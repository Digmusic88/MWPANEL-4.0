import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpException,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { 
  PdfManagerService, 
  PdfFileInfo, 
  PdfStorageStats, 
  PdfCleanupResult, 
  PdfCleanupOptions 
} from '../services/pdf-manager.service';
import { IsOptional, IsBoolean, IsNumber, IsArray, IsString } from 'class-validator';

class PdfCleanupDto {
  @IsOptional()
  @IsNumber()
  maxAge?: number;

  @IsOptional()
  @IsNumber()
  maxSize?: number;

  @IsOptional()
  @IsNumber()
  keepRecentCount?: number;

  @IsOptional()
  @IsBoolean()
  removeUnused?: boolean;

  @IsOptional()
  @IsBoolean()
  removeDuplicates?: boolean;

  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  types?: string[];
}

interface PdfListResponse {
  pdfs: PdfFileInfo[];
  total: number;
  stats: {
    totalSize: number;
    formattedTotalSize: string;
    byType: Record<string, number>;
  };
}

interface PdfManagementSummary {
  storageStats: PdfStorageStats;
  recentActivity: {
    recentFiles: number;
    recentAccesses: number;
    cleanupsDue: number;
  };
  recommendations: string[];
  nextCleanup: string;
}

@ApiTags('PDF Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.TEACHER)
@Controller('settings/pdf-manager')
export class PdfManagerController {
  constructor(private readonly pdfManagerService: PdfManagerService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Obtener estadísticas de almacenamiento PDF' })
  @ApiResponse({ 
    status: 200, 
    description: 'Estadísticas obtenidas exitosamente',
    schema: {
      type: 'object',
      properties: {
        totalFiles: { type: 'number' },
        totalSize: { type: 'number' },
        formattedTotalSize: { type: 'string' },
        tempFiles: { type: 'number' },
        tempSize: { type: 'number' },
        diskUsage: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            used: { type: 'number' },
            available: { type: 'number' },
            usagePercentage: { type: 'number' }
          }
        }
      }
    }
  })
  async getStorageStats(): Promise<PdfStorageStats> {
    try {
      return await this.pdfManagerService.getStorageStats();
    } catch (error) {
      throw new HttpException(
        'Error al obtener estadísticas de almacenamiento',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('files')
  @ApiOperation({ summary: 'Listar archivos PDF gestionados' })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de archivos PDF obtenida exitosamente',
    schema: {
      type: 'object',
      properties: {
        pdfs: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              filename: { type: 'string' },
              size: { type: 'number' },
              formattedSize: { type: 'string' },
              type: { type: 'string' },
              category: { type: 'string' },
              createdAt: { type: 'string' },
              lastAccessed: { type: 'string' },
              isTemporary: { type: 'boolean' }
            }
          }
        },
        total: { type: 'number' },
        stats: { type: 'object' }
      }
    }
  })
  async listPdfFiles(
    @Query('type') type?: string,
    @Query('category') category?: string,
    @Query('limit') limit: string = '50'
  ): Promise<PdfListResponse> {
    try {
      const pdfs = await this.pdfManagerService.getAllPdfs(type, category);
      const limitNum = parseInt(limit) || 50;
      const paginatedPdfs = pdfs.slice(0, limitNum);
      
      const totalSize = paginatedPdfs.reduce((sum, pdf) => sum + pdf.size, 0);
      const byType = paginatedPdfs.reduce((acc, pdf) => {
        acc[pdf.type] = (acc[pdf.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        pdfs: paginatedPdfs,
        total: pdfs.length,
        stats: {
          totalSize,
          formattedTotalSize: this.formatBytes(totalSize),
          byType
        }
      };
    } catch (error) {
      throw new HttpException(
        'Error al obtener lista de archivos PDF',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('files/:fileId')
  @ApiOperation({ summary: 'Obtener información detallada de un archivo PDF' })
  @ApiResponse({ 
    status: 200, 
    description: 'Información del archivo obtenida exitosamente',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        filename: { type: 'string' },
        filepath: { type: 'string' },
        size: { type: 'number' },
        formattedSize: { type: 'string' },
        type: { type: 'string' },
        category: { type: 'string' },
        createdAt: { type: 'string' },
        lastAccessed: { type: 'string' },
        accessCount: { type: 'number' },
        isTemporary: { type: 'boolean' },
        expiresAt: { type: 'string' },
        metadata: { type: 'object' }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Archivo PDF no encontrado' })
  async getPdfInfo(@Param('fileId') fileId: string): Promise<PdfFileInfo> {
    try {
      const pdfInfo = await this.pdfManagerService.accessPdf(fileId);
      if (!pdfInfo) {
        throw new HttpException(
          'Archivo PDF no encontrado',
          HttpStatus.NOT_FOUND
        );
      }
      return pdfInfo;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Error al obtener información del archivo PDF',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete('files/:fileId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Eliminar un archivo PDF específico' })
  @ApiResponse({ 
    status: 200, 
    description: 'Archivo eliminado exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Archivo PDF no encontrado' })
  async deletePdf(@Param('fileId') fileId: string): Promise<{ success: boolean; message: string }> {
    try {
      const success = await this.pdfManagerService.removePdf(fileId);
      if (!success) {
        throw new HttpException(
          'Archivo PDF no encontrado o no se pudo eliminar',
          HttpStatus.NOT_FOUND
        );
      }
      return {
        success: true,
        message: 'Archivo PDF eliminado exitosamente'
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Error al eliminar archivo PDF',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('cleanup')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Ejecutar limpieza de archivos PDF' })
  @ApiResponse({ 
    status: 200, 
    description: 'Limpieza ejecutada exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        filesRemoved: { type: 'number' },
        spaceFreed: { type: 'number' },
        formattedSpaceFreed: { type: 'string' },
        details: {
          type: 'object',
          properties: {
            expiredFiles: { type: 'number' },
            tempFiles: { type: 'number' },
            unusedFiles: { type: 'number' },
            duplicateFiles: { type: 'number' }
          }
        },
        duration: { type: 'number' }
      }
    }
  })
  async cleanupPdfs(@Body() cleanupDto: PdfCleanupDto): Promise<PdfCleanupResult> {
    try {
      const options: PdfCleanupOptions = {
        maxAge: cleanupDto.maxAge || 7,
        maxSize: cleanupDto.maxSize || 500 * 1024 * 1024, // 500MB default
        keepRecentCount: cleanupDto.keepRecentCount || 100,
        removeUnused: cleanupDto.removeUnused ?? true,
        removeDuplicates: cleanupDto.removeDuplicates ?? true,
        dryRun: cleanupDto.dryRun ?? false,
        types: cleanupDto.types || ['temp']
      };

      return await this.pdfManagerService.cleanupPdfs(options);
    } catch (error) {
      throw new HttpException(
        'Error durante la limpieza de archivos PDF',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('optimize')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Optimizar almacenamiento de PDFs' })
  @ApiResponse({ 
    status: 200, 
    description: 'Optimización ejecutada exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        optimizations: { 
          type: 'array',
          items: { type: 'string' }
        },
        spaceSaved: { type: 'number' }
      }
    }
  })
  async optimizeStorage(): Promise<{ success: boolean; optimizations: string[]; spaceSaved: number }> {
    try {
      return await this.pdfManagerService.optimizePdfStorage();
    } catch (error) {
      throw new HttpException(
        'Error durante la optimización de almacenamiento',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('management-summary')
  @ApiOperation({ summary: 'Obtener resumen ejecutivo de gestión PDF' })
  @ApiResponse({ 
    status: 200, 
    description: 'Resumen obtenido exitosamente',
    schema: {
      type: 'object',
      properties: {
        storageStats: { type: 'object' },
        recentActivity: {
          type: 'object',
          properties: {
            recentFiles: { type: 'number' },
            recentAccesses: { type: 'number' },
            cleanupsDue: { type: 'number' }
          }
        },
        recommendations: {
          type: 'array',
          items: { type: 'string' }
        },
        nextCleanup: { type: 'string' }
      }
    }
  })
  async getManagementSummary(): Promise<PdfManagementSummary> {
    try {
      const storageStats = await this.pdfManagerService.getStorageStats();
      const allPdfs = await this.pdfManagerService.getAllPdfs();
      
      const now = Date.now();
      const oneDayAgo = now - (24 * 60 * 60 * 1000);
      const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);

      const recentFiles = allPdfs.filter(pdf => 
        pdf.createdAt.getTime() > oneDayAgo
      ).length;

      const recentAccesses = allPdfs.filter(pdf => 
        pdf.lastAccessed.getTime() > oneDayAgo
      ).length;

      const cleanupsDue = allPdfs.filter(pdf => 
        pdf.isTemporary && 
        pdf.expiresAt && 
        pdf.expiresAt.getTime() < now
      ).length;

      const recommendations = this.generateRecommendations(storageStats, allPdfs);

      // Next cleanup is at 2 AM tomorrow
      const nextCleanup = new Date();
      nextCleanup.setDate(nextCleanup.getDate() + 1);
      nextCleanup.setHours(2, 0, 0, 0);

      return {
        storageStats,
        recentActivity: {
          recentFiles,
          recentAccesses,
          cleanupsDue
        },
        recommendations,
        nextCleanup: nextCleanup.toISOString()
      };
    } catch (error) {
      throw new HttpException(
        'Error al obtener resumen de gestión',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('cleanup/preview')
  @ApiOperation({ summary: 'Vista previa de limpieza (dry run)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Vista previa generada exitosamente',
    schema: {
      type: 'object',
      properties: {
        filesRemoved: { type: 'number' },
        spaceFreed: { type: 'number' },
        formattedSpaceFreed: { type: 'string' },
        details: { type: 'object' }
      }
    }
  })
  async previewCleanup(
    @Query('maxAge') maxAge: string = '7',
    @Query('types') types: string = 'temp'
  ): Promise<PdfCleanupResult> {
    try {
      const options: PdfCleanupOptions = {
        maxAge: parseInt(maxAge) || 7,
        dryRun: true,
        types: types.split(',').map(t => t.trim())
      };

      return await this.pdfManagerService.cleanupPdfs(options);
    } catch (error) {
      throw new HttpException(
        'Error al generar vista previa de limpieza',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('categories')
  @ApiOperation({ summary: 'Obtener categorías de archivos PDF disponibles' })
  @ApiResponse({ 
    status: 200, 
    description: 'Categorías obtenidas exitosamente',
    schema: {
      type: 'object',
      properties: {
        categories: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              count: { type: 'number' },
              size: { type: 'number' },
              formattedSize: { type: 'string' }
            }
          }
        }
      }
    }
  })
  async getCategories() {
    try {
      const allPdfs = await this.pdfManagerService.getAllPdfs();
      const categoryStats = allPdfs.reduce((acc, pdf) => {
        if (!acc[pdf.category]) {
          acc[pdf.category] = { count: 0, size: 0 };
        }
        acc[pdf.category].count++;
        acc[pdf.category].size += pdf.size;
        return acc;
      }, {} as Record<string, { count: number; size: number }>);

      const categories = Object.entries(categoryStats).map(([name, stats]) => ({
        name,
        count: stats.count,
        size: stats.size,
        formattedSize: this.formatBytes(stats.size)
      }));

      return { categories };
    } catch (error) {
      throw new HttpException(
        'Error al obtener categorías',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  private generateRecommendations(stats: PdfStorageStats, pdfs: PdfFileInfo[]): string[] {
    const recommendations: string[] = [];

    // Storage usage recommendations
    if (stats.diskUsage.usagePercentage > 90) {
      recommendations.push('🔴 CRÍTICO: Uso de disco muy alto (>90%). Ejecutar limpieza inmediatamente.');
    } else if (stats.diskUsage.usagePercentage > 80) {
      recommendations.push('🟡 ADVERTENCIA: Uso de disco alto (>80%). Considerar limpieza.');
    }

    // Temporary files recommendations
    if (stats.tempFiles > 100) {
      recommendations.push(`📁 ${stats.tempFiles} archivos temporales detectados. Ejecutar limpieza automática.`);
    }

    // Large files recommendations
    const largeTempFiles = pdfs.filter(pdf => 
      pdf.isTemporary && pdf.size > 10 * 1024 * 1024 // >10MB
    ).length;
    if (largeTempFiles > 0) {
      recommendations.push(`📊 ${largeTempFiles} archivos temporales grandes detectados. Revisar necesidad.`);
    }

    // Old files recommendations
    const oldFiles = pdfs.filter(pdf => 
      (Date.now() - pdf.createdAt.getTime()) > (30 * 24 * 60 * 60 * 1000)
    ).length;
    if (oldFiles > 50) {
      recommendations.push(`🗓️ ${oldFiles} archivos antiguos (>30 días). Considerar archivado.`);
    }

    // Performance recommendations
    if (stats.totalFiles > 1000) {
      recommendations.push('⚡ Sistema con muchos archivos. Considerar optimización automática.');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Sistema PDF optimizado. No se requieren acciones inmediatas.');
    }

    return recommendations;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}