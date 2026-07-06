import { EducationalLevelCode } from '../entities/educational-level.entity';

export class UpdateEducationalLevelDto {
  name?: string;
  code?: EducationalLevelCode;
  description?: string;
}