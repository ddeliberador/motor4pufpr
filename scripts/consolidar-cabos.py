import json
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

with open(BASE / "cable-geo.json") as f:
    cables_fc = json.load(f)
with open(BASE / "landing-point-geo.json") as f:
    points_fc = json.load(f)

# Cabos cujo traçado passa pelo bounding box do Brasil (aproximação dos que aterram/passam pelo território)
cables = []
for feat in cables_fc["features"]:
    props = feat["properties"]
    geom = feat["geometry"]
    if geom["type"] != "MultiLineString":
        continue
    if not any(line_in_bbox(line) for line in geom["coordinates"]):
        continue
    cables.append({
        "id": props["id"],
        "name": props["name"],
        "color": props.get("color") or "#f97316",
        "feature_id": props.get("feature_id"),
        "geometry": geom,
    })

# Landing points dentro do bounding box do Brasil
points = []
for feat in points_fc["features"]:
    props = feat["properties"]
    lon, lat = feat["geometry"]["coordinates"]
    if not in_bbox(lon, lat):
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
