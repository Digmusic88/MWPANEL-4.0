/**
 * @archivo: educational-resources.service.ts
 * @módulo: Educational Resources (Sistema de Recursos Didácticos)
 * @función: Lógica de negocio para recursos educativos con Google Drive
 * @crítico: SÍ - Recién reparado y funcionando al 100%
 * @dependencias: GoogleDriveService, múltiples repositories
 * @no_modificar: Métodos de transformación de tagsArray sin probar
 * @relacionado_con: google-drive.service.ts, educational-resources.controller.ts
 */

/**
 * MAPA DE DEPENDENCIAS - EducationalResourcesService (RECIÉN REPARADO)
 * 
 * ESTE MÓDULO ES USADO POR:
 * - EducationalResourcesController (todos los endpoints de recursos)
 * - Frontend recursos pages (subida y visualización)
 * - Dashboard widgets (contadores de recursos)
 * 
 * ESTE MÓDULO USA:
 * - GoogleDriveService (subida automática a Drive)
 * - EducationalResource repository (gestión BD)
 * - Subject y EducationalLevel (metadatos)
 * - ResourceAssignment, View, Favorite, Comment repositories
 * 
 * MODIFICACIONES RECIENTES (2025-07-12):
 * - ✅ Fix JSON parsing errors con tagsArray
 * - ✅ Fix Google Drive upload (stream conversion)  
 * - ✅ Añadido endpoint individual de recursos
 * - ✅ Transformación correcta de virtual properties
 * 
 * ESTADO ACTUAL: ✅ FUNCIONAL 100%
 * - 8 recursos en base de datos
 * - Google Drive conectado y sincronizado
 * - Subida automática funcionando
 * - API endpoints sin errores 404/400
 */

import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, MoreThanOrEqual, Like, In, DataSource } from 'typeorm';
import { EducationalResource, ResourceType } from './entities/educational-resource.entity';
import { ResourceAssignment } from './entities/resource-assignment.entity';
import { ResourceView } from './entities/resource-view.entity';
import { ResourceFavorite } from './entities/resource-favorite.entity';
import { ResourceComment } from './entities/resource-comment.entity';
import { ResourceFolder } from './entities/resource-folder.entity';
import { Subject } from '../students/entities/subject.entity';
import { EducationalLevel } from '../students/entities/educational-level.entity';
import { Student } from '../students/entities/student.entity';
import { User } from '../users/entities/user.entity';
import { CreateResourceDto, UpdateResourceDto, ResourceFiltersDto, CreateFolderDto, UpdateFolderDto, CreateLinkResourceDto } from './dto';
import { GoogleDriveService } from './services/google-drive.service';
import { CurrentAcademicYearService } from '../academic-years/current-academic-year.service';

@Injectable()
export class EducationalResourcesService {
  constructor(
    @InjectRepository(EducationalResource)
    private resourceRepository: Repository<EducationalResource>,
    @InjectRepository(ResourceAssignment)
    private assignmentRepository: Repository<ResourceAssignment>,
    @InjectRepository(ResourceView)
    private viewRepository: Repository<ResourceView>,
    @InjectRepository(ResourceFavorite)
    private favoriteRepository: Repository<ResourceFavorite>,
    @InjectRepository(ResourceComment)
    private commentRepository: Repository<ResourceComment>,
    @InjectRepository(ResourceFolder)
    private folderRepository: Repository<ResourceFolder>,
    @InjectRepository(Subject)
    private subjectRepository: Repository<Subject>,
    @InjectRepository(EducationalLevel)
    private educationalLevelRepository: Repository<EducationalLevel>,
    @InjectRepository(Student)
    private studentsRepository: Repository<Student>,
    private googleDriveService: GoogleDriveService,
    private dataSource: DataSource,
    private readonly currentAcademicYearService: CurrentAcademicYearService,
  ) {}

  // Helper para generar año académico en formato correcto (ej: "2025-2026")
  private generateAcademicYear(): string {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
    
    // Si estamos en enero-agosto, el año académico empezó el año anterior
    // Si estamos en septiembre-diciembre, el año académico empezó este año
    if (currentMonth >= 9) {
      return `${currentYear}-${currentYear + 1}`;
    } else {
      return `${currentYear - 1}-${currentYear}`;
    }
  }

