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
import { SubjectAssignment } from '../../students/entities/subject-assignment.entity';
import { LessonFolder } from './lesson-folder.entity';

@Entity('lesson_workspaces')
export class LessonWorkspace {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'subject_assignment_id' })
  subjectAssignmentId: string;

  @Column({ name: 'drive_folder_id', nullable: true })
  driveFolderId?: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'is_archived', default: false })
  isArchived: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relaciones
  @ManyToOne(() => SubjectAssignment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subject_assignment_id' })
  subjectAssignment: SubjectAssignment;

  @OneToMany(() => LessonFolder, folder => folder.workspace)
  folders: LessonFolder[];

  // Computed properties
  get teacherId(): string {
    return this.subjectAssignment?.teacherId;
  }

  get subjectId(): string {
    return this.subjectAssignment?.subjectId;
  }

  get classGroupId(): string {
    return this.subjectAssignment?.classGroupId;
  }

  get academicYearId(): string {
    return this.subjectAssignment?.academicYearId;
  }

  // Propiedades virtuales para exponer datos anidados
  get subject() {
    return this.subjectAssignment?.subject;
  }

  get classGroup() {
    return this.subjectAssignment?.classGroup;
  }

  get teacher() {
    const teacher = this.subjectAssignment?.teacher;
    if (!teacher) return null;
    
    const teacherProfile = teacher.user?.profile;
    return {
      id: teacher.id,
      name: teacherProfile ? `${teacherProfile.firstName} ${teacherProfile.lastName}` : 'Sin nombre',
      email: teacher.user?.email || '',
      profile: teacherProfile
    };
  }

  get academicYear() {
    return this.subjectAssignment?.academicYear;
  }

  // Estadísticas calculadas
  get stats() {
    if (!this.folders) return null;
    
    const totalFolders = this.folders.length;
    const totalResources = this.folders.reduce((sum, folder) => 
      sum + (folder.resources?.length || 0), 0
    );
    
    // Contar recursos por tipo
    const resourcesByType = {};
    this.folders.forEach(folder => {
      if (folder.resources) {
        folder.resources.forEach(resource => {
          const type = resource.type || 'unknown';
          resourcesByType[type] = (resourcesByType[type] || 0) + 1;
        });
      }
    });

    return {
      totalFolders,
      totalResources,
      resourcesByType
    };
  }
}