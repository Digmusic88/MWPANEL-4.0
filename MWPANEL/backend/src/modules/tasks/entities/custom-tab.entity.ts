import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Teacher } from '../../teachers/entities/teacher.entity';
import { Task } from './task.entity';

@Entity('custom_tabs')
export class CustomTab {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 7, default: '#1890ff' })
  color: string;

  @Column({ length: 50, default: 'FolderOutlined' })
  icon: string;

  @Column({ type: 'int', default: 0, name: 'order_index' })
  orderIndex: number;

  @Column({ default: false, name: 'is_default' })
  isDefault: boolean;

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  // Relación con el profesor
  @Column({ name: 'teacher_id' })
  teacherId: string;

  @ManyToOne(() => Teacher, teacher => teacher.customTabs, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'teacher_id' })
  teacher: Teacher;

  // Relación con tareas
  @OneToMany(() => Task, task => task.customTab)
  tasks: Task[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}