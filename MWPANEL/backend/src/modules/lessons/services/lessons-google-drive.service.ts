import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { google } from 'googleapis';
import { ConfigService } from '@nestjs/config';
import { GoogleDriveService } from '../../educational-resources/services/google-drive.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LessonWorkspace, LessonFolder, LessonResource } from '../entities';
import * as path from 'path';
import * as fs from 'fs';

export interface LessonsFolderStructure {
  workspaceId: string;
  workspaceName: string;
  subjectName: string;
  className: string;
  teacherName: string;
  academicYear: string;
}

export interface GoogleDriveFileInfo {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  webViewLink: string;
  downloadLink: string;
  thumbnailLink?: string;
  createdTime: string;
  modifiedTime: string;
  parents?: string[];
  webContentLink?: string;
}

export interface LessonsUploadResult {
  fileId: string;
  fileName: string;
  mimeType: string;
  size: number;
  webViewLink: string;
  downloadLink: string;
  thumbnailLink?: string;
  folderId: string;
}

@Injectable()
export class LessonsGoogleDriveService {
  private readonly logger = new Logger(LessonsGoogleDriveService.name);
  private drive: any;
  private auth: any;
  private sharedDriveId: string;

  constructor(
    private configService: ConfigService,
    private googleDriveService: GoogleDriveService,
    @InjectRepository(LessonWorkspace)
    private workspaceRepository: Repository<LessonWorkspace>,
    @InjectRepository(LessonFolder)
    private folderRepository: Repository<LessonFolder>,
    @InjectRepository(LessonResource)
    private resourceRepository: Repository<LessonResource>
  ) {
    this.initializeGoogleDrive();
  }

  private async initializeGoogleDrive() {
    try {
      // Reutilizar la configuración del servicio existente
      const sharedDriveName = this.configService.get<string>('GOOGLE_SHARED_DRIVE_NAME', '12. Plataforma (Recursos dicácticos compartidos)');
      const sharedDriveId = this.configService.get<string>('GOOGLE_SHARED_DRIVE_ID');

      this.logger.log(`[Lessons] Initializing Google Drive integration for: "${sharedDriveName}"`);

      // Try to use Google credentials from multiple possible locations
      let credentials;
      const credentialsPaths = [
        path.join(process.cwd(), 'google-credentials.json'),
        path.join(process.cwd(), 'mw-panel-educativo-aac854585bb9.json')
      ];

      for (const credentialsPath of credentialsPaths) {
        if (fs.existsSync(credentialsPath)) {
          credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
          this.logger.log(`[Lessons] Using credentials: ${credentialsPath}`);
          break;
        }
      }

      if (!credentials) {
        this.logger.warn('[Lessons] No Google credentials found');
        return;
      }

      // Configure Google Auth
      this.auth = new google.auth.GoogleAuth({
        credentials,
        scopes: [
          'https://www.googleapis.com/auth/drive',
          'https://www.googleapis.com/auth/drive.file'
        ],
      });

      this.drive = google.drive({ version: 'v3', auth: this.auth });

      // Find or verify shared drive
      if (sharedDriveId) {
        this.sharedDriveId = sharedDriveId;
        this.logger.log(`[Lessons] Using configured shared drive ID: ${sharedDriveId}`);
      } else {
        // Search for shared drive by name
        const sharedDrives = await this.drive.drives.list();
        const targetDrive = sharedDrives.data.drives?.find((drive: any) => 
          drive.name === sharedDriveName
        );

        if (targetDrive) {
          this.sharedDriveId = targetDrive.id;
          this.logger.log(`[Lessons] Found shared drive: ${sharedDriveName} (${this.sharedDriveId})`);
        } else {
          this.logger.warn(`[Lessons] Shared drive "${sharedDriveName}" not found`);
        }
      }
    } catch (error) {
      this.logger.error('[Lessons] Failed to initialize Google Drive:', error.message);
    }
  }

