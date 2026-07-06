/**
 * @archivo: auth.controller.ts
 * @módulo: Auth (Endpoints de Autenticación)
 * @función: API endpoints para login, registro, refresh tokens
 * @crítico: SÍ - Puerta de entrada de seguridad al sistema
 * @dependencias: AuthService, Guards, DTOs de validación
 * @no_modificar: Rutas sin analizar impacto en frontend y TypeQuest
 * @relacionado_con: auth.service.ts, jwt-auth.guard.ts, frontend auth
 */

/**
 * RUTAS API DE AUTENTICACIÓN - CRÍTICAS
 * 
 * POST /api/auth/login - Login principal del sistema
 * POST /api/auth/refresh - Renovación de tokens
 * POST /api/auth/register - Registro de nuevos usuarios (solo admin)
 * PATCH /api/auth/change-password - Cambio de contraseña
 * GET /api/auth/profile - Perfil del usuario actual
 * 
 * USADO POR:
 * - Frontend MW Panel (login, navegación)
 * - TypeQuest (autenticación compartida)
 * - Aplicaciones móviles (APIs)
 * - Tests automáticos
 * 
 * INTEGRACIÓN CON TYPEQUEST:
 * - Login devuelve timeLimitReached para control de tiempo
 * - Tokens compartidos entre ambos sistemas
 * - Redirección automática según rol
 * 
 * SEGURIDAD:
 * - Todas las rutas excepto login requieren JWT válido
 * - Refresh tokens con rotación automática
 * - Validación de roles en rutas sensibles
 */

import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
  Patch,
  Param,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService, AuthResult } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthRateLimit, NoRateLimit } from '../../common/decorators/rate-limit.decorator';
import { User, UserRole } from '../users/entities/user.entity';

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @AuthRateLimit() // 5 intentos cada 5 minutos
  @ApiOperation({ summary: 'Iniciar sesión' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login exitoso',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string' },
            isActive: { type: 'boolean' },
            profile: {
              type: 'object',
              properties: {
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                fullName: { type: 'string' },
              },
            },
          },
        },
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  async login(@Body() loginDto: LoginDto): Promise<AuthResult> {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @AuthRateLimit() // 5 intentos cada 5 minutos
  @ApiOperation({
    summary: 'Recuperar contraseña',
    description: 'Envía una contraseña temporal al correo del usuario. Solo disponible para admin, teacher y family.'
  })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Email de recuperación enviado si el correo existe en el sistema',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Si el correo existe en el sistema, recibirás un email con la nueva contraseña.'
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'La recuperación de contraseña no está disponible para este tipo de usuario'
  })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Public()
  @Post('register')
  @AuthRateLimit() // 5 intentos cada 5 minutos
  @ApiOperation({ summary: 'Registrar nuevo usuario' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'Usuario registrado exitosamente',
  })
  @ApiResponse({ status: 400, description: 'El usuario ya existe' })
  @Roles(UserRole.ADMIN) // Solo admins pueden registrar nuevos usuarios
  async register(@Body() registerDto: RegisterDto): Promise<AuthResult> {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar token de acceso' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Token renovado exitosamente',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Token de actualización inválido' })
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<{ accessToken: string }> {
    return this.authService.refreshTokens(refreshTokenDto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cerrar sesión' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        refreshToken: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Sesión cerrada exitosamente' })
  async logout(@Body() body: { refreshToken: string }): Promise<void> {
    return this.authService.logout(body.refreshToken);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cerrar todas las sesiones' })
  @ApiResponse({
    status: 200,
    description: 'Todas las sesiones cerradas exitosamente',
  })
  async logoutAll(@CurrentUser() user: User): Promise<void> {
    return this.authService.logoutAll(user.id);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener información del usuario actual' })
  @ApiResponse({
    status: 200,
    description: 'Información del usuario',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        email: { type: 'string' },
        role: { type: 'string' },
        isActive: { type: 'boolean' },
        lastLoginAt: { type: 'string', format: 'date-time' },
        teacherId: { type: 'string' },
        studentId: { type: 'string' },
        familyId: { type: 'string' },
        profile: {
          type: 'object',
          properties: {
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            phone: { type: 'string' },
            dni: { type: 'string' },
            fullName: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getProfile(@CurrentUser() user: User): Promise<User> {
    // Enriquecer el usuario con referencias específicas por rol
    return this.authService.enrichUserWithRoleReferences(user);
  }

  @Patch('change-password')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cambiar contraseña' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({ status: 200, description: 'Contraseña cambiada exitosamente' })
  @ApiResponse({ status: 400, description: 'Contraseña actual incorrecta' })
  async changePassword(
    @CurrentUser() user: User,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    await this.authService.changePassword(user.id, changePasswordDto);
    return { message: 'Contraseña cambiada exitosamente' };
  }

  @Post('impersonate/:userId')
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Impersonar usuario (solo administradores)' })
  @ApiResponse({
    status: 200,
    description: 'Impersonación exitosa',
    schema: {
      type: 'object',
      properties: {
        user: { type: 'object' },
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Solo administradores pueden impersonar' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async impersonateUser(
    @CurrentUser() admin: User,
    @Param('userId') userId: string,
  ): Promise<AuthResult> {
    return this.authService.impersonateUser(admin.id, userId);
  }

  @Get('health')
  @Public()
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({ status: 200, description: 'Servicio funcionando' })
  healthCheck(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Post('admin-emergency')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Login de emergencia para administradores durante mantenimiento',
    description: 'Permite a los administradores acceder al sistema incluso durante modo mantenimiento'
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login de emergencia exitoso',
    schema: {
      type: 'object',
      properties: {
        user: { type: 'object' },
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
        maintenanceMode: { type: 'boolean' },
        isEmergencyLogin: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas o usuario no es administrador' })
  @ApiResponse({ status: 403, description: 'Solo administradores pueden usar login de emergencia' })
  async adminEmergencyLogin(@Body() loginDto: LoginDto): Promise<AuthResult & { maintenanceMode: boolean; isEmergencyLogin: boolean }> {
    // Verificar que el usuario sea administrador antes de permitir login de emergencia
    const result = await this.authService.login(loginDto);
    
    if (result.user.role !== UserRole.ADMIN) {
      throw new UnauthorizedException('Solo administradores pueden usar el login de emergencia');
    }

    return {
      ...result,
      maintenanceMode: true,
      isEmergencyLogin: true,
    };
  }

}