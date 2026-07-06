import { IsIn } from 'class-validator';

export class SetGradeModeDto {
  @IsIn(['parallel', 'derive', 'replace'])
  mode: 'parallel' | 'derive' | 'replace';
}
