"""Coletores municipais com arquivos sintéticos (sem rede, sem Supabase)."""
from __future__ import annotations

import io
import zipfile
from pathlib import Path

import pytest

from app.services.series_municipais import registro
from app.services.series_municipais.coletores import anatel_bl, aneel_gd, capes_ppg, cnpj_cnae
from app.services.series_municipais.csv_util import indice, ler_linhas, numero
from app.services.series_municipais.municipios import TabelaMunicipios, normalizar


class SbFalso:
    def __init__(self):
        self.indicadores, self.obs = [], []
    def listar(self, tabela, select, filtros=None, ordem=None, pagina=1000):
        if tabela == "infra_backhaul_municipio":
            base = [("4106902", "Curitiba", "PR"), ("3550308", "São Paulo", "SP"), ("4100103", "Abatiá", "PR"), ("2927408", "Salvador", "BA"), ("1100015", "Alta Floresta D'Oeste", "RO")]
            # completa até 5000 para passar na checagem de tamanho
            base += [(f"99{i:05d}", f"Fictício {i}", "ZZ") for i in range(5000)]
            return [{"codigo_ibge": c, "municipio": n, "uf": u} for c, n, u in base]
        return []


@pytest.fixture
def municipios():
    return TabelaMunicipios(SbFalso())


def zipar(tmp_path: Path, nome: str, conteudo: str, cod="utf-8") -> Path:
    p = tmp_path / f"{nome}.zip"
    with zipfile.ZipFile(p, "w") as z:
        z.writestr(f"{nome}.csv", conteudo.encode(cod))
    return p


def test_normalizar_e_lookup(municipios):
    assert normalizar("São Paulo") == "sao paulo"
    assert municipios.por_nome_uf("SAO PAULO", "sp") == "3550308"
    assert municipios.por_nome_uf("Alta Floresta D Oeste", "RO") == "1100015"
    assert municipios.ibge_valido("410690") == "4106902"   # 6 dígitos, prefixo único
    assert municipios.ibge_valido("0000000") is None


def test_csv_util_detecta_separador_e_colunas():
    cab, linhas = ler_linhas(io.BytesIO("Ano;Mês;Código IBGE Município;Acessos\n2024;12;4106902;10\n".encode("latin-1")))
    assert indice(cab, "mes", "mês") == 1
    assert indice(cab, "codigo ibge") == 2
    assert list(linhas) == [["2024", "12", "4106902", "10"]]
    assert numero("1.234,5") == 1234.5 and numero("12.5") == 12.5 and numero("x") is None


def test_anatel_ultimo_mes_e_fibra(tmp_path, municipios, monkeypatch):
    csv = "Ano;Mês;UF;Município;Código IBGE Município;Tecnologia;Meio de Acesso;Acessos\n" \
          "2024;11;PR;Curitiba;4106902;Fibra;Fibra;100\n2024;12;PR;Curitiba;4106902;Fibra;Fibra;120\n" \
          "2024;12;PR;Curitiba;4106902;xDSL;Cabo Metálico;30\n2024;12;SP;São Paulo;3550308;Cabo Coaxial;Cabo;7\n2024;12;XX;Nada;0000000;Fibra;Fibra;5\n"
    monkeypatch.setattr(anatel_bl, "baixar", lambda url, reutilizar=True: zipar(tmp_path, "bl", csv, "latin-1"))
    obs, escopo = anatel_bl.coletar(municipios)
    d = {(o.entidade_chave, o.segmento, o.periodo_referencia): o.valor for o in obs}
    assert d[("4106902", "", "2024-12-01")] == 150 and d[("4106902", "fibra", "2024-12-01")] == 120
    assert d[("3550308", "fibra", "2024-12-01")] == 0 and ("4106902", "", "2024-11-01") not in d
    assert escopo["municipios"] == 2


def test_aneel_acumula_por_ano(tmp_path, municipios, monkeypatch):
    csv = "CodMunicipioIbge;NomMunicipio;DthAtualizaCadastralEmpreend;SigTipoGeracao;MdaPotenciaInstaladaKW\n" \
          "4106902;Curitiba;10/05/2022;UFV;5,5\n4106902;Curitiba;2023-02-01;UFV;4,5\n4106902;Curitiba;01/07/2023;CGH;100\n"
    monkeypatch.setattr(aneel_gd, "descobrir_url", lambda: "http://x/gd.csv")
    monkeypatch.setattr(aneel_gd, "baixar", lambda url, reutilizar=True: zipar(tmp_path, "gd", csv))
    obs, _ = aneel_gd.coletar(municipios)
    d = {(o.indicador_id, o.segmento, o.periodo_referencia): o.valor for o in obs}
    assert d[("mun.gd_potencia_kw", "", "2022-12-31")] == 5.5
    assert d[("mun.gd_potencia_kw", "", "2023-12-31")] == 110.0
    assert d[("mun.gd_potencia_kw", "UFV", "2023-12-31")] == 10.0
    assert d[("mun.gd_unidades", "", "2023-12-31")] == 3
    assert all(o.origem_temporal == "reconstruida" for o in obs)


