import { IsString, IsUUID, MinLength, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBlogCommentDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  content: string;

  @ApiProperty()
  @IsUUID()
  postId: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  parentId?: string;
}