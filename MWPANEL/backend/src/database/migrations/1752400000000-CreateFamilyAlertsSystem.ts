/**
 * @descripción: Migración para crear sistema de alertas familiares
 * @archivo: 1752400000000-CreateFamilyAlertsSystem.ts
 * @función: Crea tabla family_alerts para avisos importantes automáticos
 * @crítico: SÍ - Sistema automático de detección de problemas académicos
 */

import { MigrationInterface, QueryRunner, Table, Index, ForeignKey } from 'typeorm';

export class CreateFamilyAlertsSystem1752400000000 implements MigrationInterface {
  name = 'CreateFamilyAlertsSystem1752400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Crear tabla family_alerts
    await queryRunner.createTable(
      new Table({
        name: 'family_alerts',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'family_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'student_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'alert_type',
            type: 'enum',
            enum: ['pending_tasks', 'low_subject_grade', 'low_task_grade', 'unjustified_absence'],
            isNullable: false,
          },
          {
            name: 'priority',
            type: 'enum', 
            enum: ['low', 'medium', 'high', 'critical'],
            default: "'medium'",
            isNullable: false,
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
            comment: 'Metadatos específicos del tipo de alerta (subjectId, taskId, etc.)',
          },
          {
            name: 'is_viewed',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          {
            name: 'viewed_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'expires_at',
            type: 'timestamptz',
            isNullable: true,
            comment: 'Fecha de expiración para alertas temporales',
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true
    );

    // Crear índices para optimización de consultas usando SQL directo
    await queryRunner.query('CREATE INDEX IDX_family_alerts_family_id ON family_alerts (family_id)');
    await queryRunner.query('CREATE INDEX IDX_family_alerts_student_id ON family_alerts (student_id)');
    await queryRunner.query('CREATE INDEX IDX_family_alerts_alert_type ON family_alerts (alert_type)');
    await queryRunner.query('CREATE INDEX IDX_family_alerts_viewed_active ON family_alerts (is_viewed, is_active)');
    await queryRunner.query('CREATE INDEX IDX_family_alerts_created_at ON family_alerts (created_at)');
    await queryRunner.query('CREATE INDEX IDX_family_alerts_family_active_viewed ON family_alerts (family_id, is_active, is_viewed)');

    // Foreign keys
    await queryRunner.query(`
      ALTER TABLE family_alerts 
      ADD CONSTRAINT FK_family_alerts_family_id 
      FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE family_alerts 
      ADD CONSTRAINT FK_family_alerts_student_id 
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    `);

    // Trigger para actualizar updated_at automáticamente
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_family_alerts_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_family_alerts_updated_at
        BEFORE UPDATE ON family_alerts
        FOR EACH ROW
        EXECUTE FUNCTION update_family_alerts_updated_at();
    `);

    // Comentarios en tabla y columnas para documentación
    await queryRunner.query(`
      COMMENT ON TABLE family_alerts IS 'Sistema de alertas automáticas para familias - detección de problemas académicos';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN family_alerts.alert_type IS 'Tipo de alerta: tareas pendientes, calificaciones bajas, faltas injustificadas, etc.';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN family_alerts.priority IS 'Prioridad de la alerta para ordenación y visualización';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN family_alerts.metadata IS 'Metadatos específicos del tipo de alerta en formato JSON';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Eliminar trigger y función
    await queryRunner.query('DROP TRIGGER IF EXISTS update_family_alerts_updated_at ON family_alerts');
    await queryRunner.query('DROP FUNCTION IF EXISTS update_family_alerts_updated_at()');

    // Eliminar foreign keys
    await queryRunner.query('ALTER TABLE family_alerts DROP CONSTRAINT IF EXISTS FK_family_alerts_student_id');
    await queryRunner.query('ALTER TABLE family_alerts DROP CONSTRAINT IF EXISTS FK_family_alerts_family_id');

    // Eliminar tabla (esto eliminará automáticamente los índices)
    await queryRunner.dropTable('family_alerts');
  }
}