"""
MOTOR 4P UFPR - INPI / RPI Connector
Revista da Propriedade Industrial (RPI) — despachos oficiais de patentes,
programas de computador e marcas publicados semanalmente pelo INPI.

Não existe API REST no INPI. A fonte oficial e legível por máquina é o pacote
semanal da RPI em XML, distribuído em ZIP. Estrutura CONFIRMADA COM DOWNLOAD
REAL DA RPI 2905 (publicada em 08/09/2026):

  Página de índice: https://revistas.inpi.gov.br/rpi/
  Downloads:        https://revistas.inpi.gov.br/txt/{PREFIXO}{NUMERO}.zip

    P{n}.zip   -> Patente_{n}_{ddmmaaaa}.xml   (5,3 MB | 4.305 despachos)
    PC{n}.zip  -> Programa_{n}_{ddmmaaaa}.xml  (362 KB |   182 despachos)
    RM{n}.zip  -> RM{n}.xml                    ( 70 MB | marcas)
    CT{n}.zip  -> contratos de tecnologia (TXT)

  XML de patentes:
    <revista numero dataPublicacao diretoria="Patente">
      <despacho>
        <codigo>1.1</codigo><titulo>...</titulo>
        <processo-patente>
          <numero inid="21">BR 11 2026 009242-4</numero>
          <titulo inid="54">...</titulo>
          <data-deposito inid="22">...</data-deposito>
          <classificacao-internacional-lista>
            <classificacao-internacional inid="51" sequencia="1" ano="2006.01">C12N 15/62</...>
          </...>
          <titular-lista><titular><nome-completo>..</nome-completo>
              <endereco><uf>..</uf><pais><sigla>BR</sigla></pais></endereco></titular></...>
          <inventor-lista><inventor><nome-completo>..</nome-completo></inventor></...>
          <prioridade-unionista-lista>, <pedido-internacional>, <publicacao-internacional>
        </processo-patente>
      </despacho>

  XML de programas (diretoria="Programa"): <processo-programa> com <numero>,
  <titulo>, <titularLista>/<titular>/<nome>, <criadorLista>, <linguagemLista>,
  <campoAplicacaoLista>, <tipoProgramaLista>, <dataCriacao>.

Como a RPI tem centenas de MB por ano, o parsing é feito por streaming
(iterparse) direto do ZIP em memória, e o filtro de IPC/termo é aplicado
durante a varredura. Falhas de download ou de parsing são propagadas.
"""
import io
import logging
import re
import unicodedata
import xml.etree.ElementTree as ET
import zipfile
from typing import Any, Dict, Iterable, List, Optional

from .base import BaseConnector

logger = logging.getLogger(__name__)

INPI_RPI_INDEX = "https://revistas.inpi.gov.br/rpi/"
INPI_TXT_BASE = "https://revistas.inpi.gov.br/txt"

# Prefixos de arquivo por diretoria da RPI
RPI_SECTIONS: Dict[str, str] = {
    "patente": "P",
    "programa": "PC",
    "marca": "RM",
    "contrato": "CT",
}

# Classificações IPC de interesse para tecnologias digitais / IA.
# G06N = modelos computacionais (redes neurais, aprendizado de máquina)
IPC_AI = ("G06N", "G06V", "G06T", "G06F", "G06Q", "G06K")


def _normalize(text: str) -> str:
    if not text:
        return ""
    nfkd = unicodedata.normalize("NFKD", str(text))
    return "".join(c for c in nfkd if not unicodedata.combining(c)).lower()


def _text(node: Optional[ET.Element], path: str) -> str:
    if node is None:
        return ""
    found = node.find(path)
    return (found.text or "").strip() if found is not None and found.text else ""


