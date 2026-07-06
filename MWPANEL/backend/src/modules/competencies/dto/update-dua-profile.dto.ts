import { PartialType } from '@nestjs/swagger';
import { CreateDuaProfileDto } from './create-dua-profile.dto';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateDuaProfileDto extends PartialType(CreateDuaProfileDto) {
  @ApiPropertyOptional({
    description: 'Estado activo del perfil DUA',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Historial de efectividad de estrategias',
  })
  @IsOptional()
  effectivenessHistory?: {
    successfulStrategies?: string[];
    unsuccessfulStrategies?: string[];
    observations?: {
      date: Date;
      strategy: string;
      outcome: string;
      recordedBy: string;
    }[];
  };
}