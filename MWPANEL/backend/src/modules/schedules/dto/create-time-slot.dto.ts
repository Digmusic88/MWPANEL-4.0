import { IsString, IsBoolean, IsNumber, IsOptional, Matches, Min, Max } from 'class-validator';

export class CreateTimeSlotDto {
  @IsString()
  name: string;

  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'startTime must be in HH:MM format (24-hour)',
  })
  startTime: string;

  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'endTime must be in HH:MM format (24-hour)',
  })
  endTime: string;

  @IsNumber()
  @Min(1)
  @Max(20)
  order: number;

  @IsOptional()
  @IsBoolean()
  isBreak?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsString()
  educationalLevelId: string;
}