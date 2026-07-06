import { PartialType } from '@nestjs/swagger';
import { CreateFormativeObservationDto } from './create-formative-observation.dto';

export class UpdateFormativeObservationDto extends PartialType(CreateFormativeObservationDto) {}