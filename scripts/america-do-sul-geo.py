#!/usr/bin/env python3
"""
Gera public/america-do-sul.geojson: países da América do Sul (menos o Brasil,
que tem a própria malha de UFs) e vizinhos próximos, a partir do Natural Earth
1:50m (ne_50m_admin_0_map_units, domínio público; unidades, para a Guiana
Francesa vir separada da França), para o fundo sóbrio do Mapa
mostrar o continente em volta do Brasil.

Uso: python3 scripts/america-do-sul-geo.py <ne_50m_admin_0_map_units.geojson>
"""
from __future__ import annotations
import json, sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
# Vizinhança que cabe no enquadramento do mapa: América do Sul inteira, Panamá e Caribe sul.
INCLUIR = {"South America"}
EXTRA_ISO = {"PAN", "CRI", "NIC", "TTO", "CUW", "ABW"}
EXCLUIR_ISO = {"BRA"}
NOMES_PT = {
    "Argentina": "Argentina", "Bolivia": "Bolívia", "Chile": "Chile", "Colombia": "Colômbia", "Ecuador": "Equador",
    "Guyana": "Guiana", "Paraguay": "Paraguai", "Peru": "Peru", "Suriname": "Suriname", "Uruguay": "Uruguai",
    "Venezuela": "Venezuela", "France": "Guiana Francesa", "Falkland Islands": "Ilhas Malvinas", "Panama": "Panamá",
    "Costa Rica": "Costa Rica", "Nicaragua": "Nicarágua", "Trinidad and Tobago": "Trinidad e Tobago",
}


def arred(c, n=3):
    return [arred(x, n) for x in c] if isinstance(c[0], list) else [round(c[0], n), round(c[1], n)]


def main():
    d = json.load(open(sys.argv[1]))
    feats = []
    for f in d["features"]:
        p = f["properties"]
        iso = p.get("GU_A3") or p.get("ADM0_A3")
        if iso in EXCLUIR_ISO:
            continue
        if p.get("CONTINENT") not in INCLUIR and iso not in EXTRA_ISO:
            continue
        nome = p.get("NAME_PT") or NOMES_PT.get(p.get("NAME"), p.get("NAME"))
        feats.append({"type": "Feature", "geometry": {"type": f["geometry"]["type"], "coordinates": arred(f["geometry"]["coordinates"])},
                      "properties": {"iso": iso, "nome": nome, "lon": p.get("LABEL_X"), "lat": p.get("LABEL_Y")}})
    saida = RAIZ / "public" / "america-do-sul.geojson"
    saida.write_text(json.dumps({"type": "FeatureCollection", "features": feats,
                                 "meta": {"fonte": "Natural Earth 1:50m (ne_50m_admin_0_map_units), domínio público", "fonte_url": "https://www.naturalearthdata.com/"}},
                                ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(len(feats), "países,", saida.stat().st_size // 1024, "KB:", ", ".join(sorted(x["properties"]["nome"] for x in feats)))


if __name__ == "__main__":
    main()
