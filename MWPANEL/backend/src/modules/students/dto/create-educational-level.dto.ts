import { EducationalLevelCode } from '../entities/educational-level.entity';

export class CreateEducationalLevelDto {
  name: string;
  code: EducationalLevelCode;
  description?: string;
}