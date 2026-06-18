-- =====================================================================
-- Secretaría — Migración 011: leer docentes de MW Panel
-- Vista puente + enlace en secretaria.teachers (mwpanel_teacher_id)
-- =====================================================================
SET search_path TO secretaria, public;

ALTER TABLE secretaria.teachers ADD COLUMN IF NOT EXISTS mwpanel_teacher_id uuid;

CREATE OR REPLACE VIEW secretaria.v_docentes_mwpanel AS
SELECT t.id AS mwpanel_teacher_id,
       t."userId" AS user_id,
       u.email,
       NULLIF(TRIM(COALESCE(p."firstName",'')||' '||COALESCE(p."lastName",'')),'') AS full_name,
       t."employeeNumber" AS employee_number,
       t.specialties
FROM public.teachers t
LEFT JOIN public.users u ON u.id = t."userId"
LEFT JOIN public.user_profiles p ON p."userId" = u.id;
