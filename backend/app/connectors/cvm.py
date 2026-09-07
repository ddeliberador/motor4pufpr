"""
MOTOR 4P UFPR - CVM Connector
Conector para dados abertos da CVM (mercado de capitais)

Documentação: https://dados.cvm.gov.br/
Licença dos dados: ODbL (Open Database License)

Dois usos distintos:
1) Busca de datasets no catálogo CKAN da CVM (search_datasets)
2) Ranking de companhias abertas por setor, cruzando o Formulário Cadastral (FCA)
   com a receita declarada na Demonstração Financeira Padronizada (DFP/DRE)

IMPORTANTE — verificações feitas sobre os arquivos reais da CVM:
- FCA (fca_cia_aberta_geral_{ano}.csv): colunas reais utilizadas
  CNPJ_Companhia; Nome_Empresarial; Codigo_CVM; Setor_Atividade;
  Descricao_Atividade; Situacao_Registro_CVM; Situacao_Emissor
  >>> O cadastro da CVM NÃO possui coluna de CNAE. A classificação
  disponível é o campo textual "Setor_Atividade" (taxonomia própria da CVM),
  por isso o CNAE informado é traduzido para setores CVM (CNAE_DIV_TO_CVM_SETOR).
- DFP (dfp_cia_aberta_DRE_con_{ano}.csv): colunas reais utilizadas
  CNPJ_CIA; DENOM_CIA; ESCALA_MOEDA (MIL|UNIDADE); ORDEM_EXERC (ÚLTIMO|PENÚLTIMO);
  DT_FIM_EXERC; CD_CONTA; DS_CONTA; VL_CONTA
  >>> Conta de receita confirmada: CD_CONTA "3.01" =
  "Receita de Venda de Bens e/ou Serviços" (bancos usam a mesma conta 3.01 com
  a descrição "Receitas de Intermediação Financeira").
"""
import csv
import io
import logging
import time
import zipfile
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple

import httpx

from .base import BaseConnector

logger = logging.getLogger(__name__)

CVM_BASE = "https://dados.cvm.gov.br/api/3/action"
FCA_URL = "https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC/FCA/DADOS/fca_cia_aberta_{ano}.zip"
DFP_URL = "https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC/DFP/DADOS/dfp_cia_aberta_{ano}.zip"

# Conta contábil de receita bruta na DRE (confirmada na amostra real)
CONTA_RECEITA = "3.01"

# Cache em memória, revalidado no máximo 1x por dia (dados CVM são periódicos)
CACHE_TTL_SECONDS = 24 * 60 * 60

