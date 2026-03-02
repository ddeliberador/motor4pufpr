"""
MOTOR 4P UFPR - Entity Resolution Engine
Normalização e linkage de nomes de instituições entre bases públicas

Baseado em técnicas do BR/ACC (World Open Graph) para entity resolution
usando normalização textual e matching fuzzy.
"""
import re
import unicodedata
from typing import Dict, List, Optional, Tuple


# ===== Dicionário de aliases conhecidos =====
INSTITUTION_ALIASES: Dict[str, List[str]] = {
    "UFPR": ["Universidade Federal do Paraná", "Federal University of Paraná", "Univ Fed Parana", "UFPR"],
    "USP": ["Universidade de São Paulo", "University of São Paulo", "Univ Sao Paulo", "USP"],
    "UNICAMP": ["Universidade Estadual de Campinas", "University of Campinas", "UNICAMP"],
    "UFRJ": ["Universidade Federal do Rio de Janeiro", "Federal University of Rio de Janeiro", "UFRJ"],
    "UFRGS": ["Universidade Federal do Rio Grande do Sul", "Federal University of Rio Grande do Sul", "UFRGS"],
    "UFMG": ["Universidade Federal de Minas Gerais", "Federal University of Minas Gerais", "UFMG"],
    "UFSC": ["Universidade Federal de Santa Catarina", "Federal University of Santa Catarina", "UFSC"],
    "UNB": ["Universidade de Brasília", "University of Brasília", "UnB"],
    "UNESP": ["Universidade Estadual Paulista", "São Paulo State University", "UNESP"],
    "UFPE": ["Universidade Federal de Pernambuco", "Federal University of Pernambuco", "UFPE"],
    "UFC": ["Universidade Federal do Ceará", "Federal University of Ceará", "UFC"],
    "UFBA": ["Universidade Federal da Bahia", "Federal University of Bahia", "UFBA"],
    "UFPA": ["Universidade Federal do Pará", "Federal University of Pará", "UFPA"],
    "EMBRAPA": ["Empresa Brasileira de Pesquisa Agropecuária", "Embrapa", "EMBRAPA"],
    "FIOCRUZ": ["Fundação Oswaldo Cruz", "Fiocruz", "FIOCRUZ", "Oswaldo Cruz Foundation"],
    "INPE": ["Instituto Nacional de Pesquisas Espaciais", "National Institute for Space Research", "INPE"],
    "CNPEM": ["Centro Nacional de Pesquisa em Energia e Materiais", "CNPEM"],
    "PETROBRAS": ["Petróleo Brasileiro S.A.", "Petrobras", "PETROBRAS"],
    "WEG": ["WEG S.A.", "WEG Equipamentos Elétricos", "WEG"],
    "EMBRAER": ["Embraer S.A.", "Embraer", "EMBRAER"],
    "VALE": ["Vale S.A.", "Vale", "VALE", "Companhia Vale do Rio Doce"],
}


def _normalize_text(text: str) -> str:
    """Remove acentos, converte para minúsculo, remove pontuação"""
    if not text:
        return ""
    # Remove acentos
    nfkd = unicodedata.normalize("NFKD", text)
    ascii_text = nfkd.encode("ASCII", "ignore").decode("ASCII")
    # Lowercase e remove pontuação
    cleaned = re.sub(r"[^a-z0-9\s]", "", ascii_text.lower())
    # Normaliza espaços
    return re.sub(r"\s+", " ", cleaned).strip()


def _similarity_score(a: str, b: str) -> float:
    """Calcula similaridade entre dois textos normalizados (Jaccard sobre tokens)"""
    if not a or not b:
        return 0.0
    tokens_a = set(a.split())
    tokens_b = set(b.split())
    if not tokens_a or not tokens_b:
        return 0.0
    intersection = tokens_a & tokens_b
    union = tokens_a | tokens_b
    return len(intersection) / len(union)


def resolve_institution(name: str, threshold: float = 0.5) -> Tuple[str, str, float]:
    """
    Resolve o nome de uma instituição para sua forma canônica.
    
    Returns:
        Tuple (canonical_id, canonical_name, confidence)
    """
    if not name:
        return ("", name, 0.0)
    
    normalized = _normalize_text(name)
    
    best_match = ("", name, 0.0)
    
    for canonical_id, aliases in INSTITUTION_ALIASES.items():
        for alias in aliases:
            norm_alias = _normalize_text(alias)
            
            # Exact match
            if normalized == norm_alias:
                return (canonical_id, aliases[0], 1.0)
            
            # Containment check
            if norm_alias in normalized or normalized in norm_alias:
                score = 0.85
                if score > best_match[2]:
                    best_match = (canonical_id, aliases[0], score)
                continue
            
            # Jaccard similarity
            score = _similarity_score(normalized, norm_alias)
            if score > best_match[2] and score >= threshold:
                best_match = (canonical_id, aliases[0], score)
    
    return best_match


def resolve_institutions_batch(names: List[str], threshold: float = 0.5) -> Dict[str, Tuple[str, str, float]]:
    """
    Resolve uma lista de nomes de instituições em batch.
    
    Returns:
        Dict mapping original_name -> (canonical_id, canonical_name, confidence)
    """
    return {name: resolve_institution(name, threshold) for name in names}


def find_cross_base_matches(
    openalex_institutions: List[str],
    pncp_organs: List[str],
    capes_programs: List[str],
) -> Dict[str, Dict[str, List[str]]]:
    """
    Identifica matches entre instituições de diferentes bases.
    
    Returns:
        Dict de canonical_id -> {base: [nomes originais]}
    """
    matches: Dict[str, Dict[str, List[str]]] = {}
    
    for source_name, items in [
        ("openalex", openalex_institutions),
        ("pncp", pncp_organs),
        ("capes", capes_programs),
    ]:
        for item in items:
            canonical_id, canonical_name, confidence = resolve_institution(item)
            if canonical_id and confidence >= 0.5:
                if canonical_id not in matches:
                    matches[canonical_id] = {"canonical_name": [canonical_name], "sources": {}}
                if source_name not in matches[canonical_id]["sources"]:
                    matches[canonical_id]["sources"][source_name] = []
                matches[canonical_id]["sources"][source_name].append(item)
    
    # Filtra apenas entidades com presença em 2+ bases
    return {
        k: v for k, v in matches.items()
        if len(v.get("sources", {})) >= 2
    }
