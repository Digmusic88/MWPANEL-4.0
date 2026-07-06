import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GroupPhoto, ProcessingStatus } from '../entities/group-photo.entity';
import { CreateGroupPhotoDto } from '../dto/create-group-photo.dto';
import { UpdateGroupPhotoDto } from '../dto/update-group-photo.dto';

@Injectable()
export class GroupPhotosService {
  constructor(
    @InjectRepository(GroupPhoto)
    private groupPhotoRepository: Repository<GroupPhoto>,
  ) {}

  async create(createGroupPhotoDto: CreateGroupPhotoDto, file: Express.Multer.File): Promise<GroupPhoto> {
    if (!file) {
      throw new BadRequestException('El archivo de imagen es requerido');
    }

    const groupPhoto = this.groupPhotoRepository.create({
      ...createGroupPhotoDto,
      originalFilename: file.originalname,
      originalUrl: `/uploads/group-photos/${file.filename}`,
      metadata: {
        fileSize: file.size,
        mimeType: file.mimetype,
      },
    });

    return await this.groupPhotoRepository.save(groupPhoto);
  }

  async findAll(): Promise<GroupPhoto[]> {
    console.error('🔍 [GroupPhotosService] findAll called!!!!');
    // Use raw SQL to get enriched data with assigned faces count
    const rawResults = await this.groupPhotoRepository.query(`
      SELECT 
        gp.*,
        u.email as uploader_email,
        up."firstName" as uploader_first_name,
        up."lastName" as uploader_last_name,
        cg.name as class_group_name,
        cg.section as class_group_section,
        (SELECT COUNT(*) FROM face_detections fd WHERE fd."groupPhotoId" = gp.id AND fd."assignedStudentId" IS NOT NULL) as assigned_faces_count
      FROM group_photos gp
      LEFT JOIN users u ON gp."uploadedById" = u.id
      LEFT JOIN user_profiles up ON u.id = up."userId"
      LEFT JOIN class_groups cg ON gp."classGroupId" = cg.id
      ORDER BY gp."createdAt" DESC
    `);

    console.log('🔍 [GroupPhotos] Raw results count:', rawResults.length);
    if (rawResults.length > 0) {
      console.log('🔍 [GroupPhotos] First result sample:', {
        originalFilename: rawResults[0].originalFilename,
        assigned_faces_count: rawResults[0].assigned_faces_count,
        uploader_first_name: rawResults[0].uploader_first_name,
        uploader_last_name: rawResults[0].uploader_last_name
      });
    }

    return rawResults.map(row => ({
      id: row.id,
      originalFilename: row.originalFilename,
      originalUrl: row.originalUrl,
      uploadDate: row.uploadDate,
      uploadedById: row.uploadedById,
      classGroupId: row.classGroupId,
      processingStatus: row.processingStatus,
      facesDetected: row.facesDetected,
      metadata: row.metadata,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      assignedFaces: parseInt(row.assigned_faces_count) || 0,
      uploadedBy: row.uploader_email ? {
        id: row.uploadedById,
        email: row.uploader_email,
        profile: {
          firstName: row.uploader_first_name,
          lastName: row.uploader_last_name
        }
      } : null,
      classGroup: row.class_group_name ? {
        name: row.class_group_name,
        section: row.class_group_section
      } : null
    }));
  }

  async findByUser(userId: string): Promise<GroupPhoto[]> {
    const groupPhotos = await this.groupPhotoRepository.find({
      where: { uploadedById: userId },
      relations: {
        uploadedBy: {
          profile: true
        },
        classGroup: true,
        faceDetections: true
      },
      order: { createdAt: 'DESC' },
    });

    // Add assignedFaces count to each photo
    return groupPhotos.map(photo => {
      const assignedCount = photo.faceDetections?.filter(face => face.assignedStudentId).length || 0;
      return {
        ...photo,
        assignedFaces: assignedCount
      } as any; // Cast to any to allow adding dynamic property
    });
  }

  async findByClassGroup(classGroupId: string): Promise<GroupPhoto[]> {
    const groupPhotos = await this.groupPhotoRepository.find({
      where: { classGroupId },
      relations: {
        uploadedBy: {
          profile: true
        },
        classGroup: true,
        faceDetections: true
      },
      order: { createdAt: 'DESC' },
    });

    // Add assignedFaces count to each photo
    return groupPhotos.map(photo => {
      const assignedCount = photo.faceDetections?.filter(face => face.assignedStudentId).length || 0;
      return {
        ...photo,
        assignedFaces: assignedCount
      } as any; // Cast to any to allow adding dynamic property
    });
  }

  async findOne(id: string): Promise<GroupPhoto> {
    const groupPhoto = await this.groupPhotoRepository.findOne({
      where: { id },
      relations: {
        uploadedBy: {
          profile: true
        },
        classGroup: true,
        faceDetections: {
          assignedStudent: true
        }
      },
    });

    if (!groupPhoto) {
      throw new NotFoundException(`Foto grupal con ID ${id} no encontrada`);
    }

    // Add assignedFaces count
    const assignedCount = groupPhoto.faceDetections?.filter(face => face.assignedStudentId).length || 0;
    return {
      ...groupPhoto,
      assignedFaces: assignedCount
    } as any; // Cast to any to allow adding dynamic property
  }

  async update(id: string, updateGroupPhotoDto: UpdateGroupPhotoDto): Promise<GroupPhoto> {
    const groupPhoto = await this.findOne(id);

    Object.assign(groupPhoto, updateGroupPhotoDto);

    return await this.groupPhotoRepository.save(groupPhoto);
  }

  async updateProcessingStatus(id: string, status: ProcessingStatus, facesDetected?: number): Promise<GroupPhoto> {
    const groupPhoto = await this.findOne(id);

    groupPhoto.processingStatus = status;
    if (facesDetected !== undefined) {
      groupPhoto.facesDetected = facesDetected;
    }

    return await this.groupPhotoRepository.save(groupPhoto);
  }

  async remove(id: string): Promise<void> {
    const groupPhoto = await this.findOne(id);
    await this.groupPhotoRepository.remove(groupPhoto);
  }

  async getStatistics(): Promise<{
    total: number;
    byStatus: Record<ProcessingStatus, number>;
    totalFacesDetected: number;
    totalFacesAssigned: number;
  }> {
    const photos = await this.groupPhotoRepository.find({
      relations: ['faceDetections'],
    });

    const stats = {
      total: photos.length,
      byStatus: {
        [ProcessingStatus.PENDING]: 0,
        [ProcessingStatus.PROCESSING]: 0,
        [ProcessingStatus.COMPLETED]: 0,
        [ProcessingStatus.FAILED]: 0,
      },
      totalFacesDetected: 0,
      totalFacesAssigned: 0,
    };

    photos.forEach((photo) => {
      stats.byStatus[photo.processingStatus]++;
      stats.totalFacesDetected += photo.faceDetections.length;
      stats.totalFacesAssigned += photo.faceDetections.filter(
        (face) => face.assignedStudentId,
      ).length;
    });

    return stats;
  }
}