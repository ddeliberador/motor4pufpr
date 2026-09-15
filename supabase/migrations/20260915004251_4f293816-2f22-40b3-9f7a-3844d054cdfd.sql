UPDATE public.mapa_inovacao_fontes
SET status_pesquisa = CASE
  WHEN lower(coalesce(status_pesquisa,'')) ~ '(não funcional|bloquead)'
    THEN 'Pendente — ' || status_pesquisa
  WHEN lower(coalesce(status_pesquisa,'')) ~ '(integrad|já usado|testado em produção)'
    THEN 'Integrada ao Motor (funcional) — ' || status_pesquisa
  ELSE 'Pendente — ' || coalesce(status_pesquisa, 'A validar')
END
WHERE status_pesquisa IS NULL
   OR (status_pesquisa NOT LIKE 'Integrada ao Motor (funcional)%' AND status_pesquisa NOT LIKE 'Pendente%');