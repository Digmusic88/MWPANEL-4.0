-- 039_notebook_search.sql
-- Índice full-text (español) para la búsqueda de texto en el cuaderno docente.
-- Idempotente: seguro de re-ejecutar.

CREATE INDEX IF NOT EXISTS idx_nb_entries_content_fts
  ON secretaria.notebook_entries
  USING gin (to_tsvector('spanish', coalesce(content, '')));
