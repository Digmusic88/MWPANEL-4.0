-- migrations/030_group_term_dates.sql
-- Override de fechas de trimestre por grupo. Sin fila = usa las fechas globales
-- del trimestre (academic_terms). Cascada al borrar grupo o trimestre.
CREATE TABLE IF NOT EXISTS secretaria.group_term_dates (
  group_id uuid NOT NULL REFERENCES secretaria.groups(id) ON DELETE CASCADE,
  academic_term_id uuid NOT NULL REFERENCES secretaria.academic_terms(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  PRIMARY KEY (group_id, academic_term_id)
);
