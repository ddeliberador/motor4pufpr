"""
Cliente mínimo do PostgREST (Supabase) com a service role, espelhando a
semântica de supabase/functions/_shared/temporal.ts: abre a coleta em
ingest_runs, garante o indicador no catálogo, grava observações em lotes e
fecha a coleta. Só httpx, sem SDK.
"""
from __future__ import annotations

import logging
import os
import time
from dataclasses import dataclass, field
from typing import Any, Iterable

import httpx

logger = logging.getLogger(__name__)

LOTE = 500


@dataclass
class Observacao:
    indicador_id: str
    entidade_chave: str          # código IBGE, 7 dígitos
    periodo_referencia: str      # YYYY-MM-DD
    valor: float | None
    granularidade: str = "ano"   # dia | mes | trimestre | semestre | ano | foto
    segmento: str = ""
    origem_temporal: str = "serie_da_fonte"  # serie_da_fonte | foto_coletada | reconstruida
    entidade_tipo: str = "municipio"
    metadados: dict[str, Any] | None = None
    versao_metodo: str | None = None

    def chave(self) -> str:
        return "|".join([self.indicador_id, self.entidade_tipo, self.entidade_chave, self.segmento, self.periodo_referencia])


@dataclass
class Indicador:
    id: str
    nome: str
    natureza: str                # estoque | fluxo | proporcao | indice | preco
    unidade: str | None = None
    periodicidade: str | None = None
    descricao: str | None = None
    fonte_chave: str | None = None
    camada_mapa: str | None = None
    cnae: str | None = None
    metodologia: str | None = None


@dataclass
class Coleta:
    id: str
    inicio: float = field(default_factory=time.monotonic)
    encontrados: int = 0
    inseridos: int = 0


class SupabaseServico:
    def __init__(self, url: str | None = None, chave: str | None = None):
        self.url = (url or os.environ.get("SUPABASE_URL") or "").rstrip("/")
        self.chave = chave or os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or ""
        if not self.url or not self.chave:
            raise RuntimeError("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios para gravar séries municipais")
        self.http = httpx.Client(
            base_url=f"{self.url}/rest/v1",
            headers={"apikey": self.chave, "Authorization": f"Bearer {self.chave}", "Content-Type": "application/json"},
            timeout=httpx.Timeout(120.0),
        )

    # ---- leitura genérica, paginada -------------------------------------
    def listar(self, tabela: str, select: str, filtros: dict[str, str] | None = None, ordem: str | None = None, pagina: int = 1000) -> list[dict]:
        linhas: list[dict] = []
        de = 0
        while True:
            params = {"select": select, **(filtros or {})}
            if ordem:
                params["order"] = ordem
            r = self.http.get(f"/{tabela}", params=params, headers={"Range": f"{de}-{de + pagina - 1}", "Range-Unit": "items"})
            if r.status_code not in (200, 206):
                raise RuntimeError(f"{tabela}: HTTP {r.status_code} {r.text[:200]}")
            lote = r.json()
            linhas.extend(lote)
            if len(lote) < pagina:
                return linhas
            de += pagina

    # ---- catálogo e coletas ---------------------------------------------
    def garantir_indicador(self, ind: Indicador) -> None:
        corpo = {k: v for k, v in ind.__dict__.items() if v is not None}
        r = self.http.post("/indicadores", json=corpo, headers={"Prefer": "resolution=ignore-duplicates,return=minimal"}, params={"on_conflict": "id"})
        if r.status_code not in (200, 201):
            raise RuntimeError(f"indicadores({ind.id}): HTTP {r.status_code} {r.text[:200]}")

    def iniciar_coleta(self, job_id: str, fonte: str, versao: str, escopo: dict | None = None, hash_: str | None = None) -> Coleta:
        corpo = {"job_id": job_id, "fonte": fonte, "ok": False, "found": 0, "inserted": 0, "escopo": escopo, "versao_conector": versao, "resposta_hash": hash_}
        r = self.http.post("/ingest_runs", json=corpo, headers={"Prefer": "return=representation"})
        if r.status_code not in (200, 201):
            raise RuntimeError(f"ingest_runs: HTTP {r.status_code} {r.text[:200]}")
        return Coleta(id=r.json()[0]["id"])

    def finalizar_coleta(self, c: Coleta, ok: bool, erro: str | None = None) -> None:
        corpo = {"ok": ok, "found": c.encontrados, "inserted": c.inseridos, "error": (erro or None) and erro[:2000], "duration_ms": int((time.monotonic() - c.inicio) * 1000)}
        r = self.http.patch("/ingest_runs", json=corpo, params={"id": f"eq.{c.id}"}, headers={"Prefer": "return=minimal"})
        if r.status_code not in (200, 204):
            logger.warning("ingest_runs(%s) não atualizado: HTTP %s", c.id, r.status_code)

    def ultima_coleta_ok(self, job_id: str) -> dict | None:
        linhas = self.listar("ingest_runs", "id,resposta_hash,started_at", {"job_id": f"eq.{job_id}", "ok": "eq.true"}, ordem="started_at.desc", pagina=1)
        return linhas[0] if linhas else None

    def registrar_observacoes(self, c: Coleta, linhas: Iterable[Observacao]) -> tuple[int, int]:
        """Append-only e idempotente dentro da coleta (como em temporal.ts)."""
        unicas: dict[str, Observacao] = {}
        for l in linhas:
            if l.valor is None:
                continue
            unicas[l.chave()] = l
        existentes = {
            "|".join([r["indicador_id"], r["entidade_tipo"], r["entidade_chave"], r.get("segmento") or "", r["periodo_referencia"]])
            for r in self.listar("observacoes", "indicador_id,entidade_tipo,entidade_chave,segmento,periodo_referencia", {"coleta_id": f"eq.{c.id}"})
        }
        novas = [l for k, l in unicas.items() if k not in existentes]
        corpo = [{
            "indicador_id": l.indicador_id, "entidade_tipo": l.entidade_tipo, "entidade_chave": l.entidade_chave,
            "segmento": l.segmento, "periodo_referencia": l.periodo_referencia, "granularidade": l.granularidade,
            "valor": l.valor, "origem_temporal": l.origem_temporal, "metadados": l.metadados, "versao_metodo": l.versao_metodo,
            "coleta_id": c.id,
        } for l in novas]
        for i in range(0, len(corpo), LOTE):
            r = self.http.post("/observacoes", json=corpo[i:i + LOTE], headers={"Prefer": "return=minimal"})
            if r.status_code not in (200, 201):
                raise RuntimeError(f"observacoes (lote {i // LOTE}): HTTP {r.status_code} {r.text[:300]}")
        c.encontrados += len(unicas)
        c.inseridos += len(novas)
        return len(novas), len(unicas) - len(novas)

    def atualizar_agenda(self, job: str, status: str, mensagem: str) -> None:
        corpo = {"ultima_execucao": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "ultimo_status": status, "ultima_mensagem": mensagem[:500]}
        self.http.patch("/agenda_coletas", json=corpo, params={"job": f"eq.{job}"}, headers={"Prefer": "return=minimal"})
