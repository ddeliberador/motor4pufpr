ALTER TABLE public.build_log ADD COLUMN IF NOT EXISTS eh_mapa_inovacao boolean NOT NULL DEFAULT false;

UPDATE public.build_log
SET eh_mapa_inovacao = true
WHERE eh_mapa_inovacao = false AND (
     categoria IN ('fonte_de_dado', 'integracao_externa')
  OR titulo ILIKE '%mapa%inova%'
  OR descricao ILIKE '%mapa%inova%'
  OR titulo ILIKE '%bbsia%' OR descricao ILIKE '%bbsia%'
  OR titulo ILIKE '%eunice%' OR descricao ILIKE '%eunice%'
  OR fonte ILIKE '%mapa%inova%'
);