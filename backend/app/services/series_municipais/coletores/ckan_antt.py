"""Descoberta de recursos CSV no portal de dados abertos da ANTT (CKAN)."""
from __future__ import annotations

import os
import re

import httpx

from ..baixar import UA

CKAN = os.environ.get("ANTT_CKAN_URL", "https://dados.antt.gov.br/api/3/action")


def recursos_csv(pacote: str) -> list[dict]:
    """Recursos CSV de um conjunto (id do CKAN), com nome, url e ano inferido do nome quando houver."""
    r = httpx.get(f"{CKAN}/package_show", params={"id": pacote}, headers=UA, timeout=60)
    if r.status_code != 200:
        raise RuntimeError(f"CKAN da ANTT ({pacote}): HTTP {r.status_code}")
    saida = []
    for rec in r.json().get("result", {}).get("resources", []):
        fmt = str(rec.get("format", "")).upper()
        url = str(rec.get("url", ""))
        if fmt not in ("CSV", "ZIP") and not url.lower().endswith((".csv", ".zip")):
            continue
        nome = f"{rec.get('name', '')} {url.rsplit('/', 1)[-1]}"
        anos = re.findall(r"\b(20[0-4]\d)\b", nome)
        saida.append({"nome": rec.get("name"), "url": url, "ano": int(anos[0]) if anos else None})
    return saida
