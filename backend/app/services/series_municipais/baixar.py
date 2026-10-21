"""Download em disco (streaming) com cache por URL, para arquivos de centenas de MB."""
from __future__ import annotations

import hashlib
import logging
import os
import tempfile
import zipfile
from pathlib import Path
from typing import IO, Iterator

import httpx

logger = logging.getLogger(__name__)
UA = {"User-Agent": "Motor4PUFPR/1.0 (motorinovacao.com.br; séries municipais)"}
PASTA = Path(os.environ.get("SERIES_MUNICIPAIS_CACHE", os.path.join(tempfile.gettempdir(), "series-municipais")))


def baixar(url: str, reutilizar: bool = True) -> Path:
    PASTA.mkdir(parents=True, exist_ok=True)
    destino = PASTA / (hashlib.sha1(url.encode()).hexdigest()[:16] + "_" + url.rsplit("/", 1)[-1].split("?")[0][:80])
    if reutilizar and destino.exists() and destino.stat().st_size > 0:
        logger.info("cache: %s (%d MB)", destino.name, destino.stat().st_size >> 20)
        return destino
    parcial = destino.with_suffix(destino.suffix + ".parte")
    logger.info("baixando %s", url)
    with httpx.stream("GET", url, headers=UA, follow_redirects=True, timeout=httpx.Timeout(60.0, read=600.0)) as r:
        if r.status_code != 200:
            raise RuntimeError(f"{url}: HTTP {r.status_code}")
        with open(parcial, "wb") as f:
            for pedaco in r.iter_bytes(1 << 20):
                f.write(pedaco)
    parcial.replace(destino)
    logger.info("baixado %s (%d MB)", destino.name, destino.stat().st_size >> 20)
    return destino


def abrir_csvs(caminho: Path, padrao: str = ".csv") -> Iterator[tuple[str, IO[bytes]]]:
    """Itera (nome, fluxo binário) dos CSVs: direto, ou de dentro de um ZIP."""
    if zipfile.is_zipfile(caminho):
        with zipfile.ZipFile(caminho) as z:
            for info in z.infolist():
                if info.filename.lower().endswith(padrao):
                    with z.open(info) as f:
                        yield info.filename, f
    else:
        with open(caminho, "rb") as f:
            yield caminho.name, f
