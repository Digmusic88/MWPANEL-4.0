import { IsIn, IsObject, IsString, IsUUID } from 'class-validator';
export class GenerateDto {
  @IsString() subjectName: string;
  @IsIn(['cycle', 'course']) scopeType: 'cycle' | 'course';
  @IsUUID() scopeId: string;
}
export class SavePayloadDto { @IsObject() payload: any; }
export class ListQueryDto {
  @IsString() subjectName: string;
  @IsIn(['cycle', 'course']) scopeType: 'cycle' | 'course';
  @IsUUID() scopeId: string;
}
