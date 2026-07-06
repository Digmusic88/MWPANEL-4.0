import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { LessonWorkspace } from './lesson-workspace.entity';
import { LessonResource } from './lesson-resource.entity';

@Entity('lesson_folders')
export class LessonFolder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workspace_id' })
  workspaceId: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'order_index', default: 0 })
  orderIndex: number;

  @Column({ name: 'drive_folder_id', nullable: true })
  driveFolderId?: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relaciones
  @ManyToOne(() => LessonWorkspace, workspace => workspace.folders, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: LessonWorkspace;

  @OneToMany(() => LessonResource, resource => resource.lessonFolder)
  resources: LessonResource[];

  // Computed properties
  get resourceCount(): number {
    return this.resources?.filter(r => r.isActive).length || 0;
  }

  get hasFiles(): boolean {
    return this.resources?.some(r => r.isActive && r.type === 'FILE') || false;
  }

  get hasTsxArtifacts(): boolean {
    return this.resources?.some(r => r.isActive && r.type === 'TSX_ARTIFACT') || false;
  }
}