# Divisão CNAE (2 dígitos) -> setor de atividade na taxonomia da CVM
CNAE_DIV_TO_CVM_SETOR: Dict[str, List[str]] = {
    "01": ["Agricultura (Açúcar, Álcool e Cana)"],
    "02": ["Reflorestamento", "Papel e Celulose"],
    "03": ["Alimentos"],
    "05": ["Extração Mineral"],
    "06": ["Petróleo e Gás"],
    "07": ["Extração Mineral"],
    "08": ["Extração Mineral"],
    "09": ["Extração Mineral", "Petróleo e Gás"],
    "10": ["Alimentos"],
    "11": ["Bebidas e Fumo"],
    "12": ["Bebidas e Fumo"],
    "13": ["Têxtil e Vestuário"],
    "14": ["Têxtil e Vestuário"],
    "15": ["Têxtil e Vestuário"],
    "16": ["Construção Civil, Mat. Constr. e Decoração"],
    "17": ["Papel e Celulose", "Embalagens"],
    "18": ["Comunicação e Informática"],
    "19": ["Petróleo e Gás", "Petroquímicos e Borracha"],
    "20": ["Petroquímicos e Borracha"],
    "21": ["Farmacêutico e Higiene"],
    "22": ["Petroquímicos e Borracha", "Embalagens"],
    "23": ["Construção Civil, Mat. Constr. e Decoração"],
    "24": ["Metalurgia e Siderurgia"],
    "25": ["Metalurgia e Siderurgia"],
    "26": ["Máquinas, Equipamentos, Veículos e Peças", "Comunicação e Informática"],
    "27": ["Máquinas, Equipamentos, Veículos e Peças"],
    "28": ["Máquinas, Equipamentos, Veículos e Peças"],
    "29": ["Máquinas, Equipamentos, Veículos e Peças"],
    "30": ["Máquinas, Equipamentos, Veículos e Peças"],
    "31": ["Construção Civil, Mat. Constr. e Decoração"],
    "32": ["Brinquedos e Lazer"],
    "33": ["Máquinas, Equipamentos, Veículos e Peças"],
    "35": ["Energia Elétrica"],
    "36": ["Saneamento, Serv. Água e Gás"],
    "37": ["Saneamento, Serv. Água e Gás"],
    "38": ["Saneamento, Serv. Água e Gás"],
    "39": ["Saneamento, Serv. Água e Gás"],
    "41": ["Construção Civil, Mat. Constr. e Decoração"],
    "42": ["Construção Civil, Mat. Constr. e Decoração"],
    "43": ["Construção Civil, Mat. Constr. e Decoração"],
    "45": ["Comércio (Atacado e Varejo)"],
    "46": ["Comércio (Atacado e Varejo)"],
    "47": ["Comércio (Atacado e Varejo)"],
    "49": ["Serviços Transporte e Logística"],
    "50": ["Serviços Transporte e Logística"],
    "51": ["Serviços Transporte e Logística"],
    "52": ["Serviços Transporte e Logística"],
    "53": ["Serviços Transporte e Logística"],
    "55": ["Hospedagem e Turismo"],
    "56": ["Hospedagem e Turismo"],
    "58": ["Comunicação e Informática"],
    "59": ["Comunicação e Informática"],
    "60": ["Comunicação e Informática"],
    "61": ["Telecomunicações"],
    "62": ["Comunicação e Informática"],
    "63": ["Comunicação e Informática"],
    "64": ["Bancos", "Intermediação Financeira"],
    "65": ["Seguradoras e Corretoras"],
    "66": ["Intermediação Financeira", "Bolsas de Valores/Mercadorias e Futuros"],
    "68": ["Construção Civil, Mat. Constr. e Decoração"],
    "77": ["Arrendamento Mercantil"],
    "85": ["Educação"],
    "86": ["Serviços médicos"],
    "87": ["Serviços médicos"],
    "88": ["Serviços médicos"],
    "90": ["Brinquedos e Lazer"],
    "91": ["Brinquedos e Lazer"],
    "92": ["Brinquedos e Lazer"],
    "93": ["Brinquedos e Lazer"],
}


def _only_digits(value: str) -> str:
    return "".join(ch for ch in (value or "") if ch.isdigit())


def _norm(text: str) -> str:
    import unicodedata

    text = unicodedata.normalize("NFKD", (text or "").lower())
    return "".join(c for c in text if not unicodedata.combining(c)).strip()


def cnae_to_cvm_sectors(cnae_codes: List[str]) -> List[str]:
    """Traduz códigos CNAE (qualquer formato) para setores da taxonomia CVM."""
    sectors: List[str] = []
    for code in cnae_codes or []:
        digits = _only_digits(str(code))
        if len(digits) < 2:
            continue
        for sector in CNAE_DIV_TO_CVM_SETOR.get(digits[:2], []):
            if sector not in sectors:
                sectors.append(sector)
    return sectors


