import { IsString, IsUUID, MinLength, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ 
    description: 'User ID to reset password for',
    example: '599cd2c3-b163-4e86-8ecc-cf332889c05a'
  })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ 
    description: 'New password for the user',
    example: 'newPassword123',
    minLength: 6
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  newPassword: string;
}