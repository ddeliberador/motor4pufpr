# Fonte: PBIA — Plano Brasileiro de Inteligência Artificial
**Órgão responsável:** Ministério da Ciência, Tecnologia e Inovação (MCTI) / Centro de Gestão e Estudos Estratégicos (CGEE)  
**URL:** https://pbia.cgee.org.br/resultados  
**Acesso:** relatório Power BI "Publish to Web" (público, sem autenticação), consultado via engenharia reversa do endpoint de query pública. Não há API REST oficial documentada — é um método, não uma API.  
**Registros ativos:** 54 ações (25 com entregas, 19 iniciadas, 10 não iniciadas) — medido em 01/10/2026

## Método de consulta

```
POST https://wabi-brazil-south-b-primary-api.analysis.windows.net/public/reports/querydata?synchronous=true
Headers: X-PowerBI-ResourceKey: 2dd48ef9-3404-4f8c-8db1-e2b8f068a158
Corpo: SemanticQueryDataShapeCommand (modelId 7407363)
```

A resposta vem no formato comprimido DSR do Power BI (dicionários + bitmasks de repetição/nulo), decodificado por `_decode_dsr` em `backend/app/connectors/pbia_cgee.py`.

## Conteúdo

54 ações organizadas em 5 eixos: (1) Infraestrutura e Desenvolvimento de IA, (2) Capacitação, Formação e Difusão de IA, (3) Governo e Serviços Públicos, (4) Setor Produtivo, (5) Governança e Regulação.

| Tabela | Colunas | Uso |
|--------|---------|-----|
| `Eixos` | Ações, Status | Resumo (Com entregas / Iniciada / Não iniciada) |
| `Eixo 1`..`Eixo 5` | Ações, Programa, Status, Descrição, Metas, Entrega 1, Entrega 2, Entregas previstas para 2026 | Detalhe por eixo |

Valores de financiamento e instituições aparecem no texto livre de "Entrega 1/2" e "Entregas previstas 2026" quando mencionados, não como campos estruturados.

## Limitações conhecidas

- Depende da estrutura interna do relatório Power BI da CGEE; pode quebrar sem aviso se o relatório for republicado com schema diferente (o conector devolve lista vazia e registra warning).
- Não há valores de financiamento como campo estruturado, apenas em texto livre.
- A mesma CGEE mantém o OTD/CGEE (outra fonte já integrada): pode haver sobreposição institucional de contexto, não de dados.

## Chave / credencial

Nenhuma. A ResourceKey é pública, embutida no link "Publish to Web".
