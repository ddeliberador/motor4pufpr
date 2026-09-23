import json, urllib.request, urllib.error, os, time
from pathlib import Path

BASE = "https://www.submarinecablemap.com/api/v3"
OUT = Path("public/submarine-cablemap")
OUT.mkdir(parents=True, exist_ok=True)

def fetch(path):
    url = f"{BASE}{path}"
    print("fetch", url)
    req = urllib.request.Request(url, headers={
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; Motor4PUFPR/1.0; research)",
    })
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode("utf-8"))

cables = fetch("/cable/all.json")
points = fetch("/landing-point/all.json")

# landing points no território brasileiro (com margem)
br_points = [p for p in points if -75 <= float(p.get("longitude", 0)) <= -30 and -35 <= float(p.get("latitude", 0)) <= 6]
br_ids = {p["id"] for p in br_points}

# cabos que tocam o Brasil
br_cables = [c for c in cables if any(lp in br_ids for lp in c.get("landing_points", []))]
print(f"Landing points BR: {len(br_points)}; cabos BR: {len(br_cables)}")

geometries = {}
for c in br_cables:
    cid = c["id"]
    try:
        data = fetch(f"/cable/{cid}.json")
        coords = []
        if data.get("geometry", {}).get("type") == "MultiLineString":
            coords = data["geometry"]["coordinates"]
        elif data.get("geometry", {}).get("type") == "LineString":
            coords = [data["geometry"]["coordinates"]]
        elif isinstance(data.get("features"), list):
            for feat in data["features"]:
                g = feat.get("geometry")
                if not g: continue
                if g.get("type") == "LineString":
                    coords.append(g["coordinates"])
                elif g.get("type") == "MultiLineString":
                    coords.extend(g["coordinates"])
        geometries[cid] = coords
    except Exception as e:
        print(f"ignorado {cid}: {e}")
    time.sleep(0.15)

payload = {
    "cables": br_cables,
    "points": br_points,
    "geometries": geometries,
    "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    "source": "https://www.submarinecablemap.com/api/v3",
}
(OUT / "data.json").write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print("saved", OUT / "data.json", "bytes", (OUT / "data.json").stat().st_size)
