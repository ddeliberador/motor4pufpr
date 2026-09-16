-- Issue #8: o bucket research-docs só limitava tamanho e tipo no formulário
-- (AuthorDocumentsPanel). Quem chamasse a API do Storage com o token de sessão
-- enviava qualquer arquivo, de qualquer tamanho, para a própria pasta.
-- Os valores abaixo batem com o que o cliente já impõe: 25 MB, .pdf ou .md.
-- text/plain cobre navegadores que não reconhecem a extensão .md.
UPDATE storage.buckets
SET file_size_limit = 26214400,
    allowed_mime_types = ARRAY['application/pdf', 'text/markdown', 'text/plain']
WHERE id = 'research-docs';
