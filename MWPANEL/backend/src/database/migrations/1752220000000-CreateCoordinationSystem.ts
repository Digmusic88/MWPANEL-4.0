import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCoordinationSystem1752220000000 implements MigrationInterface {
    name = 'CreateCoordinationSystem1752220000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Crear tabla coordination_sheets
        await queryRunner.query(`
            CREATE TABLE coordination_sheets (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                title VARCHAR(255) NOT NULL,
                description TEXT,
                meeting_date DATE NOT NULL,
                progress_percentage DECIMAL(5,2) DEFAULT 0,
                is_editable BOOLEAN DEFAULT true,
                is_active BOOLEAN DEFAULT true,
                allowed_editors JSON,
                permission_level TEXT CHECK (permission_level IN ('open', 'restricted', 'readonly')) DEFAULT 'open',
                created_by_id UUID NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_coordination_sheets_created_by 
                    FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // Crear tabla coordination_items
        await queryRunner.query(`
            CREATE TABLE coordination_items (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                item_title VARCHAR(255) NOT NULL,
                item_description TEXT,
                due_date DATE,
                is_completed BOOLEAN DEFAULT false,
                assignment_type TEXT CHECK (assignment_type IN ('all', 'individual', 'department')) DEFAULT 'all',
                priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
                order_index INTEGER DEFAULT 0,
                tags JSON,
                color VARCHAR(7),
                sheet_id UUID NOT NULL,
                created_by_id UUID NOT NULL,
                completed_by_id UUID,
                completed_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_coordination_items_sheet 
                    FOREIGN KEY (sheet_id) REFERENCES coordination_sheets(id) ON DELETE CASCADE,
                CONSTRAINT fk_coordination_items_created_by 
                    FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE CASCADE,
                CONSTRAINT fk_coordination_items_completed_by 
                    FOREIGN KEY (completed_by_id) REFERENCES users(id) ON DELETE SET NULL
            )
        `);

        // Crear tabla de relación coordination_item_assignments
        await queryRunner.query(`
            CREATE TABLE coordination_item_assignments (
                item_id UUID NOT NULL,
                user_id UUID NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (item_id, user_id),
                CONSTRAINT fk_coordination_assignments_item 
                    FOREIGN KEY (item_id) REFERENCES coordination_items(id) ON DELETE CASCADE,
                CONSTRAINT fk_coordination_assignments_user 
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // Crear índices para optimizar rendimiento
        await queryRunner.query(`
            CREATE INDEX idx_coordination_sheets_meeting_date ON coordination_sheets(meeting_date);
        `);
        
        await queryRunner.query(`
            CREATE INDEX idx_coordination_sheets_is_active ON coordination_sheets(is_active);
        `);
        
        await queryRunner.query(`
            CREATE INDEX idx_coordination_sheets_created_by ON coordination_sheets(created_by_id);
        `);

        await queryRunner.query(`
            CREATE INDEX idx_coordination_items_sheet_id ON coordination_items(sheet_id);
        `);
        
        await queryRunner.query(`
            CREATE INDEX idx_coordination_items_is_completed ON coordination_items(is_completed);
        `);
        
        await queryRunner.query(`
            CREATE INDEX idx_coordination_items_due_date ON coordination_items(due_date);
        `);
        
        await queryRunner.query(`
            CREATE INDEX idx_coordination_items_assignment_type ON coordination_items(assignment_type);
        `);

        // Crear trigger para actualizar updated_at automáticamente
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION update_coordination_updated_at()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql';
        `);

        await queryRunner.query(`
            CREATE TRIGGER coordination_sheets_updated_at_trigger
                BEFORE UPDATE ON coordination_sheets
                FOR EACH ROW
                EXECUTE FUNCTION update_coordination_updated_at();
        `);

        await queryRunner.query(`
            CREATE TRIGGER coordination_items_updated_at_trigger
                BEFORE UPDATE ON coordination_items
                FOR EACH ROW
                EXECUTE FUNCTION update_coordination_updated_at();
        `);

        // Crear función para actualizar progress_percentage automáticamente
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION update_coordination_sheet_progress()
            RETURNS TRIGGER AS $$
            BEGIN
                UPDATE coordination_sheets
                SET progress_percentage = (
                    SELECT CASE 
                        WHEN COUNT(*) = 0 THEN 0
                        ELSE ROUND((COUNT(*) FILTER (WHERE is_completed = true)::DECIMAL / COUNT(*)) * 100, 2)
                    END
                    FROM coordination_items
                    WHERE sheet_id = COALESCE(NEW.sheet_id, OLD.sheet_id)
                )
                WHERE id = COALESCE(NEW.sheet_id, OLD.sheet_id);
                
                RETURN COALESCE(NEW, OLD);
            END;
            $$ language 'plpgsql';
        `);

        await queryRunner.query(`
            CREATE TRIGGER coordination_items_progress_trigger
                AFTER INSERT OR UPDATE OR DELETE ON coordination_items
                FOR EACH ROW
                EXECUTE FUNCTION update_coordination_sheet_progress();
        `);

        console.log('✅ Migración del sistema de coordinación completada');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Eliminar triggers
        await queryRunner.query(`DROP TRIGGER IF EXISTS coordination_items_progress_trigger ON coordination_items;`);
        await queryRunner.query(`DROP TRIGGER IF EXISTS coordination_items_updated_at_trigger ON coordination_items;`);
        await queryRunner.query(`DROP TRIGGER IF EXISTS coordination_sheets_updated_at_trigger ON coordination_sheets;`);
        
        // Eliminar funciones
        await queryRunner.query(`DROP FUNCTION IF EXISTS update_coordination_sheet_progress();`);
        await queryRunner.query(`DROP FUNCTION IF EXISTS update_coordination_updated_at();`);
        
        // Eliminar tablas en orden correcto
        await queryRunner.query(`DROP TABLE IF EXISTS coordination_item_assignments;`);
        await queryRunner.query(`DROP TABLE IF EXISTS coordination_items;`);
        await queryRunner.query(`DROP TABLE IF EXISTS coordination_sheets;`);

        console.log('✅ Rollback del sistema de coordinación completado');
    }
}