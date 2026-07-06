import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Student } from '../../students/entities/student.entity';
import { User } from '../../users/entities/user.entity';

export enum AttendanceRequestType {
  ABSENCE = 'absence',
  LATE_ARRIVAL = 'late_arrival',
  EARLY_DEPARTURE = 'early_departure',
}

export enum AttendanceRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

@Entity('attendance_requests')
@Index(['studentId', 'date'])
@Index(['status'])
@Index(['requestedById'])
export class AttendanceRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  studentId: string;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: Student;

  @Column({ type: 'uuid' })
  requestedById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'requestedById' })
  requestedBy: User; // Familia que solicita

  @Column({
    type: 'enum',
    enum: AttendanceRequestType,
  })
  type: AttendanceRequestType;

  @Column({ type: 'date' })
  date: Date; // Fecha para la cual se solicita la justificación

  @Column({ type: 'text' })
  reason: string; // Mínimo 10 caracteres

  @Column({
    type: 'enum',
    enum: AttendanceRequestStatus,
    default: AttendanceRequestStatus.PENDING,
  })
  status: AttendanceRequestStatus;

  @Column({ type: 'uuid', nullable: true })
  reviewedById?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewedById' })
  reviewedBy?: User; // Profesor que revisa

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt?: Date;

  @Column({ type: 'text', nullable: true })
  reviewNote?: string; // Nota del profesor al aprobar/rechazar

  @Column({ type: 'time', nullable: true })
  expectedArrivalTime?: string; // Para retrasos: hora esperada de llegada

  @Column({ type: 'time', nullable: true })
  expectedDepartureTime?: string; // Para salidas anticipadas: hora de salida

  @Column({ type: 'uuid', nullable: true })
  messageId?: string; // ID del mensaje asociado en el sistema de comunicaciones

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}