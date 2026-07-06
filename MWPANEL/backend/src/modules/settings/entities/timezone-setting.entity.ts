import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('timezone_settings')
export class TimezoneSetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 100,
    default: 'Europe/Madrid',
    comment: 'Zona horaria principal del sistema',
  })
  timezone: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'DD/MM/YYYY HH:mm',
    comment: 'Formato de display para fechas y horas',
  })
  displayFormat: string;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Ajuste automático horario de verano',
  })
  autoDST: boolean;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Si esta configuración está activa',
  })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}