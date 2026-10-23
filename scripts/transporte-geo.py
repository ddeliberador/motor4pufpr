#!/usr/bin/env python3
"""
Gera public/transporte/{aeroportos,portos,ferrovias,rodovias}.geojson, a camada
de transporte da visão regional do Mapa.

Fontes (todas de acesso livre):
- Aeroportos: OurAirports (airports.csv, domínio público), só large/medium do Brasil.
- Portos: scripts/portos-organizados.json (portos organizados ANTAQ, coordenadas
  aproximadas cadastradas manualmente).
- Ferrovias e rodovias: Natural Earth 1:10m (ne_10m_railroads, ne_10m_roads,
  domínio público), recortadas pelo Brasil e marcadas com a UF do ponto médio.
  Escala 1:10m: serve à visão regional, não a detalhe municipal.

Uso: python3 scripts/transporte-geo.py [pasta-de-cache]
"""
from __future__ import annotations
import csv, json, sys, urllib.request
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
CACHE = Path(sys.argv[1]) if len(sys.argv) > 1 else RAIZ / ".cache-transporte"
SAIDA = RAIZ / "public" / "transporte"
NE = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/"
FONTES = {
    "airports.csv": "https://raw.githubusercontent.com/davidmegginson/ourairports-data/main/airports.csv",
    "ne_10m_railroads.geojson": NE + "ne_10m_railroads.geojson",
    "ne_10m_roads.geojson": NE + "ne_10m_roads.geojson",
}
BBOX = (-74.2, -34.0, -33.6, 5.6)


def baixar(nome: str) -> Path:
    CACHE.mkdir(parents=True, exist_ok=True)
    p = CACHE / nome
    if not p.exists():
        print("baixando", nome)
        urllib.request.urlretrieve(FONTES[nome], p)
    return p


def poligonos(f):
    g = f["geometry"]
    return g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]


def dentro(x, y, anel):
    ins, j = False, len(anel) - 1
    for i in range(len(anel)):
        xi, yi = anel[i][:2]; xj, yj = anel[j][:2]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            ins = not ins
        j = i
    return ins


class Ufs:
    def __init__(self):
        self.fs = json.load(open(RAIZ / "public" / "br-uf.geojson"))["features"]
        self.bb = {}
        for f in self.fs:
            xs = [c[0] for p in poligonos(f) for r in p for c in r]; ys = [c[1] for p in poligonos(f) for r in p for c in r]
            self.bb[f["properties"]["sigla"]] = (min(xs), min(ys), max(xs), max(ys))

    def uf(self, x, y):
        for f in self.fs:
            s = f["properties"]["sigla"]; b = self.bb[s]
            if not (b[0] <= x <= b[2] and b[1] <= y <= b[3]):
                continue
            for p in poligonos(f):
                if dentro(x, y, p[0]) and not any(dentro(x, y, h) for h in p[1:]):
                    return s
        return None


def arredondar(coords, casas=4):
    if isinstance(coords[0], (int, float)):
        return [round(coords[0], casas), round(coords[1], casas)]
    return [arredondar(c, casas) for c in coords]


def simplificar(linha, tol=0.01):
    """Douglas-Peucker simples (graus) para enxugar as linhas do Natural Earth."""
    if len(linha) < 3:
        return linha
    def dist(p, a, b):
        dx, dy = b[0] - a[0], b[1] - a[1]
        if dx == dy == 0:
            return ((p[0] - a[0]) ** 2 + (p[1] - a[1]) ** 2) ** 0.5
        t = max(0, min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)))
        return ((p[0] - a[0] - t * dx) ** 2 + (p[1] - a[1] - t * dy) ** 2) ** 0.5
    i, dmax = 0, 0.0
    for k in range(1, len(linha) - 1):
        d = dist(linha[k], linha[0], linha[-1])
        if d > dmax:
            i, dmax = k, d
    if dmax > tol:
        return simplificar(linha[: i + 1], tol)[:-1] + simplificar(linha[i:], tol)
    return [linha[0], linha[-1]]


