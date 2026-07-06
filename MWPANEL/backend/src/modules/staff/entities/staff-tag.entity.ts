/**
 * @archivo: staff-tag.entity.ts
 * @modulo: Staff (Claustro)
 * @funcion: Etiquetas personalizables para categorizar tareas del claustro
 * @relacionado_con: staff-task.entity.ts
 */

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToMany,
} from 'typeorm';
import { StaffTask } from './staff-task.entity';

@Entity('staff_tags')
export class StaffTag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  color: string;

  @ManyToMany(() => StaffTask, task => task.tags)
  tasks: StaffTask[];

  @CreateDateColumn()
  createdAt: Date;
}
