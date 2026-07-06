import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
  Unique,
} from 'typeorm';
import { EducationalResource } from './educational-resource.entity';
import { User } from '../../users/entities/user.entity';

@Entity('resource_favorites')
@Unique('UQ_resource_favorites_resource_user', ['resourceId', 'userId'])
export class ResourceFavorite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  resourceId: string;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => EducationalResource, resource => resource.favorites, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'resourceId' })
  resource: EducationalResource;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;
}