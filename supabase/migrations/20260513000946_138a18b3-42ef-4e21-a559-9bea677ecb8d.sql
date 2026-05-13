
-- Research management tables
CREATE TABLE public.research_authors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  main_work text,
  thematic_area text,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.research_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  keywords text,
  progress integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.research_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  venue text,
  status text NOT NULL DEFAULT 'idea',
  due_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.research_authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_select_authors" ON public.research_authors FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "owner_insert_authors" ON public.research_authors FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_update_authors" ON public.research_authors FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "owner_delete_authors" ON public.research_authors FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "owner_select_themes" ON public.research_themes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "owner_insert_themes" ON public.research_themes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_update_themes" ON public.research_themes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "owner_delete_themes" ON public.research_themes FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "owner_select_articles" ON public.research_articles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "owner_insert_articles" ON public.research_articles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_update_articles" ON public.research_articles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "owner_delete_articles" ON public.research_articles FOR DELETE USING (auth.uid() = user_id);
