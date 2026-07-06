import { FaceDetector, FilesetResolver, Detection } from '@mediapipe/tasks-vision';

export interface FaceDetectionResult {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

export class FaceDetectionService {
  private static instance: FaceDetectionService;
  private faceDetector: FaceDetector | null = null;
  private isInitialized = false;
  private isInitializing = false;

  private constructor() {}

  static getInstance(): FaceDetectionService {
    if (!FaceDetectionService.instance) {
      FaceDetectionService.instance = new FaceDetectionService();
    }
    return FaceDetectionService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (this.isInitializing) {
      // Esperar a que termine la inicialización en curso
      while (this.isInitializing) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }

    this.isInitializing = true;

    try {
      // Resolver el conjunto de archivos de MediaPipe
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
      );

      // Crear el detector de caras
      this.faceDetector = await FaceDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
          delegate: 'GPU'
        },
        runningMode: 'IMAGE',
        minDetectionConfidence: 0.5,
        minSuppressionThreshold: 0.3
      });

      this.isInitialized = true;
      console.log('MediaPipe Face Detector inicializado exitosamente');
    } catch (error) {
      console.error('Error inicializando MediaPipe:', error);
      throw new Error('No se pudo inicializar el detector de caras');
    } finally {
      this.isInitializing = false;
    }
  }

  async detectFaces(imageFile: File): Promise<FaceDetectionResult[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.faceDetector) {
      throw new Error('Detector de caras no inicializado');
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = async () => {
        try {
          // Crear canvas para procesar la imagen
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('No se pudo crear el contexto del canvas'));
            return;
          }

          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          // Detectar caras
          const results = this.faceDetector!.detect(canvas);
          
          // Convertir resultados a formato esperado
          const faces: FaceDetectionResult[] = results.detections.map((detection: Detection) => {
            const boundingBox = detection.boundingBox;
            return {
              x: boundingBox?.originX || 0,
              y: boundingBox?.originY || 0,
              width: boundingBox?.width || 0,
              height: boundingBox?.height || 0,
              confidence: detection.categories[0]?.score || 0
            };
          });

          resolve(faces);
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error('Error cargando la imagen'));
      };

      img.src = URL.createObjectURL(imageFile);
    });
  }

  async detectFacesFromImageElement(imageElement: HTMLImageElement): Promise<FaceDetectionResult[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.faceDetector) {
      throw new Error('Detector de caras no inicializado');
    }

    try {
      const results = this.faceDetector.detect(imageElement);
      
      const faces: FaceDetectionResult[] = results.detections.map((detection: Detection) => {
        const boundingBox = detection.boundingBox;
        return {
          x: boundingBox?.originX || 0,
          y: boundingBox?.originY || 0,
          width: boundingBox?.width || 0,
          height: boundingBox?.height || 0,
          confidence: detection.categories[0]?.score || 0
        };
      });

      return faces;
    } catch (error) {
      throw new Error(`Error detectando caras: ${error}`);
    }
  }

  async detectFacesFromCanvas(canvas: HTMLCanvasElement): Promise<FaceDetectionResult[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.faceDetector) {
      throw new Error('Detector de caras no inicializado');
    }

    try {
      const results = this.faceDetector.detect(canvas);
      
      const faces: FaceDetectionResult[] = results.detections.map((detection: Detection) => {
        const boundingBox = detection.boundingBox;
        return {
          x: boundingBox?.originX || 0,
          y: boundingBox?.originY || 0,
          width: boundingBox?.width || 0,
          height: boundingBox?.height || 0,
          confidence: detection.categories[0]?.score || 0
        };
      });

      return faces;
    } catch (error) {
      throw new Error(`Error detectando caras: ${error}`);
    }
  }

  // Método para validar si una imagen es adecuada para detección facial
  validateImageForFaceDetection(imageFile: File): Promise<{
    isValid: boolean;
    issues: string[];
    imageInfo: {
      width: number;
      height: number;
      size: number;
      type: string;
    };
  }> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const issues: string[] = [];
        const imageInfo = {
          width: img.width,
          height: img.height,
          size: imageFile.size,
          type: imageFile.type
        };

        // Validar dimensiones mínimas
        if (img.width < 320 || img.height < 240) {
          issues.push('Imagen muy pequeña (mínimo 320x240 píxeles)');
        }

        // Validar tamaño máximo
        if (imageFile.size > 10 * 1024 * 1024) {
          issues.push('Imagen muy grande (máximo 10MB)');
        }

        // Validar formato
        if (!['image/jpeg', 'image/png', 'image/gif'].includes(imageFile.type)) {
          issues.push('Formato no soportado (use JPEG, PNG o GIF)');
        }

        // Validar relación de aspecto
        const aspectRatio = img.width / img.height;
        if (aspectRatio < 0.5 || aspectRatio > 3) {
          issues.push('Relación de aspecto inusual');
        }

        resolve({
          isValid: issues.length === 0,
          issues,
          imageInfo
        });
      };

      img.onerror = () => {
        resolve({
          isValid: false,
          issues: ['Error cargando la imagen'],
          imageInfo: {
            width: 0,
            height: 0,
            size: imageFile.size,
            type: imageFile.type
          }
        });
      };

      img.src = URL.createObjectURL(imageFile);
    });
  }

  // Método para limpiar recursos
  cleanup(): void {
    if (this.faceDetector) {
      this.faceDetector.close();
      this.faceDetector = null;
    }
    this.isInitialized = false;
    this.isInitializing = false;
  }
}

// Exportar instancia singleton
export const faceDetectionService = FaceDetectionService.getInstance();