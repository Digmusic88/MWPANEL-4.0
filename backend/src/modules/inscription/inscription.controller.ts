import { Controller, Post, UseGuards, UseInterceptors, UploadedFile, Body, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SecretariaAuthGuard, Roles } from '../../common/secretaria-auth.guard';
import { InscriptionService } from './inscription.service';

@Controller('secretaria/inscription')
@UseGuards(SecretariaAuthGuard)
export class InscriptionController {
  constructor(private readonly svc: InscriptionService) {}

  @Post('preview')
  @Roles('secretaria_admin', 'direccion')
  @UseInterceptors(FileInterceptor('file'))
  async preview(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException('Sube el PDF de inscripción');
    try {
      return await this.svc.preview(file.buffer);
    } catch (e: any) {
      throw new BadRequestException(e?.message || 'No se pudo leer el PDF');
    }
  }

  @Post('commit')
  @Roles('secretaria_admin', 'direccion')
  async commit(@Body() body: { payload: any; academicYearId: string; confirmedDuplicateId?: string | null; mergeIntoStudentId?: string | null }) {
    if (!body?.payload) throw new BadRequestException('Falta el payload de inscripción');
    return this.svc.commit(body.payload, body.academicYearId, body.confirmedDuplicateId, body.mergeIntoStudentId);
  }
}
