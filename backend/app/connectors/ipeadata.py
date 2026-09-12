"""
MOTOR 4P UFPR - IPEAData Connector
Conector para a API OData v4 do IPEAData (séries socioeconômicas do Brasil).

Base: http://www.ipeadata.gov.br/api/odata4/
Documentação: http://www.ipeadata.gov.br/api/

Formato REAL confirmado por chamada real em 2026-09-12:
  GET /Metadados
      -> {"value":[{SERCODIGO, SERNOME, SERCOMENTARIO, SERATUALIZACAO,
                    BASNOME, FNTSIGLA, FNTNOME, FNTURL, PERNOME, UNINOME,
                    MULNOME, SERSTATUS, SERNUMERICA, TEMCODIGO, PAICODIGO}]}
      3.604 séries no catálogo completo (~7 MB).
  GET /Metadados('CODIGO')            -> mesma estrutura, 1 item em "value"
  GET /ValoresSerie(SERCODIGO='CODIGO')
      -> {"value":[{SERCODIGO, VALDATA, VALVALOR, NIVNOME, TERCODIGO}]}
  GET /Temas                          -> {"value":[{TEMCODIGO, TEMCODIGO_PAI, TEMNOME}]}

LIMITAÇÕES REAIS DO SERVIDOR (medidas, não presumidas):
  - `$select` é rejeitado (HTTP 400 / "An error has occurred").
  - `contains(...)` é inválido; `substringof(...)` e `startswith(...)` são
    aceitos, mas case-sensitive e sem normalização de acento -> inúteis para
    busca por termo do usuário.
  - `$orderby VALDATA desc` é ignorado silenciosamente (retorna ordem ascendente).
Por isso a busca textual é feita no cliente sobre o catálogo completo (com cache)
e a série "mais recente" é obtida pegando a cauda da lista ordenada por data.
"""
import logging
import unicodedata
from typing import Any, Dict, List, Optional

from .base import BaseConnector

logger = logging.getLogger(__name__)

IPEADATA_BASE = "http://www.ipeadata.gov.br/api/odata4"


def _normalize(text: str) -> str:
    """Minúsculas sem acento — para casar termo do usuário com nome da série."""
    if not text:
        return ""
    nfkd = unicodedata.normalize("NFKD", str(text))
    return "".join(c for c in nfkd if not unicodedata.combining(c)).lower()


