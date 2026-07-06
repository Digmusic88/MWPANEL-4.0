import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { LoggerService } from '../../common/services/logger.service';
import { Log, Audit, Measure } from '../../common/decorators/log.decorator';

/**
 * Ejemplo de AuthService con sistema de logging completo
 * Este archivo muestra cómo integrar el sistema de logs en un servicio existente
 */
@Injectable()
export class AuthServiceWithLogging {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    private readonly logger: LoggerService, // Inyectar el logger
  ) {
    // Establecer contexto para el logger
    this.logger.setContext('AuthService');
  }

  /**
   * Validar usuario con logging
   */
  @Log('Validating user credentials')
  @Measure('auth.validateUser')
  async validateUser(email: string, password: string): Promise<any> {
    this.logger.debug(`Attempting to validate user: ${email}`);
    
    try {
      const user = await this.usersService.findByEmail(email);
      
      if (!user) {
        this.logger.warn(`User not found: ${email}`);
        this.logger.security('Failed login attempt - user not found', {
          email,
          ip: 'unknown', // En un caso real, obtener del request
        });
        return null;
      }

      if (!user.isActive) {
        this.logger.warn(`Inactive user attempted login: ${email}`);
        this.logger.security('Failed login attempt - inactive user', {
          email,
          userId: user.id,
        });
        return null;
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        this.logger.warn(`Invalid password for user: ${email}`);
        this.logger.security('Failed login attempt - invalid password', {
          email,
          userId: user.id,
        });
        return null;
      }

      this.logger.info(`User validated successfully: ${email}`);
      const { password: _, ...result } = user;
      return result;
    } catch (error) {
      this.logger.error(`Error validating user: ${email}`, error.stack);
      throw error;
    }
  }

  /**
   * Login con logging y auditoría
   */
  @Audit('User login')
  @Measure('auth.login')
  async login(user: any) {
    this.logger.info(`User logging in: ${user.email} (${user.role})`);

    try {
      const payload = { 
        email: user.email, 
        sub: user.id, 
        role: user.role 
      };

      const accessToken = this.jwtService.sign(payload);
      const refreshToken = this.jwtService.sign(payload, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      });

      // Guardar refresh token
      await this.saveRefreshToken(user.id, refreshToken);

      this.logger.info(`Login successful for user: ${user.email} (ID: ${user.id})`);

      this.logger.audit('User logged in', user.id, {
        email: user.email,
        role: user.role,
        timestamp: new Date().toISOString(),
      });

      return {
        access_token: accessToken,
        refresh_token: refreshToken,
        user,
      };
    } catch (error) {
      this.logger.error(`Login failed for user: ${user.email}`, error.stack);
      throw error;
    }
  }

  /**
   * Registro con logging completo
   */
  @Audit('User registration')
  @Measure('auth.register')
  async register(registerDto: RegisterDto) {
    this.logger.info(`New user registration attempt: ${registerDto.email}`);

    try {
      // Verificar si el usuario ya existe
      const existingUser = await this.usersService.findByEmail(registerDto.email);
      
      if (existingUser) {
        this.logger.warn(`Registration failed - email already exists: ${registerDto.email}`);
        throw new ConflictException('El email ya está registrado');
      }

      // Hash de la contraseña
      const hashedPassword = await bcrypt.hash(registerDto.password, 10);

      // Crear el usuario
      const user = await this.usersService.create({
        ...registerDto,
        password: hashedPassword,
      });

      this.logger.info(`User registered successfully: ${registerDto.email} (ID: ${user.id}, Role: ${user.role})`);

      this.logger.audit('User registered', user.id, {
        email: registerDto.email,
        role: user.role,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
      });

      // Login automático después del registro
      return this.login(user);
    } catch (error) {
      this.logger.error(`Registration failed for: ${registerDto.email}`, error.stack);
      throw error;
    }
  }

  /**
   * Refresh token con logging
   */
  @Log('Refreshing access token')
  @Measure('auth.refreshToken')
  async refreshTokens(refreshToken: string) {
    this.logger.debug('Attempting to refresh tokens');

    try {
      // Verificar el refresh token
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      // Buscar el refresh token en la base de datos
      const storedToken = await this.refreshTokenRepository.findOne({
        where: { 
          token: refreshToken, 
          user: { id: payload.sub }
        },
        relations: ['user'],
      });

      if (!storedToken || storedToken.isRevoked) {
        this.logger.warn(`Invalid refresh token for user: ${payload.sub}`);
        this.logger.security('Invalid refresh token attempt', {
          userId: payload.sub,
          tokenId: storedToken?.id,
        });
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Verificar si el token ha expirado
      if (storedToken.expiresAt < new Date()) {
        this.logger.warn(`Expired refresh token for user: ${payload.sub}`);
        await this.refreshTokenRepository.remove(storedToken);
        throw new UnauthorizedException('Refresh token expired');
      }

      // Generar nuevos tokens
      const user = await this.usersService.findOne(payload.sub);
      const newTokens = await this.login(user);

      // Invalidar el token anterior
      await this.refreshTokenRepository.remove(storedToken);

      this.logger.info(`Tokens refreshed successfully for user: ${user.email}`);

      return newTokens;
    } catch (error) {
      this.logger.error('Token refresh failed', error.stack);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Logout con logging
   */
  @Audit('User logout')
  async logout(userId: string, refreshToken?: string) {
    this.logger.info(`User logging out: ${userId}`);

    try {
      if (refreshToken) {
        const token = await this.refreshTokenRepository.findOne({
          where: { 
            token: refreshToken, 
            user: { id: userId }
          },
        });

        if (token) {
          await this.refreshTokenRepository.remove(token);
          this.logger.debug(`Refresh token invalidated for user: ${userId}`);
        }
      } else {
        // Invalidar todos los tokens del usuario
        await this.refreshTokenRepository.delete({ user: { id: userId } });
        this.logger.debug(`All refresh tokens invalidated for user: ${userId}`);
      }

      this.logger.audit('User logged out', userId, {
        timestamp: new Date().toISOString(),
      });

      return { message: 'Logout successful' };
    } catch (error) {
      this.logger.error(`Logout failed for user: ${userId}`, error.stack);
      throw error;
    }
  }

  /**
   * Método privado con logging
   */
  private async saveRefreshToken(
    userId: string,
    token: string,
  ): Promise<RefreshToken> {
    this.logger.debug(`Saving refresh token for user: ${userId}`);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const refreshToken = this.refreshTokenRepository.create({
      user,
      token,
      expiresAt,
    });

    const saved = await this.refreshTokenRepository.save(refreshToken);
    
    this.logger.debug(`Refresh token saved successfully for user: ${userId}`);

    return saved;
  }
}