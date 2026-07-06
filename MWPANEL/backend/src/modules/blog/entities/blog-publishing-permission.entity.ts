import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ClassGroup } from '../../students/entities/class-group.entity';

/**
 * BlogPublishingPermission
 *
 * Define qué profesores pueden publicar en qué grupos de clase.
 * El administrador configura estos permisos desde el panel de admin.
 */
@Entity('blog_publishing_permissions')
@Unique(['teacherId', 'classGroupId']) // Un profesor solo puede tener un permiso por grupo
@Index(['teacherId'])
@Index(['classGroupId'])
export class BlogPublishingPermission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  teacherId: string;

  @Column('uuid')
  classGroupId: string;

  @Column('uuid', { nullable: true })
  createdById: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'teacherId' })
  teacher: User;

  @ManyToOne(() => ClassGroup, { eager: true })
  @JoinColumn({ name: 'classGroupId' })
  classGroup: ClassGroup;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @CreateDateColumn()
  createdAt: Date;
}
