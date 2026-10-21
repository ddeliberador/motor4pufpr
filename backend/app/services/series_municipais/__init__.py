"""
Séries municipais para as Camadas de IA do Mapa da Inovação.

Cada coletor baixa uma base pública pesada (ANATEL, ANEEL, Receita/CNPJ,
CAPES, IBGE), agrega por município (código IBGE de 7 dígitos) e grava o
resultado na camada temporal do Supabase (`observacoes`, entidade_tipo =
'municipio'), passando por `ingest_runs` como qualquer outra coleta.

Roda no Railway (CLI `python -m app.services.series_municipais.cli` ou rota
/api/v1/coletas/municipal) porque os arquivos têm centenas de MB a alguns GB,
fora do alcance de uma Edge Function. Nada aqui é exposto ao frontend: o
Mapa lê só `v_series_validas`.
"""
from .registro import COLETORES, executar_coleta

__all__ = ["COLETORES", "executar_coleta"]
