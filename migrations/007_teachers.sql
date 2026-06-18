-- =====================================================================
-- Secretaría — Migración 007: profesores (docentes de la academia)
-- =====================================================================
SET search_path TO secretaria, public;

CREATE TABLE IF NOT EXISTS secretaria.teachers (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name  varchar NOT NULL,
  email      varchar,
  phone      varchar,
  user_id    uuid,            -- enlace opcional a public.users (para login futuro del profesor)
  is_active  boolean NOT NULL DEFAULT true,
  notes      text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- groups.teacher_id ahora referencia a teachers
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='groups_teacher_id_fkey') THEN
    ALTER TABLE secretaria.groups
      ADD CONSTRAINT groups_teacher_id_fkey FOREIGN KEY (teacher_id)
      REFERENCES secretaria.teachers(id) ON DELETE SET NULL;
  END IF;
END $$;

-- rol futuro para login de profesores
ALTER TYPE secretaria.staff_role ADD VALUE IF NOT EXISTS 'secretaria_teacher';
