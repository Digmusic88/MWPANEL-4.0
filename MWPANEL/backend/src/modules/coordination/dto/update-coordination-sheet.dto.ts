import { PartialType } from '@nestjs/swagger';
import { CreateCoordinationSheetDto } from './create-coordination-sheet.dto';

export class UpdateCoordinationSheetDto extends PartialType(CreateCoordinationSheetDto) {}