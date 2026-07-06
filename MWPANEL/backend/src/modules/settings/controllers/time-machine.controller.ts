import { Controller, Get, Post, Delete, Body, Param, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { TimeMachineBackupService } from '../services/time-machine-backup.service';
import { BackupSchedulerService } from '../services/backup-scheduler.service';

@ApiTags('Time Machine Backups')
@Controller('settings/time-machine')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class TimeMachineController {
  private readonly logger = new Logger(TimeMachineController.name);

  constructor(
    private readonly timeMachineService: TimeMachineBackupService,
    private readonly schedulerService: BackupSchedulerService,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Get Time Machine backup status' })
  @ApiResponse({ status: 200, description: 'Time Machine status retrieved successfully' })
  async getStatus() {
    try {
      this.logger.log('🔍 Getting Time Machine status...');
      const status = await this.timeMachineService.getBackupStatus();
      
      return {
        success: true,
        data: {
          ...status,
          config: {
            retentionPolicy: {
              hourly: '24 backups (last 24 hours)',
              daily: '7 backups (last 7 days)', 
              weekly: '7 backups (last 7 weeks)',
              monthly: '7 backups (last 7 months)'
            },
            schedule: {
              hourly: '0 * * * * (every hour)',
              daily: '0 2 * * * (daily at 2:00 AM)',
              weekly: '0 3 * * 0 (Sunday at 3:00 AM)',
              monthly: '0 4 1 * * (1st day of month at 4:00 AM)'
            }
          }
        }
      };
    } catch (error) {
      this.logger.error(`❌ Error getting Time Machine status: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Get('backups')
  @ApiOperation({ summary: 'List all Time Machine backups' })
  @ApiResponse({ status: 200, description: 'Backup list retrieved successfully' })
  async listAllBackups() {
    try {
      this.logger.log('📋 Listing all Time Machine backups...');
      const backups = await this.timeMachineService.listBackups();
      
      return {
        success: true,
        data: {
          backups: backups,
          summary: {
            totalBackups: backups.length,
            byType: {
              hourly: backups.filter(b => b.type === 'hourly').length,
              daily: backups.filter(b => b.type === 'daily').length,
              weekly: backups.filter(b => b.type === 'weekly').length,
              monthly: backups.filter(b => b.type === 'monthly').length
            }
          }
        }
      };
    } catch (error) {
      this.logger.error(`❌ Error listing Time Machine backups: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Get('backups/:type')
  @ApiOperation({ summary: 'List backups by type' })
  @ApiResponse({ status: 200, description: 'Backups by type retrieved successfully' })
  async listBackupsByType(@Param('type') type: 'hourly' | 'daily' | 'weekly' | 'monthly') {
    try {
      this.logger.log(`📋 Listing ${type} Time Machine backups...`);
      const backups = await this.timeMachineService.listBackups(type);
      
      return {
        success: true,
        data: {
          type: type,
          backups: backups,
          count: backups.length
        }
      };
    } catch (error) {
      this.logger.error(`❌ Error listing ${type} Time Machine backups: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Post('backup/:type')
  @ApiOperation({ summary: 'Create manual Time Machine backup' })
  @ApiResponse({ status: 201, description: 'Backup created successfully' })
  async createManualBackup(@Param('type') type: 'hourly' | 'daily' | 'weekly' | 'monthly') {
    try {
      this.logger.log(`🔧 Creating manual ${type} Time Machine backup...`);
      const result = await this.schedulerService.triggerTimeMachineBackup(type);
      
      if (result.success) {
        return {
          success: true,
          message: result.message,
          data: {
            type: type,
            timestamp: new Date().toISOString()
          }
        };
      } else {
        return {
          success: false,
          error: result.message
        };
      }
    } catch (error) {
      this.logger.error(`❌ Error creating manual ${type} backup: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Delete('backup/:type/:timestamp')
  @ApiOperation({ summary: 'Delete specific Time Machine backup' })
  @ApiResponse({ status: 200, description: 'Backup deleted successfully' })
  async deleteBackup(
    @Param('type') type: 'hourly' | 'daily' | 'weekly' | 'monthly',
    @Param('timestamp') timestamp: string
  ) {
    try {
      this.logger.log(`🗑️ Deleting ${type} Time Machine backup: ${timestamp}`);
      await this.timeMachineService.deleteBackup(type, timestamp);
      
      return {
        success: true,
        message: `${type} backup ${timestamp} deleted successfully`
      };
    } catch (error) {
      this.logger.error(`❌ Error deleting ${type} backup ${timestamp}: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Post('test-backup')
  @ApiOperation({ summary: 'Create test Time Machine backup (hourly)' })
  @ApiResponse({ status: 201, description: 'Test backup created successfully' })
  async createTestBackup() {
    try {
      this.logger.log('🧪 Creating test Time Machine backup...');
      const result = await this.timeMachineService.createHourlyBackup();
      
      return {
        success: true,
        message: 'Test Time Machine backup created successfully',
        data: {
          filename: result.filename,
          size: result.size,
          path: result.path,
          type: 'hourly',
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      this.logger.error(`❌ Error creating test backup: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }
}