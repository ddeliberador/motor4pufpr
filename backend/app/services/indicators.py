"""
MOTOR 4P UFPR - Indicators Calculator
Calculador de Indicadores Estruturais

Indicadores propostos:
- C2T: Maturidade Ciência → Tecnologia
- GT: Gargalo de Tradução
- P2C: Aderência Política → Capacidade
- CD: Concentração e Dependência Tecnológica
- ILT: Índice de Lacuna de Tradução (composto)
"""
import logging
from typing import List, Optional

from ..models.schemas import (
    ScientificIncidence,
    TechnologicalIncidence,
    ProductiveIncidence,
    InstitutionalIncidence,
    InternationalIncidence,
    StructuralIndicators,
    IndicatorValue
)

logger = logging.getLogger(__name__)


class IndicatorsCalculator:
    """
    Calculador de Indicadores Estruturais

    Implementa metodologia para calcular indicadores inéditos
    que medem a tradução de conhecimento em capacidade produtiva.
    """

    def calculate(
        self,
        scientific: ScientificIncidence,
        technological: TechnologicalIncidence,
        productive: ProductiveIncidence,
        institutional: InstitutionalIncidence,
        international: List[InternationalIncidence]
    ) -> StructuralIndicators:
        """
        Calcula todos os indicadores estruturais

        Args:
            scientific: Incidência científica (grupos, artigos)
            technological: Incidência tecnológica (patentes)
            productive: Incidência produtiva (comércio exterior)
            institutional: Incidência institucional (instrumentos)
            international: Incidência internacional (comparação global)

        Returns:
            StructuralIndicators com todos os indicadores calculados
        """
        logger.info("Calculating structural indicators")

        c2t = self._calculate_c2t(scientific, technological)
        gt = self._calculate_gt(scientific, technological, productive)
        p2c = self._calculate_p2c(scientific, technological, institutional)
        cd = self._calculate_cd(productive, international)
        ilt = self._calculate_ilt(c2t, gt, p2c, cd)

        return StructuralIndicators(
            c2t=c2t,
            gt=gt,
            p2c=p2c,
            cd=cd,
            ilt=ilt
        )

    def _calculate_c2t(
        self,
        scientific: ScientificIncidence,
        technological: TechnologicalIncidence
    ) -> IndicatorValue:
        """
        Calcula C2T - Maturidade Ciência → Tecnologia

        Metodologia:
        C2T = (Patentes / Grupos de Pesquisa) × Fator de Qualidade

        Onde Fator de Qualidade considera:
        - Citações das patentes
        - Patentes concedidas vs depositadas
        """
        groups = max(scientific.total_groups, 1)
        patents = technological.total_patents

        # Razão básica (normalizada para 0-100)
        ratio = min((patents / groups) * 20, 100)

        # Fator de qualidade baseado em citações
        avg_citations = 0
        if technological.patents:
            avg_citations = sum(p.cited_by_count for p in technological.patents) / len(technological.patents)

        quality_factor = min(1 + (avg_citations / 10), 1.5)

        value = min(ratio * quality_factor, 100)

        # Interpretação
        if value >= 70:
            level = "Alto"
            interpretation = "Excelente conversão de ciência em tecnologia aplicada"
        elif value >= 50:
            level = "Médio"
            interpretation = "Boa maturidade, tradução em progresso"
        elif value >= 30:
            level = "Baixo-Médio"
            interpretation = "Ciência avançada, mas tradução tecnológica limitada"
        else:
            level = "Baixo"
            interpretation = "Necessita fortalecimento da transferência tecnológica"

        return IndicatorValue(
            code="C2T",
            name="Maturidade Ciência → Tecnologia",
            value=round(value, 1),
            description=interpretation,
            methodology="C2T = (Patentes / Grupos) × Fator de Citação",
            level=level,
            interpretation=interpretation
        )

    def _calculate_gt(
        self,
        scientific: ScientificIncidence,
        technological: TechnologicalIncidence,
        productive: ProductiveIncidence
    ) -> IndicatorValue:
        """
        Calcula GT - Gargalo de Tradução

        Metodologia:
        GT = 100 - [(Patentes_Exploradas / Total_Patentes) × (Produção / Importação)]

        Valores altos indicam gargalos severos
        """
        patents = max(technological.total_patents, 1)

        # Simula taxa de exploração (em produção, seria dado real)
        exploitation_rate = 0.15  # 15% das patentes são exploradas comercialmente

        # Razão produção/importação
        imports = productive.total_imports_usd if productive.total_imports_usd > 0 else 1
        exports = productive.total_exports_usd

        production_ratio = min(exports / imports, 1)

        # Gargalo = inverso da eficiência de tradução
        translation_efficiency = exploitation_rate * (0.5 + 0.5 * production_ratio)
        value = 100 - (translation_efficiency * 100)

        # Limita entre 0 e 100
        value = max(0, min(100, value))

        # Interpretação (invertida - alto GT = ruim)
        if value <= 30:
            level = "Baixo"
            interpretation = "Ecossistema bem integrado, tradução fluida"
        elif value <= 50:
            level = "Médio"
            interpretation = "Gargalos moderados na escala produtiva"
        elif value <= 70:
            level = "Alto"
            interpretation = "Gargalos significativos: integração indústria-academia"
        else:
            level = "Crítico"
            interpretation = "Gargalos severos: urgente necessidade de políticas de tradução"

        return IndicatorValue(
            code="GT",
            name="Gargalo de Tradução",
            value=round(value, 1),
            description=interpretation,
            methodology="GT = 100 - [(Exploração × Produção/Importação)]",
            level=level,
            interpretation=interpretation
        )

    def _calculate_p2c(
        self,
        scientific: ScientificIncidence,
        technological: TechnologicalIncidence,
        institutional: InstitutionalIncidence
    ) -> IndicatorValue:
        """
        Calcula P2C - Aderência Política → Capacidade

        Metodologia:
        P2C = Σ(Instrumentos_Aderentes × Peso) / Total_Instrumentos

        Mede se os instrumentos públicos estão direcionados
        para áreas onde há capacidade instalada.
        """
        instruments = institutional.instruments
        if not instruments:
            value = 50  # Neutro se não há instrumentos
        else:
            # Verifica aderência: se há instrumentos E há capacidade científica/tecnológica
            has_science = scientific.total_groups > 10
            has_tech = technological.total_patents > 5

            adherent_instruments = len(instruments)
            total_capacity_score = 0

            if has_science:
                total_capacity_score += 40
            if has_tech:
                total_capacity_score += 40

            # Bonus por quantidade de instrumentos disponíveis
            instrument_bonus = min(adherent_instruments * 5, 20)

            value = total_capacity_score + instrument_bonus

        # Limita entre 0 e 100
        value = max(0, min(100, value))

        if value >= 70:
            level = "Alto"
            interpretation = "Políticas bem alinhadas com capacidades existentes"
        elif value >= 50:
            level = "Médio"
            interpretation = "Aderência moderada, espaço para otimização"
        elif value >= 30:
            level = "Baixo"
            interpretation = "Desalinhamento entre instrumentos e capacidades"
        else:
            level = "Crítico"
            interpretation = "Instrumentos não atingem as capacidades instaladas"

        return IndicatorValue(
            code="P2C",
            name="Aderência Política → Capacidade",
            value=round(value, 1),
            description=interpretation,
            methodology="P2C = Σ(Instrumentos × Capacidade) / Total",
            level=level,
            interpretation=interpretation
        )

    def _calculate_cd(
        self,
        productive: ProductiveIncidence,
        international: List[InternationalIncidence]
    ) -> IndicatorValue:
        """
        Calcula CD - Concentração e Dependência Tecnológica

        Metodologia:
        CD = (Importações / (Importações + Exportações)) × Fator_Concentração

        Fator_Concentração = HHI dos países de origem das importações
        """
        imports = productive.total_imports_usd
        exports = productive.total_exports_usd
        total_trade = imports + exports

        if total_trade == 0:
            value = 50  # Neutro
        else:
            # Dependência básica (% de importação)
            import_dependency = (imports / total_trade) * 100

            # Fator de concentração (HHI simplificado)
            # Se poucos países dominam = mais concentrado = mais risco
            if productive.main_import_origins:
                total_import = sum(c.get("total_value", 0) for c in productive.main_import_origins)
                if total_import > 0:
                    shares = [(c.get("total_value", 0) / total_import) ** 2 for c in productive.main_import_origins]
                    hhi = sum(shares)
                    concentration_factor = 1 + (hhi - 0.1) * 0.5  # Ajusta HHI para fator
                else:
                    concentration_factor = 1
            else:
                concentration_factor = 1

            value = import_dependency * concentration_factor

        # Limita entre 0 e 100
        value = max(0, min(100, value))

        # Interpretação
        if value <= 40:
            level = "Baixa"
            interpretation = "Baixa dependência externa, base produtiva robusta"
        elif value <= 60:
            level = "Média"
            interpretation = "Dependência moderada, diversificação recomendada"
        elif value <= 80:
            level = "Alta"
            interpretation = "Alta dependência de importações concentradas"
        else:
            level = "Crítica"
            interpretation = "Vulnerabilidade estratégica: dependência crítica de poucos fornecedores"

        return IndicatorValue(
            code="CD",
            name="Concentração e Dependência",
            value=round(value, 1),
            description=interpretation,
            methodology="CD = (Import/Total) × HHI_Concentração",
            level=level,
            interpretation=interpretation
        )

    def _calculate_ilt(
        self,
        c2t: IndicatorValue,
        gt: IndicatorValue,
        p2c: IndicatorValue,
        cd: IndicatorValue
    ) -> Optional[IndicatorValue]:
        """
        Calcula ILT - Índice de Lacuna de Tradução (composto)

        Metodologia:
        ILT = (C2T × 0.3) + ((100-GT) × 0.3) + (P2C × 0.2) + ((100-CD) × 0.2)

        Índice composto que resume a situação geral de tradução tecnológica
        """
        # Normaliza para que todos contribuam positivamente
        # (GT e CD altos são ruins, então invertemos)
        c2t_norm = c2t.value
        gt_norm = 100 - gt.value  # Inverte
        p2c_norm = p2c.value
        cd_norm = 100 - cd.value  # Inverte

        # Pesos
        value = (
            c2t_norm * 0.30 +
            gt_norm * 0.30 +
            p2c_norm * 0.20 +
            cd_norm * 0.20
        )

        if value >= 70:
            level = "Favorável"
            interpretation = "Ecossistema de inovação saudável, tradução tecnológica eficiente"
        elif value >= 50:
            level = "Moderado"
            interpretation = "Sistema funcional com oportunidades de melhoria"
        elif value >= 30:
            level = "Desafiador"
            interpretation = "Lacunas significativas na tradução tecnológica"
        else:
            level = "Crítico"
            interpretation = "Sistema de inovação com lacunas estruturais severas"

        return IndicatorValue(
            code="ILT",
            name="Índice de Lacuna de Tradução",
            value=round(value, 1),
            description=interpretation,
            methodology="ILT = (C2T×0.3) + ((100-GT)×0.3) + (P2C×0.2) + ((100-CD)×0.2)",
            level=level,
            interpretation=interpretation
        )
