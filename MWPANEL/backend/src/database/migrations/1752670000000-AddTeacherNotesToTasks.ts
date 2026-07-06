import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddTeacherNotesToTasks1752670000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn('tasks', new TableColumn({
            name: 'teacherNotes',
            type: 'text',
            isNullable: true,
            comment: 'Notas privadas del profesor, no visibles para padres'
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('tasks', 'teacherNotes');
    }
}