import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import * as multer from 'multer';
import {
  BlogController,
  BlogCategoriesController,
  BlogCommentsController,
  BlogMediaController,
  BlogPermissionsController,
} from './controllers';
import { BlogSimpleController } from './controllers/blog-simple.controller';
import {
  BlogService,
  BlogCategoryService,
  BlogCommentService,
  BlogMediaService,
  BlogPermissionsService,
} from './services';
import { BlogGoogleDriveService } from './services/blog-google-drive.service';
import { BlogSchedulerService } from './services/blog-scheduler.service';
import {
  BlogPost,
  BlogCategory,
  BlogComment,
  BlogMedia,
  BlogPublishingPermission,
  BlogPostView,
} from './entities';
import { User } from '../users/entities/user.entity';
import { ClassGroup } from '../students/entities/class-group.entity';
import { CommunicationsModule } from '../communications/communications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BlogPost,
      BlogCategory,
      BlogComment,
      BlogMedia,
      BlogPublishingPermission,
      BlogPostView,
      User,
      ClassGroup,
    ]),
    MulterModule.register({
      storage: multer.memoryStorage(), // CRITICAL FIX: Use memory storage for large file chunks
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB por chunk para archivos muy grandes
        files: 1,
        fieldSize: 50 * 1024 * 1024, // 50MB para campos de formulario
        fieldNameSize: 500, // Nombres de campo más largos para URLs de Google Drive
        fields: 20 // Más campos para metadata de chunks
      },
      fileFilter: (req, file, callback) => {
        // Para el endpoint de chunks, permitir todos los archivos
        if (req.route && req.route.path && req.route.path.includes('upload-chunk')) {
          callback(null, true); // Permitir todos los tipos para chunks
          return;
        }
        
        // Para otros uploads, usar filtro normal
        const allowedMimes = [
          // Imágenes
          'image/jpeg',
          'image/jpg', 
          'image/png',
          'image/gif',
          'image/bmp',
          'image/webp',
          'image/svg+xml',
          
          // Videos
          'video/mp4',
          'video/avi',
          'video/mov',
          'video/quicktime', // .mov files
          'video/wmv',
          'video/flv',
          'video/webm',
          'video/mkv',
          
          // Audio
          'audio/mp3',
          'audio/wav',
          'audio/ogg',
          'audio/m4a',
          'audio/flac',
          'audio/aac',
          
          // Documentos
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
          
          // Archivos comprimidos
          'application/zip',
          'application/x-rar-compressed',
          
          // MIME types genéricos (para archivos grandes que pueden no ser detectados correctamente)
          'application/octet-stream' // Para archivos multimedia grandes o con detección incorrecta
        ];

        if (allowedMimes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(new Error(`Tipo de archivo no permitido para blog: ${file.mimetype}`), false);
        }
      }
    }),
    CommunicationsModule,
  ],
  controllers: [
    BlogController,
    BlogCategoriesController,
    BlogCommentsController,
    BlogMediaController,
    BlogSimpleController, // Controlador simplificado para /api/blog/*
    BlogPermissionsController, // Gestión de permisos de publicación
  ],
  providers: [
    BlogService,
    BlogCategoryService,
    BlogCommentService,
    BlogMediaService,
    BlogGoogleDriveService,
    BlogPermissionsService,
    BlogSchedulerService,
  ],
  exports: [
    BlogService,
    BlogCategoryService,
    BlogCommentService,
    BlogMediaService,
    BlogGoogleDriveService,
    BlogPermissionsService,
  ],
})
export class BlogModule {}