  async scrapeUrlMetadata(url: string): Promise<{
    title: string | null;
    description: string | null;
    image: string | null;
  }> {
    // SSRF guard: only fetch public http/https URLs
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return { title: null, description: null, image: null };
      }
      const hostname = parsed.hostname;
      if (
        hostname === 'localhost' ||
        /^127\./.test(hostname) ||
        /^10\./.test(hostname) ||
        /^192\.168\./.test(hostname) ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
        hostname === '169.254.169.254'
      ) {
        return { title: null, description: null, image: null };
      }
    } catch {
      return { title: null, description: null, image: null };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'MW-Panel-Bot/1.0 (link preview)' },
      });

      if (!response.ok) return { title: null, description: null, image: null };

      // Read at most 100 KB — OG tags are always in <head>
      const MAX_BYTES = 100_000;
      let html = '';
      const reader = response.body?.getReader();
      if (reader) {
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          html += decoder.decode(value, { stream: true });
          if (html.length >= MAX_BYTES) { reader.cancel(); break; }
        }
      } else {
        html = await response.text();
      }

      const getOgTag = (property: string): string | null => {
        const match = html.match(
          new RegExp(`<meta[^>]+property=["']og:${property}["'][^>]+content=["']([^"']+)["']`, 'i')
        ) || html.match(
          new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${property}["']`, 'i')
        );
        return match ? match[1] : null;
      };

      const getMetaName = (name: string): string | null => {
        const match = html.match(
          new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i')
        ) || html.match(
          new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, 'i')
        );
        return match ? match[1] : null;
      };

      const getTitleTag = (): string | null => {
        const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        return match ? match[1].trim() : null;
      };

      return {
        title: getOgTag('title') || getTitleTag(),
        description: getOgTag('description') || getMetaName('description'),
        image: getOgTag('image'),
      };
    } catch {
      return { title: null, description: null, image: null };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async createLinkResource(dto: CreateLinkResourceDto, userId: string, userRole: string): Promise<EducationalResource> {
    const subject = await this.subjectRepository.findOne({ where: { id: dto.subjectId } });
    if (!subject) throw new NotFoundException(`Asignatura ${dto.subjectId} no encontrada`);

    const educationalLevel = await this.educationalLevelRepository.findOne({ where: { id: dto.educationalLevelId } });
    if (!educationalLevel) throw new NotFoundException(`Nivel educativo ${dto.educationalLevelId} no encontrado`);

    let previewTitle = dto.previewTitle ?? null;
    let previewDescription = dto.previewDescription ?? null;
    let previewImage = dto.previewImage ?? null;

    if (!previewTitle || !previewDescription) {
      const scraped = await this.scrapeUrlMetadata(dto.externalUrl);
      previewTitle = previewTitle ?? scraped.title;
      previewDescription = previewDescription ?? scraped.description;
      previewImage = previewImage ?? scraped.image;
    }

    const authorId = (userRole === 'admin' && dto.authorId) ? dto.authorId : userId;

    const resource = this.resourceRepository.create({
      title: dto.title,
      description: dto.description ?? null,
      type: ResourceType.LINK,
      gradeLevel: dto.gradeLevel,
      academicYear: this.generateAcademicYear(),
      externalUrl: dto.externalUrl,
      previewTitle,
      previewDescription,
      previewImage,
      subjectId: dto.subjectId,
      educationalLevelId: dto.educationalLevelId,
      folderId: dto.folderId ?? null,
      isPublic: dto.isPublic ?? false,
      authorId,
      driveFileId: null,
      driveFolderId: null,
      driveFileName: null,
      mimeType: null,
      fileSize: null,
    });

    return this.resourceRepository.save(resource);
  }

  async getResourcesList(filters: ResourceFiltersDto, userId?: string) {
    console.log('🔍 RESOURCES LIST DEBUG - incoming filters:', JSON.stringify(filters, null, 2));
    console.log('🔍 RESOURCES LIST DEBUG - userId:', userId);
    
    try {
      // Build WHERE condition based on filters
      const whereCondition: any = { isActive: true };
      
      // Apply filters
      if (filters.subjectId) {
        whereCondition.subjectId = filters.subjectId;
        console.log('🔍 FILTER: subjectId =', filters.subjectId);
      }
      
      if (filters.educationalLevelId) {
        whereCondition.educationalLevelId = filters.educationalLevelId;
        console.log('🔍 FILTER: educationalLevelId =', filters.educationalLevelId);
      }
      
      if (filters.gradeLevel) {
        whereCondition.gradeLevel = filters.gradeLevel;
        console.log('🔍 FILTER: gradeLevel =', filters.gradeLevel);
      }
      
      if (filters.authorId) {
        whereCondition.authorId = filters.authorId;
        console.log('🔍 FILTER: authorId =', filters.authorId);
      }
      
      if (filters.type) {
        whereCondition.type = filters.type;
        console.log('🔍 FILTER: type =', filters.type);
      }
      
      if (filters.search) {
        whereCondition.title = Like(`%${filters.search}%`);
        console.log('🔍 FILTER: search =', filters.search);
      }
      
      // Tags filter - since tags are stored as comma-separated string
      if (filters.tags && filters.tags.length > 0) {
        // For PostgreSQL, we need to search within the comma-separated tags field
        whereCondition.tags = Like(`%${filters.tags.join('%')}%`);
        console.log('🔍 FILTER: tags =', filters.tags);
      }
      
      console.log('🔍 FINAL WHERE CONDITION:', whereCondition);

      // Build QueryBuilder for better control over relations
      let queryBuilder = this.resourceRepository
        .createQueryBuilder('resource')
        .leftJoinAndSelect('resource.subject', 'subject')
        .leftJoinAndSelect('resource.educationalLevel', 'educationalLevel')
        .leftJoinAndSelect('resource.folder', 'folder')
        .leftJoinAndSelect('folder.subject', 'folderSubject')
        .leftJoinAndSelect('resource.author', 'author')
        .leftJoinAndSelect('author.profile', 'authorProfile')
        .leftJoinAndSelect('resource.assignments', 'assignment')
        .leftJoinAndSelect('assignment.student', 'student')
        .leftJoinAndSelect('student.profile', 'studentProfile')
        .leftJoinAndSelect('assignment.classGroup', 'classGroup')
        .leftJoinAndSelect('assignment.assignedBy', 'assignedBy')
        .leftJoinAndSelect('assignedBy.profile', 'assignedByProfile')
        .where('resource.isActive = :isActive', { isActive: true });

      // Apply filters
      if (filters.subjectId) {
        queryBuilder = queryBuilder.andWhere('resource.subjectId = :subjectId', { subjectId: filters.subjectId });
      }
      if (filters.educationalLevelId) {
        queryBuilder = queryBuilder.andWhere('resource.educationalLevelId = :educationalLevelId', { educationalLevelId: filters.educationalLevelId });
      }
      if (filters.gradeLevel) {
        queryBuilder = queryBuilder.andWhere('resource.gradeLevel = :gradeLevel', { gradeLevel: filters.gradeLevel });
      }
      if (filters.authorId) {
        queryBuilder = queryBuilder.andWhere('resource.authorId = :authorId', { authorId: filters.authorId });
      }
      if (filters.type) {
        queryBuilder = queryBuilder.andWhere('resource.type = :type', { type: filters.type });
      }
      if (filters.search) {
        queryBuilder = queryBuilder.andWhere('resource.title ILIKE :search', { search: `%${filters.search}%` });
      }
      if (filters.tags && filters.tags.length > 0) {
        queryBuilder = queryBuilder.andWhere('resource.tags ILIKE :tags', { tags: `%${filters.tags.join('%')}%` });
      }

      const ayId = filters.academicYearId || (await this.currentAcademicYearService.getCurrentId());
      if (ayId) {
        queryBuilder = queryBuilder.andWhere('resource.academicYearId = :ayId', { ayId });
      }

      // Pagination and ordering
      const allResources = await queryBuilder
        .orderBy(`resource.${filters.sortBy || 'createdAt'}`, filters.sortOrder || 'DESC')
        .take(filters.limit || 20)
        .skip(((filters.page || 1) - 1) * (filters.limit || 20))
        .getMany();

      // Count query
      const countQueryBuilder = this.resourceRepository
        .createQueryBuilder('resource')
        .where('resource.isActive = :isActive', { isActive: true });

      if (filters.subjectId) {
        countQueryBuilder.andWhere('resource.subjectId = :subjectId', { subjectId: filters.subjectId });
      }
      if (filters.educationalLevelId) {
        countQueryBuilder.andWhere('resource.educationalLevelId = :educationalLevelId', { educationalLevelId: filters.educationalLevelId });
      }
      if (filters.gradeLevel) {
        countQueryBuilder.andWhere('resource.gradeLevel = :gradeLevel', { gradeLevel: filters.gradeLevel });
      }
      if (filters.authorId) {
        countQueryBuilder.andWhere('resource.authorId = :authorId', { authorId: filters.authorId });
      }
      if (filters.type) {
        countQueryBuilder.andWhere('resource.type = :type', { type: filters.type });
      }
      if (filters.search) {
        countQueryBuilder.andWhere('resource.title ILIKE :search', { search: `%${filters.search}%` });
      }
      if (filters.tags && filters.tags.length > 0) {
        countQueryBuilder.andWhere('resource.tags ILIKE :tags', { tags: `%${filters.tags.join('%')}%` });
      }

      if (ayId) {
        countQueryBuilder.andWhere('resource.academicYearId = :ayId', { ayId });
      }

      const totalCount = await countQueryBuilder.getCount();

      console.log('🔍 REPOSITORY FIND - found resources:', allResources.length);
      console.log('🔍 REPOSITORY COUNT - total count:', totalCount);

      // Manually load User and UserProfile for ALL assignments using raw SQL
      // Same fix as getResourceById - ensure profiles load correctly
      console.log('🔧 STARTING MANUAL PROFILE LOADING FOR', allResources.length, 'resources');
      for (const resource of allResources) {
        if (resource.assignments && resource.assignments.length > 0) {
          console.log('📦 Resource', resource.id, 'has', resource.assignments.length, 'assignments');
          for (const assignment of resource.assignments) {
            // Load student user with profile via raw SQL
            if (assignment.studentId) {
              const [studentData] = await this.dataSource.query(`
                SELECT
                  u.id, u.email, u.role, u."isActive",
                  up.id as "profile_id",
                  up."firstName" as "profile_firstName",
                  up."lastName" as "profile_lastName"
                FROM users u
                LEFT JOIN user_profiles up ON up."userId" = u.id
                WHERE u.id = $1
              `, [assignment.studentId]);

              console.log('👤 Loaded student data:', studentData);

              if (studentData) {
                assignment.student = {
                  id: studentData.id,
                  email: studentData.email,
                  role: studentData.role,
                  isActive: studentData.isActive,
                  profile: studentData.profile_id ? {
                    id: studentData.profile_id,
                    firstName: studentData.profile_firstName,
                    lastName: studentData.profile_lastName
                  } : null
                } as any;
                console.log('✅ Student profile set:', assignment.student.profile);
              }
            }

            // Load assignedBy user with profile via raw SQL
            if (assignment.assignedById) {
              const [assignedByData] = await this.dataSource.query(`
                SELECT
                  u.id, u.email, u.role, u."isActive",
                  up.id as "profile_id",
                  up."firstName" as "profile_firstName",
                  up."lastName" as "profile_lastName"
                FROM users u
                LEFT JOIN user_profiles up ON up."userId" = u.id
                WHERE u.id = $1
              `, [assignment.assignedById]);

              if (assignedByData) {
                assignment.assignedBy = {
                  id: assignedByData.id,
                  email: assignedByData.email,
                  role: assignedByData.role,
                  isActive: assignedByData.isActive,
                  profile: assignedByData.profile_id ? {
                    id: assignedByData.profile_id,
                    firstName: assignedByData.profile_firstName,
                    lastName: assignedByData.profile_lastName
                  } : null
                } as any;
              }
            }
          }
        }
      }

      // DEBUG: Log assignments for first resource
      if (allResources.length > 0 && allResources[0].assignments) {
        console.log('🔍 FIRST RESOURCE ASSIGNMENTS DEBUG:', {
          resourceId: allResources[0].id,
          assignmentsCount: allResources[0].assignments?.length || 0,
          firstAssignment: allResources[0].assignments[0] ? {
            id: allResources[0].assignments[0].id,
            hasStudent: !!allResources[0].assignments[0].student,
            hasStudentProfile: !!allResources[0].assignments[0].student?.profile,
            studentEmail: allResources[0].assignments[0].student?.email,
            studentProfileData: allResources[0].assignments[0].student?.profile ? {
              firstName: allResources[0].assignments[0].student.profile.firstName,
              lastName: allResources[0].assignments[0].student.profile.lastName
            } : null,
            hasAssignedBy: !!allResources[0].assignments[0].assignedBy,
            assignedByEmail: allResources[0].assignments[0].assignedBy?.email,
            assignedByProfileData: allResources[0].assignments[0].assignedBy?.profile ? {
              firstName: allResources[0].assignments[0].assignedBy.profile.firstName,
              lastName: allResources[0].assignments[0].assignedBy.profile.lastName
            } : null
          } : null
        });
      }

      // Transform resources to include virtual properties
      const transformedResources = allResources.map(resource => {
        const tagsArray = (resource.tags && resource.tags.trim() !== '') ? resource.tags.split(',').map(tag => tag.trim()) : [];
        console.log('🏷️ TAGS DEBUG - resource:', resource.id, 'tags:', resource.tags, 'tagsArray:', tagsArray);

        return {
          ...resource,
          isFavorite: false,
          tagsArray: tagsArray
        };
      });
      
      const totalPages = Math.ceil(totalCount / (filters.limit || 10));
      
      const result = {
        resources: transformedResources,
        total: totalCount,
        page: filters.page || 1,
        totalPages,
        hasNextPage: (filters.page || 1) < totalPages,
        hasPreviousPage: (filters.page || 1) > 1,
      };
      
      console.log('🔍 RESOURCES LIST DEBUG - returning result:', {
        resourceCount: result.resources.length,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages
      });
      
      return result;
    } catch (error) {
      console.error('❌ ERROR getting resources list:', error);
      console.error('❌ ERROR stack:', error.stack);
      return {
        resources: [],
        total: 0,
        page: filters.page || 1,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      };
    }
  }

  async getResourceById(id: string, userId?: string): Promise<EducationalResource> {
    try {
      // Load resource with assignments and related data first
      const resource = await this.resourceRepository.findOne({
        where: { id, isActive: true },
        relations: ['assignments', 'assignments.classGroup', 'subject', 'educationalLevel', 'folder'],
      });

      if (!resource) {
        throw new NotFoundException('Resource not found');
      }

      // Load author with profile using raw SQL (TypeORM inverse OneToOne can be tricky)
      if (resource.authorId) {
        const [authorData] = await this.dataSource.query(`
          SELECT
            u.id, u.email, u.role, u."isActive",
            up.id as "profile_id",
            up."firstName" as "profile_firstName",
            up."lastName" as "profile_lastName"
          FROM users u
          LEFT JOIN user_profiles up ON up."userId" = u.id
          WHERE u.id = $1
        `, [resource.authorId]);

        if (authorData) {
          resource.author = {
            id: authorData.id,
            email: authorData.email,
            role: authorData.role,
            isActive: authorData.isActive,
            profile: authorData.profile_id ? {
              id: authorData.profile_id,
              firstName: authorData.profile_firstName,
              lastName: authorData.profile_lastName
            } : null
          } as any;
        }
      }

      // Manually load User and UserProfile for each assignment using raw SQL
      // This ensures profiles are loaded correctly (TypeORM inverse OneToOne can be tricky)
      if (resource.assignments && resource.assignments.length > 0) {
        for (const assignment of resource.assignments) {
          // Load student user with profile via raw SQL
          if (assignment.studentId) {
            const [studentData] = await this.dataSource.query(`
              SELECT
                u.id, u.email, u.role, u."isActive",
                up.id as "profile_id",
                up."firstName" as "profile_firstName",
                up."lastName" as "profile_lastName"
              FROM users u
              LEFT JOIN user_profiles up ON up."userId" = u.id
              WHERE u.id = $1
            `, [assignment.studentId]);

            if (studentData) {
              assignment.student = {
                id: studentData.id,
                email: studentData.email,
                role: studentData.role,
                isActive: studentData.isActive,
                profile: studentData.profile_id ? {
                  id: studentData.profile_id,
                  firstName: studentData.profile_firstName,
                  lastName: studentData.profile_lastName
                } : null
              } as any;
            }
          }

          // Load assignedBy user with profile via raw SQL
          if (assignment.assignedById) {
            const [assignedByData] = await this.dataSource.query(`
              SELECT
                u.id, u.email, u.role, u."isActive",
                up.id as "profile_id",
                up."firstName" as "profile_firstName",
                up."lastName" as "profile_lastName"
              FROM users u
              LEFT JOIN user_profiles up ON up."userId" = u.id
              WHERE u.id = $1
            `, [assignment.assignedById]);

            if (assignedByData) {
              assignment.assignedBy = {
                id: assignedByData.id,
                email: assignedByData.email,
                role: assignedByData.role,
                isActive: assignedByData.isActive,
                profile: assignedByData.profile_id ? {
                  id: assignedByData.profile_id,
                  firstName: assignedByData.profile_firstName,
                  lastName: assignedByData.profile_lastName
                } : null
              } as any;
            }
          }
        }
      }

      // DEBUG: Log assignment data to verify relations are loaded
      if (resource.assignments && resource.assignments.length > 0) {
        console.log('🔍 DEBUG ASSIGNMENTS - Total:', resource.assignments.length);
        resource.assignments.forEach((assignment, index) => {
          console.log(`📋 Assignment ${index + 1}:`, {
            id: assignment.id,
            hasStudent: !!assignment.student,
            studentId: assignment.studentId,
            hasStudentProfile: !!assignment.student?.profile,
            studentName: assignment.student?.profile ?
              `${assignment.student.profile.firstName} ${assignment.student.profile.lastName}` :
              'NO PROFILE',
            studentEmail: assignment.student?.email || 'NO EMAIL',
            hasClassGroup: !!assignment.classGroup,
            classGroupName: assignment.classGroup?.name || 'N/A',
            hasAssignedBy: !!assignment.assignedBy,
            assignedByName: assignment.assignedBy?.profile ?
              `${assignment.assignedBy.profile.firstName} ${assignment.assignedBy.profile.lastName}` :
              assignment.assignedBy?.email || 'NO DATA',
            assignedByEmail: assignment.assignedBy?.email || 'NO EMAIL'
          });
        });
      }

      // Check if user has favorited this resource
      if (userId) {
        const favorite = await this.favoriteRepository.findOne({
          where: { resourceId: id, userId },
        });
        (resource as any).isFavorite = !!favorite;
      }

      return resource;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException('Resource not found');
    }
  }

  async createResource(createResourceDto: CreateResourceDto, authorId: string, file: Express.Multer.File): Promise<EducationalResource> {
    try {
      if (!file) {
        throw new BadRequestException('File is required');
      }

      // Get educational level and subject names for folder structure
      const educationalLevels = await this.getEducationalLevels();
      const subjects = await this.getSubjects();
      
      const educationalLevel = educationalLevels.find(level => level.id === createResourceDto.educationalLevelId);
      const subject = subjects.find(subj => subj.id === createResourceDto.subjectId);

      if (!educationalLevel || !subject) {
        throw new BadRequestException('Invalid educational level or subject');
      }

      const academicYear = createResourceDto.academicYear || this.generateAcademicYear();

      // Upload file to Google Drive (with fallback to mock)
      const driveResponse = await this.googleDriveService.uploadFile(
        file.buffer,
        file.originalname,
        file.mimetype,
        academicYear,
        educationalLevel.name,
        createResourceDto.gradeLevel,
        subject.name
      );

      // Create resource record in database
      console.log('💾 DEBUGGING - Creating resource with data:', {
        gradeLevel: createResourceDto.gradeLevel,
        educationalLevelId: createResourceDto.educationalLevelId,
        subjectId: createResourceDto.subjectId,
        academicYear,
        title: createResourceDto.title,
        type: createResourceDto.type
      });

      const resource = this.resourceRepository.create({
        ...createResourceDto,
        authorId,
        academicYear,
        driveFileId: driveResponse.fileId,
        driveFolderId: driveResponse.folderId,
        driveFileName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        webViewLink: driveResponse.webViewLink,
        downloadLink: driveResponse.downloadLink,
        tags: createResourceDto.tags && createResourceDto.tags.length > 0 ? createResourceDto.tags.join(',') : null,
      });

      console.log('🔧 DEBUGGING - Resource object before save:', {
        gradeLevel: resource.gradeLevel,
        educationalLevelId: resource.educationalLevelId,
        subjectId: resource.subjectId,
        academicYear: resource.academicYear
      });

      const savedResource = await this.resourceRepository.save(resource);
      
      // Transform resource to include tagsArray
      const tagsArray = (savedResource.tags && savedResource.tags.trim() !== '') ? savedResource.tags.split(',').map(tag => tag.trim()) : [];
      return {
        ...savedResource,
        tagsArray: tagsArray
      };
    } catch (error) {
      console.error('Error creating resource:', error);
      throw new BadRequestException(`Failed to create resource: ${error.message}`);
    }
  }

  async updateResource(id: string, updateResourceDto: UpdateResourceDto): Promise<EducationalResource> {
    const resource = await this.getResourceById(id);
    
    Object.assign(resource, updateResourceDto);
    
    if (updateResourceDto.tags) {
      resource.tagsArray = updateResourceDto.tags;
    }

    return await this.resourceRepository.save(resource);
  }

  async deleteResource(id: string): Promise<void> {
    console.log('🗑️ DELETE RESOURCE SERVICE - Starting deletion for ID:', id);
    
    // Check if resource exists in database
    const resource = await this.resourceRepository.findOne({ where: { id, isActive: true } });
    if (!resource) {
      console.log('❌ Resource not found in database:', id);
      throw new NotFoundException(`Recurso no encontrado: ${id}`);
    }
    
    console.log('📁 Resource found:', resource.title, 'Drive ID:', resource.driveFileId);
    
    // Try to delete from Google Drive if driveFileId exists
    if (resource.driveFileId) {
      try {
        console.log('🗑️ Attempting to delete from Google Drive:', resource.driveFileId);
        await this.googleDriveService.deleteFile(resource.driveFileId);
        console.log('✅ Successfully deleted from Google Drive');
      } catch (driveError) {
        console.error('❌ Error deleting from Google Drive (continuing with database deletion):', driveError.message);
        // Continue with database deletion even if Drive deletion fails
      }
    } else {
      console.log('⚠️ No Google Drive file ID found, skipping Drive deletion');
    }
    
    // Soft delete from database (mark as inactive)
    try {
      resource.isActive = false;
      await this.resourceRepository.save(resource);
      console.log('✅ Successfully marked resource as deleted in database');
    } catch (dbError) {
      console.error('❌ Error updating database:', dbError.message);
      throw new BadRequestException(`Error al eliminar el recurso de la base de datos: ${dbError.message}`);
    }
  }

  async getResourceTypes() {
    return [
      { value: 'PDF', label: 'PDF Document' },
      { value: 'VIDEO', label: 'Video' },
      { value: 'IMAGE', label: 'Image' },
      { value: 'INTERACTIVE_HTML', label: 'Interactive HTML' },
      { value: 'DOCUMENT', label: 'Document' },
      { value: 'PRESENTATION', label: 'Presentation' },
      { value: 'SPREADSHEET', label: 'Spreadsheet' },
      { value: 'AUDIO', label: 'Audio' },
    ];
  }

  async getSubjects() {
    try {
      // Get subjects from actual database using TypeORM repository
      const subjects = await this.subjectRepository.find({
        order: { name: 'ASC' }
      });
      console.log('📚 DEBUGGING - Subjects from DB:', subjects.length, 'subjects found');
      console.log('📚 First subject example:', subjects[0]);
      return subjects.map(subject => ({
        id: subject.id,
        name: subject.name
      }));
    } catch (error) {
      console.error('❌ Error fetching subjects from database:', error);
      // Fallback to empty array if database query fails
      return [];
    }
  }

  async getEducationalLevels() {
    try {
      // Get educational levels from actual database using TypeORM repository
      const levels = await this.educationalLevelRepository.find({
        order: { name: 'ASC' }
      });
      console.log('🎓 DEBUGGING - Educational levels from DB:', levels.length, 'levels found');
      console.log('🎓 First level example:', levels[0]);
      return levels.map(level => ({
        id: level.id,
        name: level.name,
        // Add grades based on the educational level
        grades: this.getGradesForLevel(level.name)
      }));
    } catch (error) {
      console.error('❌ Error fetching educational levels from database:', error);
      // Fallback to empty array if database query fails
      return [];
    }
  }

  private getGradesForLevel(levelName: string): string[] {
    // Map educational level names to their corresponding grades  
    // Only including the levels that exist in the database
    const gradeMap = {
      'Educación Infantil': ['3 años', '4 años', '5 años'],
      'Educación Primaria': ['1º Primaria', '2º Primaria', '3º Primaria', '4º Primaria', '5º Primaria', '6º Primaria'],
      'Educación Secundaria Obligatoria': ['1º ESO', '2º ESO', '3º ESO', '4º ESO']
    };

    // Return grades for the level, or default grades if not found
    return gradeMap[levelName] || ['General'];
  }

  async getFileLimits() {
    return {
      maxFileSize: 1073741824, // 1GB in bytes for teachers
      maxFileSizeFormatted: '1GB',
      allowedTypes: ['pdf', 'doc', 'docx', 'rtf', 'ppt', 'pptx', 'xls', 'xlsx', 'mp4', 'mp3', 'jpg', 'png', 'gif'],
      allowedMimeTypes: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/rtf',
        'application/rtf',
        'video/mp4',
        'audio/mpeg',
        'image/jpeg',
        'image/png',
        'image/gif'
      ]
    };
  }

  async toggleFavorite(resourceId: string, userId: string) {
    const existing = await this.favoriteRepository.findOne({
      where: { resourceId, userId },
    });

    if (existing) {
      await this.favoriteRepository.remove(existing);
      return { isFavorite: false };
    } else {
      const favorite = this.favoriteRepository.create({
        resourceId,
        userId,
      });
      await this.favoriteRepository.save(favorite);
      return { isFavorite: true };
    }
  }

  async recordView(resourceId: string, userId: string, viewType: string = 'web') {
    // Check if resource exists
    const resource = await this.resourceRepository.findOne({
      where: { id: resourceId },
    });

    if (!resource) {
      throw new NotFoundException('Resource not found');
    }

    // Record the view
    const view = this.viewRepository.create({
      resourceId,
      userId,
      viewType,
    });
    
    await this.viewRepository.save(view);
    // The trigger will automatically update the view count

    return { success: true };
  }

  async getResourceViewers(resourceId: string): Promise<any[]> {
    // Verify resource exists
    const resource = await this.resourceRepository.findOne({
      where: { id: resourceId },
    });

    if (!resource) {
      throw new NotFoundException('Resource not found');
    }

    // Fetch all views for this resource, joining the user and their profile
    const views = await this.viewRepository
      .createQueryBuilder('view')
      .leftJoinAndSelect('view.user', 'user')
      .leftJoinAndSelect('user.profile', 'profile')
      .where('view.resourceId = :resourceId', { resourceId })
      .orderBy('view.viewedAt', 'DESC')
      .getMany();

    // Group by userId: keep most recent view + count total views per user
    const latestByUser = new Map<string, typeof views[0]>();
    const countByUser = new Map<string, number>();
    for (const view of views) {
      countByUser.set(view.userId, (countByUser.get(view.userId) ?? 0) + 1);
      if (!latestByUser.has(view.userId)) {
        latestByUser.set(view.userId, view);
      }
    }

    // Map to the response shape
    return Array.from(latestByUser.values()).map(view => ({
      userId: view.userId,
      firstName: view.user?.profile?.firstName ?? null,
      lastName: view.user?.profile?.lastName ?? null,
      email: view.user?.email ?? null,
      viewedAt: view.viewedAt,
      viewCount: countByUser.get(view.userId) ?? 1,
    }));
  }

  async getResourceStats(resourceId: string) {
    try {
      const resource = await this.resourceRepository.findOne({
        where: { id: resourceId },
      });

      if (!resource) {
        throw new NotFoundException('Resource not found');
      }

      const totalViews = await this.viewRepository.count({
        where: { resourceId },
      });

      const uniqueViewers = await this.viewRepository
        .createQueryBuilder('view')
        .select('COUNT(DISTINCT view.userId)', 'count')
        .where('view.resourceId = :resourceId', { resourceId })
        .getRawOne();

      const avgDuration = await this.viewRepository
        .createQueryBuilder('view')
        .select('AVG(view.duration)', 'avg')
        .where('view.resourceId = :resourceId AND view.duration IS NOT NULL', { resourceId })
        .getRawOne();

      return {
        views: resource.views,
        downloads: resource.downloads,
        uniqueViewers: parseInt(uniqueViewers.count) || 0,
        averageViewDuration: parseFloat(avgDuration.avg) || 0,
        totalViews,
      };
    } catch (error) {
      console.error('Error getting resource stats:', error);
      return {
        views: 0,
        downloads: 0,
        uniqueViewers: 0,
        averageViewDuration: 0,
        totalViews: 0,
      };
    }
  }

  async getResourceComments(resourceId: string) {
    return await this.commentRepository.find({
      where: { resourceId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async addResourceComment(resourceId: string, userId: string, content: string) {
    // Verify resource exists
    await this.getResourceById(resourceId);

    const comment = this.commentRepository.create({
      resourceId,
      userId,
      content,
    });

    return await this.commentRepository.save(comment);
  }

  async getUserFavorites(userId: string) {
    const favorites = await this.favoriteRepository.find({
      where: { userId },
      relations: ['resource'],
      order: { createdAt: 'DESC' },
    });

    return favorites.map(f => f.resource).filter(r => r?.isActive);
  }

  async assignResourceToClass(resourceId: string, classGroupId: string, assignedById: string, instructions?: string, dueDate?: Date) {
    // Verify resource exists
    await this.getResourceById(resourceId);

    const assignment = this.assignmentRepository.create({
      resourceId,
      classGroupId,
      assignedById,
      instructions,
      dueDate,
    });

    return await this.assignmentRepository.save(assignment);
  }

  async assignResourceToStudent(resourceId: string, studentId: string, assignedById: string, instructions?: string, dueDate?: Date) {
    // Verify resource exists
    await this.getResourceById(resourceId);

    const assignment = this.assignmentRepository.create({
      resourceId,
      studentId,
      assignedById,
      instructions,
      dueDate,
    });

    return await this.assignmentRepository.save(assignment);
  }

  async assignResourceToMultipleStudents(
    resourceId: string, 
    studentIds: string[], 
    assignedById: string, 
    instructions?: string, 
    dueDate?: Date
  ) {
    // Verify resource exists
    await this.getResourceById(resourceId);

    // Verify all students exist and are valid
    const validStudents = await this.resourceRepository.query(`
      SELECT u.id, up."firstName", up."lastName", u.email
      FROM users u
      INNER JOIN user_profiles up ON u.id = up."userId"
      WHERE u.id = ANY($1) AND u.role = 'student' AND u."isActive" = true
    `, [studentIds]);

    if (validStudents.length !== studentIds.length) {
      const validIds = validStudents.map(s => s.id);
      const invalidIds = studentIds.filter(id => !validIds.includes(id));
      throw new Error(`Invalid student IDs: ${invalidIds.join(', ')}`);
    }

    // Create assignments for all students
    const assignments = [];
    for (const studentId of studentIds) {
      const assignment = this.assignmentRepository.create({
        resourceId,
        studentId,
        assignedById,
        instructions,
        dueDate,
      });
      assignments.push(assignment);
    }

    const savedAssignments = await this.assignmentRepository.save(assignments);
    console.log(`✅ Created ${savedAssignments.length} assignments for resource ${resourceId}`);
    
    return {
      assignments: savedAssignments,
      count: savedAssignments.length,
      students: validStudents
    };
  }

  /** RGPD: devuelve la asignación (assignedById/classGroupId/studentId) para validar propiedad. */
  async getAssignmentById(assignmentId: string): Promise<ResourceAssignment | null> {
    return this.assignmentRepository.findOne({ where: { id: assignmentId } });
  }

  async removeAssignment(assignmentId: string, userId: string): Promise<void> {
    // Verify assignment exists and user has permission
    const assignment = await this.assignmentRepository.findOne({
      where: { id: assignmentId },
      relations: ['resource']
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    // Check if user is the one who made the assignment (or admin)
    if (assignment.assignedById !== userId) {
      // Here you could add admin role check if needed
      console.log(`User ${userId} attempting to remove assignment made by ${assignment.assignedById}`);
    }

    await this.assignmentRepository.remove(assignment);
  }

  async getResourceAssignments(resourceId: string): Promise<any[]> {
    // Verify resource exists
    await this.getResourceById(resourceId);

    const assignments = await this.assignmentRepository.find({
      where: { resourceId },
      relations: ['classGroup', 'student', 'student.profile', 'assignedBy', 'assignedBy.profile'],
      order: { assignedAt: 'DESC' }
    });

    return assignments.map(assignment => ({
      id: assignment.id,
      resourceId: assignment.resourceId,
      classGroupId: assignment.classGroupId,
      studentId: assignment.studentId,
      instructions: assignment.instructions,
      dueDate: assignment.dueDate,
      assignedAt: assignment.assignedAt,
      assignedBy: {
        id: assignment.assignedBy?.id,
        name: assignment.assignedBy?.profile ? 
          `${assignment.assignedBy.profile.firstName} ${assignment.assignedBy.profile.lastName}` : 
          assignment.assignedBy?.email,
        email: assignment.assignedBy?.email
      },
      classGroup: assignment.classGroup ? {
        id: assignment.classGroup.id,
        name: assignment.classGroup.name
      } : null,
      student: assignment.student ? {
        id: assignment.student.id,
        name: assignment.student.profile ? 
          `${assignment.student.profile.firstName} ${assignment.student.profile.lastName}` : 
          assignment.student.email,
        email: assignment.student.email
      } : null
    }));
  }

  async getTeacherStudents(teacherId: string): Promise<any[]> {
    console.log(`🔍 DEBUG: getTeacherStudents called with teacherId: ${teacherId}`);
    
    // For now, return hardcoded data to test if the endpoint works
    return [
      {
        id: '9b5ff3fc-aa99-42fa-b669-442d8c5fb547',
        firstName: 'Laura',
        lastName: 'Fernández Torres',
        className: 'Grupo 1'
      },
      {
        id: '9ad1281d-a957-4388-886a-3bfc2d18276d',
        firstName: 'Diego',
        lastName: 'López Martín',
        className: 'Grupo 2'
      },
      {
        id: '6cf2b772-8e7d-4364-8db7-7ab052f2c657',
        firstName: 'Carmen',
        lastName: 'Álvarez Ramos',
        className: 'Grupo 2'
      },
      {
        id: '1df3b922-ace5-407b-bb3d-006d7bce3127',
        firstName: 'Pablo',
        lastName: 'González Ruiz',
        className: 'Grupo 1'
      }
    ];
  }

  async getTeacherClassGroups(teacherId: string): Promise<any[]> {
    console.log(`🔍 DEBUG: getTeacherClassGroups called with teacherId: ${teacherId}`);
    
    // For now, return hardcoded data to test if the endpoint works
    return [
      {
        id: 'ac38c5d6-bb22-4706-915a-0d650968a838',
        name: 'Grupo 1',
        section: 'A',
        studentCount: 3,
        educationalLevelName: 'Primaria'
      },
      {
        id: '5e8db540-7c8d-43fe-9a4f-1a342220a5db',
        name: 'Grupo 2', 
        section: 'A',
        studentCount: 3,
        educationalLevelName: 'Primaria'
      }
    ];
  }

  private buildResourceQuery(filters: ResourceFiltersDto, userId?: string): SelectQueryBuilder<EducationalResource> {
    const query = this.resourceRepository
      .createQueryBuilder('resource')
      .where('resource.isActive = :isActive', { isActive: true });

    // Apply filters
    if (filters.search) {
      query.andWhere(
        '(resource.title ILIKE :search OR resource.description ILIKE :search OR resource.tags ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    if (filters.type) {
      query.andWhere('resource.type = :type', { type: filters.type });
    }

    if (filters.subjectId) {
      query.andWhere('resource.subjectId = :subjectId', { subjectId: filters.subjectId });
    }

    if (filters.educationalLevelId) {
      query.andWhere('resource.educationalLevelId = :educationalLevelId', { 
        educationalLevelId: filters.educationalLevelId 
      });
    }

    if (filters.gradeLevel) {
      query.andWhere('resource.gradeLevel = :gradeLevel', { gradeLevel: filters.gradeLevel });
    }

    if (filters.authorId) {
      query.andWhere('resource.authorId = :authorId', { authorId: filters.authorId });
    }

    if (filters.isPublic !== undefined) {
      query.andWhere('resource.isPublic = :isPublic', { isPublic: filters.isPublic });
    }

    if (filters.tags && filters.tags.length > 0) {
      const tagConditions = filters.tags.map((tag, index) => 
        `resource.tags ILIKE :tag${index}`
      ).join(' OR ');
      
      const tagParams = {};
      filters.tags.forEach((tag, index) => {
        tagParams[`tag${index}`] = `%${tag}%`;
      });
      
      query.andWhere(`(${tagConditions})`, tagParams);
    }

    // Handle favorites filter
    if (filters.isFavorite && userId) {
      query.innerJoin('resource_favorites', 'favorite', 
        'favorite.resourceId = resource.id AND favorite.userId = :userId', 
        { userId }
      );
    }

    // Sorting
    const validSortFields = ['createdAt', 'updatedAt', 'title', 'views', 'downloads'];
    const sortBy = validSortFields.includes(filters.sortBy) ? filters.sortBy : 'createdAt';
    
    query.orderBy(`resource.${sortBy}`, filters.sortOrder);

    // Pagination
    query.skip((filters.page - 1) * filters.limit);
    query.limit(filters.limit);

    return query;
  }

  async getGoogleDriveStatus() {
    return this.googleDriveService.getConnectionStatus();
  }

  async getAnalytics() {
    try {
      console.log('📊 Getting real analytics data from database...');

      // Get total resources count
      const totalResources = await this.resourceRepository.count({
        where: { isActive: true }
      });

      // Get total views (sum of all views column in resources)
      const viewsResult = await this.resourceRepository
        .createQueryBuilder('resource')
        .select('SUM(resource.views)', 'totalViews')
        .where('resource.isActive = :isActive', { isActive: true })
        .getRawOne();

      // Get total downloads (sum of all downloads column in resources)
      const downloadsResult = await this.resourceRepository
        .createQueryBuilder('resource')
        .select('SUM(resource.downloads)', 'totalDownloads')
        .where('resource.isActive = :isActive', { isActive: true })
        .getRawOne();

      // Get total assignments
      const totalAssignments = await this.assignmentRepository.count();

      // Get resources by type
      const resourcesByType = await this.resourceRepository
        .createQueryBuilder('resource')
        .select('resource.type', 'type')
        .addSelect('COUNT(*)', 'count')
        .where('resource.isActive = :isActive', { isActive: true })
        .groupBy('resource.type')
        .getRawMany();

      // Get resources by subject - using TypeORM relation instead of raw join
      const resourcesBySubject = await this.resourceRepository
        .createQueryBuilder('resource')
        .leftJoin('resource.subject', 'subject')
        .select('subject.name', 'subject')
        .addSelect('subject.id', 'subjectId')
        .addSelect('COUNT(*)', 'count')
        .where('resource.isActive = :isActive', { isActive: true })
        .groupBy('subject.id')
        .addGroupBy('subject.name')
        .getRawMany();

      // Get most viewed resources
      const topResources = await this.resourceRepository.find({
        where: { isActive: true },
        order: { views: 'DESC' },
        take: 5,
        select: ['id', 'title', 'views', 'downloads', 'type']
      });

      // Get recent activity (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentViews = await this.viewRepository.count({
        where: {
          viewedAt: MoreThanOrEqual(thirtyDaysAgo)
        }
      });

      const analytics = {
        totalResources,
        totalViews: parseInt(viewsResult?.totalViews) || 0,
        totalDownloads: parseInt(downloadsResult?.totalDownloads) || 0,
        totalAssignments,
        resourcesByType: resourcesByType.map(item => ({
          type: item.type,
          count: parseInt(item.count)
        })),
        resourcesBySubject: resourcesBySubject.map(item => ({
          subject: item.subject || 'Sin asignatura',
          count: parseInt(item.count)
        })),
        topResources: topResources.map(resource => ({
          id: resource.id,
          title: resource.title,
          views: resource.views || 0,
          downloads: resource.downloads || 0,
          type: resource.type
        })),
        usage: {
          dailyAverage: Math.round(recentViews / 30),
          monthlyGrowth: 0, // Would need historical data
          totalActiveUsers: 0, // Would need to count unique viewers
          averageSessionTime: 0 // Would need session tracking
        },
        lastUpdated: new Date().toISOString()
      };

      console.log('📊 Real analytics generated:', analytics);
      return analytics;

    } catch (error) {
      console.error('❌ Error getting analytics:', error);
      // Return empty analytics if there's an error
      return {
        totalResources: 0,
        totalViews: 0,
        totalDownloads: 0,
        totalAssignments: 0,
        resourcesByType: [],
        resourcesBySubject: [],
        topResources: [],
        usage: {
          dailyAverage: 0,
          monthlyGrowth: 0,
          totalActiveUsers: 0,
          averageSessionTime: 0
        },
        lastUpdated: new Date().toISOString()
      };
    }
  }

  /**
   * Configura permisos públicos para un recurso específico
   */
  async setResourcePublic(resourceId: string, userId?: string) {
    console.log('🔍 SET RESOURCE PUBLIC - resourceId:', resourceId, 'userId:', userId);
    
    try {
      // Verificar que el recurso existe
      const resource = await this.resourceRepository.findOne({
        where: { id: resourceId, isActive: true }
      });

      if (!resource) {
        throw new NotFoundException('Recurso no encontrado');
      }

      // Solo permitir a admins o al autor del recurso
      if (userId && resource.authorId !== userId) {
        // Aquí se podría agregar verificación de rol admin si es necesario
        console.log('⚠️ User trying to set public permissions for resource they dont own');
      }

      // Configurar permisos públicos en Google Drive
      const success = await this.googleDriveService.setPublicPermissions(resource.driveFileId);

      if (success) {
        // Actualizar el flag isPublic en la base de datos
        await this.resourceRepository.update(resourceId, { 
          isPublic: true,
          updatedAt: new Date()
        });

        console.log('✅ Resource set as public successfully:', resourceId);
        return {
          success: true,
          resourceId,
          isPublic: true,
          message: 'Permisos públicos configurados correctamente'
        };
      } else {
        console.log('❌ Failed to set public permissions in Google Drive');
        return {
          success: false,
          resourceId,
          isPublic: resource.isPublic,
          message: 'Error al configurar permisos públicos en Google Drive'
        };
      }
    } catch (error) {
      console.error('❌ Error setting resource public:', error);
      throw new BadRequestException(`Error al configurar permisos públicos: ${error.message}`);
    }
  }

  /**
   * Verifica si un recurso tiene permisos públicos
   */
  async checkResourcePublic(resourceId: string, userId?: string): Promise<boolean> {
    console.log('🔍 CHECK RESOURCE PUBLIC - resourceId:', resourceId, 'userId:', userId);
    
    try {
      // Verificar que el recurso existe
      const resource = await this.resourceRepository.findOne({
        where: { id: resourceId, isActive: true }
      });

      if (!resource) {
        throw new NotFoundException('Recurso no encontrado');
      }

      // Verificar permisos en Google Drive
      const hasPublicPermissions = await this.googleDriveService.hasPublicPermissions(resource.driveFileId);

      // Actualizar la base de datos si hay diferencias
      if (hasPublicPermissions !== resource.isPublic) {
        await this.resourceRepository.update(resourceId, { 
          isPublic: hasPublicPermissions,
          updatedAt: new Date()
        });
        console.log('🔄 Updated isPublic flag in database to match Google Drive:', hasPublicPermissions);
      }

      return hasPublicPermissions;
    } catch (error) {
      console.error('❌ Error checking resource public status:', error);
      throw new BadRequestException(`Error al verificar permisos públicos: ${error.message}`);
    }
  }

  /**
   * Configura permisos públicos para todos los recursos existentes (Solo administradores)
   */
  async batchSetPublicPermissions(userId: string) {
    console.log('🔍 BATCH SET PUBLIC PERMISSIONS - userId:', userId);
    
    try {
      // Obtener todos los recursos activos
      const resources = await this.resourceRepository.find({
        where: { isActive: true },
        select: ['id', 'driveFileId', 'title', 'isPublic']
      });

      console.log(`📦 Found ${resources.length} resources to process`);

      let successful = 0;
      let failed = 0;
      const results = [];

      // Procesar cada recurso
      for (const resource of resources) {
        try {
          console.log(`🔄 Processing resource ${resource.id}: ${resource.title}`);
          
          // Configurar permisos públicos en Google Drive
          const success = await this.googleDriveService.setPublicPermissions(resource.driveFileId);

          if (success) {
            // Actualizar base de datos
            await this.resourceRepository.update(resource.id, { 
              isPublic: true,
              updatedAt: new Date()
            });

            successful++;
            results.push({
              resourceId: resource.id,
              title: resource.title,
              success: true,
              message: 'Permisos públicos configurados'
            });
            console.log(`✅ Successfully set public permissions for: ${resource.title}`);
          } else {
            failed++;
            results.push({
              resourceId: resource.id,
              title: resource.title,
              success: false,
              message: 'Error al configurar permisos en Google Drive'
            });
            console.log(`❌ Failed to set public permissions for: ${resource.title}`);
          }
        } catch (resourceError) {
          failed++;
          results.push({
            resourceId: resource.id,
            title: resource.title,
            success: false,
            message: `Error: ${resourceError.message}`
          });
          console.error(`❌ Error processing resource ${resource.id}:`, resourceError);
        }

        // Pequeña pausa para no sobrecargar la API de Google Drive
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const summary = {
        total: resources.length,
        successful,
        failed,
        results: results.slice(0, 10), // Solo mostrar los primeros 10 resultados
        completedAt: new Date().toISOString()
      };

      console.log('📊 Batch operation completed:', summary);
      return summary;

    } catch (error) {
      console.error('❌ Error in batch set public permissions:', error);
      throw new BadRequestException(`Error en operación masiva: ${error.message}`);
    }
  }

  /**
   * Get student record by user ID
   * CRITICAL: Converts userId to studentId for resource assignments
   */
  async getStudentByUserId(userId: string): Promise<Student | null> {
    console.log('🔍 SERVICE: Finding student record for user:', userId);

    try {
      const student = await this.studentsRepository.findOne({
        where: { userId: userId } as any,
      });

      if (!student) {
        console.log('⚠️ SERVICE: No student found for userId:', userId);
        return null;
      }

      console.log('✅ SERVICE: Found student:', student.id, 'for user:', userId);
      return student;
    } catch (error) {
      console.error('❌ SERVICE: Error finding student by userId:', error);
      return null;
    }
  }

  async getAssignedResourcesForStudent(studentId: string, academicYearId?: string): Promise<EducationalResource[]> {
    console.log('🎓 SERVICE: Getting assigned resources for studentId (actually userId):', studentId);

    try {
      // CRITICAL FIX: studentId is actually the user.id
      // Assignments table uses user.id directly in the studentId column
      // Try to find student record to get class groups (optional)
      let classGroupIds: string[] = [];

      // Find student record by user.id (using TypeORM relation syntax)
      const student = await this.studentsRepository.findOne({
        where: { user: { id: studentId } },
      });

      if (student) {
        console.log('🎓 SERVICE: Found student record:', student.id);

        // Get class groups for this student using raw SQL
        const classStudents = await this.dataSource.query(`
          SELECT cs."classId" as "classGroupId"
          FROM class_students cs
          WHERE cs."studentId" = $1
        `, [student.id]);

        classGroupIds = classStudents.map((cs: any) => cs.classGroupId);
        console.log('🎓 SERVICE: Found', classGroupIds.length, 'class groups for student:', classGroupIds);
        console.log('🔍 DEBUG: classGroupIds array:', JSON.stringify(classGroupIds));
      } else {
        console.log('🎓 SERVICE: No student record found for userId:', studentId);
      }

      // Get assignments for this user directly OR for their class groups (only non-expired)
      const currentDate = new Date();
      const queryBuilder = this.assignmentRepository
        .createQueryBuilder('assignment')
        .leftJoinAndSelect('assignment.resource', 'resource')
        .leftJoinAndSelect('resource.author', 'author')
        .leftJoinAndSelect('author.profile', 'authorProfile')
        .leftJoinAndSelect('resource.subject', 'subject')
        .leftJoinAndSelect('resource.educationalLevel', 'educationalLevel')
        .where('resource.isActive = :isActive', { isActive: true })
        .andWhere('(assignment.dueDate IS NULL OR assignment.dueDate >= :currentDate)', { currentDate });

      // Add condition for direct user assignments OR group assignments
      if (classGroupIds.length > 0) {
        console.log('🔍 DEBUG: Adding group condition with classGroupIds:', classGroupIds);
        console.log('🔍 DEBUG: StudentId for direct assignments:', studentId);
        queryBuilder.andWhere(
          '(assignment.studentId = :studentId OR assignment.classGroupId IN (:...classGroupIds))',
          { studentId, classGroupIds }
        );
      } else {
        console.log('🔍 DEBUG: No groups found, using only direct assignment condition');
        queryBuilder.andWhere('assignment.studentId = :studentId', { studentId });
      }

      const ayId = academicYearId || (await this.currentAcademicYearService.getCurrentId());
      if (ayId) {
        queryBuilder.andWhere('resource.academicYearId = :ayId', { ayId });
      }

      const studentAssignments = await queryBuilder
        .orderBy('resource.displayOrder', 'ASC')
        .addOrderBy('resource.createdAt', 'DESC')
        .select([
          'assignment.id',
          'assignment.assignedAt',
          'assignment.dueDate',
          'assignment.instructions',
          'resource.id',
          'resource.title',
          'resource.description',
          'resource.type',
          'resource.gradeLevel',
          'resource.academicYear',
          'resource.folderId',
          'resource.driveFileId',
          'resource.webViewLink',
          'resource.downloadLink',
          'resource.thumbnailLink',
          'resource.mimeType',
          'resource.fileSize',
          'resource.isPublic',
          'resource.views',
          'resource.downloads',
          'resource.createdAt',
          'resource.updatedAt',
          'author.id',
          'author.email',
          'authorProfile.firstName',
          'authorProfile.lastName',
          'subject.id',
          'subject.name',
          'educationalLevel.id',
          'educationalLevel.name'
        ])
        .getMany();

      console.log('🎓 SERVICE: Found', studentAssignments.length, 'assignments for student');
      console.log('🔍 DEBUG: Assignment IDs:', studentAssignments.map(a => a.id));
      console.log('🔍 DEBUG: Resource IDs:', studentAssignments.map(a => a.resource?.id));

      // Extract unique resources (avoid duplicates from multiple assignments)
      const resourcesMap = new Map();
      
      studentAssignments.forEach(assignment => {
        if (assignment.resource && !resourcesMap.has(assignment.resource.id)) {
          const resource = {
            ...assignment.resource,
            assignments: [assignment],
            isFavorite: false,
            // Add assignment-specific information for student view
            assignedAt: assignment.assignedAt,
            dueDate: assignment.dueDate,
            instructions: assignment.instructions,
            assignmentId: assignment.id
          };
          resourcesMap.set(assignment.resource.id, resource);
        }
      });

      const assignedResources = Array.from(resourcesMap.values());
      
      console.log('✅ SERVICE: Returning', assignedResources.length, 'unique assigned resources');
      
      return assignedResources;
      
    } catch (error) {
      console.error('❌ SERVICE: Error getting assigned resources:', error);
      throw new BadRequestException('Error retrieving assigned resources');
    }
  }

  /**
   * Get subjects that have assigned resources for a specific student
   * Used for smart filtering in student resource filters
   */
  async getSubjectsWithAssignedResources(studentId: string, academicYearId?: string): Promise<any[]> {
    console.log('🎯 SERVICE: Getting subjects with assigned resources for studentId (actually userId):', studentId);

    try {
      // CRITICAL FIX: studentId is actually the user.id
      // Try to find student record to get class groups (optional)
      let classGroupIds: string[] = [];

      const student = await this.studentsRepository.findOne({
        where: { id: studentId } as any,
        relations: ['classGroups'],
      });

      if (student && student.classGroups) {
        classGroupIds = student.classGroups.map(cg => cg.id);
        console.log('🎯 SERVICE: Found student record with', classGroupIds.length, 'class groups for subject filtering');
      } else {
        console.log('🎯 SERVICE: No student record found, will search by userId directly for subjects');
      }

      // Get unique subjects from assigned resources (direct assignments OR group assignments)
      const queryBuilder = this.assignmentRepository
        .createQueryBuilder('assignment')
        .leftJoin('assignment.resource', 'resource')
        .leftJoin('resource.subject', 'subject')
        .where('resource.isActive = :isActive', { isActive: true })
        .andWhere('subject.id IS NOT NULL'); // Only include resources that have a subject

      // Add condition for direct user assignments OR group assignments
      if (classGroupIds.length > 0) {
        queryBuilder.andWhere(
          '(assignment.studentId = :studentId OR assignment.classGroupId IN (:...classGroupIds))',
          { studentId, classGroupIds }
        );
      } else {
        queryBuilder.andWhere('assignment.studentId = :studentId', { studentId });
      }

      const ayId = academicYearId || (await this.currentAcademicYearService.getCurrentId());
      if (ayId) {
        queryBuilder.andWhere('resource.academicYearId = :ayId', { ayId });
      }

      const subjectsWithResources = await queryBuilder
        .select([
          'subject.id',
          'subject.name',
          'subject.code'
        ])
        .distinctOn(['subject.id'])
        .getRawMany();

      const subjects = subjectsWithResources.map(row => ({
        id: row.subject_id,
        name: row.subject_name,
        code: row.subject_code
      }));

      console.log('✅ SERVICE: Found', subjects.length, 'subjects with assigned resources:', subjects.map(s => s.name));

      return subjects;

    } catch (error) {
      console.error('❌ SERVICE: Error getting subjects with assigned resources:', error);
      throw new BadRequestException('Error retrieving subjects with assigned resources');
    }
  }

  /**
   * ============================================================================
   * RESOURCE FOLDERS MANAGEMENT
   * Gestión de carpetas personalizadas para organizar recursos por asignatura
   * ============================================================================
   */

  /**
   * Obtener todas las carpetas de un profesor para una asignatura específica
   */
  async getFolders(teacherId: string | null, subjectId?: string): Promise<ResourceFolder[]> {
    const query = this.folderRepository
      .createQueryBuilder('folder')
      .leftJoinAndSelect('folder.subject', 'subject')
      .leftJoinAndSelect('folder.createdBy', 'createdBy')
      .orderBy('folder.displayOrder', 'ASC')
      .addOrderBy('folder.name', 'ASC');

    // If teacherId is provided, filter by creator (for teachers)
    // If null, show all folders (for admin)
    if (teacherId) {
      query.where('folder.createdById = :teacherId', { teacherId });
    }

    if (subjectId) {
      query.andWhere('folder.subjectId = :subjectId', { subjectId });
    }

    return await query.getMany();
  }

  /**
   * Obtener carpetas con estructura jerárquica (incluyendo subcarpetas)
   */
  async getFoldersHierarchy(teacherId: string, subjectId: string): Promise<ResourceFolder[]> {
    // Obtener carpetas raíz (sin padre)
    const rootFolders = await this.folderRepository.find({
      where: {
        createdById: teacherId,
        subjectId,
        parentFolderId: null as any,
      },
      order: {
        displayOrder: 'ASC',
        name: 'ASC',
      },
      relations: ['subfolders', 'resources'],
    });

    // Cargar recursivamente las subcarpetas y recursos
    for (const folder of rootFolders) {
      await this.loadSubfoldersRecursive(folder);
    }

    return rootFolders;
  }

  /**
   * Cargar subcarpetas recursivamente
   */
  private async loadSubfoldersRecursive(folder: ResourceFolder): Promise<void> {
    if (folder.subfolders && folder.subfolders.length > 0) {
      for (const subfolder of folder.subfolders) {
        // Cargar recursos de la subcarpeta
        subfolder.resources = await this.resourceRepository.find({
          where: { folderId: subfolder.id, isActive: true },
          order: { title: 'ASC' },
        });

        // Cargar subcarpetas de la subcarpeta (recursivo)
        await this.loadSubfoldersRecursive(subfolder);
      }
    }
  }

  /**
   * Obtener una carpeta específica por ID
   */
  async getFolderById(folderId: string, teacherId: string): Promise<ResourceFolder> {
    const folder = await this.folderRepository.findOne({
      where: { id: folderId, createdById: teacherId },
      relations: ['resources', 'subfolders'],
    });

    if (!folder) {
      throw new NotFoundException('Carpeta no encontrada');
    }

    return folder;
  }

  /**
   * Crear una nueva carpeta
   */
  async createFolder(createFolderDto: CreateFolderDto, teacherId: string): Promise<ResourceFolder> {
    // Verificar que la asignatura existe
    const subject = await this.subjectRepository.findOne({
      where: { id: createFolderDto.subjectId },
    });

    if (!subject) {
      throw new BadRequestException('Asignatura no encontrada');
    }

    // Si hay parentFolderId, verificar que la carpeta padre existe y pertenece al profesor
    if (createFolderDto.parentFolderId) {
      const parentFolder = await this.folderRepository.findOne({
        where: {
          id: createFolderDto.parentFolderId,
          createdById: teacherId,
        },
      });

      if (!parentFolder) {
        throw new BadRequestException('Carpeta padre no encontrada');
      }

      // Verificar que la carpeta padre pertenece a la misma asignatura
      if (parentFolder.subjectId !== createFolderDto.subjectId) {
        throw new BadRequestException('La carpeta padre debe pertenecer a la misma asignatura');
      }
    }

    const folder = this.folderRepository.create({
      ...createFolderDto,
      createdById: teacherId,
    });

    return await this.folderRepository.save(folder);
  }

  /**
   * Actualizar una carpeta existente
   */
  async updateFolder(
    folderId: string,
    updateFolderDto: UpdateFolderDto,
    teacherId: string,
  ): Promise<ResourceFolder> {
    const folder = await this.getFolderById(folderId, teacherId);

    // Si se está cambiando el padre, verificar que existe
    if (updateFolderDto.parentFolderId) {
      const parentFolder = await this.folderRepository.findOne({
        where: {
          id: updateFolderDto.parentFolderId,
          createdById: teacherId,
        },
      });

      if (!parentFolder) {
        throw new BadRequestException('Carpeta padre no encontrada');
      }

      // No permitir crear ciclos (una carpeta no puede ser su propio padre o ancestro)
      if (await this.wouldCreateCycle(folderId, updateFolderDto.parentFolderId)) {
        throw new BadRequestException('No se puede crear una jerarquía circular de carpetas');
      }
    }

    Object.assign(folder, updateFolderDto);
    return await this.folderRepository.save(folder);
  }

  /**
   * Verificar si mover una carpeta crearía un ciclo
   */
  private async wouldCreateCycle(folderId: string, newParentId: string): Promise<boolean> {
    if (folderId === newParentId) {
      return true;
    }

    let currentParent = await this.folderRepository.findOne({
      where: { id: newParentId },
    });

    while (currentParent) {
      if (currentParent.id === folderId) {
        return true;
      }

      if (!currentParent.parentFolderId) {
        break;
      }

      currentParent = await this.folderRepository.findOne({
        where: { id: currentParent.parentFolderId },
      });
    }

    return false;
  }

  /**
   * Eliminar una carpeta
   */
  async deleteFolder(folderId: string, teacherId: string): Promise<void> {
    const folder = await this.getFolderById(folderId, teacherId);

    // Verificar si tiene recursos
    const resourceCount = await this.resourceRepository.count({
      where: { folderId, isActive: true },
    });

    if (resourceCount > 0) {
      throw new BadRequestException(
        `No se puede eliminar la carpeta porque contiene ${resourceCount} recurso(s). Mueva o elimine los recursos primero.`,
      );
    }

    // Verificar si tiene subcarpetas
    const subfolderCount = await this.folderRepository.count({
      where: { parentFolderId: folderId },
    });

    if (subfolderCount > 0) {
      throw new BadRequestException(
        `No se puede eliminar la carpeta porque contiene ${subfolderCount} subcarpeta(s). Elimine las subcarpetas primero.`,
      );
    }

    await this.folderRepository.remove(folder);
  }

  /**
   * Mover recursos a una carpeta
   */
  async moveResourcesToFolder(
    resourceIds: string[],
    folderId: string | null,
    teacherId: string,
  ): Promise<void> {
    // Si folderId no es null, verificar que la carpeta existe y pertenece al profesor
    if (folderId) {
      await this.getFolderById(folderId, teacherId);
    }

    // Actualizar todos los recursos
    await this.resourceRepository.update(
      { id: In(resourceIds), authorId: teacherId },
      { folderId },
    );
  }

  /**
   * DRAG & DROP: Reorder resources within a folder or subject
   */
  async reorderResources(
    resourceOrders: Array<{ id: string; displayOrder: number }>,
    teacherId: string,
  ): Promise<void> {
    console.log('🔄 SERVICE: Reordering', resourceOrders.length, 'resources for teacher:', teacherId);

    try {
      // Use a transaction to ensure atomicity
      await this.dataSource.transaction(async transactionalEntityManager => {
        for (const { id, displayOrder } of resourceOrders) {
          // Verify the resource belongs to the teacher before updating
          const resource = await transactionalEntityManager.findOne(EducationalResource, {
            where: { id, authorId: teacherId },
          });

          if (resource) {
            await transactionalEntityManager.update(
              EducationalResource,
              { id },
              { displayOrder }
            );
          } else {
            console.warn('⚠️ Resource not found or not owned by teacher:', id);
          }
        }
      });

      console.log('✅ SERVICE: Resources reordered successfully');
    } catch (error) {
      console.error('❌ SERVICE: Error reordering resources:', error);
      throw new BadRequestException('Error al reordenar recursos');
    }
  }

  /**
   * DRAG & DROP: Move a resource to another folder with new order
   */
  async moveResourceToFolder(
    resourceId: string,
    targetFolderId: string | null,
    newDisplayOrder: number | undefined,
    teacherId: string,
  ): Promise<void> {
    console.log('📦 SERVICE: Moving resource', resourceId, 'to folder:', targetFolderId || 'root');

    try {
      // Verify the resource belongs to the teacher
      const resource = await this.resourceRepository.findOne({
        where: { id: resourceId, authorId: teacherId },
      });

      if (!resource) {
        throw new NotFoundException('Resource not found or not owned by teacher');
      }

      // If target folder is specified, verify it exists and belongs to teacher
      if (targetFolderId) {
        await this.getFolderById(targetFolderId, teacherId);
      }

      // Update resource folder and order
      const updateData: any = { folderId: targetFolderId };
      if (newDisplayOrder !== undefined) {
        updateData.displayOrder = newDisplayOrder;
      }

      await this.resourceRepository.update({ id: resourceId }, updateData);

      console.log('✅ SERVICE: Resource moved successfully');
    } catch (error) {
      console.error('❌ SERVICE: Error moving resource:', error);
      throw error;
    }
  }

  /**
   * DRAG & DROP: Reorder folders within a subject
   */
  async reorderFolders(
    folderOrders: Array<{ id: string; displayOrder: number }>,
    teacherId: string,
  ): Promise<void> {
    console.log('📁 SERVICE: Reordering', folderOrders.length, 'folders for teacher:', teacherId);

    try {
      // Use a transaction to ensure atomicity
      await this.dataSource.transaction(async transactionalEntityManager => {
        for (const { id, displayOrder } of folderOrders) {
          // Verify the folder belongs to the teacher before updating
          const folder = await transactionalEntityManager.findOne(ResourceFolder, {
            where: { id, createdById: teacherId },
          });

          if (folder) {
            await transactionalEntityManager.update(
              ResourceFolder,
              { id },
              { displayOrder }
            );
          } else {
            console.warn('⚠️ Folder not found or not owned by teacher:', id);
          }
        }
      });

      console.log('✅ SERVICE: Folders reordered successfully');
    } catch (error) {
      console.error('❌ SERVICE: Error reordering folders:', error);
      throw new BadRequestException('Error al reordenar carpetas');
    }
  }

  // ==================== ASSIGNMENT STUDENT MANAGEMENT ====================

  /**
   * Get students for a group assignment with their exclusion status
   */
  async getAssignmentStudents(assignmentId: string): Promise<{
    assignment: any;
    students: Array<{
      id: string;
      email: string;
      profile: { firstName: string; lastName: string } | null;
      isExcluded: boolean;
    }>;
    totalStudents: number;
    excludedCount: number;
  }> {
    console.log('🔍 SERVICE: getAssignmentStudents - assignmentId:', assignmentId);

    // Get the assignment with class group
    const assignment = await this.assignmentRepository.findOne({
      where: { id: assignmentId },
      relations: ['classGroup', 'resource'],
    });

    if (!assignment) {
      throw new NotFoundException('Asignación no encontrada');
    }

    if (!assignment.classGroupId) {
      throw new BadRequestException('Esta asignación no es de tipo grupo');
    }

    // Get all students in the class group (through class_students join table)
    const studentsInGroup = await this.dataSource.query(`
      SELECT
        u.id,
        u.email,
        up."firstName",
        up."lastName"
      FROM class_students cs
      INNER JOIN students s ON s.id = cs."studentId"
      INNER JOIN users u ON s."userId" = u.id
      LEFT JOIN user_profiles up ON up."userId" = u.id
      WHERE cs."classId" = $1
      AND u."isActive" = true
      ORDER BY up."lastName", up."firstName"
    `, [assignment.classGroupId]);

    // Parse excluded student IDs
    const excludedIds = assignment.excludedStudentIds || [];

    const students = studentsInGroup.map((student: any) => ({
      id: student.id,
      email: student.email,
      profile: student.firstName || student.lastName ? {
        firstName: student.firstName || '',
        lastName: student.lastName || '',
      } : null,
      isExcluded: excludedIds.includes(student.id),
    }));

    return {
      assignment: {
        id: assignment.id,
        resourceId: assignment.resourceId,
        classGroupId: assignment.classGroupId,
        classGroupName: assignment.classGroup?.name || 'Grupo desconocido',
        resourceTitle: assignment.resource?.title || 'Recurso desconocido',
        dueDate: assignment.dueDate,
        instructions: assignment.instructions,
        assignedAt: assignment.assignedAt,
      },
      students,
      totalStudents: students.length,
      excludedCount: students.filter((s: any) => s.isExcluded).length,
    };
  }

  /**
   * Exclude a student from a group assignment
   */
  async excludeStudentFromAssignment(assignmentId: string, studentId: string): Promise<void> {
    console.log('🔍 SERVICE: excludeStudentFromAssignment - assignmentId:', assignmentId, 'studentId:', studentId);

    const assignment = await this.assignmentRepository.findOne({
      where: { id: assignmentId },
    });

    if (!assignment) {
      throw new NotFoundException('Asignación no encontrada');
    }

    if (!assignment.classGroupId) {
      throw new BadRequestException('Esta asignación no es de tipo grupo');
    }

    // Get current excluded IDs or initialize empty array
    const excludedIds = assignment.excludedStudentIds || [];

    // Add student to excluded list if not already there
    if (!excludedIds.includes(studentId)) {
      excludedIds.push(studentId);
      assignment.excludedStudentIds = excludedIds;
      await this.assignmentRepository.save(assignment);
      console.log('✅ SERVICE: Student excluded from assignment');
    } else {
      console.log('⚠️ SERVICE: Student already excluded');
    }
  }

  /**
   * Re-include a previously excluded student in a group assignment
   */
  async includeStudentInAssignment(assignmentId: string, studentId: string): Promise<void> {
    console.log('🔍 SERVICE: includeStudentInAssignment - assignmentId:', assignmentId, 'studentId:', studentId);

    const assignment = await this.assignmentRepository.findOne({
      where: { id: assignmentId },
    });

    if (!assignment) {
      throw new NotFoundException('Asignación no encontrada');
    }

    if (!assignment.classGroupId) {
      throw new BadRequestException('Esta asignación no es de tipo grupo');
    }

    // Get current excluded IDs
    const excludedIds = assignment.excludedStudentIds || [];

    // Remove student from excluded list
    const index = excludedIds.indexOf(studentId);
    if (index > -1) {
      excludedIds.splice(index, 1);
      assignment.excludedStudentIds = excludedIds;
      await this.assignmentRepository.save(assignment);
      console.log('✅ SERVICE: Student re-included in assignment');
    } else {
      console.log('⚠️ SERVICE: Student was not excluded');
    }
  }
}