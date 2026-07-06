/**
 * @archivo: auth.service.ts
 * @módulo: Auth (Sistema de Autenticación Central)
 * @función: Autenticación JWT, gestión de tokens, seguridad del sistema
 * @crítico: SÍ - NÚCLEO DE SEGURIDAD DEL SISTEMA COMPLETO
 * @dependencias: JwtService, User, RefreshToken, UsersService, TypeQuestStatsService
 * @no_modificar: JwtPayload interface sin revisar toda la autenticación
 * @relacionado_con: jwt-auth.guard.ts, roles.guard.ts, users.service.ts
 */

/**
 * MAPA DE DEPENDENCIAS - AuthService (CRÍTICO MÁXIMO)
 * 
 * ESTE MÓDULO ES USADO POR:
 * - AuthController (endpoints de login/registro)
 * - JwtAuthGuard (validación de tokens en TODOS los endpoints)
 * - TypeQuest (autenticación compartida)
 * - Frontend (almacenamiento de tokens)
 * - TODOS los módulos protegidos del sistema
 * 
 * ESTE MÓDULO USA:
 * - JwtService (generación/validación tokens)
 * - UsersService (gestión de usuarios)
 * - TypeQuestStatsService (integración con juego)
 * - bcrypt (encriptación contraseñas)
 * 
 * MODIFICAR CON EXTREMO CUIDADO: Cambios afectan TODO el sistema
 * 
 * FUNCIONALIDADES CRÍTICAS:
 * - Login/Logout con JWT + Refresh Token
 * - Validación de contraseñas con bcrypt
 * - Integración automática con TypeQuest
 * - Gestión de roles y permisos
 * - Límites de tiempo para TypeQuest (20min diarios)
 */

import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { EmailService } from '../communications/services/email.service';
import { EmailPriority } from '../communications/entities/email-notification.entity';

// CRÍTICO: JwtPayload - Estructura de datos en tokens JWT
// USADO POR: JwtStrategy, AuthGuard, @CurrentUser decorator
// NOTA: Si se modifica, actualizar jwt.strategy.ts y current-user.decorator.ts
/**
 * ESTRUCTURA DEL PAYLOAD JWT - NO MODIFICAR
 * 
 * sub: User ID (UUID) - Identificador único del usuario
 * email: Email del usuario - Para validación y logs
 * role: UserRole (admin/teacher/student/family) - Para autorización
 * iat: Issued At - Timestamp de emisión del token
 * exp: Expires At - Timestamp de expiración (añadido por JWT automáticamente)
 * 
 * USADO EN:
 * - Generación de access tokens (15 min)
 * - Generación de refresh tokens (7 días)
 * - Validación en guards
 * - Decorador @CurrentUser en controllers
 */
export interface JwtPayload {
  sub: string;      // User ID (UUID)
  email: string;    // Email del usuario
  role: string;     // UserRole del usuario
  iat?: number;     // Issued At timestamp
  exp?: number;
}

export interface AuthResult {
  user: User;
  accessToken: string;
  refreshToken: string;
  timeLimitReached?: boolean;
  nextResetTime?: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .addSelect('user.temporaryPasswordHash')
      .leftJoinAndSelect('user.profile', 'profile')
      .where('LOWER(user.email) = LOWER(:email)', { email })
      .getOne();

    if (user && user.isActive && await user.validatePassword(password)) {
      // Update last login
      await this.usersRepository.update(user.id, {
        lastLoginAt: new Date(),
      });

      // fullName is already available as a getter in UserProfile

      // Si es un profesor, obtener también el teacherId
      if (user.role === UserRole.TEACHER) {
        const teacher = await this.usersRepository
          .createQueryBuilder('user')
          .leftJoin('teachers', 'teacher', 'teacher."userId" = user.id')
          .addSelect('teacher.id', 'teacherId')
          .where('user.id = :userId', { userId: user.id })
          .getRawOne();
        
        if (teacher?.teacherId) {
          (user as any).teacherId = teacher.teacherId;
        }
      }

      return user;
    }

