"""
Tabela de municípios (código IBGE ↔ nome/UF), lida do próprio Supabase
(`infra_backhaul_municipio`, 5.570 linhas com sede municipal). Fontes que só
trazem o nome do município (CAPES, Receita) são casadas aqui por nome
normalizado + UF, com desambiguação por homônimos através da UF.
"""
from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass

from .postgrest import SupabaseServico


def normalizar(texto: str) -> str:
    t = unicodedata.normalize("NFD", str(texto or "")).encode("ascii", "ignore").decode()
    t = re.sub(r"[^a-z0-9]+", " ", t.lower()).strip()
    # Variações comuns entre fontes.
    t = re.sub(r"\bd(a|e|o|as|os)\b", "", t)
    return re.sub(r"\s+", " ", t).strip()


@dataclass
class Municipio:
    ibge: str
    nome: str
    uf: str


class TabelaMunicipios:
    def __init__(self, sb: SupabaseServico):
        linhas = sb.listar("infra_backhaul_municipio", "codigo_ibge,municipio,uf", ordem="codigo_ibge.asc")
        self.por_ibge: dict[str, Municipio] = {}
        self.por_nome: dict[str, Municipio] = {}
        for r in linhas:
            m = Municipio(ibge=str(r["codigo_ibge"]).zfill(7), nome=r["municipio"], uf=str(r["uf"]).upper())
            self.por_ibge[m.ibge] = m
            self.por_nome[f"{normalizar(m.nome)}|{m.uf}"] = m
        if len(self.por_ibge) < 5000:
            raise RuntimeError(f"infra_backhaul_municipio devolveu só {len(self.por_ibge)} municípios; carga abortada")

    def ibge_valido(self, codigo: str | int | None) -> str | None:
        if codigo is None:
            return None
        c = re.sub(r"\D", "", str(codigo))
        if len(c) == 6:  # algumas fontes omitem o dígito verificador: casa pelo prefixo
            cands = [k for k in self.por_ibge if k.startswith(c)]
            return cands[0] if len(cands) == 1 else None
        return c if c in self.por_ibge else None

    def por_nome_uf(self, nome: str, uf: str) -> str | None:
        m = self.por_nome.get(f"{normalizar(nome)}|{str(uf).upper().strip()}")
        return m.ibge if m else None