def test_cnpj_conta_ativos_por_cnae(tmp_path, municipios, monkeypatch):
    def linha(sit, cnae, uf, tom):
        campos = [""] * 30
        campos[cnpj_cnae.COL_SITUACAO], campos[cnpj_cnae.COL_CNAE], campos[cnpj_cnae.COL_UF], campos[cnpj_cnae.COL_MUNICIPIO] = sit, cnae, uf, tom
        return ";".join(f'"{c}"' for c in campos)
    estab = "\n".join([linha("02", "6201501", "PR", "7535"), linha("02", "6311900", "PR", "7535"), linha("08", "6201501", "PR", "7535"), linha("02", "6201501", "SP", "7107"), linha("02", "4711301", "SP", "7107")])
    munis = "\n".join([f'"{i:04d}";"NOME {i}"' for i in range(5000)] + ['"7535";"CURITIBA"', '"7107";"SAO PAULO"'])
    arquivos = {"Municipios.zip": zipar(tmp_path, "mun", munis, "latin-1"), "Estabelecimentos0.zip": zipar(tmp_path, "est", estab, "latin-1")}
    monkeypatch.setattr(cnpj_cnae, "pasta_mais_recente", lambda: "2026-09")
    monkeypatch.setattr(cnpj_cnae, "baixar", lambda url, reutilizar=True: arquivos[url.rsplit("/", 1)[-1]])
    obs, escopo = cnpj_cnae.coletar(municipios, amostra=10_000)
    d = {(o.indicador_id, o.entidade_chave): o.valor for o in obs}
    assert d[("mun.estab_ti", "4106902")] == 1 and d[("mun.estab_dados", "4106902")] == 1 and d[("mun.estab_ti", "3550308")] == 1
    assert ("mun.estab_dados", "3550308") not in d
    assert obs[0].periodo_referencia == "2026-09-01" and escopo["pasta"] == "2026-09"


def test_capes_programas_distintos(tmp_path, municipios, monkeypatch):
    csv = "AN_BASE;CD_PROGRAMA_IES;NM_AREA_AVALIACAO;NM_MUNICIPIO_PROGRAMA_IES;SG_UF_PROGRAMA_IES\n" \
          "2023;40001016034P2;CIÊNCIA DA COMPUTAÇÃO;CURITIBA;PR\n2023;40001016034P2;CIÊNCIA DA COMPUTAÇÃO;CURITIBA;PR\n" \
          "2023;40001016999P1;ECONOMIA;CURITIBA;PR\n2023;33002010001P0;ECONOMIA;SÃO PAULO;SP\n2023;1;ECONOMIA;LUGAR NENHUM;SP\n"
    monkeypatch.setattr(capes_ppg, "listar_csvs", lambda: [("prog2023", "http://x/p.csv")])
    monkeypatch.setattr(capes_ppg, "baixar", lambda url, reutilizar=True: zipar(tmp_path, "capes", csv))
    obs, escopo = capes_ppg.coletar(municipios)
    d = {(o.entidade_chave, o.segmento): o.valor for o in obs}
    assert d[("4106902", "")] == 2 and d[("4106902", "computacao")] == 1
    assert d[("3550308", "")] == 1 and ("3550308", "computacao") not in d
    assert escopo["sem_municipio"] == 1


def test_simular_nao_grava(monkeypatch, municipios):
    from app.services.series_municipais.postgrest import Observacao
    class Mod:
        ID = "x"; JOB = "j"; VERSAO = "v"; INDICADORES = []
        @staticmethod
        def coletar(m, amostra=None):
            return [Observacao("mun.x", "4106902", "2024-12-31", 1.0)], {"completo": True}
    monkeypatch.setitem(registro.COLETORES, "x", Mod)
    r = registro.executar_coleta("x", simular=True, sb=SbFalso())
    assert r["simulado"] and r["observacoes"] == 1 and r["indicadores"] == ["mun.x"]


# ---- OpenAlex (coautoria): sem rede, com transporte falso -------------------
def test_openalex_uf_da_regiao():
    from app.services.series_municipais.coletores import openalex_coautoria as oa
    assert oa.uf_da_regiao("São Paulo") == "SP"
    assert oa.uf_da_regiao("State of Paraná") == "PR"
    assert oa.uf_da_regiao("Federal District") == "DF"
    assert oa.uf_da_regiao(None) is None
    assert oa.uf_da_regiao("Lisboa") is None