  // ========================================
  // FOLDER STRUCTURE MANAGEMENT
  // ========================================

  async createLessonsRootFolder(): Promise<string> {
    try {
      if (!this.drive || !this.sharedDriveId) {
        throw new Error('Google Drive not properly configured');
      }

      // Check if Lessons root folder already exists
      const query = `name = 'Lecciones y Recursos' and parents in '${this.sharedDriveId}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
      
      const existingFolders = await this.drive.files.list({
        q: query,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        driveId: this.sharedDriveId,
        corpora: 'drive'
      });

      if (existingFolders.data.files && existingFolders.data.files.length > 0) {
        const folderId = existingFolders.data.files[0].id;
        this.logger.log(`[Lessons] Using existing root folder: ${folderId}`);
        return folderId;
      }

      // Create new root folder
      const folderMetadata = {
        name: 'Lecciones y Recursos',
        mimeType: 'application/vnd.google-apps.folder',
        parents: [this.sharedDriveId],
      };

      const response = await this.drive.files.create({
        requestBody: folderMetadata,
        supportsAllDrives: true,
        supportsTeamDrives: true,
        fields: 'id, name'
      });

      const folderId = response.data.id;
      this.logger.log(`[Lessons] Created root folder: Lecciones y Recursos (${folderId})`);

      return folderId;
    } catch (error) {
      this.logger.error('[Lessons] Failed to create root folder:', error.message);
      throw new BadRequestException(`Failed to create lessons root folder: ${error.message}`);
    }
  }

  async createAcademicYearFolder(rootFolderId: string, academicYear: string): Promise<string> {
    try {
      // Check if academic year folder already exists
      const query = `name = '${academicYear}' and parents in '${rootFolderId}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
      
      const existingFolders = await this.drive.files.list({
        q: query,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        driveId: this.sharedDriveId,
        corpora: 'drive'
      });

      if (existingFolders.data.files && existingFolders.data.files.length > 0) {
        const folderId = existingFolders.data.files[0].id;
        this.logger.log(`[Lessons] Using existing academic year folder: ${academicYear} (${folderId})`);
        return folderId;
      }

      // Create new academic year folder
      const folderMetadata = {
        name: academicYear,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [rootFolderId],
      };

      const response = await this.drive.files.create({
        requestBody: folderMetadata,
        supportsAllDrives: true,
        supportsTeamDrives: true,
        fields: 'id, name'
      });

      const folderId = response.data.id;
      this.logger.log(`[Lessons] Created academic year folder: ${academicYear} (${folderId})`);

      return folderId;
    } catch (error) {
      this.logger.error('[Lessons] Failed to create academic year folder:', error.message);
      throw new BadRequestException(`Failed to create academic year folder: ${error.message}`);
    }
  }

