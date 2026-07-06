import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAIAssistantSettings1752510000000 implements MigrationInterface {
  name = 'AddAIAssistantSettings1752510000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Agregar configuraciones de IA Assistant
    const aiSettings = [
      {
        key: 'ai_assistant_enabled',
        name: 'Habilitar Asistente IA',
        description: 'Permite a profesores y administradores usar respuestas inteligentes generadas por IA',
        type: 'boolean',
        category: 'ai_assistant',
        value: 'false',
        defaultValue: 'false',
        isEditable: true,
        requiresRestart: false,
        sortOrder: 1
      },
      {
        key: 'ai_provider',
        name: 'Proveedor de IA',
        description: 'Selecciona el proveedor de servicios de IA (anthropic, openai)',
        type: 'string',
        category: 'ai_assistant',
        value: 'anthropic',
        defaultValue: 'anthropic',
        isEditable: true,
        requiresRestart: false,
        validationRules: JSON.stringify({
          options: ['anthropic', 'openai'],
          required: true
        }),
        sortOrder: 2
      },
      {
        key: 'anthropic_api_key',
        name: 'Clave API Anthropic',
        description: 'Clave de API para el servicio Claude de Anthropic. Obtener en: https://console.anthropic.com/',
        type: 'string',
        category: 'ai_assistant',
        value: '',
        defaultValue: '',
        isEditable: true,
        requiresRestart: false,
        validationRules: JSON.stringify({
          sensitive: true,
          placeholder: 'sk-ant-api03-...',
          pattern: '^sk-ant-api03-[A-Za-z0-9\\-_]{95}$'
        }),
        sortOrder: 3
      },
      {
        key: 'openai_api_key',
        name: 'Clave API OpenAI',
        description: 'Clave de API para el servicio GPT de OpenAI. Obtener en: https://platform.openai.com/api-keys',
        type: 'string',
        category: 'ai_assistant',
        value: '',
        defaultValue: '',
        isEditable: true,
        requiresRestart: false,
        validationRules: JSON.stringify({
          sensitive: true,
          placeholder: 'sk-...',
          pattern: '^sk-[A-Za-z0-9]{48}$'
        }),
        sortOrder: 4
      },
      {
        key: 'ai_daily_limit_teacher',
        name: 'Límite Diario - Profesores',
        description: 'Número máximo de solicitudes de IA por día para profesores',
        type: 'number',
        category: 'ai_assistant',
        value: '20',
        defaultValue: '20',
        isEditable: true,
        requiresRestart: false,
        validationRules: JSON.stringify({
          min: 1,
          max: 100,
          step: 1
        }),
        sortOrder: 5
      },
      {
        key: 'ai_daily_limit_admin',
        name: 'Límite Diario - Administradores',
        description: 'Número máximo de solicitudes de IA por día para administradores',
        type: 'number',
        category: 'ai_assistant',
        value: '50',
        defaultValue: '50',
        isEditable: true,
        requiresRestart: false,
        validationRules: JSON.stringify({
          min: 1,
          max: 200,
          step: 1
        }),
        sortOrder: 6
      },
      {
        key: 'ai_model_anthropic',
        name: 'Modelo Anthropic',
        description: 'Modelo específico de Claude a utilizar',
        type: 'string',
        category: 'ai_assistant',
        value: 'claude-3-haiku-20240307',
        defaultValue: 'claude-3-haiku-20240307',
        isEditable: true,
        requiresRestart: false,
        validationRules: JSON.stringify({
          options: [
            'claude-3-haiku-20240307',
            'claude-3-sonnet-20240229',
            'claude-3-opus-20240229'
          ]
        }),
        sortOrder: 7
      },
      {
        key: 'ai_model_openai',
        name: 'Modelo OpenAI',
        description: 'Modelo específico de GPT a utilizar',
        type: 'string',
        category: 'ai_assistant',
        value: 'gpt-3.5-turbo',
        defaultValue: 'gpt-3.5-turbo',
        isEditable: true,
        requiresRestart: false,
        validationRules: JSON.stringify({
          options: [
            'gpt-3.5-turbo',
            'gpt-4',
            'gpt-4-turbo-preview'
          ]
        }),
        sortOrder: 8
      }
    ];

    // Insertar todas las configuraciones
    for (const setting of aiSettings) {
      await queryRunner.query(`
        INSERT INTO system_settings (
          "key", "name", "description", "type", "category", 
          "value", "defaultValue", "isEditable", "requiresRestart", 
          "validationRules", "sortOrder", "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW()
        ) ON CONFLICT ("key") DO NOTHING
      `, [
        setting.key,
        setting.name,
        setting.description,
        setting.type,
        setting.category,
        setting.value,
        setting.defaultValue,
        setting.isEditable,
        setting.requiresRestart,
        setting.validationRules || null,
        setting.sortOrder
      ]);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Eliminar configuraciones de IA
    await queryRunner.query(`
      DELETE FROM system_settings 
      WHERE category = 'ai_assistant'
    `);
  }
}