"""
Uso (no Railway ou local, com SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY):
  python -m app.services.series_municipais.cli ibge_pop
  python -m app.services.series_municipais.cli anatel_bl --amostra 200000 --simular
  python -m app.services.series_municipais.cli todas
"""
from __future__ import annotations

import argparse
import json
import logging
import sys

from .registro import COLETORES, executar_coleta


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="Séries municipais das Camadas de IA")
    p.add_argument("fonte", choices=[*COLETORES, "todas"])
    p.add_argument("--amostra", type=int, default=None, help="lê só N linhas por arquivo (teste)")
    p.add_argument("--simular", action="store_true", help="agrega e resume sem gravar")
    a = p.parse_args(argv)
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    fontes = list(COLETORES) if a.fonte == "todas" else [a.fonte]
    falhas = 0
    for f in fontes:
        try:
            print(json.dumps(executar_coleta(f, amostra=a.amostra, simular=a.simular), ensure_ascii=False, indent=2))
        except Exception as e:  # noqa: BLE001
            falhas += 1
            logging.getLogger(__name__).error("%s falhou: %s", f, e)
    return 1 if falhas else 0


if __name__ == "__main__":
    sys.exit(main())
