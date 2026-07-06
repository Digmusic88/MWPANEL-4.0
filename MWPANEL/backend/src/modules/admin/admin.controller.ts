import { Controller, Post, Body, UseGuards, BadRequestException, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { AdminService } from './admin.service';
import { ResetPasswordDto } from './dto/reset-password.dto';

@ApiTags('Admin Operations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('reset-password')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Reset user password by admin' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid user ID or password' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    console.log('🔧 ADMIN RESET PASSWORD - Request received:', {
      userId: resetPasswordDto.userId,
      hasPassword: !!resetPasswordDto.newPassword
    });

    if (!resetPasswordDto.newPassword || resetPasswordDto.newPassword.trim() === '') {
      throw new BadRequestException('New password is required');
    }

    try {
      const result = await this.adminService.resetUserPassword(
        resetPasswordDto.userId,
        resetPasswordDto.newPassword
      );

      console.log('✅ ADMIN RESET PASSWORD - Success:', {
        userId: resetPasswordDto.userId,
        userEmail: result.email,
        role: result.role
      });

      return {
        message: 'Password reset successfully',
        user: {
          id: result.id,
          email: result.email,
          role: result.role,
          updatedAt: result.updatedAt
        }
      };
    } catch (error) {
      console.error('❌ ADMIN RESET PASSWORD - Error:', error);
      throw error;
    }
  }

  @Get('system-stats')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get system statistics' })
  @ApiResponse({ status: 200, description: 'System statistics retrieved successfully' })
  async getSystemStats() {
    return this.adminService.getSystemStats();
  }

  @Get('modules-status')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get modules status' })
  @ApiResponse({ status: 200, description: 'Modules status retrieved successfully' })
  async getModulesStatus() {
    return this.adminService.getModulesStatus();
  }

  @Get('system-alerts')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get system alerts' })
  @ApiResponse({ status: 200, description: 'System alerts retrieved successfully' })
  async getSystemAlerts() {
    return this.adminService.getSystemAlerts();
  }

  @Get('recent-activity')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get recent system activity' })
  @ApiResponse({ status: 200, description: 'Recent activity retrieved successfully' })
  async getRecentActivity() {
    return this.adminService.getRecentActivity();
  }
}