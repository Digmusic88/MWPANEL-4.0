import { IsNotEmpty, IsString, IsEnum, IsOptional, IsArray, IsUUID, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GroupType } from '../entities/message-group.entity';

export class CreateMessageGroupDto {
  @ApiProperty({ description: 'Nombre del grupo' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Descripción del grupo' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: GroupType, description: 'Tipo de grupo' })
  @IsOptional()
  @IsEnum(GroupType)
  type?: GroupType;

  @ApiPropertyOptional({ description: 'Si el grupo está activo' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Si es un grupo por defecto' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({
    description: 'IDs de los usuarios miembros del grupo',
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  memberIds?: string[];

  @ApiPropertyOptional({ description: 'Configuración automática del grupo (JSON)' })
  @IsOptional()
  @IsString()
  config?: string;
}