import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOpenRouterSupport1753810000000 implements MigrationInterface {
  name = 'AddOpenRouterSupport1753810000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Actualizar ai_provider para incluir gemini y openrouter
    await queryRunner.query(`
      UPDATE system_settings 
      SET 
        "description" = 'Selecciona el proveedor de servicios de IA (anthropic, openai, gemini, openrouter)',
        "validationRules" = '{"options":["anthropic","openai","gemini","openrouter"],"required":true}',
        "updatedAt" = NOW()
      WHERE "key" = 'ai_provider'
    `);

    // Agregar configuraciones para Gemini
    const geminiSettings = [
      {
        key: 'gemini_api_key',
        name: 'Clave API Gemini',
        description: 'Clave de API para el servicio Gemini de Google. Obtener en: https://ai.google.dev/',
        type: 'string',
        category: 'ai_assistant',
        value: '',
        defaultValue: '',
        isEditable: true,
        requiresRestart: false,
        validationRules: JSON.stringify({
          sensitive: true,
          placeholder: 'AIza...',
          pattern: '^AIza[A-Za-z0-9_-]{35}$'
        }),
        sortOrder: 9
      },
      {
        key: 'ai_model_gemini',
        name: 'Modelo Gemini',
        description: 'Modelo específico de Gemini a utilizar',
        type: 'string',
        category: 'ai_assistant',
        value: 'gemini-1.5-flash',
        defaultValue: 'gemini-1.5-flash',
        isEditable: true,
        requiresRestart: false,
        validationRules: JSON.stringify({
          options: [
            'gemini-1.5-flash',
            'gemini-1.5-pro',
            'gemini-1.0-pro'
          ]
        }),
        sortOrder: 10
      }
    ];

    // Agregar configuraciones para OpenRouter
    const openrouterSettings = [
      {
        key: 'openrouter_api_key',
        name: 'Clave API OpenRouter',
        description: 'Clave de API para el servicio OpenRouter. Obtener en: https://openrouter.ai/keys',
        type: 'string',
        category: 'ai_assistant',
        value: '',
        defaultValue: '',
        isEditable: true,
        requiresRestart: false,
        validationRules: JSON.stringify({
          sensitive: true,
          placeholder: 'sk-or-v1-...',
          pattern: '^sk-or-v1-[A-Za-z0-9]{64}$'
        }),
        sortOrder: 11
      },
      {
        key: 'ai_model_openrouter',
        name: 'Modelo OpenRouter',
        description: 'Modelo específico de OpenRouter a utilizar',
        type: 'string',
        category: 'ai_assistant',
        value: 'openai/gpt-3.5-turbo',
        defaultValue: 'openai/gpt-3.5-turbo',
        isEditable: true,
        requiresRestart: false,
        validationRules: JSON.stringify({
          options: [
            'openai/gpt-3.5-turbo',
            'openai/gpt-4-turbo-preview',
            'anthropic/claude-3-haiku',
            'meta-llama/llama-2-70b-chat'
          ]
        }),
        sortOrder: 12
      }
    ];

    // Insertar todas las nuevas configuraciones
    const allSettings = [...geminiSettings, ...openrouterSettings];
    
    for (const setting of allSettings) {
      await queryRunner.query(`
        INSERT INTO system_settings (
          "key", "name", "description", "type", "category", 
          "value", "defaultValue", "isEditable", "requiresRestart", 
          "validationRules", "sortOrder", "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW()
        ) ON CONFLICT ("key") DO UPDATE SET
          "name" = EXCLUDED."name",
          "description" = EXCLUDED."description",
          "validationRules" = EXCLUDED."validationRules",
          "sortOrder" = EXCLUDED."sortOrder",
          "updatedAt" = NOW()
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
    // Restaurar ai_provider a solo anthropic y openai
    await queryRunner.query(`
      UPDATE system_settings 
      SET 
        "description" = 'Selecciona el proveedor de servicios de IA (anthropic, openai)',
        "validationRules" = '{"options":["anthropic","openai"],"required":true}',
        "updatedAt" = NOW()
      WHERE "key" = 'ai_provider'
    `);

    // Eliminar configuraciones de Gemini y OpenRouter
    await queryRunner.query(`
      DELETE FROM system_settings 
      WHERE "key" IN (
        'gemini_api_key', 
        'ai_model_gemini',
        'openrouter_api_key', 
        'ai_model_openrouter'
      )
    `);
  }
}