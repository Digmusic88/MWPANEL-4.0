import { Injectable, Logger } from '@nestjs/common';
import { FaceCoordinates, FacialEmbedding } from '../entities/face-detection.entity';
import { ImageProcessingService } from './image-processing.service';
import { FaceDetectionsService } from './face-detections.service';

export interface DetectionResult {
  faces: {
    id: string;
    coordinates: FaceCoordinates;
    confidence: number;
    thumbnailUrl?: string;
  }[];
  totalFaces: number;
}

@Injectable()
export class FacialRecognitionService {
  private readonly logger = new Logger(FacialRecognitionService.name);

  constructor(
    private readonly imageProcessingService: ImageProcessingService,
    private readonly faceDetectionsService: FaceDetectionsService,
  ) {}

  async processFacesFromClientDetections(
    imagePath: string,
    clientDetections: Array<{
      x: number;
      y: number;
      width: number;
      height: number;
      confidence?: number;
    }>,
    groupPhotoId: string,
  ): Promise<DetectionResult> {
    try {
      const result: DetectionResult = {
        faces: [],
        totalFaces: clientDetections.length,
      };

      // Procesar cada detección enviada desde el cliente
      for (let i = 0; i < clientDetections.length; i++) {
        const detection = clientDetections[i];
        const faceId = `${groupPhotoId}_face_${i}`;

        // Validar coordenadas
        const coordinates: FaceCoordinates = {
          x: Math.max(0, detection.x),
          y: Math.max(0, detection.y),
          width: Math.max(50, detection.width), // Mínimo 50px
          height: Math.max(50, detection.height), // Mínimo 50px
        };

        // Generar thumbnail del rostro
        const thumbnailPath = await this.imageProcessingService.generateThumbnailPath(
          imagePath,
          faceId,
        );

        try {
          await this.imageProcessingService.createThumbnail(
            imagePath,
            coordinates,
            thumbnailPath,
          );

          // Create proper API URL for thumbnail access
          // Look for uploads directory (with or without leading slash)
          let uploadsIndex = thumbnailPath.indexOf('/uploads/');
          if (uploadsIndex === -1) {
            uploadsIndex = thumbnailPath.indexOf('uploads/');
          }
          
          let thumbnailUrl: string | undefined;
          
          if (uploadsIndex !== -1) {
            // Extract the uploads/... portion and ensure it starts with /
            let uploadRelativePath = thumbnailPath.substring(uploadsIndex);
            if (!uploadRelativePath.startsWith('/')) {
              uploadRelativePath = '/' + uploadRelativePath;
            }
            thumbnailUrl = uploadRelativePath;
            
            this.logger.log(`✅ Generated thumbnail URL for face ${faceId}: ${thumbnailUrl}`);
          } else {
            this.logger.error(`❌ Invalid thumbnail path - missing uploads directory: ${thumbnailPath}`);
          }

          result.faces.push({
            id: faceId,
            coordinates,
            confidence: detection.confidence || 0.8,
            thumbnailUrl,
          });
        } catch (thumbnailError) {
          this.logger.error(`Error creando thumbnail para cara ${faceId}: ${thumbnailError.message}`);
          
          // Agregar cara sin thumbnail
          result.faces.push({
            id: faceId,
            coordinates,
            confidence: detection.confidence || 0.8,
          });
        }
      }

      this.logger.log(`Procesadas ${result.faces.length} caras para foto ${groupPhotoId}`);
      return result;
    } catch (error) {
      this.logger.error(`Error procesando caras: ${error.message}`);
      throw error;
    }
  }

  async generateFacialEmbedding(imagePath: string): Promise<FacialEmbedding> {
    // Placeholder para futura implementación con face-recognition o similar
    // Por ahora devolvemos un embedding dummy
    return {
      vector: Array(128).fill(0).map(() => Math.random()),
      algorithm: 'placeholder',
      version: '1.0',
    };
  }

  async findSimilarFaces(
    embedding: FacialEmbedding,
    threshold: number = 0.6,
  ): Promise<Array<{ faceId: string; similarity: number }>> {
    // Placeholder para futura implementación
    // Aquí se implementaría la búsqueda de caras similares usando embeddings
    return [];
  }

  async calculateSimilarity(embedding1: FacialEmbedding, embedding2: FacialEmbedding): Promise<number> {
    // Placeholder para cálculo de similitud usando distancia euclidiana
    if (embedding1.vector.length !== embedding2.vector.length) {
      return 0;
    }

    let sum = 0;
    for (let i = 0; i < embedding1.vector.length; i++) {
      sum += Math.pow(embedding1.vector[i] - embedding2.vector[i], 2);
    }

    const distance = Math.sqrt(sum);
    return Math.max(0, 1 - distance); // Convertir distancia a similitud
  }

  async suggestStudentMatches(
    faceId: string,
    classGroupId?: string,
  ): Promise<Array<{ studentId: string; confidence: number; reason: string }>> {
    // Placeholder para futura implementación
    // Aquí se implementaría la sugerencia de estudiantes basada en:
    // 1. Embeddings faciales similares
    // 2. Estudiantes del mismo grupo de clase
    // 3. Historial de asignaciones previas
    return [];
  }

  async validateFaceQuality(coordinates: FaceCoordinates, imageWidth: number, imageHeight: number): Promise<{
    isValid: boolean;
    issues: string[];
    score: number;
  }> {
    const issues: string[] = [];
    let score = 1.0;

    // Validar tamaño mínimo
    if (coordinates.width < 64 || coordinates.height < 64) {
      issues.push('Cara muy pequeña (mínimo 64x64 píxeles)');
      score -= 0.3;
    }

    // Validar que la cara esté dentro de la imagen
    if (coordinates.x < 0 || coordinates.y < 0 || 
        coordinates.x + coordinates.width > imageWidth ||
        coordinates.y + coordinates.height > imageHeight) {
      issues.push('Cara fuera de los límites de la imagen');
      score -= 0.4;
    }

    // Validar proporción facial (aproximadamente cuadrada)
    const aspectRatio = coordinates.width / coordinates.height;
    if (aspectRatio < 0.7 || aspectRatio > 1.4) {
      issues.push('Proporción facial inusual');
      score -= 0.2;
    }

    // Validar posición (no muy cerca de los bordes)
    const marginX = imageWidth * 0.05;
    const marginY = imageHeight * 0.05;
    if (coordinates.x < marginX || coordinates.y < marginY ||
        coordinates.x + coordinates.width > imageWidth - marginX ||
        coordinates.y + coordinates.height > imageHeight - marginY) {
      issues.push('Cara muy cerca del borde de la imagen');
      score -= 0.1;
    }

    return {
      isValid: issues.length === 0,
      issues,
      score: Math.max(0, score),
    };
  }
}