  async createWorkspaceFolder(folderStructure: LessonsFolderStructure): Promise<string> {
    try {
      if (!this.drive || !this.sharedDriveId) {
        throw new Error('Google Drive not properly configured');
      }

      // Ensure root folder exists
      const rootFolderId = await this.createLessonsRootFolder();

      // DEBUG: Log folder structure
      this.logger.log(`[Lessons] DEBUG - Folder Structure: ${JSON.stringify(folderStructure)}`);
      this.logger.log(`[Lessons] DEBUG - About to create academic year folder with: ${folderStructure.academicYear}`);

      // Ensure academic year folder exists
      const academicYearFolderId = await this.createAcademicYearFolder(rootFolderId, folderStructure.academicYear);
      
      this.logger.log(`[Lessons] DEBUG - Academic year folder ID: ${academicYearFolderId}`);

      // Create workspace folder structure: Subject - Class - Teacher (without academic year since it's in parent folder)
      const workspaceFolderName = `${folderStructure.subjectName} - ${folderStructure.className} - ${folderStructure.teacherName}`;

      // Check if workspace folder already exists
      const query = `name = '${workspaceFolderName}' and parents in '${academicYearFolderId}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
      
      const existingFolders = await this.drive.files.list({
        q: query,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        driveId: this.sharedDriveId,
        corpora: 'drive'
      });

      if (existingFolders.data.files && existingFolders.data.files.length > 0) {
        const folderId = existingFolders.data.files[0].id;
        this.logger.log(`[Lessons] Using existing workspace folder: ${workspaceFolderName} (${folderId})`);
        return folderId;
      }

      // Create new workspace folder
      const folderMetadata = {
        name: workspaceFolderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [academicYearFolderId],
      };

      const response = await this.drive.files.create({
        requestBody: folderMetadata,
        supportsAllDrives: true,
        supportsTeamDrives: true,
        fields: 'id, name'
      });

      const folderId = response.data.id;
      this.logger.log(`[Lessons] Created workspace folder: ${workspaceFolderName} (${folderId})`);

      return folderId;
    } catch (error) {
      this.logger.error('[Lessons] Failed to create workspace folder:', error.message);
      throw new BadRequestException(`Failed to create workspace folder: ${error.message}`);
    }
  }

  async createLessonFolder(parentFolderId: string, lessonName: string): Promise<string> {
    try {
      if (!this.drive) {
        throw new Error('Google Drive not properly configured');
      }

      // Sanitize lesson name for folder creation
      const sanitizedName = lessonName.replace(/[<>:"/\\|?*]/g, '_').trim();

      // Check if lesson folder already exists
      const query = `name = '${sanitizedName}' and parents in '${parentFolderId}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
      
      const existingFolders = await this.drive.files.list({
        q: query,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        driveId: this.sharedDriveId,
        corpora: 'drive'
      });

      if (existingFolders.data.files && existingFolders.data.files.length > 0) {
        const folderId = existingFolders.data.files[0].id;
        this.logger.log(`[Lessons] Using existing lesson folder: ${sanitizedName} (${folderId})`);
        return folderId;
      }

      // Create new lesson folder
      const folderMetadata = {
        name: sanitizedName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentFolderId],
      };

      const response = await this.drive.files.create({
        requestBody: folderMetadata,
        supportsAllDrives: true,
        supportsTeamDrives: true,
        fields: 'id, name'
      });

      const folderId = response.data.id;
      this.logger.log(`[Lessons] Created lesson folder: ${sanitizedName} (${folderId})`);

      return folderId;
    } catch (error) {
      this.logger.error('[Lessons] Failed to create lesson folder:', error.message);
      throw new BadRequestException(`Failed to create lesson folder: ${error.message}`);
    }
  }

  // ========================================
  // FILE OPERATIONS
  // ========================================

  async uploadLessonFile(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    lessonFolderId: string
  ): Promise<LessonsUploadResult> {
    try {
      if (!this.drive) {
        throw new Error('Google Drive not properly configured');
      }

      // Sanitize file name
      const sanitizedFileName = fileName.replace(/[<>:"/\\|?*]/g, '_').trim();

      // Upload file to Google Drive
      const fileMetadata = {
        name: sanitizedFileName,
        parents: [lessonFolderId],
      };

      const { Readable } = require('stream');
      const media = {
        mimeType: mimeType,
        body: Readable.from(fileBuffer),
      };

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        media: media,
        supportsAllDrives: true,
        supportsTeamDrives: true,
        fields: 'id, name, size, mimeType, webViewLink, thumbnailLink, createdTime, modifiedTime, webContentLink',
      });

      const fileData = response.data;
      const fileId = fileData.id;
      const webViewLink = fileData.webViewLink;
      const downloadLink = fileData.webContentLink || `https://drive.google.com/file/d/${fileId}/view?usp=drivesdk`;

      // Set public permissions for the file
      try {
        await this.drive.permissions.create({
          fileId: fileId,
          requestBody: {
            role: 'reader',
            type: 'anyone'
          },
          supportsAllDrives: true,
          supportsTeamDrives: true
        });
        this.logger.log(`[Lessons] Public permissions set for file: ${sanitizedFileName} (${fileId})`);
      } catch (permissionError) {
        this.logger.warn(`[Lessons] Failed to set public permissions for file ${sanitizedFileName}: ${permissionError.message}`);
      }

      this.logger.log(`[Lessons] File uploaded successfully: ${sanitizedFileName} (${fileId})`);

      return {
        fileId,
        fileName: sanitizedFileName,
        mimeType: fileData.mimeType,
        size: parseInt(fileData.size || '0'),
        webViewLink,
        downloadLink,
        thumbnailLink: fileData.thumbnailLink,
        folderId: lessonFolderId,
      };
    } catch (error) {
      this.logger.error(`[Lessons] Failed to upload file ${fileName}:`, error.message);
      throw new BadRequestException(`Failed to upload file: ${error.message}`);
    }
  }

  async getFileInfo(fileId: string): Promise<GoogleDriveFileInfo> {
    try {
      if (!this.drive) {
        throw new Error('Google Drive not properly configured');
      }

      const response = await this.drive.files.get({
        fileId: fileId,
        supportsAllDrives: true,
        fields: 'id, name, mimeType, size, webViewLink, thumbnailLink, createdTime, modifiedTime, parents, webContentLink'
      });

      const fileData = response.data;

      return {
        id: fileData.id,
        name: fileData.name,
        mimeType: fileData.mimeType,
        size: fileData.size,
        webViewLink: fileData.webViewLink,
        downloadLink: fileData.webContentLink || `https://drive.google.com/file/d/${fileData.id}/view?usp=drivesdk`,
        thumbnailLink: fileData.thumbnailLink,
        createdTime: fileData.createdTime,
        modifiedTime: fileData.modifiedTime,
        parents: fileData.parents,
        webContentLink: fileData.webContentLink
      };
    } catch (error) {
      this.logger.error(`[Lessons] Failed to get file info for ${fileId}:`, error.message);
      throw new NotFoundException(`File not found: ${fileId}`);
    }
  }

  async deleteFile(fileId: string): Promise<void> {
    try {
      if (!this.drive) {
        throw new Error('Google Drive not properly configured');
      }

      await this.drive.files.delete({
        fileId: fileId,
        supportsAllDrives: true,
      });

      this.logger.log(`[Lessons] File deleted successfully: ${fileId}`);
    } catch (error) {
      this.logger.error(`[Lessons] Failed to delete file ${fileId}:`, error.message);
      throw new BadRequestException(`Failed to delete file: ${error.message}`);
    }
  }

  async deleteFolder(folderId: string): Promise<void> {
    try {
      if (!this.drive) {
        throw new Error('Google Drive not properly configured');
      }

      // First, list all files in the folder
      const filesInFolder = await this.drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        driveId: this.sharedDriveId,
        corpora: 'drive'
      });

      // Delete all files in the folder first
      if (filesInFolder.data.files && filesInFolder.data.files.length > 0) {
        for (const file of filesInFolder.data.files) {
          await this.deleteFile(file.id);
        }
      }

      // Then delete the folder itself
      await this.drive.files.delete({
        fileId: folderId,
        supportsAllDrives: true,
      });

      this.logger.log(`[Lessons] Folder deleted successfully: ${folderId}`);
    } catch (error) {
      this.logger.error(`[Lessons] Failed to delete folder ${folderId}:`, error.message);
      throw new BadRequestException(`Failed to delete folder: ${error.message}`);
    }
  }

  // ========================================
  // FOLDER LISTING AND SEARCH
  // ========================================

  async listFolderContents(folderId: string): Promise<GoogleDriveFileInfo[]> {
    try {
      if (!this.drive) {
        throw new Error('Google Drive not properly configured');
      }

      const response = await this.drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        driveId: this.sharedDriveId,
        corpora: 'drive',
        fields: 'files(id, name, mimeType, size, webViewLink, thumbnailLink, createdTime, modifiedTime, webContentLink)',
        orderBy: 'name'
      });

      if (!response.data.files) {
        return [];
      }

      return response.data.files.map((file: any) => ({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        size: file.size,
        webViewLink: file.webViewLink,
        downloadLink: file.webContentLink || `https://drive.google.com/file/d/${file.id}/view?usp=drivesdk`,
        thumbnailLink: file.thumbnailLink,
        createdTime: file.createdTime,
        modifiedTime: file.modifiedTime,
        webContentLink: file.webContentLink
      }));
    } catch (error) {
      this.logger.error(`[Lessons] Failed to list folder contents for ${folderId}:`, error.message);
      throw new BadRequestException(`Failed to list folder contents: ${error.message}`);
    }
  }

  // ========================================
  // INTEGRATION WITH LESSON ENTITIES
  // ========================================

  async syncWorkspaceWithDrive(workspaceId: string): Promise<string> {
    this.logger.log(`[Lessons] 🚀 STARTING syncWorkspaceWithDrive for workspace: ${workspaceId}`);
    try {
      const workspace = await this.workspaceRepository.findOne({
        where: { id: workspaceId },
        relations: [
          'subjectAssignment', 
          'subjectAssignment.teacher', 
          'subjectAssignment.teacher.user',
          'subjectAssignment.teacher.user.profile',
          'subjectAssignment.subject', 
          'subjectAssignment.classGroup',
          'subjectAssignment.academicYear'
        ]
      });

      if (!workspace) {
        throw new NotFoundException('Workspace not found');
      }

      // DEBUG: Log detailed workspace data
      this.logger.log(`[Lessons] DEBUG - Workspace relations loaded:`);
      this.logger.log(`[Lessons] DEBUG - Has subjectAssignment: ${!!workspace.subjectAssignment}`);
      this.logger.log(`[Lessons] DEBUG - Has teacher: ${!!workspace.subjectAssignment?.teacher}`);
      this.logger.log(`[Lessons] DEBUG - Has teacher user: ${!!workspace.subjectAssignment?.teacher?.user}`);
      this.logger.log(`[Lessons] DEBUG - Has teacher profile: ${!!workspace.subjectAssignment?.teacher?.user?.profile}`);
      this.logger.log(`[Lessons] DEBUG - Has academicYear: ${!!workspace.subjectAssignment?.academicYear}`);
      this.logger.log(`[Lessons] DEBUG - Teacher ID: ${workspace.subjectAssignment?.teacherId}`);
      this.logger.log(`[Lessons] DEBUG - Academic Year ID: ${workspace.subjectAssignment?.academicYearId}`);

      // Get teacher name from profile with fallback
      const teacherProfile = workspace.subjectAssignment?.teacher?.user?.profile;
      let teacherName = 'Unknown Teacher';
      
      if (teacherProfile) {
        teacherName = `${teacherProfile.firstName} ${teacherProfile.lastName}`;
      } else if (workspace.subjectAssignment?.teacherId) {
        // If teacher profile is not loaded, query it separately
        this.logger.log(`[Lessons] Teacher profile not loaded in relations, querying separately...`);
        try {
          const teacherResult = await this.workspaceRepository.manager.query(
            `SELECT up."firstName", up."lastName" 
             FROM teachers t 
             JOIN users u ON t."userId" = u.id 
             JOIN user_profiles up ON u.id = up."userId" 
             WHERE t.id = $1`, 
            [workspace.subjectAssignment.teacherId]
          );
          if (teacherResult && teacherResult.length > 0) {
            const teacher = teacherResult[0];
            teacherName = `${teacher.firstName} ${teacher.lastName}`;
            this.logger.log(`[Lessons] Found teacher name from direct query: ${teacherName}`);
          }
        } catch (error) {
          this.logger.error(`[Lessons] Error querying teacher profile: ${error.message}`);
        }
      }
      
      this.logger.log(`[Lessons] Final Teacher Name: ${teacherName}`);

      // Get academic year properly with fallback
      let academicYear = workspace.subjectAssignment?.academicYear?.name;
      
      // If academic year is not loaded, query it separately
      if (!academicYear && workspace.subjectAssignment?.academicYearId) {
        this.logger.log(`[Lessons] Academic year not loaded in relations, querying separately...`);
        try {
          const academicYearResult = await this.workspaceRepository.manager.query(
            `SELECT name FROM academic_years WHERE id = $1`, 
            [workspace.subjectAssignment.academicYearId]
          );
          if (academicYearResult && academicYearResult.length > 0) {
            academicYear = academicYearResult[0].name;
            this.logger.log(`[Lessons] Found academic year from direct query: ${academicYear}`);
          }
        } catch (error) {
          this.logger.error(`[Lessons] Error querying academic year: ${error.message}`);
        }
      }
      
      // Final fallback
      if (!academicYear) {
        academicYear = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
        this.logger.log(`[Lessons] Using fallback academic year: ${academicYear}`);
      }

      // DEBUG: Log final academic year
      this.logger.log(`[Lessons] Final Academic Year: ${academicYear}`);

      // Create folder structure object
      const folderStructure: LessonsFolderStructure = {
        workspaceId: workspace.id,
        workspaceName: `${workspace.subjectAssignment?.subject?.name || 'Unknown'} - ${workspace.subjectAssignment?.classGroup?.name || 'Unknown'}`,
        subjectName: workspace.subjectAssignment?.subject?.name || 'Unknown Subject',
        className: workspace.subjectAssignment?.classGroup?.name || 'Unknown Class',
        teacherName: teacherName,
        academicYear: academicYear
      };

      // Create or get workspace folder in Google Drive
      const driveFolderId = await this.createWorkspaceFolder(folderStructure);

      // Update workspace with Drive folder ID
      workspace.driveFolderId = driveFolderId;
      await this.workspaceRepository.save(workspace);

      this.logger.log(`[Lessons] Workspace ${workspaceId} synced with Drive folder ${driveFolderId}`);

      return driveFolderId;
    } catch (error) {
      this.logger.error(`[Lessons] Failed to sync workspace ${workspaceId} with Drive:`, error.message);
      throw new BadRequestException(`Failed to sync workspace with Drive: ${error.message}`);
    }
  }

  async syncFolderWithDrive(folderId: string): Promise<string> {
    try {
      const folder = await this.folderRepository.findOne({
        where: { id: folderId },
        relations: ['workspace']
      });

      if (!folder) {
        throw new NotFoundException('Folder not found');
      }

      // Ensure workspace has Drive folder
      let workspaceDriveFolderId = folder.workspace.driveFolderId;
      if (!workspaceDriveFolderId) {
        workspaceDriveFolderId = await this.syncWorkspaceWithDrive(folder.workspace.id);
      }

      // Create lesson folder in Drive
      const lessonDriveFolderId = await this.createLessonFolder(workspaceDriveFolderId, folder.name);

      // Update folder with Drive folder ID
      folder.driveFolderId = lessonDriveFolderId;
      await this.folderRepository.save(folder);

      this.logger.log(`[Lessons] Folder ${folderId} synced with Drive folder ${lessonDriveFolderId}`);

      return lessonDriveFolderId;
    } catch (error) {
      this.logger.error(`[Lessons] Failed to sync folder ${folderId} with Drive:`, error.message);
      throw new BadRequestException(`Failed to sync folder with Drive: ${error.message}`);
    }
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  async checkDriveConnection(): Promise<boolean> {
    try {
      if (!this.drive || !this.sharedDriveId) {
        return false;
      }

      // Try to list drives to test connection
      await this.drive.drives.list();
      return true;
    } catch (error) {
      this.logger.error('[Lessons] Drive connection check failed:', error.message);
      return false;
    }
  }

  getSharedDriveId(): string {
    return this.sharedDriveId;
  }

  isDriveConfigured(): boolean {
    return !!(this.drive && this.sharedDriveId);
  }
}