    return null;
  }

  async login(loginDto: LoginDto): Promise<AuthResult> {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Note: TypeQuest time limits removed as system was deprecated
    const timeLimitReached = false;
    const nextResetTime = null;

    const tokens = await this.generateTokens(user);

    return {
      user,
      ...tokens,
      timeLimitReached,
      nextResetTime,
    };
  }

  async register(registerDto: RegisterDto): Promise<AuthResult> {
    // Check if user already exists
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new BadRequestException('El usuario ya existe');
    }

    // Create user
    const user = await this.usersService.create(registerDto);

    // Generate tokens
    const tokens = await this.generateTokens(user);

    return {
      user,
      ...tokens,
    };
  }

  async refreshTokens(refreshToken: string): Promise<{ accessToken: string }> {
    const tokenEntity = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken, isRevoked: false },
      relations: ['user'],
    });

    if (!tokenEntity) {
      throw new UnauthorizedException('Token de actualización inválido');
    }

    if (tokenEntity.expiresAt < new Date()) {
      throw new UnauthorizedException('Token de actualización expirado');
    }

    if (!tokenEntity.user.isActive) {
      throw new UnauthorizedException('Usuario inactivo');
    }

    // Generate new access token
    const payload: JwtPayload = {
      sub: tokenEntity.user.id,
      email: tokenEntity.user.email,
      role: tokenEntity.user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    return { accessToken };
  }

  async logout(refreshToken: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { token: refreshToken },
      { isRevoked: true, revokedAt: new Date() },
    );
  }

  async logoutAll(userId: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { user: { id: userId } },
      { isRevoked: true, revokedAt: new Date() },
    );
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .addSelect('user.temporaryPasswordHash')
      .where('user.id = :id', { id: userId })
      .getOne();

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const isCurrentPasswordValid = await user.validatePassword(
      changePasswordDto.currentPassword,
    );

    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Contraseña actual incorrecta');
    }

    // Update password and clear temporary password if exists
    user.password = changePasswordDto.newPassword;
    
    // Clear temporary password since user is setting a new permanent password
    if (user.isPasswordTemporary) {
      user.clearTemporaryPassword();
    }
    
    await this.usersRepository.save(user);

    // Revoke all refresh tokens to force re-login
    await this.logoutAll(userId);
  }

  private async generateTokens(user: User): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    // Generate access token
    const accessToken = this.jwtService.sign(payload);

    // Generate refresh token
    const refreshTokenValue = this.jwtService.sign(
      { sub: user.id },
      {
        secret: this.configService.get<string>('app.jwt.refreshSecret'),
        expiresIn: this.configService.get<string>('app.jwt.refreshExpiresIn'),
      },
    );

    // Save refresh token to database
    const refreshTokenEntity = this.refreshTokenRepository.create({
      token: refreshTokenValue,
      user,
      expiresAt: new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      ),
    });

    await this.refreshTokenRepository.save(refreshTokenEntity);

    return {
      accessToken,
      refreshToken: refreshTokenValue,
    };
  }

  async impersonateUser(adminId: string, targetUserId: string): Promise<AuthResult> {
    // Verificar que el admin tiene permisos
    const admin = await this.usersRepository.findOne({ where: { id: adminId } });
    if (!admin || admin.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Solo administradores pueden impersonar usuarios');
    }

    // Obtener usuario objetivo
    const targetUser = await this.usersRepository.findOne({
      where: { id: targetUserId },
      relations: ['profile'],
    });

    if (!targetUser) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (!targetUser.isActive) {
      throw new BadRequestException('No se puede impersonar un usuario inactivo');
    }

    // No permitir impersonar otros administradores
    if (targetUser.role === UserRole.ADMIN) {
      throw new ForbiddenException('No se puede impersonar otro administrador');
    }

    // Generar tokens para el usuario objetivo
    const tokens = await this.generateTokens(targetUser);

    // Log de auditoría
    console.log(`Admin ${admin.email} impersonating user ${targetUser.email} at ${new Date().toISOString()}`);

    // Actualizar último login del usuario objetivo
    await this.usersRepository.update(targetUser.id, {
      lastLoginAt: new Date(),
    });

    return {
      user: targetUser,
      ...tokens,
    };
  }

  async cleanExpiredTokens(): Promise<void> {
    await this.refreshTokenRepository.delete({
      expiresAt: new Date(),
    });
  }

  /**
   * Enriquece el usuario con referencias específicas por rol
   */
  async enrichUserWithRoleReferences(user: User): Promise<User> {
    try {
      console.log(`🔍 Enriching user ${user.email} with role ${user.role}`);
      
      // fullName is already available as a getter in UserProfile
      
      // Si es un profesor, obtener también el teacherId
      if (user.role === UserRole.TEACHER) {
        const teacher = await this.usersRepository
          .createQueryBuilder('user')
          .leftJoin('teachers', 'teacher', 'teacher."userId" = user.id')
          .addSelect('teacher.id', 'teacherId')
          .where('user.id = :userId', { userId: user.id })
          .getRawOne();
        
        console.log(`👨‍🏫 Teacher query result:`, teacher);
        
        if (teacher?.teacherId) {
          (user as any).teacherId = teacher.teacherId;
          console.log(`✅ Added teacherId ${teacher.teacherId} to user`);
        } else {
          console.log(`❌ No teacherId found for user ${user.email}`);
        }
      }

      // Si es un estudiante, obtener también el studentId
      if (user.role === UserRole.STUDENT) {
        const student = await this.usersRepository
          .createQueryBuilder('user')
          .leftJoin('students', 'student', 'student."userId" = user.id')
          .addSelect('student.id', 'studentId')
          .where('user.id = :userId', { userId: user.id })
          .getRawOne();
        
        if (student?.studentId) {
          (user as any).studentId = student.studentId;
        }
      }

      // Si es una familia, obtener también el familyId
      if (user.role === UserRole.FAMILY) {
        const family = await this.usersRepository
          .createQueryBuilder('user')
          .leftJoin('families', 'family', 'family."primaryContactId" = user.id OR family."secondaryContactId" = user.id')
          .addSelect('family.id', 'familyId')
          .where('user.id = :userId', { userId: user.id })
          .getRawOne();
        
        if (family?.familyId) {
          (user as any).familyId = family.familyId;
        }
      }

      return user;
    } catch (error) {
      console.warn('Error enriching user with role references:', error.message);
      return user; // Return original user if enrichment fails
    }
  }

  /**
   * Forgot password - Genera y envía una contraseña temporal por correo
   * Solo disponible para roles: admin, teacher, family
   */
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
    const { email } = forgotPasswordDto;

    // Buscar usuario por email
    const user = await this.usersRepository.findOne({
      where: { email: email.toLowerCase() },
      relations: ['profile'],
    });

    // Si no existe el usuario, devolver mensaje genérico (seguridad)
    if (!user) {
      return {
        message: 'Si el correo existe en el sistema, recibirás un email con la nueva contraseña.',
      };
    }

    // Verificar que el rol sea admin, teacher o family
    const allowedRoles = [UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY];
    if (!allowedRoles.includes(user.role as UserRole)) {
      throw new ForbiddenException(
        'La recuperación de contraseña solo está disponible para administradores, profesores y familias.',
      );
    }

    // Verificar que el usuario esté activo
    if (!user.isActive) {
      throw new ForbiddenException('Esta cuenta está desactivada.');
    }

    // Generar contraseña temporal aleatoria (8 caracteres alfanuméricos)
    const tempPassword = this.generateTemporaryPassword();

    // Hashear la contraseña temporal
    const tempPasswordHash = await bcrypt.hash(tempPassword, 10);

    // Actualizar usuario con contraseña temporal
    await this.usersRepository.update(user.id, {
      temporaryPasswordHash: tempPasswordHash,
      isPasswordTemporary: true,
    });

    // Preparar nombre del usuario para el correo
    const userName = user.profile
      ? `${user.profile.firstName} ${user.profile.lastName}`
      : email;

    // Enviar correo con la nueva contraseña
    try {
      await this.emailService.sendEmail({
        to: email,
        subject: 'Recuperación de Contraseña - Mundo World School',
        htmlContent: this.generatePasswordRecoveryEmailHtml(userName, tempPassword),
        textContent: `Hola ${userName},\n\nHas solicitado recuperar tu contraseña.\n\nTu nueva contraseña temporal es: ${tempPassword}\n\nPor seguridad, deberás cambiarla al iniciar sesión.\n\nSi no solicitaste este cambio, por favor contacta con el administrador.\n\nSaludos,\nEquipo Mundo World School`,
        priority: EmailPriority.HIGH,
        userId: user.id,
      });
    } catch (error) {
      console.error('Error sending password recovery email:', error);
      throw new BadRequestException('Error al enviar el correo de recuperación.');
    }

    return {
      message: 'Si el correo existe en el sistema, recibirás un email con la nueva contraseña.',
    };
  }

  /**
   * Genera una contraseña temporal aleatoria
   */
  private generateTemporaryPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  /**
   * Genera el HTML del correo de recuperación de contraseña
   */
  private generatePasswordRecoveryEmailHtml(userName: string, tempPassword: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Recuperación de Contraseña</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 0;">
              <table role="presentation" style="width: 100%; max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Recuperación de Contraseña</h1>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                      Hola <strong>${userName}</strong>,
                    </p>

                    <p style="margin: 0 0 30px; color: #555555; font-size: 16px; line-height: 1.6;">
                      Hemos recibido una solicitud para recuperar tu contraseña. Tu nueva contraseña temporal es:
                    </p>

                    <div style="background-color: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; margin: 0 0 30px; border-radius: 4px;">
                      <p style="margin: 0; color: #333333; font-size: 24px; font-weight: 700; letter-spacing: 2px; text-align: center; font-family: 'Courier New', monospace;">
                        ${tempPassword}
                      </p>
                    </div>

                    <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 0 0 30px; border-radius: 4px;">
                      <p style="margin: 0; color: #856404; font-size: 14px; line-height: 1.6;">
                        <strong>⚠️ Importante:</strong> Por seguridad, deberás cambiar esta contraseña temporal al iniciar sesión por primera vez.
                      </p>
                    </div>

                    <p style="margin: 0 0 30px; color: #555555; font-size: 16px; line-height: 1.6;">
                      Si no solicitaste este cambio, por favor contacta inmediatamente con el administrador del sistema.
                    </p>

                    <table role="presentation" style="margin: 0 auto;">
                      <tr>
                        <td style="border-radius: 4px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                          <a href="https://plataforma.mundoworld.school" style="display: inline-block; padding: 14px 30px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 4px;">
                            Iniciar Sesión
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 30px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; text-align: center;">
                    <p style="margin: 0 0 10px; color: #666666; font-size: 14px;">
                      Saludos,<br>
                      <strong>Equipo Mundo World School</strong>
                    </p>
                    <p style="margin: 0; color: #999999; font-size: 12px;">
                      Este es un correo automático, por favor no respondas a este mensaje.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }

}