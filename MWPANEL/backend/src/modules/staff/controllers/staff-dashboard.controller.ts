/**
 * @archivo: staff-dashboard.controller.ts
 * @modulo: Staff (Claustro)
 * @funcion: Controller para dashboard y estadisticas del claustro
 */

import {
  Controller,
  Get,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { User, UserRole } from '../../users/entities/user.entity';
import { StaffTasksService } from '../services/staff-tasks.service';
import { StaffMeetingsService } from '../services/staff-meetings.service';

@Controller('staff/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.TEACHER)
export class StaffDashboardController {
  constructor(
    private readonly tasksService: StaffTasksService,
    private readonly meetingsService: StaffMeetingsService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  @Get('stats')
  async getStats(@CurrentUser() user: { id: string; role: UserRole }) {
    const userId = user.role === UserRole.ADMIN ? undefined : user.id;

    const [taskStats, meetingStats, upcomingMeetings] = await Promise.all([
      this.tasksService.getStats(userId),
      this.meetingsService.getStats(),
      this.meetingsService.findUpcoming(3),
    ]);

    return {
      tasks: taskStats,
      meetings: meetingStats,
      upcomingMeetings,
    };
  }

  @Get('my-stats')
  async getMyStats(@CurrentUser() user: { id: string }) {
    const [taskStats, upcomingMeetings] = await Promise.all([
      this.tasksService.getStats(user.id),
      this.meetingsService.findUpcoming(3),
    ]);

    return {
      tasks: taskStats,
      upcomingMeetings,
    };
  }

  @Get('progress')
  @Roles(UserRole.ADMIN)
  async getProgress() {
    const [taskStats, userStats] = await Promise.all([
      this.tasksService.getStats(),
      this.tasksService.getStatsByUser(),
    ]);

    return {
      globalStats: taskStats,
      userStats,
    };
  }

  @Get('users')
  async getStaffUsers() {
    const users = await this.userRepository.find({
      where: {
        role: In([UserRole.ADMIN, UserRole.TEACHER]),
        isActive: true,
      },
      relations: ['profile'],
      select: {
        id: true,
        email: true,
        role: true,
        profile: {
          firstName: true,
          lastName: true,
        },
      },
      order: {
        profile: {
          firstName: 'ASC',
        },
      },
    });

    return users.map(user => ({
      id: user.id,
      email: user.email,
      role: user.role,
      profile: user.profile ? {
        firstName: user.profile.firstName,
        lastName: user.profile.lastName,
      } : null,
    }));
  }
}
