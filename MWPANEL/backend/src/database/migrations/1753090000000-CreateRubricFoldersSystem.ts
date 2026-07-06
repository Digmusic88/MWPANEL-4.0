import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateRubricFoldersSystem1753090000000 implements MigrationInterface {
  name = 'CreateRubricFoldersSystem1753090000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Crear tabla de carpetas de rúbricas
    await queryRunner.createTable(
      new Table({
        name: 'rubric_folders',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'color',
            type: 'varchar',
            length: '7',
            isNullable: true,
            comment: 'Color hexadecimal para la carpeta (#RRGGBB)',
          },
          {
            name: 'icon',
            type: 'varchar',
            length: '50',
            isNullable: true,
            default: "'folder'",
            comment: 'Icono de Ant Design para la carpeta',
          },
          {
            name: 'parent_folder_id',
            type: 'uuid',
            isNullable: true,
            comment: 'ID de la carpeta padre (null para carpeta raíz)',
          },
          {
            name: 'teacher_id',
            type: 'uuid',
            isNullable: false,
            comment: 'Propietario de la carpeta',
          },
          {
            name: 'is_shared',
            type: 'boolean',
            default: false,
            comment: 'Si la carpeta es compartida con otros profesores',
          },
          {
            name: 'shared_with',
            type: 'uuid',
            isArray: true,
            isNullable: true,
            comment: 'Array de IDs de profesores con acceso',
          },
          {
            name: 'order_index',
            type: 'integer',
            default: 0,
            comment: 'Orden de visualización dentro de la carpeta padre',
          },
          {
            name: 'is_system_folder',
            type: 'boolean',
            default: false,
            comment: 'Si es una carpeta del sistema (no editable por usuarios)',
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Agregar columna folder_id a la tabla rubrics
    await queryRunner.query(`
      ALTER TABLE rubrics 
      ADD COLUMN folder_id uuid NULL;
    `);

    // Crear índices para optimizar consultas
    await queryRunner.query(`CREATE INDEX IDX_rubric_folders_teacher_id ON rubric_folders (teacher_id);`);
    await queryRunner.query(`CREATE INDEX IDX_rubric_folders_parent_folder_id ON rubric_folders (parent_folder_id);`);
    await queryRunner.query(`CREATE INDEX IDX_rubric_folders_is_active ON rubric_folders (is_active);`);
    await queryRunner.query(`CREATE INDEX IDX_rubrics_folder_id ON rubrics (folder_id);`);

    // Crear claves foráneas
    await queryRunner.query(`
      ALTER TABLE rubric_folders 
      ADD CONSTRAINT FK_rubric_folders_parent_folder_id 
      FOREIGN KEY (parent_folder_id) REFERENCES rubric_folders(id) 
      ON DELETE SET NULL ON UPDATE CASCADE;
    `);

    await queryRunner.query(`
      ALTER TABLE rubric_folders 
      ADD CONSTRAINT FK_rubric_folders_teacher_id 
      FOREIGN KEY (teacher_id) REFERENCES teachers(id) 
      ON DELETE CASCADE ON UPDATE CASCADE;
    `);

    await queryRunner.query(`
      ALTER TABLE rubrics 
      ADD CONSTRAINT FK_rubrics_folder_id 
      FOREIGN KEY (folder_id) REFERENCES rubric_folders(id) 
      ON DELETE SET NULL ON UPDATE CASCADE;
    `);

    // Crear carpetas del sistema por defecto
    await queryRunner.query(`
      INSERT INTO rubric_folders (id, name, description, color, icon, parent_folder_id, teacher_id, is_system_folder, order_index)
      SELECT 
        uuid_generate_v4() as id,
        'Sin Carpeta' as name,
        'Rúbricas sin organizar en carpetas' as description,
        '#6B7280' as color,
        'inbox' as icon,
        NULL as parent_folder_id,
        t.id as teacher_id,
        true as is_system_folder,
        -1 as order_index
      FROM teachers t
      WHERE NOT EXISTS (
        SELECT 1 FROM rubric_folders rf 
        WHERE rf.teacher_id = t.id AND rf.is_system_folder = true
      );
    `);

    console.log('✅ Sistema de carpetas de rúbricas creado exitosamente');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Eliminar claves foráneas
    await queryRunner.query(`ALTER TABLE rubrics DROP CONSTRAINT IF EXISTS FK_rubrics_folder_id;`);
    await queryRunner.query(`ALTER TABLE rubric_folders DROP CONSTRAINT IF EXISTS FK_rubric_folders_parent_folder_id;`);
    await queryRunner.query(`ALTER TABLE rubric_folders DROP CONSTRAINT IF EXISTS FK_rubric_folders_teacher_id;`);

    // Eliminar índices
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_rubric_folders_teacher_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_rubric_folders_parent_folder_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_rubric_folders_is_active;`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_rubrics_folder_id;`);

    // Eliminar columna folder_id de rubrics
    await queryRunner.query(`ALTER TABLE rubrics DROP COLUMN IF EXISTS folder_id;`);

    // Eliminar tabla
    await queryRunner.dropTable('rubric_folders');

    console.log('❌ Sistema de carpetas de rúbricas eliminado');
  }
}