def test_openalex_pares_simetricos_e_limiar(monkeypatch):
    import httpx
    from app.services.series_municipais.coletores import openalex_coautoria as oa

    inst = {"results": [
        {"id": "https://openalex.org/I1", "display_name": "UFPR", "type": "education", "geo": {"region": "Paraná", "city": "Curitiba"}, "works_count": 1000},
        {"id": "https://openalex.org/I2", "display_name": "USP", "type": "education", "geo": {"region": "São Paulo", "city": "São Paulo"}, "works_count": 9000},
        {"id": "https://openalex.org/I3", "display_name": "Embrapa", "type": "facility", "geo": {}, "works_count": 500},
    ], "meta": {"next_cursor": None}}
    grupos = {
        "I1": [{"key": "https://openalex.org/I2", "count": 5}, {"key": "https://openalex.org/I3", "count": 2}, {"key": "https://openalex.org/I9", "count": 50}],
        "I2": [{"key": "https://openalex.org/I1", "count": 7}],
        "I3": [{"key": "https://openalex.org/I1", "count": 2}],
    }

    def handler(req: httpx.Request) -> httpx.Response:
        if req.url.path == "/institutions":
            return httpx.Response(200, json=inst)
        oid = req.url.params["filter"].split("lineage:")[1].split(",")[0]
        return httpx.Response(200, json={"group_by": grupos[oid]})

    monkeypatch.setattr(oa, "PAUSA", 0)
    real = httpx.Client
    monkeypatch.setattr(oa.httpx, "Client", lambda **kw: real(transport=httpx.MockTransport(handler), **kw))
    linhas, escopo = oa.coletar_interacoes(ano_inicio=2020, ano_fim=2020)
    assert escopo["instituicoes"] == 3
    # I1–I2 fica com o maior dos dois lados (7); I1–I3 (2) cai no limiar; I9 não é instituição listada.
    assert len(linhas) == 1
    l = linhas[0]
    assert l["id"] == "openalex|2020|I1|I2" and l["metadados"]["peso"] == 7
    assert (l["origem_uf"], l["destino_uf"]) == ("PR", "SP") and l["dimensao"] == "resultado"


# ---- Transporte por UF (ANTAQ, ANAC): zips sintéticos ----------------------
def test_antaq_soma_por_uf(tmp_path, municipios):
    from app.services.series_municipais.coletores import antaq_portos as ap
    atr = tmp_path / "2020Atracacao.zip"
    with zipfile.ZipFile(atr, "w") as z:
        z.writestr("2020Atracacao.txt", "IDAtracacao;Porto Atracação;UF\n1;Santos;SP\n2;Paranaguá;PR\n3;Fora;XX\n".encode("latin-1"))
    carga = tmp_path / "2020Carga.zip"
    with zipfile.ZipFile(carga, "w") as z:
        z.writestr("2020Carga.txt", "IDCarga;IDAtracacao;VLPesoCargaBruta\n10;1;1000,5\n11;1;2000\n12;2;300\n13;3;999\n14;9;5\n".encode("latin-1"))
    soma = ap._ano(atr, carga, None)
    assert soma == {"SP": 3000.5, "PR": 300.0}


def test_anac_passageiros_por_uf(tmp_path, monkeypatch, municipios):
    from app.services.series_municipais.coletores import anac_aero as an
    z = tmp_path / "basica2020-01.zip"
    with zipfile.ZipFile(z, "w") as zf:
        zf.writestr("basica2020-01.csv", "sg_uf_origem;nr_passag_pagos;nr_passag_gratis\nPR;100;5\nPR;50;0\nSP;10;1\nZZ;7;7\n".encode("utf-8"))
    monkeypatch.setattr(an, "ANO_INICIO", 2020)
    monkeypatch.setattr(an, "baixar", lambda url: z if url.endswith("basica2020-01.zip") else (_ for _ in ()).throw(RuntimeError("404")))
    import datetime as dt
    class D(dt.date):
        @classmethod
        def today(cls): return cls(2021, 6, 1)
    monkeypatch.setattr(an, "date", D)
    obs, escopo = an.coletar(municipios)
    por = {(o.entidade_chave, o.periodo_referencia): o.valor for o in obs}
    assert por[("PR", "2020-01-01")] == 155 and por[("SP", "2020-01-01")] == 11
    assert all(o.entidade_tipo == "uf" for o in obs) and len(escopo["faltas"]) == 11 and not escopo["completo"]
