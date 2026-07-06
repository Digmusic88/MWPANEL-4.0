import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitializeSystemSettings1752415000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🔧 Initializing default system settings...');

    // Default system configurations
    const defaultSettings = [
      // GENERAL Category
      { key: 'system_maintenanceMode', value: 'false', type: 'BOOLEAN', category: 'GENERAL', description: 'Enable maintenance mode' },
      { key: 'system_systemName', value: 'MW Panel 2.0', type: 'STRING', category: 'GENERAL', description: 'System name' },
      { key: 'system_systemEmail', value: 'admin@mwpanel.com', type: 'STRING', category: 'GENERAL', description: 'System email address' },
      { key: 'system_allowRegistrations', value: 'false', type: 'BOOLEAN', category: 'GENERAL', description: 'Allow new user registrations' },
      { key: 'system_defaultUserRole', value: 'student', type: 'STRING', category: 'GENERAL', description: 'Default role for new users' },
      { key: 'system_sessionTimeout', value: '3600', type: 'NUMBER', category: 'GENERAL', description: 'Session timeout in seconds' },
      { key: 'system_maxFileUploadSize', value: '52428800', type: 'NUMBER', category: 'GENERAL', description: 'Max file upload size in bytes (50MB)' },

      // ACADEMIC Category
      { key: 'system_academicYearStart', value: '2024-09-01', type: 'STRING', category: 'ACADEMIC', description: 'Academic year start date' },
      { key: 'system_academicYearEnd', value: '2025-06-30', type: 'STRING', category: 'ACADEMIC', description: 'Academic year end date' },
      { key: 'system_maxStudentsPerClass', value: '30', type: 'NUMBER', category: 'ACADEMIC', description: 'Maximum students per class' },

      // MODULES Category
      { key: 'system_enabledModules', value: JSON.stringify([
        'users', 'students', 'teachers', 'families', 'subjects', 'evaluations', 
      ]), type: 'JSON', category: 'MODULES', description: 'Enabled system modules' },

      // Individual Module Settings
      { key: 'module_expedientes_enabled', value: 'true', type: 'BOOLEAN', category: 'MODULES', description: 'Habilitar módulo de expedientes académicos' },
      { key: 'module_calendario_enabled', value: 'true', type: 'BOOLEAN', category: 'MODULES', description: 'Habilitar módulo de calendario académico' },
      { key: 'module_recursos_enabled', value: 'true', type: 'BOOLEAN', category: 'MODULES', description: 'Habilitar módulo de recursos básicos' },
      { key: 'module_analytics_enabled', value: 'true', type: 'BOOLEAN', category: 'MODULES', description: 'Habilitar módulo de analytics y estadísticas' },
      { key: 'module_chat_enabled', value: 'true', type: 'BOOLEAN', category: 'MODULES', description: 'Habilitar módulo de chat y comunicaciones' },
      { key: 'module_educational_resources_enabled', value: 'true', type: 'BOOLEAN', category: 'MODULES', description: 'Habilitar módulo de recursos educativos con Google Drive' },
      { key: 'module_meetings_enabled', value: 'true', type: 'BOOLEAN', category: 'MODULES', description: 'Habilitar módulo de reuniones de claustro' },

      // COMMUNICATIONS Category
      { key: 'notifications_emailEnabled', value: 'true', type: 'BOOLEAN', category: 'COMMUNICATIONS', description: 'Enable email notifications' },
      { key: 'notifications_smsEnabled', value: 'false', type: 'BOOLEAN', category: 'COMMUNICATIONS', description: 'Enable SMS notifications' },
      { key: 'notifications_pushEnabled', value: 'true', type: 'BOOLEAN', category: 'COMMUNICATIONS', description: 'Enable push notifications' },

      // REPORTS Category  
      { key: 'reports_autoGenerate', value: 'true', type: 'BOOLEAN', category: 'REPORTS', description: 'Auto-generate reports' },
      { key: 'reports_retentionDays', value: '365', type: 'NUMBER', category: 'REPORTS', description: 'Report retention in days' },

      // SECURITY Category
      { key: 'security_passwordMinLength', value: '8', type: 'NUMBER', category: 'SECURITY', description: 'Minimum password length' },
      { key: 'security_passwordExpiration', value: '90', type: 'NUMBER', category: 'SECURITY', description: 'Password expiration in days' },
      { key: 'security_passwordRequireSpecialChars', value: 'true', type: 'BOOLEAN', category: 'SECURITY', description: 'Require special characters in passwords' },
      { key: 'security_passwordRequireNumbers', value: 'true', type: 'BOOLEAN', category: 'SECURITY', description: 'Require numbers in passwords' },
      { key: 'security_passwordRequireUppercase', value: 'true', type: 'BOOLEAN', category: 'SECURITY', description: 'Require uppercase letters in passwords' },
      { key: 'security_requireTwoFactor', value: 'false', type: 'BOOLEAN', category: 'SECURITY', description: 'Require two-factor authentication' },
      { key: 'security_maxLoginAttempts', value: '5', type: 'NUMBER', category: 'SECURITY', description: 'Maximum login attempts before lockout' },
      { key: 'security_lockoutDuration', value: '30', type: 'NUMBER', category: 'SECURITY', description: 'Account lockout duration in minutes' },
      { key: 'security_allowPasswordReset', value: 'true', type: 'BOOLEAN', category: 'SECURITY', description: 'Allow password reset via email' },
      { key: 'security_ipWhitelist', value: '[]', type: 'JSON', category: 'SECURITY', description: 'Allowed IP addresses (JSON array)' },

      // BACKUP Category
      { key: 'backup_enableAutoBackup', value: 'true', type: 'BOOLEAN', category: 'BACKUP', description: 'Enable automatic backups' },
      { key: 'backup_backupFrequency', value: 'daily', type: 'STRING', category: 'BACKUP', description: 'Backup frequency (daily/weekly/monthly)' },
      { key: 'backup_backupTime', value: '02:00', type: 'STRING', category: 'BACKUP', description: 'Backup time in HH:mm format' },
      { key: 'backup_retentionDays', value: '30', type: 'NUMBER', category: 'BACKUP', description: 'Backup retention in days' },
      { key: 'backup_includeUploads', value: 'true', type: 'BOOLEAN', category: 'BACKUP', description: 'Include uploaded files in backup' },
      { key: 'backup_enableCloudBackup', value: 'false', type: 'BOOLEAN', category: 'BACKUP', description: 'Enable cloud backup' },
      { key: 'backup_cloudProvider', value: 'aws', type: 'STRING', category: 'BACKUP', description: 'Cloud backup provider' },
      { key: 'backup_compressionLevel', value: '6', type: 'NUMBER', category: 'BACKUP', description: 'Backup compression level (0-9)' },

      // NOTIFICATION Category
      { key: 'notification_enableSystemAlerts', value: 'true', type: 'BOOLEAN', category: 'NOTIFICATION', description: 'Enable system alerts' },
      { key: 'notification_enableErrorNotifications', value: 'true', type: 'BOOLEAN', category: 'NOTIFICATION', description: 'Enable error notifications' },
      { key: 'notification_enableSecurityAlerts', value: 'true', type: 'BOOLEAN', category: 'NOTIFICATION', description: 'Enable security alerts' },
      { key: 'notification_adminEmails', value: '["admin@mwpanel.com"]', type: 'JSON', category: 'NOTIFICATION', description: 'Admin notification emails' },
      { key: 'notification_alertThresholds', value: '{"diskUsage":80,"memoryUsage":85,"errorRate":5,"loginFailures":10}', type: 'JSON', category: 'NOTIFICATION', description: 'Alert thresholds configuration' },

      // LOG Category
      { key: 'log_enableAuditLog', value: 'true', type: 'BOOLEAN', category: 'LOG', description: 'Enable audit logging' },
      { key: 'log_enableErrorLog', value: 'true', type: 'BOOLEAN', category: 'LOG', description: 'Enable error logging' },
      { key: 'log_enableAccessLog', value: 'true', type: 'BOOLEAN', category: 'LOG', description: 'Enable access logging' },
      { key: 'log_logLevel', value: 'info', type: 'STRING', category: 'LOG', description: 'Log level (debug/info/warn/error)' },
      { key: 'log_logRetentionDays', value: '90', type: 'NUMBER', category: 'LOG', description: 'Log retention in days' },
      { key: 'log_enableLogRotation', value: 'true', type: 'BOOLEAN', category: 'LOG', description: 'Enable log rotation' },
      { key: 'log_maxLogSize', value: '100', type: 'NUMBER', category: 'LOG', description: 'Maximum log file size in MB' },
    ];

    for (const setting of defaultSettings) {
      // Check if setting already exists to avoid duplicates
      const existing = await queryRunner.query(
        `SELECT id FROM system_settings WHERE key = $1`,
        [setting.key]
      );

      if (existing.length === 0) {
        await queryRunner.query(
          `INSERT INTO system_settings (key, value, type, category, description, "isSystem", "createdAt", "updatedAt") 
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
          [setting.key, setting.value, setting.type, setting.category, setting.description, true]
        );
        console.log(`✅ Created setting: ${setting.key} = ${setting.value}`);
      } else {
        console.log(`⏭️  Setting already exists: ${setting.key}`);
      }
    }

    console.log('🎉 System settings initialization completed!');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('🗑️ Removing default system settings...');
    
    const settingKeys = [
      // System settings
      'system_maintenanceMode', 'system_systemName', 'system_systemEmail', 'system_allowRegistrations',
      'system_defaultUserRole', 'system_sessionTimeout', 'system_maxFileUploadSize', 'system_academicYearStart',
      'system_academicYearEnd', 'system_maxStudentsPerClass', 'system_enabledModules',
      
      // Individual module settings
      'module_expedientes_enabled', 'module_calendario_enabled', 'module_recursos_enabled', 
      'module_analytics_enabled', 'module_chat_enabled', 'module_educational_resources_enabled', 'module_meetings_enabled',
      
      // Communications
      'notifications_emailEnabled', 'notifications_smsEnabled', 'notifications_pushEnabled',
      
      // Reports
      'reports_autoGenerate', 'reports_retentionDays',
      
      // Security settings
      'security_passwordMinLength', 'security_passwordExpiration', 'security_passwordRequireSpecialChars',
      'security_passwordRequireNumbers', 'security_passwordRequireUppercase', 'security_requireTwoFactor',
      'security_maxLoginAttempts', 'security_lockoutDuration', 'security_allowPasswordReset', 'security_ipWhitelist',
      
      // Backup settings
      'backup_enableAutoBackup', 'backup_backupFrequency', 'backup_backupTime', 'backup_retentionDays',
      'backup_includeUploads', 'backup_enableCloudBackup', 'backup_cloudProvider', 'backup_compressionLevel',
      
      // Notification settings
      'notification_enableSystemAlerts', 'notification_enableErrorNotifications', 'notification_enableSecurityAlerts',
      'notification_adminEmails', 'notification_alertThresholds',
      
      // Log settings
      'log_enableAuditLog', 'log_enableErrorLog', 'log_enableAccessLog', 'log_logLevel',
      'log_logRetentionDays', 'log_enableLogRotation', 'log_maxLogSize'
    ];

    for (const key of settingKeys) {
      await queryRunner.query(`DELETE FROM system_settings WHERE key = $1`, [key]);
    }

    console.log('🗑️ Default system settings removed');
  }
}