import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../../users/entities/user.entity';
import { JwtPayload } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('app.jwt.secret'),
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id: payload.sub },
      relations: ['profile'],
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Usuario no autorizado');
    }

    // Enriquecer con referencias específicas por rol
    const enrichedUser = await this.enrichUserWithRoleReferences(user);

    // Ensure user has sub property for consistency
    (enrichedUser as any).sub = enrichedUser.id;
    
    // Also set userId for controller compatibility
    (enrichedUser as any).userId = enrichedUser.id;
    
    return enrichedUser;
  }

  /**
   * Enriquece el usuario con referencias específicas por rol
   */
  private async enrichUserWithRoleReferences(user: User): Promise<User> {
    try {
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
        // Usar query directa para evitar problemas con las relaciones
        const familyQuery = await this.usersRepository.query(`
          SELECT f.id as "familyId"
          FROM families f
          WHERE f."primaryContactId" = $1 OR f."secondaryContactId" = $1
          LIMIT 1
        `, [user.id]);
        
        if (familyQuery.length > 0) {
          (user as any).familyId = familyQuery[0].familyId;
        }
      }

      return user;
    } catch (error) {
      this.logger.warn(`Error enriching user with role references: ${error.message}`);
      return user; // Return original user if enrichment fails
    }
  }
}