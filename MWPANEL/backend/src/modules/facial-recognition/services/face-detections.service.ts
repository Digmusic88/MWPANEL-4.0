import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FaceDetection, FaceCoordinates } from '../entities/face-detection.entity';
import { CreateFaceDetectionDto } from '../dto/create-face-detection.dto';
import { AssignFaceDto } from '../dto/assign-face.dto';

@Injectable()
export class FaceDetectionsService {
  constructor(
    @InjectRepository(FaceDetection)
    private faceDetectionRepository: Repository<FaceDetection>,
  ) {}

  async create(createFaceDetectionDto: CreateFaceDetectionDto): Promise<FaceDetection> {
    const faceDetection = this.faceDetectionRepository.create(createFaceDetectionDto);
    return await this.faceDetectionRepository.save(faceDetection);
  }

  async createBulk(faceDetections: CreateFaceDetectionDto[]): Promise<FaceDetection[]> {
    const entities = this.faceDetectionRepository.create(faceDetections);
    return await this.faceDetectionRepository.save(entities);
  }

  async findAll(): Promise<FaceDetection[]> {
    return await this.faceDetectionRepository.find({
      relations: {
        groupPhoto: true,
        assignedStudent: {
          user: {
            profile: true
          }
        },
        assignedBy: true
      },
      order: { createdAt: 'DESC' },
    });
  }

  async findByGroupPhoto(groupPhotoId: string): Promise<FaceDetection[]> {
    console.error('🔍 [FaceDetections] findByGroupPhoto called with:', groupPhotoId);
    
    // Use raw query to ensure we get all the data including student names
    const rawResults = await this.faceDetectionRepository.query(`
      SELECT 
        fd.*,
        s.id as student_id,
        s."enrollmentNumber" as student_enrollment,
        s."photoUrl" as student_photo,
        up."firstName" as student_first_name,
        up."lastName" as student_last_name,
        u.email as student_email
      FROM face_detections fd
      LEFT JOIN students s ON fd."assignedStudentId" = s.id
      LEFT JOIN users u ON s."userId" = u.id  
      LEFT JOIN user_profiles up ON u.id = up."userId"
      WHERE fd."groupPhotoId" = $1
      ORDER BY fd."createdAt" ASC
    `, [groupPhotoId]);

    console.log('🔍 [FaceDetections] Raw results count:', rawResults.length);
    if (rawResults.length > 0) {
      console.log('🔍 [FaceDetections] First result sample:', {
        id: rawResults[0].id,
        student_first_name: rawResults[0].student_first_name,
        student_last_name: rawResults[0].student_last_name
      });
    }

    // Transform raw results into FaceDetection objects with enriched assignedStudent data
    return rawResults.map(row => {
      const faceDetection: any = {
        id: row.id,
        groupPhotoId: row.groupPhotoId,
        faceCoordinates: row.faceCoordinates,
        thumbnailUrl: row.thumbnailUrl,
        confidenceScore: row.confidenceScore,
        assignedStudentId: row.assignedStudentId,
        assignedAt: row.assignedAt,
        assignedById: row.assignedById,
        facialEmbedding: row.facialEmbedding,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        assignedStudent: null,
        assignedBy: null,
        groupPhoto: null
      };

      // If there's an assigned student, create the enriched object
      if (row.student_id) {
        faceDetection.assignedStudent = {
          id: row.student_id,
          enrollmentNumber: row.student_enrollment,
          photoUrl: row.student_photo,
          birthDate: null,
          createdAt: null,
          updatedAt: null,
          user: {
            id: null,
            email: row.student_email,
            role: 'student',
            profile: {
              id: null,
              firstName: row.student_first_name,
              lastName: row.student_last_name,
              userId: null,
              createdAt: null,
              updatedAt: null
            }
          }
        };
      }

      return faceDetection;
    });
  }

