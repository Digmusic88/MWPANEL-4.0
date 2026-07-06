import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('moderation_config')
export class ModerationConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'boolean', default: false })
  autoModerationEnabled: boolean;

  @Column({ type: 'jsonb', default: [] })
  bannedWords: string[];

  @Column({ type: 'jsonb', default: [] })
  suspiciousPhrases: string[];

  @Column({ type: 'integer', default: 5, comment: 'Sensibilidad del filtro 1-10' })
  sensitivity: number;

  @Column({ type: 'boolean', default: false })
  autoApproveTrustedUsers: boolean;

  @Column({ type: 'jsonb', default: [] })
  trustedUserIds: string[];

  @Column({ type: 'jsonb', default: [] })
  whitelistedDomains: string[];

  @Column({ type: 'boolean', default: true })
  notifyModeratorsOnReport: boolean;

  @Column({ type: 'boolean', default: false })
  notifyUsersOnAction: boolean;

  @Column({ type: 'integer', default: 24, comment: 'Horas máximas para moderar contenido' })
  maxModerationHours: number;

  @Column({ type: 'jsonb', nullable: true })
  emailNotificationSettings: {
    enabled: boolean;
    moderatorEmails: string[];
    reportThreshold: number; // Número de reportes para enviar alerta
  };

  @Column({ type: 'jsonb', nullable: true })
  autoModerationRules: {
    rule: string;
    action: 'flag' | 'reject' | 'approve';
    severity: number;
  }[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}