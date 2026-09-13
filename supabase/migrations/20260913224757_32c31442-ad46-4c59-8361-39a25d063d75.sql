-- Observação de segurança: o frontend não possui tela de cadastro.
-- O endpoint de signup do Supabase Auth deve estar desabilitado manualmente
-- em: Authentication → Providers → Email → "Enable email signups" = OFF
-- Esta migração documenta a pendência identificada no relatório de re-verificação
-- de segurança (2026-09-13) para fins de rastreabilidade no histórico do repositório.
-- Não há DDL a executar — a configuração é feita no painel Supabase.
SELECT 'Documentação: desabilitar email signups no painel Supabase Auth' AS pendencia;