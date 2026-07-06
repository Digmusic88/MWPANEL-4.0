import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

import { GroupPhoto, FaceDetection } from './entities';
import { GroupPhotosController } from './controllers/group-photos.controller';
import { FaceDetectionsController } from './controllers/face-detections.controller';
import { GroupPhotosService } from './services/group-photos.service';
import { FaceDetectionsService } from './services/face-detections.service';
import { ImageProcessingService } from './services/image-processing.service';
import { FacialRecognitionService } from './services/facial-recognition.service';

import { StudentsModule } from '../students/students.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([GroupPhoto, FaceDetection]),
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads/group-photos',
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          const filename = `group-photo-${uniqueSuffix}${ext}`;
          callback(null, filename);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
      fileFilter: (req, file, callback) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
          return callback(
            new Error('Solo se permiten archivos de imagen (jpg, jpeg, png, gif)'),
            false,
          );
        }
        callback(null, true);
      },
    }),
    forwardRef(() => StudentsModule),
    forwardRef(() => UsersModule),
  ],
  controllers: [GroupPhotosController, FaceDetectionsController],
  providers: [
    GroupPhotosService,
    FaceDetectionsService,
    ImageProcessingService,
    FacialRecognitionService,
  ],
  exports: [GroupPhotosService, FaceDetectionsService],
})
export class FacialRecognitionModule {}