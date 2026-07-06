import { Controller, Get, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { LinkPreviewService } from '../services/link-preview.service';

@ApiTags('communications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('communications')
export class LinkPreviewController {
  constructor(private readonly linkPreviewService: LinkPreviewService) {}

  @Get('link-preview')
  @ApiOperation({ summary: 'Obtener preview de un enlace (Open Graph)' })
  @ApiQuery({ name: 'url', required: true, description: 'URL a previsualizar' })
  @ApiResponse({ status: 200, description: 'Preview obtenido exitosamente' })
  @ApiResponse({ status: 400, description: 'URL no válida' })
  async getLinkPreview(@Query('url') url: string) {
    if (!url) {
      throw new BadRequestException('Se requiere el parámetro url');
    }
    return this.linkPreviewService.getPreview(url);
  }
}
