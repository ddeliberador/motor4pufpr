"""
Conector INEP — Censo da Educação Superior
Fonte: dados.gov.br + inep.gov.br/microdados
Microdados anuais em CSV (arquivo grande) — sem API REST
Estratégia: metadados + links de download + curadoria de indicadores-chave
"""
import logging
import httpx
import os
from typing import Any

logger = logging.getLogger(__name__)

# Indicadores curados do Censo da Educação Superior 2023 (INEP)
CENSO_2023 = {
    "ano": 2023,
    "fonte": "Censo da Educação Superior 2023 — INEP/MEC",
    "url": "https://www.gov.br/inep/pt-br/areas-de-atuacao/pesquisas-estatisticas-e-indicadores/censo-da-educacao-superior",
    "indicadores": {
        "ies_total": 2595,
        "ies_publicas": 320,
        "ies_privadas": 2275,
        "cursos_total": 44543,
        "matriculas_total": 9747606,
        "matriculas_presencial": 4285512,
        "matriculas_ead": 5462094,
        "concluintes": 1330934,
        "docentes_total": 403117,
        "docentes_doutores_pct": 40.2,
    },
    "areas_mais_matriculados": [
        {"area": "Negócios, Administração e Direito", "matriculas": 2850000},
        {"area": "Saúde e Bem-estar", "matriculas": 1620000},
        {"area": "Educação", "matriculas": 1180000},
        {"area": "Engenharia, Produção e Construção", "matriculas": 1050000},
        {"area": "Computação e TIC", "matriculas": 850000},
    ],
}

async def buscar_censo_educacao(
    uf: str | None = None,
    area: str | None = None,
) -> dict[str, Any]:
    async with httpx.AsyncClient(headers={"User-Agent": "Motor4P-UFPR/1.0 (motor4p@ufpr.br)"}) as client:
        # Busca dataset no dados.gov.br
        dataset_url: str | None = None
        try:
            chave = os.getenv("DADOS_GOV_API_KEY", "")
            headers_req: dict = {"User-Agent": "Motor4P-UFPR/1.0 (motor4p@ufpr.br)"}
            if chave:
                headers_req["chave-api-dados-abertos"] = chave
            r = await client.get(
                "https://dados.gov.br/dados/api/publico/conjuntos-dados",
                params={"nomeConjuntoDados": "microdados censo educação superior", "pagina": 1, "tamanhoPagina": 3},
                headers=headers_req,
                timeout=12,
            )
            if r.status_code == 200:
                items = r.json()
                if isinstance(items, list) and items:
                    dataset_url = items[0].get("url")
        except Exception as e:
            logger.warning(f"INEP dados.gov.br: {e}")

        return {
            "disponivel": True,
            "fonte": "INEP — Censo da Educação Superior",
            "url_portal": "https://www.gov.br/inep/pt-br/areas-de-atuacao/pesquisas-estatisticas-e-indicadores/censo-da-educacao-superior",
            "url_microdados": "https://www.gov.br/inep/pt-br/acesso-a-informacao/dados-abertos/microdados/censo-da-educacao-superior",
            "dataset_dados_gov": dataset_url,
            "indicadores_nacionais": CENSO_2023,
            "uf_filtro": uf,
            "area_filtro": area,
            "colunas_filtro_uf": "CO_UF_IES (código IBGE da UF da IES)",
            "periodicidade": "Anual — referência 2023 disponível (2024 previsto para dez/2024)",
            "nota_tecnica": (
                "Microdados do Censo são arquivos CSV grandes (500MB+). "
                "O Motor retorna metadados e links — download e filtragem são feitos localmente. "
                "Colunas relevantes: CO_UF_IES, NO_IES, CO_CURSO, NO_CURSO, CO_CINE_AREA_GERAL, "
                "QT_MAT, QT_CONC, QT_DOC_EX."
            ),
            "links_diretos": [
                {"label": f"Microdados INEP 2023{' — filtrar por CO_UF_IES=' + uf if uf else ''}", "url": "https://www.gov.br/inep/pt-br/acesso-a-informacao/dados-abertos/microdados/censo-da-educacao-superior"},
                {"label": "Resumo Técnico Censo 2023 (PDF)", "url": "https://download.inep.gov.br/publicacoes/institucionais/estatisticas_e_indicadores/resumo_tecnico_censo_educacao_superior_2023.pdf"},
                {"label": "Sinopse Estatística 2023 (tabelas Excel)", "url": "https://www.gov.br/inep/pt-br/areas-de-atuacao/pesquisas-estatisticas-e-indicadores/censo-da-educacao-superior/resultados"},
            ],
        }
