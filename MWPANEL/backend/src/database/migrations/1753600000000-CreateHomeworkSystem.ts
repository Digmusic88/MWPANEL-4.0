import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateHomeworkSystem1753600000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      CREATE TABLE IF NOT EXISTS homework_subjects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(120) NOT NULL,
        color VARCHAR(30) NOT NULL DEFAULT '#1890ff',
        teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS homework_subject_students (
        subject_id UUID NOT NULL REFERENCES homework_subjects(id) ON DELETE CASCADE,
        student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        PRIMARY KEY (subject_id, student_id)
      );
      CREATE TABLE IF NOT EXISTS homework_activities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        subject_id UUID NOT NULL REFERENCES homework_subjects(id) ON DELETE CASCADE,
        name VARCHAR(150) NOT NULL,
        date DATE NOT NULL,
        description TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_hw_act_subject_date ON homework_activities(subject_id, date);
      CREATE TYPE hw_record_status_enum AS ENUM ('completed', 'partial', 'not_done');
      CREATE TABLE IF NOT EXISTS homework_activity_records (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        activity_id UUID NOT NULL REFERENCES homework_activities(id) ON DELETE CASCADE,
        student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        status hw_record_status_enum NOT NULL,
        notes TEXT,
        recorded_by_teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE RESTRICT,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now(),
        UNIQUE(activity_id, student_id)
      );
      CREATE INDEX IF NOT EXISTS idx_hw_rec_activity ON homework_activity_records(activity_id);
      CREATE INDEX IF NOT EXISTS idx_hw_rec_student ON homework_activity_records(student_id);
    `);
  }
  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`
      DROP TABLE IF EXISTS homework_activity_records;
      DROP TYPE IF EXISTS hw_record_status_enum;
      DROP TABLE IF EXISTS homework_activities;
      DROP TABLE IF EXISTS homework_subject_students;
      DROP TABLE IF EXISTS homework_subjects;
    `);
  }
}