class INPIRPIConnector(BaseConnector):
    """Despachos oficiais da Revista da Propriedade Industrial (INPI)."""

    def __init__(self):
        super().__init__()
        self.base_url = INPI_TXT_BASE

    def get_source_name(self) -> str:
        return "INPI - Revista da Propriedade Industrial (RPI)"

    # ------------------------------------------------------------------ #
    # Descoberta de edições
    # ------------------------------------------------------------------ #

    async def list_editions(self, limit: int = 12) -> List[Dict[str, Any]]:
        """
        Edições disponíveis na página oficial da RPI, mais recente primeiro.
        Lê os links `/txt/{PREFIXO}{NUMERO}.zip` presentes no HTML.
        """
        html = await self.get_text(INPI_RPI_INDEX, use_cache=True)
        numbers = sorted(
            {int(n) for n in re.findall(r"/txt/(?:P|PC|RM|CT)(\d{3,5})\.zip", html)},
            reverse=True,
        )
        if not numbers:
            # sem regressão silenciosa: a página mudou de formato
            raise ValueError("Nenhuma edição da RPI encontrada na página do INPI")
        return [
            {
                "number": n,
                "downloads": {
                    section: f"{INPI_TXT_BASE}/{prefix}{n}.zip"
                    for section, prefix in RPI_SECTIONS.items()
                },
            }
            for n in numbers[:limit]
        ]

    async def get_latest_edition_number(self) -> int:
        editions = await self.list_editions(limit=1)
        return editions[0]["number"]

    # ------------------------------------------------------------------ #
    # Download + parsing
    # ------------------------------------------------------------------ #

    async def _download_xml_members(self, section: str, edition: int) -> List[bytes]:
        prefix = RPI_SECTIONS.get(section)
        if not prefix:
            raise ValueError(
                f"Seção inválida: {section}. Válidas: {list(RPI_SECTIONS)}"
            )
        url = f"{INPI_TXT_BASE}/{prefix}{edition}.zip"
        logger.info(f"INPI RPI: baixando {url}")
        raw = await self.get_bytes(url, use_cache=False)
        with zipfile.ZipFile(io.BytesIO(raw)) as zf:
            xmls = [n for n in zf.namelist() if n.lower().endswith(".xml")]
            if not xmls:
                raise ValueError(
                    f"RPI {edition}/{section}: pacote sem XML (apenas {zf.namelist()})"
                )
            return [zf.read(name) for name in xmls]

    def _parse_patent_dispatch(self, despacho: ET.Element) -> Dict[str, Any]:
        proc = despacho.find("processo-patente")
        ipcs = [
            (c.text or "").strip()
            for c in despacho.iter("classificacao-internacional")
            if c.text
        ]
        titulares = [
            {
                "name": _text(t, "nome-completo"),
                "uf": _text(t, "endereco/uf"),
                "country": _text(t, "endereco/pais/sigla"),
            }
            for t in despacho.iter("titular")
        ]
        inventores = [
            _text(i, "nome-completo") for i in despacho.iter("inventor")
        ]
        priorities = [
            {
                "country": _text(p, "sigla-pais"),
                "number": _text(p, "numero-prioridade"),
                "date": _text(p, "data-prioridade"),
            }
            for p in despacho.iter("prioridade-unionista")
        ]
        return {
            "type": "patente",
            "dispatch_code": _text(despacho, "codigo"),
            "dispatch_title": _text(despacho, "titulo"),
            "process_number": _text(proc, "numero"),
            "title": _text(proc, "titulo"),
            "filing_date": _text(proc, "data-deposito"),
            "ipc": ipcs,
            "ipc_sections": sorted({c[:4] for c in ipcs if c}),
            "holders": titulares,
            "inventors": inventores,
            "priorities": priorities,
            "pct_number": _text(proc, "pedido-internacional/numero-pct"),
            "wipo_number": _text(proc, "publicacao-internacional/numero-ompi"),
            "comment": _text(despacho, "comentario"),
            "source": self.get_source_name(),
        }

    def _parse_program_dispatch(self, despacho: ET.Element) -> Dict[str, Any]:
        proc = despacho.find("processo-programa")
        return {
            "type": "programa_de_computador",
            "dispatch_code": _text(despacho, "codigo"),
            "dispatch_title": _text(despacho, "titulo"),
            "process_number": _text(proc, "numero"),
            "title": _text(proc, "titulo"),
            "creation_date": _text(proc, "dataCriacao"),
            "holders": [
                {"name": _text(t, "nome") or (t.text or "").strip()}
                for t in despacho.iter("titular")
            ],
            "creators": [
                (c.findtext("nome") or c.text or "").strip()
                for c in despacho.iter("criador")
            ],
            "languages": [
                (l.text or "").strip() for l in despacho.iter("linguagem") if l.text
            ],
            "application_fields": [
                (a.text or "").strip() for a in despacho.iter("campoAplicacao") if a.text
            ],
            "program_types": [
                (p.text or "").strip() for p in despacho.iter("tipoPrograma") if p.text
            ],
            "comment": _text(despacho, "comentario"),
            "source": self.get_source_name(),
        }

    def _iter_dispatches(
        self, xml_bytes: bytes, section: str
    ) -> Iterable[Dict[str, Any]]:
        """Streaming: libera cada <despacho> após parsear (RPI de marcas tem 70 MB)."""
        parser = ET.iterparse(io.BytesIO(xml_bytes), events=("end",))
        edition: Dict[str, Any] = {}
        for _, elem in parser:
            if elem.tag == "revista":
                edition = dict(elem.attrib)
            if elem.tag != "despacho":
                continue
            if section == "patente":
                record = self._parse_patent_dispatch(elem)
            elif section == "programa":
                record = self._parse_program_dispatch(elem)
            else:
                record = {
                    "type": section,
                    "dispatch_code": _text(elem, "codigo"),
                    "dispatch_title": _text(elem, "titulo"),
                    "raw_xml": ET.tostring(elem, encoding="unicode")[:4000],
                    "source": self.get_source_name(),
                }
            record["rpi_number"] = edition.get("numero")
            record["rpi_date"] = edition.get("dataPublicacao")
            yield record
            elem.clear()

    # ------------------------------------------------------------------ #
    # API pública do conector
    # ------------------------------------------------------------------ #

    async def search(self, query: str, **kwargs) -> List[Dict[str, Any]]:
        return await self.search_dispatches(query=query, **kwargs)

    async def search_dispatches(
        self,
        query: Optional[str] = None,
        section: str = "patente",
        edition: Optional[int] = None,
        ipc_prefixes: Optional[Iterable[str]] = None,
        uf: Optional[str] = None,
        holder: Optional[str] = None,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """
        Despachos de uma edição da RPI, filtrados no cliente.

        Args:
            query: termo livre casado contra título, titulares e inventores.
            section: patente | programa | marca | contrato.
            edition: número da RPI (padrão: a mais recente publicada).
            ipc_prefixes: ex. ("G06N","G06V") — só para patentes.
            uf: filtra por UF do titular (patentes).
            holder: filtra por nome de titular.
            limit: máximo de despachos retornados.
        """
        edition = edition or await self.get_latest_edition_number()
        needle = _normalize(query) if query else ""
        tokens = [t for t in needle.split() if t]
        prefixes = tuple(p.upper() for p in ipc_prefixes) if ipc_prefixes else None
        uf_up = uf.upper() if uf else None
        holder_n = _normalize(holder) if holder else ""

        results: List[Dict[str, Any]] = []
        for xml_bytes in await self._download_xml_members(section, edition):
            for record in self._iter_dispatches(xml_bytes, section):
                if prefixes:
                    if not any(
                        c.replace(" ", "").upper().startswith(prefixes)
                        for c in record.get("ipc", [])
                    ):
                        continue
                if uf_up and not any(
                    (h.get("uf") or "").upper() == uf_up for h in record.get("holders", [])
                ):
                    continue
                if holder_n and not any(
                    holder_n in _normalize(h.get("name", "")) for h in record.get("holders", [])
                ):
                    continue
                if tokens:
                    haystack = _normalize(
                        " ".join(
                            [record.get("title", ""), record.get("dispatch_title", "")]
                            + [h.get("name", "") for h in record.get("holders", [])]
                            + list(record.get("inventors", []) or [])
                            + list(record.get("application_fields", []) or [])
                        )
                    )
                    if not all(t in haystack for t in tokens):
                        continue
                results.append(record)
                if len(results) >= limit:
                    return results
        return results

    async def search_ai_patents(
        self, edition: Optional[int] = None, limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Patentes das classes IPC de computação/IA (G06N, G06V, G06T, G06F, G06Q, G06K)."""
        return await self.search_dispatches(
            section="patente", edition=edition, ipc_prefixes=IPC_AI, limit=limit
        )

    async def search_software_registrations(
        self, query: Optional[str] = None, edition: Optional[int] = None, limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Registros de programa de computador (linguagem, campo de aplicação, titular)."""
        return await self.search_dispatches(
            query=query, section="programa", edition=edition, limit=limit
        )

    async def ipc_statistics(
        self, edition: Optional[int] = None, top: int = 30
    ) -> List[Dict[str, Any]]:
        """Distribuição de subclasses IPC (4 dígitos) na edição — insumo do índice tecnológico."""
        from collections import Counter

        edition = edition or await self.get_latest_edition_number()
        counter: Counter = Counter()
        total = 0
        for xml_bytes in await self._download_xml_members("patente", edition):
            for record in self._iter_dispatches(xml_bytes, "patente"):
                total += 1
                for code in record.get("ipc_sections", []):
                    counter[code] += 1
        return [
            {
                "ipc_subclass": code,
                "dispatches": count,
                "share_pct": round(100 * count / total, 2) if total else 0.0,
                "rpi_number": edition,
            }
            for code, count in counter.most_common(top)
        ]