class CVMConnector(BaseConnector):
    """
    Conector para CVM — dados de companhias abertas, formulários de referência,
    fundos de investimento, fatos relevantes.
    Útil para mapear investimento corporativo em P&D e inovação.
    """

    # Caches de processo (compartilhados entre instâncias)
    _registry_cache: Optional[Tuple[float, int, List[Dict[str, Any]]]] = None
    _revenue_cache: Optional[Tuple[float, int, Dict[str, Dict[str, Any]]]] = None

    def __init__(self):
        super().__init__()
        self.base_url = CVM_BASE

    def get_source_name(self) -> str:
        return "CVM"

    async def search(self, query: str, **kwargs) -> List[Dict[str, Any]]:
        return await self.search_datasets(query)

    async def search_datasets(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        logger.info(f"CVM search: {query}")
        try:
            data = await self.get(
                f"{self.base_url}/package_search",
                params={"q": query, "rows": str(limit)},
                use_cache=True,
            )
            results = []
            for pkg in data.get("result", {}).get("results", []):
                resources = pkg.get("resources", [])
                results.append({
                    "id": pkg.get("id", ""),
                    "title": pkg.get("title", ""),
                    "description": pkg.get("notes", "")[:300],
                    "resources_count": len(resources),
                    "formats": list({r.get("format", "").upper() for r in resources if r.get("format")}),
                    "last_modified": pkg.get("metadata_modified", ""),
                    "url": f"https://dados.cvm.gov.br/dataset/{pkg.get('name', '')}",
                })
            return results
        except Exception as e:
            logger.warning(f"CVM API error: {e}")
            return []

    # ==================================================================
    # Companhias abertas: cadastro (FCA) + receita (DFP/DRE)
    # ==================================================================

    @staticmethod
    async def _download_zip(url: str) -> Optional[zipfile.ZipFile]:
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(120.0), follow_redirects=True) as client:
                resp = await client.get(url)
                if resp.status_code != 200:
                    logger.warning(f"CVM download {url} -> HTTP {resp.status_code}")
                    return None
                return zipfile.ZipFile(io.BytesIO(resp.content))
        except Exception as e:
            logger.warning(f"CVM download error {url}: {e}")
            return None

    @staticmethod
    def _read_csv(zf: zipfile.ZipFile, filename: str) -> List[Dict[str, str]]:
        with zf.open(filename) as fh:
            text = io.TextIOWrapper(fh, encoding="latin-1", newline="")
            return list(csv.DictReader(text, delimiter=";"))

    @classmethod
    def _candidate_years(cls) -> List[int]:
        current = datetime.now(timezone.utc).year
        return [current, current - 1, current - 2]

    async def load_registry(self) -> Tuple[List[Dict[str, Any]], Optional[int]]:
        """
        Cadastro das companhias abertas (FCA), com cache diário.
        Retorna (lista de companhias ativas, ano de referência).
        """
        cached = CVMConnector._registry_cache
        if cached and (time.time() - cached[0]) < CACHE_TTL_SECONDS:
            return cached[2], cached[1]

        for ano in self._candidate_years():
            zf = await self._download_zip(FCA_URL.format(ano=ano))
            if not zf:
                continue
            name = f"fca_cia_aberta_geral_{ano}.csv"
            if name not in zf.namelist():
                continue
            companies: Dict[str, Dict[str, Any]] = {}
            for row in self._read_csv(zf, name):
                cnpj = _only_digits(row.get("CNPJ_Companhia", ""))
                if not cnpj:
                    continue
                if _norm(row.get("Situacao_Registro_CVM", "")) != "ativo":
                    continue
                # mantém a versão mais recente do documento por companhia
                prev = companies.get(cnpj)
                if prev and prev["_versao"] >= (row.get("Versao") or ""):
                    continue
                companies[cnpj] = {
                    "cnpj": cnpj,
                    "nome": (row.get("Nome_Empresarial") or "").strip(),
                    "codigo_cvm": (row.get("Codigo_CVM") or "").strip(),
                    "setor_cvm": (row.get("Setor_Atividade") or "").strip(),
                    "atividade": (row.get("Descricao_Atividade") or "").strip()[:300],
                    "situacao_registro": (row.get("Situacao_Registro_CVM") or "").strip(),
                    "situacao_emissor": (row.get("Situacao_Emissor") or "").strip(),
                    "_versao": row.get("Versao") or "",
                }
            result = list(companies.values())
            CVMConnector._registry_cache = (time.time(), ano, result)
            logger.info(f"CVM FCA {ano}: {len(result)} companhias ativas")
            return result, ano

        return [], None

    async def load_revenues(self) -> Tuple[Dict[str, Dict[str, Any]], Optional[int]]:
        """
        Receita declarada por CNPJ (conta 3.01 da DRE consolidada; fallback individual),
        com cache diário. Retorna ({cnpj: {receita, ano, descricao}}, ano do arquivo).
        """
        cached = CVMConnector._revenue_cache
        if cached and (time.time() - cached[0]) < CACHE_TTL_SECONDS:
            return cached[2], cached[1]

        for ano in self._candidate_years():
            zf = await self._download_zip(DFP_URL.format(ano=ano))
            if not zf:
                continue
            revenues: Dict[str, Dict[str, Any]] = {}
            # consolidada tem prioridade; individual só preenche o que faltar
            for arquivo in (f"dfp_cia_aberta_DRE_con_{ano}.csv", f"dfp_cia_aberta_DRE_ind_{ano}.csv"):
                if arquivo not in zf.namelist():
                    continue
                for row in self._read_csv(zf, arquivo):
                    if (row.get("CD_CONTA") or "").strip() != CONTA_RECEITA:
                        continue
                    if _norm(row.get("ORDEM_EXERC", "")) != "ultimo":
                        continue
                    cnpj = _only_digits(row.get("CNPJ_CIA", ""))
                    if not cnpj or cnpj in revenues:
                        continue
                    try:
                        valor = float((row.get("VL_CONTA") or "0").replace(",", "."))
                    except ValueError:
                        continue
                    if _norm(row.get("ESCALA_MOEDA", "")) == "mil":
                        valor *= 1000
                    if valor <= 0:
                        continue
                    fim = (row.get("DT_FIM_EXERC") or "").strip()
                    revenues[cnpj] = {
                        "receita": valor,
                        "ano_referencia": int(fim[:4]) if fim[:4].isdigit() else ano,
                        "conta": CONTA_RECEITA,
                        "descricao_conta": (row.get("DS_CONTA") or "").strip(),
                        "consolidado": "_con_" in arquivo,
                    }
            if revenues:
                CVMConnector._revenue_cache = (time.time(), ano, revenues)
                logger.info(f"CVM DFP {ano}: receita de {len(revenues)} companhias")
                return revenues, ano

        return {}, None

    async def get_top_companies_by_cnae(
        self,
        cnae_codes: List[str],
        limit: int = 10,
    ) -> Dict[str, Any]:
        """
        Maiores companhias de capital aberto cujo setor CVM corresponde
        aos CNAEs informados, ordenadas pela receita declarada na DFP.
        """
        sectors = cnae_to_cvm_sectors(cnae_codes)
        if not sectors:
            return {
                "available": False,
                "reason": "Nenhum CNAE informado pôde ser traduzido para os setores de atividade usados pela CVM.",
                "companies": [],
                "cnae_codes": cnae_codes or [],
                "cvm_sectors": [],
            }

        registry, ano_cadastro = await self.load_registry()
        if not registry:
            return {
                "available": False,
                "reason": "O cadastro de companhias abertas da CVM não pôde ser baixado agora.",
                "companies": [],
                "cnae_codes": cnae_codes,
                "cvm_sectors": sectors,
            }

        revenues, ano_dfp = await self.load_revenues()
        wanted = {_norm(s) for s in sectors}
        # holdings ("Emp. Adm. Part. - X") do mesmo setor também entram
        matched: List[Dict[str, Any]] = []
        for comp in registry:
            setor = _norm(comp["setor_cvm"])
            if not setor:
                continue
            is_match = setor in wanted
            if not is_match and setor.startswith("emp. adm. part."):
                suffix = setor.split("-", 1)[-1].strip()
                is_match = any(
                    suffix and (suffix[:10] in w or w[:10] in suffix) for w in wanted
                )
            if not is_match:
                continue
            rev = revenues.get(comp["cnpj"])
            matched.append({
                "nome": comp["nome"],
                "cnpj": comp["cnpj"],
                "codigo_cvm": comp["codigo_cvm"],
                "setor_cvm": comp["setor_cvm"],
                "atividade": comp["atividade"],
                "situacao_emissor": comp["situacao_emissor"],
                "receita": rev["receita"] if rev else None,
                "ano_referencia": rev["ano_referencia"] if rev else None,
                "conta": rev["conta"] if rev else None,
                "descricao_conta": rev["descricao_conta"] if rev else None,
                "consolidado": rev["consolidado"] if rev else None,
                "url": "https://dados.cvm.gov.br/dataset/cia_aberta-doc-fca",
            })

        com_receita = [c for c in matched if c["receita"]]
        com_receita.sort(key=lambda c: c["receita"], reverse=True)

        return {
            "available": True,
            "companies": com_receita[:limit],
            "total_matched": len(matched),
            "with_revenue": len(com_receita),
            "cnae_codes": cnae_codes,
            "cvm_sectors": sectors,
            "ano_cadastro": ano_cadastro,
            "ano_dfp": ano_dfp,
            "conta_receita": CONTA_RECEITA,
            "partial_scope": True,
            "scope_note": (
                "Recorte parcial — inclui apenas companhias de capital aberto "
                "registradas na CVM. Não representa o mercado privado do setor."
            ),
            "sources": [
                {
                    "name": "CVM — Formulário Cadastral (FCA)",
                    "url": "https://dados.cvm.gov.br/dataset/cia_aberta-doc-fca",
                },
                {
                    "name": "CVM — Demonstrações Financeiras Padronizadas (DFP)",
                    "url": "https://dados.cvm.gov.br/dataset/cia_aberta-doc-dfp",
                },
            ],
        }
