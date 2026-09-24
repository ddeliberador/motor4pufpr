import json
import math
import urllib.request
from pathlib import Path

BASE = Path("public/submarine-cablemap")
BR = (-74.2, -33.6, -34.0, 5.6)  # lon0, lon1, lat0, lat1

def in_bbox(lon, lat):
    return BR[0] <= lon <= BR[1] and BR[2] <= lat <= BR[3]

def line_in_bbox(coords):
    for lon, lat in coords:
        if in_bbox(lon, lat):
            return True
    return False

def fetch_cable(cable_id):
    req = urllib.request.Request(
        f"https://www.submarinecablemap.com/api/v3/cable/{cable_id}.json",
        headers={
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0 (compatible; Motor4PUFPR/1.0; research)",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))

def distancia_graus(coord, destino):
    lon, lat = coord
    lon_destino, lat_destino = destino
    return math.hypot(
        (lon - lon_destino) * math.cos(math.radians(lat_destino)),
        lat - lat_destino,
    )

with open(BASE / "cable-geo.json") as f:
    cables_fc = json.load(f)
with open(BASE / "landing-point-geo.json") as f:
    points_fc = json.load(f)

# Coordenadas globais dos pontos, usadas para vincular cada traçado ao seu
# ponto de aterragem brasileiro confirmado pela API de detalhes.
point_coords = {
    feat["properties"]["id"]: feat["geometry"]["coordinates"]
    for feat in points_fc["features"]
}

# Somente cabos que possuem ponto de aterragem confirmado no Brasil. Em cabos
# com ramificações, conservamos apenas os segmentos ligados a esses pontos;
# assim, ramais exclusivamente sul-americanos a oeste não poluem o mapa.
cables = []
for feat in cables_fc["features"]:
    props = feat["properties"]
    geom = feat["geometry"]
    if geom["type"] != "MultiLineString":
        continue
    if not any(line_in_bbox(line) for line in geom["coordinates"]):
        continue
    detail = fetch_cable(props["id"])
    brazil_points = [
        point_coords[p["id"]]
        for p in detail.get("landing_points", [])
        if p.get("country") == "Brazil" and p.get("id") in point_coords
    ]
    if not brazil_points:
        continue
    connected_lines = [
        line for line in geom["coordinates"]
        if min(distancia_graus(coord, target) for coord in line for target in brazil_points) <= 1.5
    ]
    if not connected_lines:
        continue
    cables.append({
        "id": props["id"],
        "name": props["name"],
        "color": props.get("color") or "#f97316",
        "feature_id": props.get("feature_id"),
        "landing_point_ids": [
            p["id"] for p in detail.get("landing_points", [])
            if p.get("country") == "Brazil"
        ],
        "geometry": {"type": "MultiLineString", "coordinates": connected_lines},
    })

# Apenas landing points brasileiros efetivamente ligados aos cabos selecionados.
linked_point_ids = {point_id for cable in cables for point_id in cable["landing_point_ids"]}
points = []
for feat in points_fc["features"]:
    props = feat["properties"]
    lon, lat = feat["geometry"]["coordinates"]
    if props["id"] not in linked_point_ids:
        continue
    points.append({
        "id": props["id"],
        "name": props["name"],
        "latitude": lat,
        "longitude": lon,
        "is_tbd": props.get("is_tbd"),
    })

data = {
    "cables": cables,
    "points": points,
    "generated_at": "2026-09-23T00:00:00Z",
    "source": "https://www.submarinecablemap.com/api/v3",
}

(BASE / "data.json").write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(f"Salvo {BASE / 'data.json'}: {len(cables)} cabos, {len(points)} landing points")