  async findByStudent(studentId: string): Promise<FaceDetection[]> {
    return await this.faceDetectionRepository.find({
      where: { assignedStudentId: studentId },
      relations: ['groupPhoto', 'assignedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async findUnassigned(): Promise<FaceDetection[]> {
    return await this.faceDetectionRepository.find({
      where: { assignedStudentId: null },
      relations: ['groupPhoto'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<FaceDetection> {
    // Use raw query to ensure we get all the data including student names
    const rawResults = await this.faceDetectionRepository.query(`
      SELECT 
        fd.*,
        s.id as student_id,
        s."enrollmentNumber" as student_enrollment,
        s."photoUrl" as student_photo,
        up."firstName" as student_first_name,
        up."lastName" as student_last_name,
        u.email as student_email
      FROM face_detections fd
      LEFT JOIN students s ON fd."assignedStudentId" = s.id
      LEFT JOIN users u ON s."userId" = u.id  
      LEFT JOIN user_profiles up ON u.id = up."userId"
      WHERE fd.id = $1
    `, [id]);

    if (!rawResults || rawResults.length === 0) {
      throw new NotFoundException(`Detección facial con ID ${id} no encontrada`);
    }

    const row = rawResults[0];
    const faceDetection: any = {
      id: row.id,
      groupPhotoId: row.groupPhotoId,
      faceCoordinates: row.faceCoordinates,
      thumbnailUrl: row.thumbnailUrl,
      confidenceScore: row.confidenceScore,
      assignedStudentId: row.assignedStudentId,
      assignedAt: row.assignedAt,
      assignedById: row.assignedById,
      facialEmbedding: row.facialEmbedding,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      assignedStudent: null,
      assignedBy: null,
      groupPhoto: null
    };

    // If there's an assigned student, create the enriched object
    if (row.student_id) {
      faceDetection.assignedStudent = {
        id: row.student_id,
        enrollmentNumber: row.student_enrollment,
        photoUrl: row.student_photo,
        birthDate: null,
        createdAt: null,
        updatedAt: null,
        user: {
          id: null,
          email: row.student_email,
          role: 'student',
          profile: {
            id: null,
            firstName: row.student_first_name,
            lastName: row.student_last_name,
            userId: null,
            createdAt: null,
            updatedAt: null
          }
        }
      };
      console.log('🔍 [FaceDetections] Enriched student data:', {
        id: row.student_id,
        firstName: row.student_first_name,
        lastName: row.student_last_name,
        enrollmentNumber: row.student_enrollment
      });
    }

    return faceDetection as FaceDetection;
  }

  async assignToStudent(id: string, assignFaceDto: AssignFaceDto): Promise<FaceDetection> {
    // Use standard TypeORM findOne for validation and saving
    const faceDetection = await this.faceDetectionRepository.findOne({
      where: { id },
    });

    if (!faceDetection) {
      throw new NotFoundException(`Detección facial con ID ${id} no encontrada`);
    }

    if (faceDetection.assignedStudentId) {
      throw new BadRequestException('Esta cara ya está asignada a un estudiante');
    }

    faceDetection.assignedStudentId = assignFaceDto.studentId;
    faceDetection.assignedById = assignFaceDto.assignedById;
    faceDetection.assignedAt = new Date();

    await this.faceDetectionRepository.save(faceDetection);

    // Reload with full relations using our raw SQL query for display
    return await this.findOne(id);
  }

  async unassignFromStudent(id: string, userId: string): Promise<FaceDetection> {
    // Use standard TypeORM findOne for validation and saving
    const faceDetection = await this.faceDetectionRepository.findOne({
      where: { id },
    });

    if (!faceDetection) {
      throw new NotFoundException(`Detección facial con ID ${id} no encontrada`);
    }

    if (!faceDetection.assignedStudentId) {
      throw new BadRequestException('Esta cara no está asignada a ningún estudiante');
    }

    // Store the student ID before unassigning to remove their photo
    const studentIdToRemovePhoto = faceDetection.assignedStudentId;

    // Use raw SQL update to ensure null assignment works correctly
    await this.faceDetectionRepository.query(`
      UPDATE face_detections 
      SET "assignedStudentId" = NULL, 
          "assignedById" = $1, 
          "assignedAt" = NOW()
      WHERE id = $2
    `, [userId, id]);

    // Remove the photo from the student's profile (set avatarUrl to NULL)
    try {
      await this.faceDetectionRepository.query(`
        UPDATE user_profiles 
        SET "avatarUrl" = NULL
        WHERE "userId" = (
          SELECT u.id 
          FROM students s 
          JOIN users u ON s."userId" = u.id 
          WHERE s.id = $1
        )
      `, [studentIdToRemovePhoto]);
      
      console.log(`🗑️ Removed photo from student ${studentIdToRemovePhoto} profile (set avatarUrl to NULL)`);
    } catch (error) {
      console.warn(`⚠️ Could not remove photo from student profile: ${error.message}`);
      // Don't fail the unassignment if photo removal fails
    }

    // Reload with full relations using our raw SQL query for display
    return await this.findOne(id);
  }

  async updateThumbnail(id: string, thumbnailUrl: string): Promise<FaceDetection> {
    const faceDetection = await this.findOne(id);
    faceDetection.thumbnailUrl = thumbnailUrl;
    return await this.faceDetectionRepository.save(faceDetection);
  }

  async updateFacialEmbedding(id: string, embedding: any): Promise<FaceDetection> {
    const faceDetection = await this.findOne(id);
    faceDetection.facialEmbedding = embedding;
    return await this.faceDetectionRepository.save(faceDetection);
  }

  async remove(id: string): Promise<void> {
    const faceDetection = await this.findOne(id);
    await this.faceDetectionRepository.remove(faceDetection);
  }

  async removeByGroupPhoto(groupPhotoId: string): Promise<void> {
    await this.faceDetectionRepository.delete({ groupPhotoId });
  }

  async getStatistics(): Promise<{
    total: number;
    assigned: number;
    unassigned: number;
    averageConfidence: number;
  }> {
    const faces = await this.faceDetectionRepository.find();

    const stats = {
      total: faces.length,
      assigned: faces.filter((face) => face.assignedStudentId).length,
      unassigned: faces.filter((face) => !face.assignedStudentId).length,
      averageConfidence: 0,
    };

    const facesWithConfidence = faces.filter((face) => face.confidenceScore !== null);
    if (facesWithConfidence.length > 0) {
      const totalConfidence = facesWithConfidence.reduce(
        (sum, face) => sum + (face.confidenceScore || 0),
        0,
      );
      stats.averageConfidence = totalConfidence / facesWithConfidence.length;
    }

    return stats;
  }

  async findSimilarFaces(embedding: any, threshold: number = 0.6): Promise<FaceDetection[]> {
    // Esta función implementaría la búsqueda de caras similares usando embeddings
    // Por ahora devolvemos un array vacío, se implementará en futuras versiones
    return [];
  }
}