import { IsString, IsOptional, IsUUID, IsHexColor, IsInt } from 'class-validator';

export class CreateFolderDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsUUID()
  subjectId: string;

  @IsOptional()
  @IsUUID()
  parentFolderId?: string;

  @IsOptional()
  @IsHexColor()
  color?: string;

  @IsOptional()
  @IsInt()
  displayOrder?: number;
}
