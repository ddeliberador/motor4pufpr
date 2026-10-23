"""Leitura tolerante de CSV grande: separador e codificação detectados, cabeçalho casado por candidatos."""
from __future__ import annotations

import csv
import io
import logging
import re
import unicodedata
from typing import IO, Callable, Iterator

logger = logging.getLogger(__name__)


def _norm(s: str) -> str:
    return unicodedata.normalize("NFD", s).encode("ascii", "ignore").decode().lower().strip().strip('"')


def abrir_texto(fluxo: IO[bytes], codificacoes=("utf-8-sig", "latin-1")) -> io.TextIOWrapper:
    inicio = fluxo.read(1 << 16)
    for cod in codificacoes:
        try:
            inicio.decode(cod)
            break
        except UnicodeDecodeError:
            continue
    else:
        cod = "latin-1"
    # Reconstrói o fluxo com o pedaço já lido na frente.
    class _Concat(io.RawIOBase):
        def __init__(self):
            self.cabeca = io.BytesIO(inicio)
        def readable(self):
            return True
        def readinto(self, b):
            n = self.cabeca.readinto(b)
            if n:
                return n
            dado = fluxo.read(len(b))
            b[: len(dado)] = dado
            return len(dado)
    return io.TextIOWrapper(io.BufferedReader(_Concat(), 1 << 20), encoding=cod, errors="replace", newline="")


def detectar_separador(linha: str) -> str:
    return max([";", ",", "\t", "|"], key=linha.count)


def ler_linhas(fluxo: IO[bytes], com_cabecalho: bool = True, amostra: int | None = None) -> tuple[list[str] | None, Iterator[list[str]]]:
    texto = abrir_texto(fluxo)
    primeira = texto.readline()
    sep = detectar_separador(primeira)
    leitor = csv.reader(io.StringIO(primeira), delimiter=sep)
    cab = [_norm(c) for c in next(leitor)] if com_cabecalho else None
    corpo = csv.reader(texto, delimiter=sep)

    def gen() -> Iterator[list[str]]:
        n = 0
        if not com_cabecalho:
            yield next(csv.reader(io.StringIO(primeira), delimiter=sep))
        for linha in corpo:
            yield linha
            n += 1
            if amostra and n >= amostra:
                break
    return cab, gen()


def indice(cab: list[str], *candidatos: str, obrigatorio: bool = True) -> int | None:
    """Posição da primeira coluna cujo nome normalizado contém algum candidato (em ordem de preferência)."""
    for cand in candidatos:
        c = _norm(cand)
        for i, nome in enumerate(cab):
            if nome == c:
                return i
        for i, nome in enumerate(cab):
            if c in nome:
                return i
    if obrigatorio:
        raise RuntimeError(f"coluna não encontrada: {candidatos}; cabeçalho = {cab[:40]}")
    return None


def numero(v: str) -> float | None:
    if v is None:
        return None
    t = str(v).strip().replace(".", "").replace(",", ".") if ("," in str(v) and "." in str(v)) else str(v).strip().replace(",", ".")
    try:
        return float(t)
    except ValueError:
        return None


_ANO = re.compile(r"(?<!\d)(19\d{2}|20\d{2})(?!\d)")


def ano_de(texto: str) -> int | None:
    """Primeiro ano de quatro dígitos num texto de data ("01/2021", "2020-01", "2019")."""
    m = _ANO.search(str(texto or ""))
    return int(m.group(1)) if m else None
