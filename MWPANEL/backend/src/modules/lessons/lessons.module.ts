import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { 
  LessonWorkspace, 
  LessonFolder, 
  LessonResource, 
  LessonResourceShare,
  LessonResourceAccessLog 
} from './entities';
import { LessonsController } from './controllers/lessons.controller';
import { LessonsService } from './services/lessons.service';
import { TsxSecurityService } from './services/tsx-security.service';
import { GoogleDriveService } from '../educational-resources/services/google-drive.service';
import { LessonsGoogleDriveService } from './services/lessons-google-drive.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LessonWorkspace,
      LessonFolder,
      LessonResource,
      LessonResourceShare,
      LessonResourceAccessLog
    ]),
    MulterModule.register({
      dest: './uploads/lessons',
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB
        files: 1
      },
      fileFilter: (req, file, callback) => {
        // Permitir todos los tipos de archivo educativos
        const allowedMimes = [
          // Documentos
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'text/plain',
          'text/csv',
          'application/rtf',
          
          // Imágenes
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/gif',
          'image/bmp',
          'image/webp',
          'image/svg+xml',
          
          // Audio
          'audio/mp3',
          'audio/wav',
          'audio/ogg',
          'audio/m4a',
          'audio/flac',
          
          // Video
          'video/mp4',
          'video/avi',
          'video/mov',
          'video/wmv',
          'video/flv',
          'video/webm',
          'video/mkv',
          
          // Archivos comprimidos
          'application/zip',
          'application/x-rar-compressed',
          'application/x-7z-compressed',
          'application/x-tar',
          'application/gzip',
          
          // Código y desarrollo
          'text/html',
          'text/css',
          'text/javascript',
          'application/json',
          'text/xml',
          'application/xml',
          
          // Archivos de diseño
          'application/vnd.adobe.illustrator',
          'image/vnd.adobe.photoshop',
          'application/x-sketch'
        ];

        if (allowedMimes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(new Error(`Tipo de archivo no permitido: ${file.mimetype}`), false);
        }
      }
    })
  ],
  controllers: [LessonsController],
  providers: [
    LessonsService,
    TsxSecurityService,
    GoogleDriveService,
    LessonsGoogleDriveService
  ],
  exports: [
    LessonsService,
    TsxSecurityService
  ]
})
export class LessonsModule {}