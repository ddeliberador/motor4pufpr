-- Documents table
CREATE TABLE public.research_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  author_id UUID NOT NULL REFERENCES public.research_authors(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'md')),
  citation_authors TEXT,
  citation_year INTEGER,
  citation_title TEXT,
  citation_publisher TEXT,
  citation_doi TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.research_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_select_documents" ON public.research_documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "owner_insert_documents" ON public.research_documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_update_documents" ON public.research_documents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "owner_delete_documents" ON public.research_documents FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_research_documents_author ON public.research_documents(author_id);

-- Highlights table
CREATE TABLE public.research_highlights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  document_id UUID NOT NULL REFERENCES public.research_documents(id) ON DELETE CASCADE,
  color TEXT NOT NULL DEFAULT 'yellow' CHECK (color IN ('yellow','green','blue','pink')),
  text TEXT NOT NULL,
  note TEXT,
  page INTEGER,
  position JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.research_highlights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_select_highlights" ON public.research_highlights FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "owner_insert_highlights" ON public.research_highlights FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_update_highlights" ON public.research_highlights FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "owner_delete_highlights" ON public.research_highlights FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_research_highlights_document ON public.research_highlights(document_id);

-- Storage bucket (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('research-docs', 'research-docs', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "users_select_own_research_docs" ON storage.objects FOR SELECT
  USING (bucket_id = 'research-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "users_insert_own_research_docs" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'research-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "users_update_own_research_docs" ON storage.objects FOR UPDATE
  USING (bucket_id = 'research-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "users_delete_own_research_docs" ON storage.objects FOR DELETE
  USING (bucket_id = 'research-docs' AND auth.uid()::text = (storage.foldername(name))[1]);