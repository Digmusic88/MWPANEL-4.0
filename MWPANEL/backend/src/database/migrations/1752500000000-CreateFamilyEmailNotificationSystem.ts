/**
 * @descripción: Migración para crear sistema completo de notificaciones email familiares
 * @archivo: 1752500000000-CreateFamilyEmailNotificationSystem.ts
 * @función: Crea tablas para preferencias y logs de notificaciones email
 * @crítico: SÍ - Sistema de comunicación automática con familias
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFamilyEmailNotificationSystem1752500000000 implements MigrationInterface {
  name = 'CreateFamilyEmailNotificationSystem1752500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Crear tabla family_notification_preferences
    await queryRunner.query(`
      CREATE TABLE family_notification_preferences (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        family_id uuid NOT NULL UNIQUE,
        immediate_alerts boolean NOT NULL DEFAULT true,
        daily_summary boolean NOT NULL DEFAULT true,
        weekly_summary boolean NOT NULL DEFAULT true,
        enabled_alert_types text NOT NULL DEFAULT 'pending_tasks,low_subject_grade,low_task_grade,unjustified_absence',
        max_emails_per_day int NOT NULL DEFAULT 5,
        max_immediate_alerts_per_hour int NOT NULL DEFAULT 2,
        quiet_hours_start varchar(5) NOT NULL DEFAULT '22:00',
        quiet_hours_end varchar(5) NOT NULL DEFAULT '08:00',
        respect_quiet_hours boolean NOT NULL DEFAULT true,
        daily_summary_time varchar(5) NOT NULL DEFAULT '18:00',
        weekly_summary_day int NOT NULL DEFAULT 0,
        weekly_summary_time varchar(5) NOT NULL DEFAULT '10:00',
        language varchar(2) NOT NULL DEFAULT 'es' CHECK (language IN ('es', 'en')),
        email_format varchar(10) NOT NULL DEFAULT 'html' CHECK (email_format IN ('html', 'text')),
        only_critical_immediate boolean NOT NULL DEFAULT false,
        include_low_priority_in_summary boolean NOT NULL DEFAULT true,
        digest_mode boolean NOT NULL DEFAULT false,
        digest_interval_minutes int NOT NULL DEFAULT 60,
        send_resolution_notifications boolean NOT NULL DEFAULT false,
        additional_emails text,
        is_active boolean NOT NULL DEFAULT true,
        temporarily_disabled_until timestamptz,
        custom_settings jsonb,
        created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        
        CONSTRAINT FK_family_notification_preferences_family_id 
        FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
      );
    `);

    // Crear tabla family_email_logs
    await queryRunner.query(`
      CREATE TABLE family_email_logs (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        family_id uuid NOT NULL,
        email_type varchar(20) NOT NULL CHECK (email_type IN ('immediate', 'daily_summary', 'weekly_summary', 'digest', 'resolution', 'custom')),
        recipient_email varchar(255) NOT NULL,
        subject varchar(500) NOT NULL,
        email_size_bytes int,
        alert_ids text,
        alert_count int NOT NULL DEFAULT 0,
        status varchar(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'bounced', 'opened', 'clicked')),
        created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        scheduled_at timestamptz,
        sent_at timestamptz,
        delivered_at timestamptz,
        opened_at timestamptz,
        last_clicked_at timestamptz,
        email_provider_id varchar(255),
        provider_message_id varchar(255),
        user_agent text,
        ip_address inet,
        error_message text,
        retry_count int NOT NULL DEFAULT 0,
        max_retries int NOT NULL DEFAULT 3,
        next_retry_at timestamptz,
        content_metadata jsonb,
        open_count int NOT NULL DEFAULT 0,
        click_count int NOT NULL DEFAULT 0,
        unique_clicks int NOT NULL DEFAULT 0,
        preferences_snapshot jsonb,
        academic_context jsonb,
        
        CONSTRAINT FK_family_email_logs_family_id 
        FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
      );
    `);

    // Índices para family_notification_preferences
    await queryRunner.query('CREATE INDEX IDX_family_notification_preferences_family_id ON family_notification_preferences (family_id)');
    await queryRunner.query('CREATE INDEX IDX_family_notification_preferences_is_active ON family_notification_preferences (is_active)');
    await queryRunner.query('CREATE INDEX IDX_family_notification_preferences_disabled_until ON family_notification_preferences (temporarily_disabled_until)');

    // Índices para family_email_logs (optimizados para consultas frecuentes)
    await queryRunner.query('CREATE INDEX IDX_family_email_logs_family_id ON family_email_logs (family_id)');
    await queryRunner.query('CREATE INDEX IDX_family_email_logs_sent_at ON family_email_logs (sent_at)');
    await queryRunner.query('CREATE INDEX IDX_family_email_logs_family_sent ON family_email_logs (family_id, sent_at)');
    await queryRunner.query('CREATE INDEX IDX_family_email_logs_email_type_status ON family_email_logs (email_type, status)');
    await queryRunner.query('CREATE INDEX IDX_family_email_logs_recipient_email ON family_email_logs (recipient_email)');
    await queryRunner.query('CREATE INDEX IDX_family_email_logs_status_retry ON family_email_logs (status, next_retry_at)');

    // Índices compuestos para verificación de límites
    await queryRunner.query('CREATE INDEX IDX_family_email_logs_limits_daily ON family_email_logs (family_id, status, sent_at)');
    await queryRunner.query('CREATE INDEX IDX_family_email_logs_limits_hourly ON family_email_logs (family_id, email_type, status, sent_at)');

    // Trigger para actualizar updated_at en preferencias
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_family_notification_preferences_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_family_notification_preferences_updated_at
        BEFORE UPDATE ON family_notification_preferences
        FOR EACH ROW
        EXECUTE FUNCTION update_family_notification_preferences_updated_at();
    `);

    // Comentarios en tablas para documentación
    await queryRunner.query(`
      COMMENT ON TABLE family_notification_preferences IS 'Configuración personalizable de notificaciones email por familia';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN family_notification_preferences.enabled_alert_types IS 'Lista separada por comas de tipos de alertas habilitadas';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN family_notification_preferences.max_emails_per_day IS 'Límite máximo de emails por día para prevenir spam';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN family_notification_preferences.quiet_hours_start IS 'Hora de inicio del período de silencio (formato HH:MM)';
    `);

    await queryRunner.query(`
      COMMENT ON TABLE family_email_logs IS 'Registro completo de emails enviados para auditoría y control de límites';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN family_email_logs.alert_ids IS 'Lista separada por comas de IDs de alertas incluidas en el email';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN family_email_logs.content_metadata IS 'Metadatos del contenido del email en formato JSON';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN family_email_logs.preferences_snapshot IS 'Snapshot de las preferencias utilizadas en el momento del envío';
    `);

    // Crear función para calcular engagement score
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION calculate_email_engagement_score(
        p_opened_at timestamptz,
        p_open_count int,
        p_click_count int,
        p_unique_clicks int
      ) RETURNS int AS $$
      DECLARE
        score int := 0;
      BEGIN
        -- Abierto: 40 puntos
        IF p_opened_at IS NOT NULL THEN
          score := score + 40;
        END IF;
        
        -- Tiene clicks: 30 puntos
        IF p_click_count > 0 THEN
          score := score + 30;
        END IF;
        
        -- Abierto múltiples veces: 20 puntos
        IF p_open_count > 1 THEN
          score := score + 20;
        END IF;
        
        -- Múltiples clicks únicos: 10 puntos
        IF p_unique_clicks > 2 THEN
          score := score + 10;
        END IF;
        
        RETURN LEAST(score, 100); -- Máximo 100 puntos
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Insertar preferencias por defecto para familias existentes
    await queryRunner.query(`
      INSERT INTO family_notification_preferences (family_id)
      SELECT id FROM families
      WHERE id NOT IN (SELECT family_id FROM family_notification_preferences);
    `);

    this.logger?.log('Sistema de notificaciones email familiares creado exitosamente');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Eliminar función de engagement score
    await queryRunner.query('DROP FUNCTION IF EXISTS calculate_email_engagement_score(timestamptz, int, int, int)');

    // Eliminar trigger y función de updated_at
    await queryRunner.query('DROP TRIGGER IF EXISTS update_family_notification_preferences_updated_at ON family_notification_preferences');
    await queryRunner.query('DROP FUNCTION IF EXISTS update_family_notification_preferences_updated_at()');

    // Eliminar índices
    await queryRunner.query('DROP INDEX IF EXISTS IDX_family_email_logs_limits_hourly');
    await queryRunner.query('DROP INDEX IF EXISTS IDX_family_email_logs_limits_daily');
    await queryRunner.query('DROP INDEX IF EXISTS IDX_family_email_logs_status_retry');
    await queryRunner.query('DROP INDEX IF EXISTS IDX_family_email_logs_recipient_email');
    await queryRunner.query('DROP INDEX IF EXISTS IDX_family_email_logs_email_type_status');
    await queryRunner.query('DROP INDEX IF EXISTS IDX_family_email_logs_family_sent');
    await queryRunner.query('DROP INDEX IF EXISTS IDX_family_email_logs_sent_at');
    await queryRunner.query('DROP INDEX IF EXISTS IDX_family_email_logs_family_id');

    await queryRunner.query('DROP INDEX IF EXISTS IDX_family_notification_preferences_disabled_until');
    await queryRunner.query('DROP INDEX IF EXISTS IDX_family_notification_preferences_is_active');
    await queryRunner.query('DROP INDEX IF EXISTS IDX_family_notification_preferences_family_id');

    // Eliminar foreign keys
    await queryRunner.query('ALTER TABLE family_email_logs DROP CONSTRAINT IF EXISTS FK_family_email_logs_family_id');
    await queryRunner.query('ALTER TABLE family_notification_preferences DROP CONSTRAINT IF EXISTS FK_family_notification_preferences_family_id');

    // Eliminar tablas
    await queryRunner.query('DROP TABLE IF EXISTS family_email_logs');
    await queryRunner.query('DROP TABLE IF EXISTS family_notification_preferences');
  }

  private logger = {
    log: (message: string) => console.log(`[Migration] ${message}`),
  };
}