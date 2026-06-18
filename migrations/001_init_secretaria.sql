-- =====================================================================
-- Secretaría — Migración 001: schema base, modelo de datos, vistas y seed
-- Aditivo y aislado: crea el schema `secretaria`. NO toca el schema `public`
-- de MW Panel (solo lo lee mediante vistas). Reversible: DROP SCHEMA secretaria CASCADE.
-- =====================================================================

CREATE SCHEMA IF NOT EXISTS secretaria;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- cifrado de IBAN y notas médicas

SET search_path TO secretaria, public;

-- ----------------------- ENUMS -----------------------
DO $$ BEGIN CREATE TYPE secretaria.staff_role AS ENUM ('secretaria_admin','secretaria_staff','direccion'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE secretaria.guardian_relationship AS ENUM ('madre','padre','tutor','otro'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE secretaria.service_code AS ENUM ('INGLES','APOYO','DANZA','ESCUELA','TAPER'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE secretaria.enrollment_status AS ENUM ('preinscrito','matriculado','pendiente','lista_espera','baja'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE secretaria.fee_concept AS ENUM ('matricula','mensualidad','material','maillot','taper_dia','taper_mes','otro'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE secretaria.charge_status AS ENUM ('pendiente','pagado','anulado','exento'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE secretaria.payment_method AS ENUM ('efectivo','transferencia','domiciliacion','bizum','tpv'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE secretaria.sepa_batch_status AS ENUM ('borrador','generada','enviada','procesada'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE secretaria.sepa_seq AS ENUM ('FRST','RCUR','FNAL','OOFF'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE secretaria.sepa_item_status AS ENUM ('incluida','devuelta','excluida'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE secretaria.document_code AS ENUM ('foto','tarjeta_sanitaria','inscripcion','aut_imagen','aut_salida','otro'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE secretaria.document_status AS ENUM ('pendiente','recibido','caducado','no_aplica'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE secretaria.raffle_book_status AS ENUM ('entregado','devuelto_parcial','liquidado','pendiente'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ----------------------- ROLES (auth) -----------------------
-- Reutiliza el JWT/usuarios de MW Panel; aquí solo se mapea quién es de Secretaría.
CREATE TABLE IF NOT EXISTS secretaria.staff_roles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,            -- = public.users.id (MW Panel)
  role secretaria.staff_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- ----------------------- AÑO ESCOLAR -----------------------
CREATE TABLE IF NOT EXISTS secretaria.academic_years (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  label varchar NOT NULL UNIQUE,        -- '2025-2026'
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  is_enrollment_open boolean NOT NULL DEFAULT false,
  mwpanel_academic_year_id uuid NULL,   -- enlace opcional a public.academic_years
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ----------------------- FAMILIAS / TUTORES / BANCO -----------------------
CREATE TABLE IF NOT EXISTS secretaria.families (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  display_name varchar NOT NULL,
  mwpanel_family_id uuid NULL,          -- enlace opcional a public.families
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS secretaria.guardians (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id uuid NOT NULL REFERENCES secretaria.families(id) ON DELETE CASCADE,
  full_name varchar NOT NULL,
  relationship secretaria.guardian_relationship NOT NULL DEFAULT 'tutor',
  nif varchar NULL,                     -- DNI/NIF (se incorpora después; nullable)
  phone varchar,
  phone_alt varchar,
  email varchar,
  is_primary_contact boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_guardians_family ON secretaria.guardians(family_id);

CREATE TABLE IF NOT EXISTS secretaria.bank_accounts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id uuid NOT NULL REFERENCES secretaria.families(id) ON DELETE CASCADE,
  iban_encrypted bytea NOT NULL,        -- pgp_sym_encrypt; nunca en claro
  iban_last4 varchar(4) NOT NULL,       -- para mostrar ****1234
  holder_name varchar,
  sepa_mandate_ref varchar,
  sepa_mandate_date date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bank_family ON secretaria.bank_accounts(family_id);

-- ----------------------- ALUMNOS -----------------------
CREATE TABLE IF NOT EXISTS secretaria.students (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  mwpanel_student_id uuid NULL,         -- si NOT NULL -> datos personales se leen de la vista
  family_id uuid REFERENCES secretaria.families(id) ON DELETE SET NULL,
  first_name varchar,                   -- solo para alumnos externos (mwpanel_student_id NULL)
  last_name varchar,
  birth_date date,
  school_origin varchar,
  grade_label varchar,
  address varchar, postal_code varchar, city varchar,
  medical_notes_encrypted bytea NULL,
  photo_consent boolean NOT NULL DEFAULT false,
  exit_consent boolean NOT NULL DEFAULT false,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(mwpanel_student_id)
);
CREATE INDEX IF NOT EXISTS idx_students_family ON secretaria.students(family_id);

-- ----------------------- SERVICIOS / PROGRAMAS / GRUPOS -----------------------
CREATE TABLE IF NOT EXISTS secretaria.services (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code secretaria.service_code NOT NULL UNIQUE,
  name varchar NOT NULL,
  color varchar(7) DEFAULT '#560797'
);

CREATE TABLE IF NOT EXISTS secretaria.programs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id uuid NOT NULL REFERENCES secretaria.services(id) ON DELETE CASCADE,
  name varchar NOT NULL,
  level_order int DEFAULT 0,
  capacity int
);
CREATE INDEX IF NOT EXISTS idx_programs_service ON secretaria.programs(service_id);

CREATE TABLE IF NOT EXISTS secretaria.groups (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  academic_year_id uuid NOT NULL REFERENCES secretaria.academic_years(id) ON DELETE CASCADE,
  program_id uuid NOT NULL REFERENCES secretaria.programs(id) ON DELETE CASCADE,
  name varchar NOT NULL,
  teacher_id uuid NULL,                 -- = public.teachers.id (MW Panel) cuando aplique
  room varchar,
  capacity int,
  notes text
);
CREATE INDEX IF NOT EXISTS idx_groups_year ON secretaria.groups(academic_year_id);

-- Horario normalizado (Puente C - tabla común; MW Panel la renderiza por vista)
CREATE TABLE IF NOT EXISTS secretaria.schedule_slots (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id uuid NOT NULL REFERENCES secretaria.groups(id) ON DELETE CASCADE,
  weekday smallint NOT NULL,            -- 1=lunes ... 7=domingo
  start_time time NOT NULL,
  end_time time NOT NULL,
  room varchar,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_slots_group ON secretaria.schedule_slots(group_id);

-- ----------------------- MATRÍCULAS -----------------------
CREATE TABLE IF NOT EXISTS secretaria.enrollments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id uuid NOT NULL REFERENCES secretaria.students(id) ON DELETE CASCADE,
  academic_year_id uuid NOT NULL REFERENCES secretaria.academic_years(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES secretaria.services(id),
  group_id uuid NULL REFERENCES secretaria.groups(id) ON DELETE SET NULL,
  status secretaria.enrollment_status NOT NULL DEFAULT 'preinscrito',
  status_changed_at timestamptz NOT NULL DEFAULT now(),
  waitlist_reason text,
  enrolled_at timestamptz,
  withdrawn_at timestamptz,
  attendance_days text[],
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, academic_year_id, service_id)
);
CREATE INDEX IF NOT EXISTS idx_enroll_year_service ON secretaria.enrollments(academic_year_id, service_id, status);

-- ----------------------- PRUEBAS DE NIVEL -----------------------
CREATE TABLE IF NOT EXISTS secretaria.level_tests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id uuid NULL REFERENCES secretaria.students(id) ON DELETE SET NULL,
  candidate_name varchar,               -- si aún no es alumno
  candidate_contact varchar,
  academic_year_id uuid REFERENCES secretaria.academic_years(id),
  test_date date,
  evaluator varchar,
  result_level varchar,
  recommended_program_id uuid NULL REFERENCES secretaria.programs(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ----------------------- TARIFAS / CARGOS / PAGOS -----------------------
CREATE TABLE IF NOT EXISTS secretaria.fee_schedules (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  academic_year_id uuid NOT NULL REFERENCES secretaria.academic_years(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES secretaria.services(id),
  program_id uuid NULL REFERENCES secretaria.programs(id),
  concept secretaria.fee_concept NOT NULL,
  amount numeric(8,2) NOT NULL,
  siblings_discount_pct numeric(5,2) DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_fees_year_service ON secretaria.fee_schedules(academic_year_id, service_id);

CREATE TABLE IF NOT EXISTS secretaria.charges (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  enrollment_id uuid NOT NULL REFERENCES secretaria.enrollments(id) ON DELETE CASCADE,
  period char(7) NULL,                  -- '2025-09' o NULL para matrícula
  concept secretaria.fee_concept NOT NULL,
  amount_due numeric(8,2) NOT NULL,
  status secretaria.charge_status NOT NULL DEFAULT 'pendiente',
  due_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_charges_enroll ON secretaria.charges(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_charges_status ON secretaria.charges(status, period);

CREATE TABLE IF NOT EXISTS secretaria.sepa_batches (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  charge_date date NOT NULL,
  concept_template varchar,
  status secretaria.sepa_batch_status NOT NULL DEFAULT 'borrador',
  file_url varchar,
  totals jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS secretaria.payments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id uuid NOT NULL REFERENCES secretaria.families(id),
  amount numeric(8,2) NOT NULL,
  paid_at date NOT NULL,
  method secretaria.payment_method NOT NULL,
  sepa_batch_id uuid NULL REFERENCES secretaria.sepa_batches(id),
  recorded_by uuid,                     -- public.users.id
  voided_at timestamptz NULL,
  void_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payments_family ON secretaria.payments(family_id);

CREATE TABLE IF NOT EXISTS secretaria.payment_allocations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id uuid NOT NULL REFERENCES secretaria.payments(id) ON DELETE CASCADE,
  charge_id uuid NOT NULL REFERENCES secretaria.charges(id) ON DELETE CASCADE,
  amount numeric(8,2) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_alloc_charge ON secretaria.payment_allocations(charge_id);

CREATE TABLE IF NOT EXISTS secretaria.sepa_batch_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id uuid NOT NULL REFERENCES secretaria.sepa_batches(id) ON DELETE CASCADE,
  family_id uuid NOT NULL REFERENCES secretaria.families(id),
  bank_account_id uuid REFERENCES secretaria.bank_accounts(id),
  amount numeric(8,2) NOT NULL,
  end_to_end_ref varchar,
  sequence_type secretaria.sepa_seq NOT NULL DEFAULT 'RCUR',
  status secretaria.sepa_item_status NOT NULL DEFAULT 'incluida',
  return_reason varchar
);
CREATE INDEX IF NOT EXISTS idx_sepaitems_batch ON secretaria.sepa_batch_items(batch_id);

-- ----------------------- DOCUMENTACIÓN -----------------------
CREATE TABLE IF NOT EXISTS secretaria.document_types (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code secretaria.document_code NOT NULL UNIQUE,
  name varchar NOT NULL,
  required_for secretaria.service_code[] DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS secretaria.student_documents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id uuid NOT NULL REFERENCES secretaria.students(id) ON DELETE CASCADE,
  document_type_id uuid NOT NULL REFERENCES secretaria.document_types(id),
  academic_year_id uuid NOT NULL REFERENCES secretaria.academic_years(id),
  status secretaria.document_status NOT NULL DEFAULT 'pendiente',
  file_path varchar NULL,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, document_type_id, academic_year_id)
);
CREATE INDEX IF NOT EXISTS idx_docs_student ON secretaria.student_documents(student_id);

-- ----------------------- RIFAS -----------------------
CREATE TABLE IF NOT EXISTS secretaria.raffle_campaigns (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name varchar NOT NULL,
  academic_year_id uuid NOT NULL REFERENCES secretaria.academic_years(id) ON DELETE CASCADE,
  ticket_price numeric(8,2) NOT NULL DEFAULT 0,
  is_open boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS secretaria.raffle_books (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id uuid NOT NULL REFERENCES secretaria.raffle_campaigns(id) ON DELETE CASCADE,
  family_id uuid REFERENCES secretaria.families(id) ON DELETE SET NULL,
  range_start int, range_end int,
  amount_expected numeric(8,2) DEFAULT 0,
  amount_returned numeric(8,2) DEFAULT 0,
  status secretaria.raffle_book_status NOT NULL DEFAULT 'pendiente',
  notes text
);
CREATE INDEX IF NOT EXISTS idx_books_campaign ON secretaria.raffle_books(campaign_id);

-- ----------------------- TÁPER -----------------------
CREATE TABLE IF NOT EXISTS secretaria.taper_usage (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id uuid NOT NULL REFERENCES secretaria.students(id) ON DELETE CASCADE,
  period char(7) NOT NULL,
  days_count int DEFAULT 0,
  amount numeric(8,2) DEFAULT 0,
  charge_id uuid NULL REFERENCES secretaria.charges(id) ON DELETE SET NULL
);

-- ----------------------- AUDITORÍA -----------------------
CREATE TABLE IF NOT EXISTS secretaria.audit_log (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name varchar NOT NULL,
  record_id varchar,
  action varchar NOT NULL,
  old_data jsonb, new_data jsonb,
  user_id uuid,
  at timestamptz NOT NULL DEFAULT now()
);

-- Trigger genérico de auditoría (se engancha a tablas sensibles)
CREATE OR REPLACE FUNCTION secretaria.fn_audit() RETURNS trigger AS $$
BEGIN
  INSERT INTO secretaria.audit_log(table_name, record_id, action, old_data, new_data)
  VALUES (TG_TABLE_NAME,
          COALESCE(NEW.id::text, OLD.id::text),
          TG_OP,
          CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) END,
          CASE WHEN TG_OP IN ('UPDATE','INSERT') THEN to_jsonb(NEW) END);
  RETURN COALESCE(NEW, OLD);
END; $$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_audit_students AFTER INSERT OR UPDATE OR DELETE ON secretaria.students FOR EACH ROW EXECUTE FUNCTION secretaria.fn_audit();
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_audit_payments AFTER INSERT OR UPDATE OR DELETE ON secretaria.payments FOR EACH ROW EXECUTE FUNCTION secretaria.fn_audit();
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_audit_bank AFTER INSERT OR UPDATE OR DELETE ON secretaria.bank_accounts FOR EACH ROW EXECUTE FUNCTION secretaria.fn_audit();
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_audit_enroll AFTER INSERT OR UPDATE OR DELETE ON secretaria.enrollments FOR EACH ROW EXECUTE FUNCTION secretaria.fn_audit();
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_audit_sepa AFTER INSERT OR UPDATE OR DELETE ON secretaria.sepa_batches FOR EACH ROW EXECUTE FUNCTION secretaria.fn_audit();
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ----------------------- PUENTE A: vista de alumnos de Escuela (MW Panel, solo lectura) -----------------------
CREATE OR REPLACE VIEW secretaria.v_alumnos_escuela AS
SELECT s.id AS mwpanel_student_id,
       s."enrollmentNumber" AS enrollment_number,
       s."birthDate" AS birth_date,
       s."photoUrl" AS photo_url,
       p."firstName" AS first_name,
       p."lastName" AS last_name,
       el.name AS etapa,
       c.name AS curso,
       u.email AS email
FROM public.students s
JOIN public.users u ON u.id = s."userId"
JOIN public.user_profiles p ON p."userId" = u.id
LEFT JOIN public.educational_levels el ON el.id = s."educationalLevelId"
LEFT JOIN public.courses c ON c.id = s."courseId"
WHERE u."isActive" = true;

-- =====================================================================
-- SEED: servicios, programas (niveles Cambridge), tipos de documento, año activo
-- =====================================================================
INSERT INTO secretaria.services(code, name, color) VALUES
  ('INGLES','Inglés (Cambridge)','#1890ff'),
  ('APOYO','Apoyo escolar','#52c41a'),
  ('DANZA','Danza / Ballet','#eb2f96'),
  ('ESCUELA','Escuela Alternativa','#560797'),
  ('TAPER','Servicio Táper','#fa8c16')
ON CONFLICT (code) DO NOTHING;

-- Programas de Inglés (preparación Cambridge) por niveles
INSERT INTO secretaria.programs(service_id, name, level_order)
SELECT s.id, x.name, x.ord FROM secretaria.services s,
  (VALUES ('Starters',1),('Movers',2),('Flyers',3),('KEY (A2)',4),('PET (B1)',5),('FCE (B2)',6),('CAE (C1)',7)) AS x(name, ord)
WHERE s.code='INGLES'
ON CONFLICT DO NOTHING;

-- Programas de Danza (orientativos; se ajustan con tus grupos reales)
INSERT INTO secretaria.programs(service_id, name, level_order)
SELECT s.id, x.name, x.ord FROM secretaria.services s,
  (VALUES ('Ballet Iniciación',1),('Ballet Intermedio',2),('Ballet Avanzado',3)) AS x(name, ord)
WHERE s.code='DANZA'
ON CONFLICT DO NOTHING;

-- Apoyo escolar (por etapa)
INSERT INTO secretaria.programs(service_id, name, level_order)
SELECT s.id, x.name, x.ord FROM secretaria.services s,
  (VALUES ('Apoyo Primaria',1),('Apoyo ESO',2),('Apoyo Bachillerato',3)) AS x(name, ord)
WHERE s.code='APOYO'
ON CONFLICT DO NOTHING;

-- Tipos de documento requeridos
INSERT INTO secretaria.document_types(code, name, required_for) VALUES
  ('foto','Fotografía','{ESCUELA,INGLES,DANZA}'),
  ('tarjeta_sanitaria','Tarjeta sanitaria','{ESCUELA}'),
  ('inscripcion','Hoja de inscripción firmada','{ESCUELA,INGLES,APOYO,DANZA}'),
  ('aut_imagen','Autorización de imagen','{ESCUELA,INGLES,DANZA}'),
  ('aut_salida','Autorización de salida','{ESCUELA}')
ON CONFLICT (code) DO NOTHING;

-- Año académico activo de Secretaría, alineado con el año actual de MW Panel
INSERT INTO secretaria.academic_years(label, start_date, end_date, is_active, is_enrollment_open, mwpanel_academic_year_id)
SELECT ay.name,
       COALESCE(ay."startDate", date '2025-09-01'),
       COALESCE(ay."endDate", date '2026-06-30'),
       true, true, ay.id
FROM public.academic_years ay
WHERE ay."isCurrent" = true
ON CONFLICT (label) DO NOTHING;
