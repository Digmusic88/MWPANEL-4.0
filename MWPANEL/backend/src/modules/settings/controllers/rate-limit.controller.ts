import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { NoRateLimit } from '../../../common/decorators/rate-limit.decorator';
import { DDoSProtectionService } from '../../../common/services/ddos-protection.service';
import { LoggerService } from '../../../common/services/logger.service';
import { UserRole } from '../../users/entities/user.entity';

@ApiTags('Rate Limiting')
@ApiBearerAuth()
@Controller('api/settings/rate-limit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class RateLimitController {
  constructor(
    private readonly ddosService: DDoSProtectionService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('RateLimitController');
  }

  @Get('statistics')
  @NoRateLimit()
  @ApiOperation({ summary: 'Get rate limiting statistics' })
  async getStatistics() {
    this.logger.log('Fetching rate limit statistics');
    return await this.ddosService.getStatistics();
  }

  @Get('patterns')
  @NoRateLimit()
  @ApiOperation({ summary: 'Get current attack patterns' })
  async getAttackPatterns() {
    this.logger.log('Fetching attack patterns');
    return this.ddosService.getAttackPatterns();
  }

  @Post('block/:ip')
  @NoRateLimit()
  @ApiOperation({ summary: 'Manually block an IP address' })
  async blockIp(@Param('ip') ip: string, @Body() body: { reason: string }) {
    this.logger.warn(`Manually blocking IP: ${ip} - Reason: ${body.reason}`);
    await this.ddosService.blockIp(ip, body.reason);
    return { message: 'IP blocked successfully', ip };
  }

  @Delete('block/:ip')
  @NoRateLimit()
  @ApiOperation({ summary: 'Unblock an IP address' })
  async unblockIp(@Param('ip') ip: string) {
    this.logger.log(`Unblocking IP: ${ip}`);
    await this.ddosService.unblockIp(ip);
    return { message: 'IP unblocked successfully', ip };
  }

  @Get('blocked/:ip')
  @NoRateLimit()
  @ApiOperation({ summary: 'Check if an IP is blocked' })
  async checkIpStatus(@Param('ip') ip: string) {
    const isBlocked = await this.ddosService.isBlocked(ip);
    return { ip, blocked: isBlocked };
  }
}