class IPEADataConnector(BaseConnector):
    """
    Conector do IPEAData — séries históricas de indicadores socioeconômicos
    (PIB, câmbio, emprego, produção industrial, C&T, etc.).
    """

    def __init__(self):
        super().__init__()
        self.base_url = IPEADATA_BASE
        self._catalog: Optional[List[Dict[str, Any]]] = None
        self._temas: Optional[Dict[str, str]] = None

    def get_source_name(self) -> str:
        return "IPEAData"

    # ------------------------------------------------------------------ #
    # Catálogo / temas
    # ------------------------------------------------------------------ #

    async def get_temas(self) -> Dict[str, str]:
        """Mapa TEMCODIGO -> TEMNOME (usado para preencher o tema da série)."""
        if self._temas is not None:
            return self._temas
        data = await self.get(f"{self.base_url}/Temas", use_cache=True)
        self._temas = {
            str(t.get("TEMCODIGO")): t.get("TEMNOME", "")
            for t in data.get("value", [])
        }
        return self._temas

    async def get_catalog(self) -> List[Dict[str, Any]]:
        """
        Catálogo completo de metadados (3.6k séries, ~7 MB), em cache.
        Necessário porque o servidor não suporta filtro textual utilizável.
        """
        if self._catalog is not None:
            return self._catalog
        data = await self.get(f"{self.base_url}/Metadados", use_cache=True)
        self._catalog = data.get("value", [])
        logger.info(f"IPEAData: catálogo carregado com {len(self._catalog)} séries")
        return self._catalog

    def _map_metadata(self, item: Dict[str, Any], temas: Dict[str, str]) -> Dict[str, Any]:
        return {
            "code": item.get("SERCODIGO", ""),
            "name": item.get("SERNOME", ""),
            "theme": temas.get(str(item.get("TEMCODIGO")), ""),
            "theme_code": item.get("TEMCODIGO"),
            "base": item.get("BASNOME", ""),
            "source": item.get("FNTNOME", ""),
            "source_acronym": item.get("FNTSIGLA", ""),
            "source_url": item.get("FNTURL", ""),
            "frequency": item.get("PERNOME", ""),
            "unit": item.get("UNINOME", ""),
            "multiplier": item.get("MULNOME", ""),
            "last_update": item.get("SERATUALIZACAO", ""),
            "status": item.get("SERSTATUS", ""),
            "numeric": item.get("SERNUMERICA"),
            "country": item.get("PAICODIGO", "BRA"),
            "comment": (item.get("SERCOMENTARIO") or "")[:600],
            "url": f"http://www.ipeadata.gov.br/ExibeSerie.aspx?serid={item.get('SERCODIGO','')}",
        }

    # ------------------------------------------------------------------ #
    # Busca
    # ------------------------------------------------------------------ #

    async def search(self, query: str, **kwargs) -> List[Dict[str, Any]]:
        return await self.search_series(query, **kwargs)

    async def search_series(
        self,
        query: str,
        limit: int = 20,
        only_active: bool = True,
        include_values: bool = False,
        last_n: int = 12,
    ) -> List[Dict[str, Any]]:
        """
        Busca séries por termo (case/acento-insensitive) no catálogo do IPEA.

        Args:
            query: termo livre ("PIB", "câmbio", "inovação"...).
            limit: máximo de séries retornadas.
            only_active: descarta séries marcadas como inativas.
            include_values: se True, anexa os últimos valores de cada série.
            last_n: quantos valores recentes anexar quando include_values=True.
        """
        logger.info(f"IPEAData search: {query}")
        catalog = await self.get_catalog()
        temas = await self.get_temas()

        needle = _normalize(query)
        tokens = [t for t in needle.split() if t]
        matches: List[Dict[str, Any]] = []

        for item in catalog:
            name = item.get("SERNOME") or ""
            norm_name = _normalize(name)
            if only_active and ("inativa" in norm_name or item.get("SERSTATUS") == "I"):
                continue
            if tokens and not all(t in norm_name for t in tokens):
                continue
            matches.append(item)

        # séries cujo nome começa com o termo aparecem primeiro
        matches.sort(key=lambda i: (0 if _normalize(i.get("SERNOME", "")).startswith(needle) else 1,
                                    i.get("SERNOME", "")))
        matches = matches[:limit]

        results = [self._map_metadata(m, temas) for m in matches]

        if include_values:
            for r in results:
                r["values"] = await self.get_series_values(r["code"], last_n=last_n)

        return results

    # ------------------------------------------------------------------ #
    # Metadados e valores de uma série
    # ------------------------------------------------------------------ #

    async def get_series_metadata(self, series_code: str) -> Optional[Dict[str, Any]]:
        """Metadados de uma série específica (nome, tema, fonte, frequência...)."""
        data = await self.get(
            f"{self.base_url}/Metadados('{series_code}')", use_cache=True
        )
        values = data.get("value", [])
        if not values:
            return None
        temas = await self.get_temas()
        return self._map_metadata(values[0], temas)

    async def get_series_values(
        self,
        series_code: str,
        last_n: Optional[int] = 12,
        territorial_level: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Valores de uma série.

        O servidor ignora `$orderby VALDATA desc`, então baixamos a série e
        ordenamos/cortamos no cliente. last_n=None devolve a série inteira.
        """
        data = await self.get(
            f"{self.base_url}/ValoresSerie(SERCODIGO='{series_code}')",
            use_cache=True,
        )
        rows = data.get("value", [])
        out = [
            {
                "date": v.get("VALDATA", ""),
                "value": v.get("VALVALOR"),
                "territorial_level": v.get("NIVNOME", ""),
                "territory_code": v.get("TERCODIGO", ""),
            }
            for v in rows
            if territorial_level is None or v.get("NIVNOME") == territorial_level
        ]
        out.sort(key=lambda r: r["date"] or "")
        if last_n:
            out = out[-last_n:]
        return out

    async def get_series(
        self, series_code: str, last_n: Optional[int] = 12
    ) -> Dict[str, Any]:
        """Série + metadados no mesmo objeto (nome, tema, fonte, frequência, atualização)."""
        meta = await self.get_series_metadata(series_code)
        if meta is None:
            raise ValueError(f"Série IPEAData não encontrada: {series_code}")
        meta["values"] = await self.get_series_values(series_code, last_n=last_n)
        return meta
