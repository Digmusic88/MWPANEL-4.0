-- Verificación READ-ONLY del contrato de integración Secretaría -> MW Panel (SP-7).
-- Solo lee information_schema y hace SELECT ... LIMIT 1. No muta nada.
-- Falla con RAISE EXCEPTION (psql exit != 0 con ON_ERROR_STOP) si la superficie cambió.
DO $$
DECLARE
    v_missing text := '';
    v_rec record;
BEGIN
    -- (1) Columnas public.* de MW Panel de las que depende Secretaría
    FOR v_rec IN
        SELECT * FROM (VALUES
            ('public','students','id'),
            ('public','students','enrollmentNumber'),
            ('public','students','birthDate'),
            ('public','students','photoUrl'),
            ('public','students','userId'),
            ('public','students','educationalLevelId'),
            ('public','students','courseId'),
            ('public','educational_levels','id'),
            ('public','educational_levels','name'),
            ('public','courses','id'),
            ('public','courses','name'),
            ('public','teachers','id'),
            ('public','teachers','userId'),
            ('public','teachers','employeeNumber'),
            ('public','teachers','specialties'),
            ('public','users','id'),
            ('public','users','email'),
            ('public','users','passwordHash'),
            ('public','users','role'),
            ('public','users','isActive'),
            ('public','user_profiles','id'),
            ('public','user_profiles','userId'),
            ('public','user_profiles','firstName'),
            ('public','user_profiles','lastName'),
            ('public','attendance_records','studentId'),
            ('public','attendance_records','date'),
            ('public','attendance_records','status'),
            ('public','attendance_records','academicYearId'),
            ('public','academic_years','id'),
            ('public','academic_years','name'),
            ('public','academic_years','isCurrent')
        ) AS t(sch, tbl, col)
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns c
            WHERE c.table_schema = v_rec.sch
              AND c.table_name = v_rec.tbl
              AND c.column_name = v_rec.col
        ) THEN
            v_missing := v_missing || format(E'\n  - falta columna %s.%s.%s', v_rec.sch, v_rec.tbl, v_rec.col);
        END IF;
    END LOOP;

    -- (2) Columnas de salida esperadas de las 2 vistas puente
    FOR v_rec IN
        SELECT * FROM (VALUES
            ('v_alumnos_escuela','mwpanel_student_id'),
            ('v_alumnos_escuela','enrollment_number'),
            ('v_alumnos_escuela','birth_date'),
            ('v_alumnos_escuela','photo_url'),
            ('v_alumnos_escuela','first_name'),
            ('v_alumnos_escuela','last_name'),
            ('v_alumnos_escuela','etapa'),
            ('v_alumnos_escuela','curso'),
            ('v_alumnos_escuela','email'),
            ('v_docentes_mwpanel','mwpanel_teacher_id'),
            ('v_docentes_mwpanel','user_id'),
            ('v_docentes_mwpanel','email'),
            ('v_docentes_mwpanel','full_name'),
            ('v_docentes_mwpanel','employee_number'),
            ('v_docentes_mwpanel','specialties')
        ) AS t(vw, col)
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns c
            WHERE c.table_schema = 'secretaria'
              AND c.table_name = v_rec.vw
              AND c.column_name = v_rec.col
        ) THEN
            v_missing := v_missing || format(E'\n  - vista secretaria.%s sin columna de salida %s', v_rec.vw, v_rec.col);
        END IF;
    END LOOP;

    -- (3) Las vistas resuelven (ejecutan sin error)
    BEGIN
        PERFORM 1 FROM secretaria.v_alumnos_escuela LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
        v_missing := v_missing || format(E'\n  - secretaria.v_alumnos_escuela NO resuelve: %s', SQLERRM);
    END;
    BEGIN
        PERFORM 1 FROM secretaria.v_docentes_mwpanel LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
        v_missing := v_missing || format(E'\n  - secretaria.v_docentes_mwpanel NO resuelve: %s', SQLERRM);
    END;

    IF v_missing <> '' THEN
        RAISE EXCEPTION 'CONTRATO ROTO Secretaria<-MW Panel:%', v_missing;
    END IF;

    RAISE NOTICE 'Contrato Secretaria<-MW Panel OK (superficie intacta)';
END $$;