def fc(features):
    return {"type": "FeatureCollection", "features": features}


def gravar(nome, features, meta):
    SAIDA.mkdir(parents=True, exist_ok=True)
    d = fc(features); d["meta"] = meta
    (SAIDA / nome).write_text(json.dumps(d, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(nome, len(features), "feições,", (SAIDA / nome).stat().st_size // 1024, "KB")


def main():
    ufs = Ufs()
    # Aeroportos
    feats = []
    for r in csv.DictReader(open(baixar("airports.csv"), encoding="utf-8")):
        if r["iso_country"] != "BR" or r["type"] not in ("large_airport", "medium_airport"):
            continue
        feats.append({"type": "Feature", "geometry": {"type": "Point", "coordinates": [round(float(r["longitude_deg"]), 4), round(float(r["latitude_deg"]), 4)]},
                      "properties": {"id": r["ident"], "nome": r["name"], "uf": r["iso_region"].split("-")[-1], "iata": r["iata_code"] or None,
                                     "porte": "grande" if r["type"] == "large_airport" else "medio", "regular": r["scheduled_service"] == "yes", "municipio": r["municipality"] or None}})
    gravar("aeroportos.geojson", feats, {"fonte": "OurAirports (airports.csv), domínio público", "fonte_url": "https://ourairports.com/data/", "recorte": "Brasil, aeroportos large e medium"})
    # Portos
    cad = json.load(open(RAIZ / "scripts" / "portos-organizados.json"))
    feats = [{"type": "Feature", "geometry": {"type": "Point", "coordinates": [p["lon"], p["lat"]]},
              "properties": {"id": f"porto-{i}", "nome": p["nome"], "uf": p["uf"], "tipo": p["tipo"], "aproximado": True}} for i, p in enumerate(cad["portos"])]
    gravar("portos.geojson", feats, {"fonte": cad["fonte"], "fonte_url": "https://www.gov.br/antaq/"})
    # Ferrovias e rodovias (Natural Earth)
    for arq, saida, filtro, campos in [
        ("ne_10m_railroads.geojson", "ferrovias.geojson", lambda p: True, lambda p: {"multiplas": bool(p.get("mult_track")), "eletrica": bool(p.get("electric"))}),
        ("ne_10m_roads.geojson", "rodovias.geojson", lambda p: p.get("sov_a3") in ("BRA", None), lambda p: {"nome": p.get("name"), "tipo": p.get("type"), "expressa": bool(p.get("expressway"))}),
    ]:
        feats = []
        for x in json.load(open(baixar(arq)))["features"]:
            g = x["geometry"]; linhas = g["coordinates"] if g["type"] == "MultiLineString" else [g["coordinates"]]
            pts = [c for l in linhas for c in l]
            if not pts or not any(BBOX[0] <= c[0] <= BBOX[2] and BBOX[1] <= c[1] <= BBOX[3] for c in pts) or not filtro(x["properties"]):
                continue
            mid = pts[len(pts) // 2]
            uf = ufs.uf(mid[0], mid[1]) or ufs.uf(pts[0][0], pts[0][1]) or ufs.uf(pts[-1][0], pts[-1][1])
            if not uf:
                continue
            geom = {"type": "MultiLineString", "coordinates": [arredondar(simplificar(l)) for l in linhas]}
            feats.append({"type": "Feature", "geometry": geom, "properties": {"uf": uf, **campos(x["properties"])}})
        gravar(saida, feats, {"fonte": f"Natural Earth 1:10m ({arq.replace('.geojson', '')}), domínio público", "fonte_url": "https://www.naturalearthdata.com/", "recorte": "Brasil; UF pelo ponto médio do trecho; simplificado 0,01°"})


if __name__ == "__main__":
    main()
