import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  ManyToMany,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import { CoordinationSheet } from './coordination-sheet.entity';

export enum AssignmentType {
  ALL = 'all',           // Asignado a todos los profesores
  INDIVIDUAL = 'individual',  // Asignado a usuarios específicos
  DEPARTMENT = 'department',   // Asignado por departamento (usar subject_assignments)
}

@Entity('coordination_items')
export class CoordinationItem {
  @ApiProperty({ description: 'ID único del item de coordinación' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Título del acuerdo/compromiso', example: 'Preparar festival de Navidad' })
  @Column({ type: 'varchar', length: 255 })
  item_title: string;

  @ApiProperty({ description: 'Descripción detallada en formato Markdown' })
  @Column({ type: 'text', nullable: true })
  item_description?: string;

  @ApiProperty({ description: 'Fecha límite para completar el item' })
  @Column({ type: 'date', nullable: true })
  due_date?: Date;

  @ApiProperty({ description: 'Si el item está completado' })
  @Column({ type: 'boolean', default: false })
  is_completed: boolean;

  @ApiProperty({ description: 'Tipo de asignación', enum: AssignmentType })
  @Column({
    type: 'enum',
    enum: AssignmentType,
    default: AssignmentType.ALL
  })
  assignment_type: AssignmentType;

  @ApiProperty({ description: 'Prioridad del item: low, medium, high' })
  @Column({
    type: 'enum',
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  })
  priority: 'low' | 'medium' | 'high';

  @ApiProperty({ description: 'Orden de visualización en la lista' })
  @Column({ type: 'integer', default: 0 })
  order_index: number;

  @ApiProperty({ description: 'Tags/etiquetas del item (JSON array)' })
  @Column({ type: 'json', nullable: true })
  tags?: string[];

  @ApiProperty({ description: 'Color del item para destacado visual' })
  @Column({ type: 'varchar', length: 7, nullable: true })
  color?: string;

  // Relaciones
  @ApiProperty({ description: 'Hoja de coordinación a la que pertenece' })
  @Column({ type: 'uuid' })
  sheet_id: string;

  @ManyToOne(() => CoordinationSheet, sheet => sheet.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sheet_id' })
  sheet: CoordinationSheet;

  @ApiProperty({ description: 'Usuario que creó el item' })
  @Column({ type: 'uuid' })
  created_by_id: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'created_by_id' })
  created_by: User;

  @ApiProperty({ description: 'Usuario que completó el item' })
  @Column({ type: 'uuid', nullable: true })
  completed_by_id?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'completed_by_id' })
  completed_by?: User;

  @ApiProperty({ description: 'Fecha de completado' })
  @Column({ type: 'timestamp', nullable: true })
  completed_at?: Date;

  @ApiProperty({ description: 'Usuarios asignados específicamente (para assignment_type INDIVIDUAL)' })
  @ManyToMany(() => User)
  @JoinTable({
    name: 'coordination_item_assignments',
    joinColumn: { name: 'item_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' }
  })
  assigned_users: User[];

  @ApiProperty({ description: 'Departamentos asignados (para assignment_type DEPARTMENT)' })
  @Column({ type: 'json', nullable: true })
  assigned_departments?: string[];

  // Campos de auditoría
  @ApiProperty({ description: 'Fecha de creación' })
  @CreateDateColumn()
  created_at: Date;

  @ApiProperty({ description: 'Fecha de última actualización' })
  @UpdateDateColumn()
  updated_at: Date;

  // Métodos de utilidad
  isAssignedTo(userId: string, userDepartment?: string): boolean {
    switch (this.assignment_type) {
      case AssignmentType.ALL:
        return true;
      case AssignmentType.INDIVIDUAL:
        return this.assigned_users?.some(user => user.id === userId) || false;
      case AssignmentType.DEPARTMENT:
        // Implement department assignment logic
        if (!userDepartment || !this.assigned_departments?.length) {
          return false;
        }
        // Check if user's department is in the assigned departments list
        return this.assigned_departments.includes(userDepartment);
      default:
        return false;
    }
  }

  canComplete(userId: string, userRole: string, userDepartment?: string): boolean {
    // Admin siempre puede completar
    if (userRole === 'admin') return true;
    
    // Solo usuarios asignados pueden completar
    return this.isAssignedTo(userId, userDepartment);
  }

  canEdit(userId: string, userRole: string): boolean {
    // Admin siempre puede editar
    if (userRole === 'admin') return true;
    
    // El creador del item puede editarlo
    if (this.created_by_id === userId) return true;
    
    // Para otros permisos, defer to the service layer
    return false;
  }

  complete(userId: string): void {
    this.is_completed = true;
    this.completed_by_id = userId;
    this.completed_at = new Date();
  }

  uncomplete(): void {
    this.is_completed = false;
    this.completed_by_id = null;
    this.completed_at = null;
  }

  // Método para obtener color según prioridad
  getPriorityColor(): string {
    if (this.color) return this.color;
    
    switch (this.priority) {
      case 'high': return '#ff4d4f';    // Rojo
      case 'medium': return '#faad14';  // Amarillo
      case 'low': return '#52c41a';     // Verde
      default: return '#1890ff';       // Azul por defecto
    }
  }

  // Método para verificar si está vencido
  isOverdue(): boolean {
    if (!this.due_date || this.is_completed) return false;
    return new Date() > new Date(this.due_date);
  }

  // Método para obtener días restantes
  getDaysRemaining(): number | null {
    if (!this.due_date || this.is_completed) return null;
    const now = new Date();
    const dueDate = new Date(this.due_date);
    const diffTime = dueDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}