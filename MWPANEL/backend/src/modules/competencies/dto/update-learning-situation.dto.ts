import { PartialType } from '@nestjs/swagger';
import { CreateLearningSituationDto } from './create-learning-situation.dto';

export class UpdateLearningSituationDto extends PartialType(CreateLearningSituationDto) {}