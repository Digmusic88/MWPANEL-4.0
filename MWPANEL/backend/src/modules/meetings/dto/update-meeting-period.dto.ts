import { PartialType } from '@nestjs/mapped-types';
import { CreateMeetingPeriodDto } from './create-meeting-period.dto';

export class UpdateMeetingPeriodDto extends PartialType(CreateMeetingPeriodDto) {}