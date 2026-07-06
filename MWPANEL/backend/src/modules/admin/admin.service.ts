import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import { Student } from '../students/entities/student.entity';
import { Teacher } from '../teachers/entities/teacher.entity';
import { Family } from '../users/entities/family.entity';
import { Subject } from '../students/entities/subject.entity';
import { ClassGroup } from '../students/entities/class-group.entity';
import { Message } from '../communications/entities/message.entity';
import { Activity } from '../activities/entities/activity.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(Teacher)
    private readonly teacherRepository: Repository<Teacher>,
    @InjectRepository(Family)
    private readonly familyRepository: Repository<Family>,
    @InjectRepository(Subject)
    private readonly subjectRepository: Repository<Subject>,
    @InjectRepository(ClassGroup)
    private readonly classGroupRepository: Repository<ClassGroup>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(Activity)
    private readonly activityRepository: Repository<Activity>,
  ) {}

  async resetUserPassword(userId: string, newPassword: string): Promise<User> {
    console.log('🔧 ADMIN SERVICE - Reset password for user:', userId);
    
    // Find user by ID
    const user = await this.userRepository.findOne({ 
      where: { id: userId },
      relations: ['profile']
    });

    if (!user) {
      console.error('❌ ADMIN SERVICE - User not found:', userId);
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    console.log('🔍 ADMIN SERVICE - User found:', {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive
    });

    // Validate password
    if (!newPassword || newPassword.trim().length < 6) {
      throw new BadRequestException('Password must be at least 6 characters long');
    }

    try {
      // Hash the new password
      console.log('🔐 ADMIN SERVICE - Hashing password...');
      const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);
      console.log('✅ ADMIN SERVICE - Password hashed successfully');

      // Update user password directly
      user.passwordHash = hashedPassword;
      user.updatedAt = new Date();
      user.isPasswordTemporary = false; // Reset temporary password flag
      
      // Save user with new password
      console.log('💾 ADMIN SERVICE - Saving user to database...');
      const savedUser = await this.userRepository.save(user);
      console.log('✅ ADMIN SERVICE - User saved successfully:', {
        id: savedUser.id,
        email: savedUser.email,
        updatedAt: savedUser.updatedAt
      });

      // Verify the password was saved correctly
      const verifyUser = await this.userRepository.findOne({ 
        where: { id: userId },
        select: ['id', 'email', 'passwordHash', 'updatedAt']
      });
      
      console.log('🔍 ADMIN SERVICE - Password verification:', {
        userId: verifyUser.id,
        hashChanged: verifyUser.passwordHash !== user.passwordHash,
        updatedAt: verifyUser.updatedAt
      });

      // Test the new password
      const isPasswordValid = await bcrypt.compare(newPassword.trim(), verifyUser.passwordHash);
      console.log('🧪 ADMIN SERVICE - Password test result:', isPasswordValid);

      if (!isPasswordValid) {
        throw new BadRequestException('Password was not saved correctly');
      }

      return savedUser;
    } catch (error) {
      console.error('❌ ADMIN SERVICE - Error during password reset:', error);
      throw error;
    }
  }

  async getSystemStats() {
    try {
      const [
        totalUsers,
        totalTeachers,
        totalStudents,
        totalFamilies,
        totalSubjects,
        totalClassGroups,
        totalMessages,
        totalActivities,
        activeUsers24h
      ] = await Promise.all([
        this.userRepository.count(),
        this.teacherRepository.count(),
        this.studentRepository.count(),
        this.familyRepository.count(),
        this.subjectRepository.count(),
        this.classGroupRepository.count(),
        this.messageRepository.count(),
        this.activityRepository.count(),
        this.userRepository.count({
          where: {
            lastLoginAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        })
      ]);

      return {
        totalUsers,
        totalTeachers,
        totalStudents,
        totalFamilies,
        totalSubjects,
        totalClassGroups,
        totalMessages,
        totalActivities,
        systemUptime: '45 días, 12 horas', // Mock data - would need system monitoring
        lastBackup: new Date().toISOString(),
        activeUsers24h,
        storageUsed: 1.2, // GB - Mock data
        storageTotal: 10.0 // GB - Mock data
      };
    } catch (error) {
      console.error('Error getting system stats:', error);
      throw error;
    }
  }

  async getModulesStatus() {
    // Return mock data for now - this would be replaced with real module monitoring
    return [
      {
        name: 'Autenticación',
        enabled: true,
        lastUpdated: new Date().toISOString(),
        version: '2.0.0',
        status: 'healthy'
      },
      {
        name: 'Evaluaciones',
        enabled: true,
        lastUpdated: new Date().toISOString(),
        version: '2.0.0',
        status: 'healthy'
      },
      {
        name: 'Mensajería',
        enabled: true,
        lastUpdated: new Date().toISOString(),
        version: '2.0.0',
        status: 'healthy'
      },
      {
        name: 'Calendario',
        enabled: true,
        lastUpdated: new Date().toISOString(),
        version: '2.0.0',
        status: 'healthy'
      },
      {
        name: 'Rúbricas',
        enabled: true,
        lastUpdated: new Date().toISOString(),
        version: '2.0.0',
        status: 'healthy'
      }
    ];
  }

  async getSystemAlerts() {
    // Return mock data for now - this would be replaced with real system monitoring
    return [
      {
        id: '1',
        type: 'warning',
        title: 'Uso de almacenamiento alto',
        description: 'El uso de almacenamiento ha alcanzado el 80%',
        timestamp: new Date().toISOString(),
        resolved: false,
      },
      {
        id: '2',
        type: 'info',
        title: 'Backup completado',
        description: 'Backup automático completado exitosamente',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        resolved: true,
      }
    ];
  }

  async getRecentActivity() {
    try {
      // Get recent user logins
      const recentLogins = await this.userRepository.find({
        where: {
          lastLoginAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        },
        relations: ['profile'],
        order: { lastLoginAt: 'DESC' },
        take: 10
      });

      const activities = recentLogins.map(user => ({
        id: user.id,
        action: 'Inicio de sesión',
        user: `${user.profile?.firstName || ''} ${user.profile?.lastName || ''} (${user.role})`.trim(),
        timestamp: user.lastLoginAt?.toISOString() || new Date().toISOString(),
        type: 'login',
      }));

      // Add some mock system activities
      activities.push(
        {
          id: 'system-1',
          action: 'Backup automático - Backup completo de base de datos',
          user: 'Sistema',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          type: 'system'
        },
        {
          id: 'system-2',
          action: 'Actualización de módulo - Módulo de evaluaciones actualizado',
          user: 'Admin Sistema',
          timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          type: 'system_change'
        }
      );

      return activities.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch (error) {
      console.error('Error getting recent activity:', error);
      // Return fallback data
      return [
        {
          id: '1',
          action: 'Sistema iniciado',
          user: 'Sistema',
          timestamp: new Date().toISOString(),
          type: 'system',
        }
      ];
    }
  }
}