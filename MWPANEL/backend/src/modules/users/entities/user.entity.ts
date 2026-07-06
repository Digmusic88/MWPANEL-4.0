/**
 * @archivo: user.entity.ts
 * @módulo: Users (Authentication & Authorization Core)
 * @función: Entity principal para autenticación y autorización del sistema
 * @crítico: SÍ - Base de todo el sistema de usuarios
 * @dependencias: UserProfile, todos los módulos del sistema
 * @no_modificar: UserRole enum - cambios afectan a todo el sistema
 * @relacionado_con: user-profile.entity.ts, auth.service.ts, auth.guard.ts
 */

/**
 * MAPA DE DEPENDENCIAS - User Entity (NÚCLEO DEL SISTEMA)
 * 
 * ESTE MÓDULO ES USADO POR:
 * - AuthService (autenticación JWT)
 * - RolesGuard (autorización por roles)
 * - Todos los controllers (decorador @CurrentUser)
 * - TasksService (autoría de tareas)
 * - ActivitiesService (creación de actividades)
 * - TypeQuestService (perfiles de juego)
 * 
 * ESTE MÓDULO USA:
 * - UserProfile (relación 1:1)
 * - bcrypt (encriptación de contraseñas)
 * 
 * MODIFICAR CON EXTREMO CUIDADO: Es la base del sistema de autenticación
 */

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserProfile } from './user-profile.entity';

// CRÍTICO: UserRole enum - NO MODIFICAR sin revisar guards y decoradores
// USADO POR: RolesGuard, @Roles decorator, todos los controllers
// NOTA: Si se modifica, actualizar también auth.guard.ts y role.decorator.ts
/**
 * ROLES DEL SISTEMA - NOMENCLATURA FIJA
 * 
 * ADMIN: Acceso completo al sistema, gestión de usuarios
 * TEACHER: Gestión de evaluaciones, tareas, actividades, calificaciones
 * STUDENT: Acceso a tareas propias, TypeQuest, visualización de notas
 * FAMILY: Visualización de progreso de hijos, comunicaciones
 * 
 * NO AGREGAR MÁS ROLES sin analizar impacto en:
 * - Guards de autorización
 * - Decoradores @Roles
 * - Frontend routing y permisos
 */
export enum UserRole {
  ADMIN = 'admin',     // Administrador del sistema
  TEACHER = 'teacher', // Profesorado
  STUDENT = 'student', // Estudiantes
  FAMILY = 'family',   // Familias/Padres
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  passwordHash: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.STUDENT,
  })
  role: UserRole;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  lastLoginAt: Date;

  @Column({ nullable: true, select: false, name: 'temporaryPasswordHash' })
  temporaryPasswordHash: string;

  @Column({ default: false, name: 'isPasswordTemporary' })
  isPasswordTemporary: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(() => UserProfile, profile => profile.user)
  profile: UserProfile;

  // Virtual fields for passwords (not persisted to database)
  password?: string;
  temporaryPassword?: string;

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    // Hash regular password
    if (this.password && this.password.trim() !== '') {
      console.log(`Hashing password for user: ${this.email}`);
      this.passwordHash = await bcrypt.hash(this.password, 10);
      // Clear the virtual password field to avoid accidental exposure
      delete this.password;
      console.log(`Password hashed successfully for user: ${this.email}`);
    }

    // Hash temporary password
    if (this.temporaryPassword && this.temporaryPassword.trim() !== '') {
      console.log(`Hashing temporary password for user: ${this.email}`);
      this.temporaryPasswordHash = await bcrypt.hash(this.temporaryPassword, 10);
      this.isPasswordTemporary = true;
      // Clear the virtual temporary password field
      delete this.temporaryPassword;
      console.log(`Temporary password hashed successfully for user: ${this.email}`);
    }
  }

  async validatePassword(password: string): Promise<boolean> {
    // First try regular password
    const isValidRegular = await bcrypt.compare(password, this.passwordHash);
    if (isValidRegular) {
      return true;
    }

    // If regular password fails and user has temporary password, try temporary
    if (this.temporaryPasswordHash && this.isPasswordTemporary) {
      const isValidTemporary = await bcrypt.compare(password, this.temporaryPasswordHash);
      return isValidTemporary;
    }

    return false;
  }

  async validateTemporaryPassword(password: string): Promise<boolean> {
    if (!this.temporaryPasswordHash || !this.isPasswordTemporary) {
      return false;
    }
    return bcrypt.compare(password, this.temporaryPasswordHash);
  }

  // Method to clear temporary password after first successful login
  clearTemporaryPassword(): void {
    this.temporaryPasswordHash = null;
    this.isPasswordTemporary = false;
  }
}