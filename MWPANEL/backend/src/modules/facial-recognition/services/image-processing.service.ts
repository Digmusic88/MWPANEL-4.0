import { Injectable, Logger } from '@nestjs/common';
import * as sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs';
import { FaceCoordinates } from '../entities/face-detection.entity';

@Injectable()
export class ImageProcessingService {
  private readonly logger = new Logger(ImageProcessingService.name);

  async createThumbnail(
    imagePath: string,
    coordinates: FaceCoordinates,
    outputPath: string,
  ): Promise<string> {
    try {
      // Crear directorio de destino si no existe
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Obtener dimensiones de la imagen original para validar límites
      const imageMetadata = await sharp(imagePath).metadata();
      const imageWidth = imageMetadata.width || 0;
      const imageHeight = imageMetadata.height || 0;

      // Ampliar el área de recorte para incluir más contexto alrededor de la cara
      const marginFactor = 0.3; // 30% de margen adicional
      const marginX = Math.round(coordinates.width * marginFactor);
      const marginY = Math.round(coordinates.height * marginFactor);

      // Calcular nuevas coordenadas con margen, respetando límites de imagen
      const expandedLeft = Math.max(0, Math.round(coordinates.x - marginX));
      const expandedTop = Math.max(0, Math.round(coordinates.y - marginY));
      const expandedWidth = Math.min(
        Math.round(coordinates.width + (marginX * 2)),
        imageWidth - expandedLeft
      );
      const expandedHeight = Math.min(
        Math.round(coordinates.height + (marginY * 2)),
        imageHeight - expandedTop
      );

      // Extraer la cara con área ampliada y crear thumbnail más grande
      await sharp(imagePath)
        .extract({
          left: expandedLeft,
          top: expandedTop,
          width: expandedWidth,
          height: expandedHeight,
        })
        .resize(400, 400, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({
          quality: 92,
          progressive: true,
        })
        .toFile(outputPath);

      this.logger.log(`Thumbnail mejorado creado: ${outputPath} (${expandedWidth}x${expandedHeight} -> 400x400)`);
      return outputPath;
    } catch (error) {
      this.logger.error(`Error creando thumbnail: ${error.message}`);
      throw error;
    }
  }

  async validateImage(imagePath: string): Promise<{
    isValid: boolean;
    metadata?: {
      width: number;
      height: number;
      format: string;
      size: number;
    };
    error?: string;
  }> {
    try {
      const metadata = await sharp(imagePath).metadata();

      if (!metadata.width || !metadata.height) {
        return {
          isValid: false,
          error: 'Imagen inválida: no se pudieron obtener las dimensiones',
        };
      }

      // Validar dimensiones mínimas
      if (metadata.width < 200 || metadata.height < 200) {
        return {
          isValid: false,
          error: 'Imagen muy pequeña: mínimo 200x200 píxeles',
        };
      }

      // Validar formato
      const supportedFormats = ['jpeg', 'jpg', 'png', 'webp'];
      if (!supportedFormats.includes(metadata.format?.toLowerCase() || '')) {
        return {
          isValid: false,
          error: 'Formato no soportado: use JPEG, PNG o WebP',
        };
      }

      const stats = fs.statSync(imagePath);

      return {
        isValid: true,
        metadata: {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format || 'unknown',
          size: stats.size,
        },
      };
    } catch (error) {
      return {
        isValid: false,
        error: `Error procesando imagen: ${error.message}`,
      };
    }
  }

  async optimizeImage(inputPath: string, outputPath: string): Promise<string> {
    try {
      // Crear directorio de destino si no existe
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      await sharp(inputPath)
        .resize(1920, 1080, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({
          quality: 85,
          progressive: true,
        })
        .toFile(outputPath);

      this.logger.log(`Imagen optimizada: ${outputPath}`);
      return outputPath;
    } catch (error) {
      this.logger.error(`Error optimizando imagen: ${error.message}`);
      throw error;
    }
  }

  async generateThumbnailPath(originalPath: string, faceId: string): Promise<string> {
    const dir = path.dirname(originalPath);
    const ext = path.extname(originalPath);
    const basename = path.basename(originalPath, ext);
    
    return path.join(dir, 'thumbnails', `${basename}_face_${faceId}.jpg`);
  }

  async cleanupThumbnails(groupPhotoId: string): Promise<void> {
    try {
      const thumbnailsDir = path.join(process.cwd(), 'uploads', 'group-photos', 'thumbnails');
      
      if (fs.existsSync(thumbnailsDir)) {
        const files = fs.readdirSync(thumbnailsDir);
        const filesToDelete = files.filter(file => file.includes(groupPhotoId));
        
        for (const file of filesToDelete) {
          const filePath = path.join(thumbnailsDir, file);
          fs.unlinkSync(filePath);
          this.logger.log(`Thumbnail eliminado: ${filePath}`);
        }
      }
    } catch (error) {
      this.logger.error(`Error limpiando thumbnails: ${error.message}`);
    }
  }

  async getImageInfo(imagePath: string): Promise<{
    width: number;
    height: number;
    format: string;
    size: number;
    aspectRatio: number;
  }> {
    const metadata = await sharp(imagePath).metadata();
    const stats = fs.statSync(imagePath);

    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: metadata.format || 'unknown',
      size: stats.size,
      aspectRatio: metadata.width && metadata.height ? metadata.width / metadata.height : 0,
    };
  }
}