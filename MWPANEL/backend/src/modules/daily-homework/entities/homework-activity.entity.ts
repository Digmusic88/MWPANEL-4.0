import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { HomeworkSubject } from './homework-subject.entity';
import { HomeworkActivityRecord } from './homework-activity-record.entity';

@Entity('homework_activities')
export class HomeworkActivity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'subject_id' }) subjectId: string;
  @ManyToOne(() => HomeworkSubject, (s) => s.activities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subject_id' }) subject: HomeworkSubject;
  @Column({ length: 150 }) name: string;
  @Column({ type: 'date' }) date: string;
  @Column({ type: 'text', nullable: true }) description: string | null;
  @OneToMany(() => HomeworkActivityRecord, (r) => r.activity) records: HomeworkActivityRecord[];
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
