"""
Conector FORMICT/DATANIT — Política de Propriedade Intelectual das ICTs
Fonte: dados.gov.br (MCTI/FORMICT) + BrasilAPI/CNPJ para enriquecimento
Sem API REST — dados publicados como CSV no dados.gov.br
ACHADO: os CSVs consolidados do FORMICT NÃO identificam as ICTs nominalmente —
apenas dados agregados por tipo de instituição. Para identificação nominal,
é necessário cruzar com as listas do Apêndice dos relatórios PDF (manual).
Documentado em: https://dados.gov.br/dataset/politica-propriedade-intelectual
"""
import logging
import httpx
import os
from typing import Any

logger = logging.getLogger(__name__)

DADOS_GOV_BASE = "https://dados.gov.br"
FORMICT_SLUG = "politica-propriedade-intelectual"

# NITs mapeados manualmente dos relatórios FORMICT (amostra curada para o Motor)
# Fonte: Relatório FORMICT ano-base 2022 (publicado out/2024) — Apêndice I (296 ICTs)
# Lista completa não está no CSV estruturado — apenas em PDF
NITS_CURADOS = [
    {"sigla": "NIT-UFPR", "nome": "Agência de Inovação da UFPR", "ies": "Universidade Federal do Paraná", "uf": "PR", "url": "https://www.agencia.ufpr.br", "municipio": "Curitiba"},
    {"sigla": "INOVA-UNICAMP", "nome": "Inova Unicamp", "ies": "Universidade Estadual de Campinas", "uf": "SP", "url": "https://www.inova.unicamp.br", "municipio": "Campinas"},
    {"sigla": "AGEUSP", "nome": "Agência USP de Inovação", "ies": "Universidade de São Paulo", "uf": "SP", "url": "https://inovacao.usp.br", "municipio": "São Paulo"},
    {"sigla": "NIT-UFRJ", "nome": "Coordenadoria de Transferência e Inovação Tecnológica (CTIN)", "ies": "Universidade Federal do Rio de Janeiro", "uf": "RJ", "url": "https://www.ctin.ufrj.br", "municipio": "Rio de Janeiro"},
    {"sigla": "CDT-UnB", "nome": "Centro de Apoio ao Desenvolvimento Tecnológico", "ies": "Universidade de Brasília", "uf": "DF", "url": "https://www.cdt.unb.br", "municipio": "Brasília"},
    {"sigla": "ITTI-UFMG", "nome": "Instituto de Transferência de Tecnologia e Inovação", "ies": "Universidade Federal de Minas Gerais", "uf": "MG", "url": "https://www.itti.ufmg.br", "municipio": "Belo Horizonte"},
    {"sigla": "FORTEC", "nome": "Fórum Nacional de Gestores de Inovação e Transferência de Tecnologia", "ies": "Rede nacional de NITs", "uf": "BR", "url": "https://www.fortec.org.br", "municipio": ""},
    {"sigla": "NIT-UNESP", "nome": "Agência de Inovação UNESP", "ies": "Universidade Estadual Paulista", "uf": "SP", "url": "https://www.inovacao.unesp.br", "municipio": "São Paulo"},
    {"sigla": "NUTEC-UFC", "nome": "Núcleo de Transferência de Tecnologia", "ies": "Universidade Federal do Ceará", "uf": "CE", "url": "https://www.nutec.ufc.br", "municipio": "Fortaleza"},
    {"sigla": "NIT-UFSC", "nome": "Agência UFSC de Inovação", "ies": "Universidade Federal de Santa Catarina", "uf": "SC", "url": "https://inovacao.ufsc.br", "municipio": "Florianópolis"},
]

async def buscar_formict(uf: str | None = None) -> dict[str, Any]:
    """
    Retorna metadados do FORMICT + amostra curada de NITs.
    Para dados completos: download do CSV no dados.gov.br.
    """
    async with httpx.AsyncClient(headers={"User-Agent": "Motor4P-UFPR/1.0 (motor4p@ufpr.br)"}) as client:
        # Tenta descobrir o dataset via CKAN
        chave = os.getenv("DADOS_GOV_API_KEY", "")
        headers_req: dict = {"User-Agent": "Motor4P-UFPR/1.0 (motor4p@ufpr.br)"}
        if chave:
            headers_req["chave-api-dados-abertos"] = chave

        dataset_info: dict | None = None
        try:
            r = await client.get(
                f"{DADOS_GOV_BASE}/dados/api/publico/conjuntos-dados",
                params={"nomeConjuntoDados": "formict propriedade intelectual ICT", "pagina": 1, "tamanhoPagina": 3},
                headers=headers_req,
                timeout=12,
            )
            if r.status_code == 200:
                results = r.json()
                dataset_info = results[0] if isinstance(results, list) and results else None
        except Exception as e:
            logger.warning(f"FORMICT dados.gov.br search: {e}")

        # Filtra NITs por UF quando há localização
        nits_filtrados = [n for n in NITS_CURADOS if not uf or n["uf"] == uf or n["uf"] == "BR"]

        return {
            "disponivel": True,
            "fonte": "MCTI/FORMICT — Formulário para Informações sobre a Política de Propriedade Intelectual das ICTs",
            "url_portal": f"https://dados.gov.br/dataset/{FORMICT_SLUG}",
            "url_relatorios": "https://www.gov.br/mcti/pt-br/acompanhe-o-mcti/noticias/2024/10/mcti-publica-relatorios-formict-dos-anos-base-2020-a-2023",
            "periodo": "Anos-base 2018–2022 (publicados no dados.gov.br)",
            "total_icts_respondentes": 296,  # Fonte: Relatório FORMICT ano-base 2022
            "cobertura_nits": "O Brasil tem 296+ ICTs com NIT ativo (dado do relatório FORMICT 2022)",
            "dataset_encontrado": dataset_info is not None,
            "dataset_titulo": dataset_info.get("title", "") if dataset_info else "",
            "dataset_url": dataset_info.get("url", f"https://dados.gov.br/dataset/{FORMICT_SLUG}") if dataset_info else f"https://dados.gov.br/dataset/{FORMICT_SLUG}",
            "nits_curados": nits_filtrados,
            "filtro_uf": uf,
            "achado_estrutural": (
                "Os CSVs do FORMICT disponíveis no dados.gov.br contêm dados AGREGADOS por tipo de instituição — "
                "as ICTs NÃO são identificadas nominalmente nos arquivos estruturados. "
                "Identificação nominal requer leitura dos Apêndices dos relatórios PDF (manual). "
                "O Motor usa uma lista curada de NITs para suprir essa lacuna."
            ),
            "campos_csv_disponiveis": [
                "TP_CATEGORIA_ADMIN", "TP_ORGANIZACAO_ICT", "TP_NIT",
                "IN_POSSUI_NIT", "IN_POLÍTICA_INOVACAO", "IN_TRANSFERENCIA_TECNOLOGIA",
                "QT_PATENTES_DEPOSITADAS", "QT_PATENTES_CONCEDIDAS", "QT_CONTRATOS_TT",
            ],
            "proximos_passos": [
                "Solicitar ao MCTI exportação estruturada com CNPJ das ICTs via parceria com Prof. Eunice Liu",
                "Cruzar lista PDF do Apêndice com BrasilAPI/CNPJ para identificação nominal",
                "Avaliar FORTEC (Fórum Nacional de NITs) como fonte complementar de contatos",
            ],
        }
