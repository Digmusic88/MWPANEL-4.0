import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  BeforeUpdate,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import { CoordinationItem } from './coordination-item.entity';

@Entity('coordination_sheets')
export class CoordinationSheet {
  @ApiProperty({ description: 'ID único de la hoja de coordinación' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Título de la reunión', example: 'Reunión Claustro 15/11/2024' })
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @ApiProperty({ description: 'Descripción opcional de la reunión' })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ApiProperty({ description: 'Fecha de la reunión' })
  @Column({ type: 'date' })
  meeting_date: Date;

  @ApiProperty({ description: 'Porcentaje de progreso calculado automáticamente', example: 75 })
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  progress_percentage: number;

  @ApiProperty({ description: 'Si la hoja es editable por usuarios con permisos' })
  @Column({ type: 'boolean', default: true })
  is_editable: boolean;

  @ApiProperty({ description: 'Si la hoja está activa (visible en dashboard)' })
  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @ApiProperty({ description: 'IDs de usuarios con permisos de edición (JSON array)' })
  @Column({ type: 'json', nullable: true })
  allowed_editors?: string[];

  @ApiProperty({ description: 'Nivel de permisos: open, restricted, readonly' })
  @Column({ 
    type: 'enum', 
    enum: ['open', 'restricted', 'readonly'],
    default: 'open'
  })
  permission_level: 'open' | 'restricted' | 'readonly';

  // Relaciones
  @ApiProperty({ description: 'Usuario que creó la hoja' })
  @Column({ type: 'uuid' })
  created_by_id: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'created_by_id' })
  created_by: User;

  @OneToMany(() => CoordinationItem, item => item.sheet, { cascade: true })
  items: CoordinationItem[];

  // Campos de auditoría
  @ApiProperty({ description: 'Fecha de creación' })
  @CreateDateColumn()
  created_at: Date;

  @ApiProperty({ description: 'Fecha de última actualización' })
  @UpdateDateColumn()
  updated_at: Date;

  // Métodos calculados
  @BeforeUpdate()
  calculateProgress() {
    if (this.items && this.items.length > 0) {
      const completedItems = this.items.filter(item => item.is_completed).length;
      this.progress_percentage = Math.round((completedItems / this.items.length) * 100);
    } else {
      this.progress_percentage = 0;
    }
  }

  // Método para verificar si un usuario puede editar
  canEdit(userId: string, userRole: string): boolean {
    // Admin siempre puede editar
    if (userRole === 'admin') return true;
    
    // Si no es editable, solo admin puede editar
    if (!this.is_editable) return false;
    
    // Si es readonly, nadie excepto admin puede editar
    if (this.permission_level === 'readonly') return false;
    
    // Si es open, todos pueden editar
    if (this.permission_level === 'open') return true;
    
    // Si es restricted, solo usuarios permitidos pueden editar
    if (this.permission_level === 'restricted') {
      return this.allowed_editors?.includes(userId) || this.created_by_id === userId;
    }
    
    return false;
  }

  // Método para verificar si un usuario puede ver la hoja
  canView(userId: string): boolean {
    // Si está inactiva, solo el creador y admin pueden ver
    if (!this.is_active) {
      return this.created_by_id === userId;
    }
    
    // Si está activa, todos los profesores pueden ver
    return true;
  }
}