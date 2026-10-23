"""
Cliente da função `series-municipais` do Supabase, que grava as séries
municipais pela camada temporal compartilhada (_shared/temporal.ts).

O backend não toca o banco: manda lotes para a função, autenticado pela
MCTI_API_KEY (a chave institucional que o backend já tem). Só precisa da
SUPABASE_URL (pública). O nome do módulo é histórico: a primeira versão
falava PostgREST com a service role, dispensada por este desenho.
"""
from __future__ import annotations

import logging
import os
import time
from dataclasses import dataclass, field
from typing import Any, Iterable

import httpx

logger = logging.getLogger(__name__)

LOTE = 1000


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

    def linha(self) -> dict[str, Any]:
        return {
            "indicador_id": self.indicador_id, "entidade_tipo": self.entidade_tipo, "entidade_chave": self.entidade_chave,
            "segmento": self.segmento, "periodo_referencia": self.periodo_referencia, "granularidade": self.granularidade,
            "valor": self.valor, "origem_temporal": self.origem_temporal, "metadados": self.metadados, "versao_metodo": self.versao_metodo,
        }


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
        base = (url or os.environ.get("SUPABASE_URL") or "").rstrip("/")
        self.chave = chave or os.environ.get("MCTI_API_KEY") or ""
        if not base or not self.chave:
            raise RuntimeError("SUPABASE_URL e MCTI_API_KEY são obrigatórios para gravar séries municipais")
        self.http = httpx.Client(
            base_url=f"{base}/functions/v1/series-municipais",
            headers={"x-api-key": self.chave, "Content-Type": "application/json"},
            timeout=httpx.Timeout(180.0),
        )

    def _chamar(self, acao: str, **corpo: Any) -> dict:
        for tentativa in range(3):
            r = self.http.post("", json={"acao": acao, **corpo})
            if r.status_code < 500:
                break
            time.sleep(2 * (tentativa + 1))
        if r.status_code != 200:
            raise RuntimeError(f"series-municipais/{acao}: HTTP {r.status_code} {r.text[:300]}")
        return r.json()

    # ---- leitura ----------------------------------------------------------
    def listar(self, tabela: str, select: str, filtros: dict[str, str] | None = None, ordem: str | None = None, pagina: int = 1000) -> list[dict]:
        """Só a tabela de municípios é exposta pela função; a assinatura é mantida para os coletores."""
        if tabela != "infra_backhaul_municipio":
            raise RuntimeError(f"leitura de {tabela} não é exposta pela função series-municipais")
        linhas: list[dict] = []
        de = 0
        while True:
            lote = self._chamar("municipios", de=de).get("linhas", [])
            linhas.extend(lote)
            if len(lote) < 1000:
                return linhas
            de += 1000

    # ---- catálogo e coletas ---------------------------------------------
    def garantir_indicador(self, ind: Indicador) -> None:
        self._chamar("indicador", indicador={k: v for k, v in ind.__dict__.items() if v is not None})

    def iniciar_coleta(self, job_id: str, fonte: str, versao: str, escopo: dict | None = None, hash_: str | None = None) -> Coleta:
        return Coleta(id=self._chamar("iniciar", job_id=job_id, fonte=fonte, versao=versao, escopo=escopo, hash=hash_)["coleta_id"])

    def finalizar_coleta(self, c: Coleta, ok: bool, erro: str | None = None) -> None:
        try:
            self._chamar("finalizar", coleta_id=c.id, ok=ok, found=c.encontrados, inserted=c.inseridos, error=(erro or "")[:2000] or None)
        except RuntimeError as e:
            logger.warning("ingest_runs(%s) não atualizado: %s", c.id, e)

    def ultima_coleta_ok(self, job_id: str) -> dict | None:
        return self._chamar("ultima_coleta_ok", job_id=job_id).get("coleta")

    def registrar_observacoes(self, c: Coleta, linhas: Iterable[Observacao]) -> tuple[int, int]:
        """Lotes de até LOTE linhas; a idempotência dentro da coleta é da função (temporal.ts)."""
        unicas: dict[str, Observacao] = {}
        for l in linhas:
            if l.valor is None:
                continue
            unicas[l.chave()] = l
        todas = list(unicas.values())
        inseridas = ignoradas = 0
        for i in range(0, len(todas), LOTE):
            r = self._chamar("observacoes", coleta_id=c.id, linhas=[l.linha() for l in todas[i:i + LOTE]])
            inseridas += int(r.get("inseridas", 0))
            ignoradas += int(r.get("ignoradas", 0))
            if (i // LOTE) % 20 == 0:
                logger.info("gravadas %d/%d observações", min(i + LOTE, len(todas)), len(todas))
        c.encontrados += len(todas)
        c.inseridos += inseridas
        return inseridas, ignoradas

    def registrar_interacoes(self, c: Coleta, linhas: list[dict]) -> int:
        """Interações entre atores (tabela interacoes), em lotes; o upsert por id é da função interacoes_upsert."""
        gravadas = 0
        for i in range(0, len(linhas), LOTE):
            r = self._chamar("interacoes", linhas=linhas[i:i + LOTE])
            gravadas += int(r.get("gravadas", 0))
        c.encontrados += len(linhas)
        c.inseridos += gravadas
        return gravadas

    def atualizar_agenda(self, job: str, status: str, mensagem: str) -> None:
        try:
            self._chamar("agenda", job=job, status=status, mensagem=mensagem[:500])
        except RuntimeError as e:
            logger.warning("agenda_coletas(%s) não atualizada: %s", job, e)
