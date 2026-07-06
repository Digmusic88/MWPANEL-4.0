import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { google } from 'googleapis';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class GoogleDriveService {
  private readonly logger = new Logger(GoogleDriveService.name);
  private drive: any;
  private auth: any;
  private sharedDriveId: string;

  constructor(private configService: ConfigService) {
    this.initializeGoogleDrive();
  }

  private async initializeGoogleDrive() {
    try {
      const googleConfig = this.configService.get('google');
      const sharedDriveName = googleConfig?.sharedDriveName || this.configService.get<string>('GOOGLE_SHARED_DRIVE_NAME', '12. Plataforma (Recursos dicácticos compartidos)');
      const sharedDriveId = this.configService.get<string>('GOOGLE_SHARED_DRIVE_ID');

      this.logger.log(`Attempting to connect to shared drive: "${sharedDriveName}"`);
      this.logger.log(`Shared drive ID: ${sharedDriveId}`);

      // Use credentials from secure configuration
      let credentials = googleConfig?.credentials;
      
      // Fallback to file if credentials not in config
      if (!credentials) {
        const credentialsPaths = [
          '/app/google-credentials.json', // Check container path first
          path.join(process.cwd(), 'google-credentials.json'),
          path.join(__dirname, '../../../google-credentials.json')
        ];

        for (const credentialsPath of credentialsPaths) {
          try {
            this.logger.log(`Checking for credentials at: ${credentialsPath}`);
            if (fs.existsSync(credentialsPath)) {
              credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
              this.logger.log(`Using credentials from file: ${credentialsPath}`);
              break;
            }
          } catch (fileError) {
            this.logger.error(`Error reading credentials file at ${credentialsPath}:`, fileError);
          }
        }
      }
      
      // Fallback to environment variables if still no credentials
      if (!credentials) {
        const serviceAccountEmail = this.configService.get<string>('GOOGLE_SERVICE_ACCOUNT_EMAIL');
        const privateKey = this.configService.get<string>('GOOGLE_PRIVATE_KEY');

        if (serviceAccountEmail && privateKey) {
          credentials = {
            client_email: serviceAccountEmail,
            private_key: privateKey.replace(/\\n/g, '\n'),
          };
          this.logger.log(`Using credentials from environment: ${serviceAccountEmail}`);
        }
      }
      
      if (!credentials) {
        this.logger.warn('No Google credentials configured. Google Drive features will be disabled.');
        this.logger.warn('Set GOOGLE_SERVICE_ACCOUNT_CREDENTIALS environment variable with the JSON content.');
        return; // Exit gracefully without throwing
      }

      this.auth = new google.auth.GoogleAuth({
        credentials: credentials,
        scopes: ['https://www.googleapis.com/auth/drive'],
      });

      this.drive = google.drive({ version: 'v3', auth: this.auth });

      // Use direct shared drive ID if available, otherwise search by name
      if (sharedDriveId) {
        this.sharedDriveId = sharedDriveId;
        this.logger.log(`Using direct shared drive ID: ${sharedDriveId}`);
        
        // Verify the drive exists
        try {
          const driveInfo = await this.drive.drives.get({ driveId: sharedDriveId });
          this.logger.log(`Connected to shared drive: ${driveInfo.data.name} (${this.sharedDriveId})`);
        } catch (error) {
          this.logger.error(`Failed to access shared drive ${sharedDriveId}: ${error.message}`);
          this.sharedDriveId = null;
        }
      } else {
        // Find the shared drive by name
        this.logger.log('Searching for shared drive by name...');
        const sharedDrives = await this.drive.drives.list();
        const targetDrive = sharedDrives.data.drives?.find(
          (drive: any) => drive.name === sharedDriveName
        );

        if (targetDrive) {
          this.sharedDriveId = targetDrive.id;
          this.logger.log(`Connected to shared drive: ${sharedDriveName} (${this.sharedDriveId})`);
        } else {
          this.logger.warn(`Shared drive "${sharedDriveName}" not found. Available drives: ${
            sharedDrives.data.drives?.map((d: any) => d.name).join(', ') || 'None'
          }`);
        }
      }
    } catch (error) {
      this.logger.error('Failed to initialize Google Drive service:', error.message);
    }
  }

  async uploadFile(
    fileBuffer: Buffer, 
    fileName: string, 
    mimeType: string, 
    academicYear: string,
    educationalLevel: string,
    gradeLevel: string,
    subject: string
  ): Promise<{ fileId: string; webViewLink: string; downloadLink: string; folderId: string }> {
    try {
      if (!this.drive || !this.sharedDriveId) {
        throw new Error(
          'Google Drive no está configurado correctamente. ' +
          'Verifique que las credenciales estén montadas como volumen en el contenedor Docker. ' +
          'NO se generarán archivos mock.'
        );
      }

      // Create folder structure if it doesn't exist
      const folderId = await this.ensureFolderStructure(academicYear, educationalLevel, gradeLevel, subject);

      // Normalizar nombre de archivo para preservar acentos correctamente
      const normalizedFileName = this.normalizeFileName(fileName);
      this.logger.log(`Uploading file with normalized name: "${fileName}" → "${normalizedFileName}"`);

      // Upload file to Google Drive
      const fileMetadata = {
        name: normalizedFileName,
        parents: [folderId],
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
        fields: 'id,webViewLink',
      });

      const fileId = response.data.id;
      const webViewLink = response.data.webViewLink;
      const downloadLink = `https://drive.google.com/file/d/${fileId}/view?usp=drivesdk`;

      // Configurar permisos públicos para el archivo
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
        this.logger.log(`Public permissions set for file: ${fileName} (${fileId})`);
      } catch (permissionError) {
        this.logger.warn(`Failed to set public permissions for file ${fileName}: ${permissionError.message}`);
        // No lanzamos error, el archivo se subió correctamente, solo falló el permiso público
      }

      this.logger.log(`File uploaded successfully: ${fileName} (${fileId})`);

      return {
        fileId,
        webViewLink,
        downloadLink,
        folderId,
      };
    } catch (error) {
      this.logger.error(`Failed to upload file ${fileName}:`, error.message);
      throw new BadRequestException(`Failed to upload file: ${error.message}`);
    }
  }

  /**
   * Upload a voice note to the "Notas de Voz" folder in the shared drive.
   * Returns null (graceful degradation) if Drive is not configured.
   */
  async uploadVoiceNote(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
  ): Promise<{ fileId: string; webViewLink: string; downloadLink: string } | null> {
    if (!this.drive || !this.sharedDriveId) {
      this.logger.warn('Google Drive not configured — voice note will remain on local disk');
      return null;
    }
    try {
      const folderId = await this.findOrCreateFolder('Notas de Voz', this.sharedDriveId);
      const { Readable } = require('stream');
      const response = await this.drive.files.create({
        requestBody: { name: fileName, parents: [folderId] },
        media: { mimeType, body: Readable.from(fileBuffer) },
        supportsAllDrives: true,
        supportsTeamDrives: true,
        fields: 'id,webViewLink',
      });
      const fileId = response.data.id;
      const webViewLink = response.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;
      // Direct download link — usable as <audio src> in browsers
      const downloadLink = `https://drive.google.com/uc?id=${fileId}&export=download`;
      try {
        await this.drive.permissions.create({
          fileId,
          requestBody: { role: 'reader', type: 'anyone' },
          supportsAllDrives: true,
          supportsTeamDrives: true,
        });
      } catch (permErr) {
        this.logger.warn(`Could not set public permissions for voice note ${fileName}: ${permErr.message}`);
      }
      this.logger.log(`Voice note uploaded to Drive: ${fileName} (${fileId})`);
      return { fileId, webViewLink, downloadLink };
    } catch (error) {
      this.logger.error(`Failed to upload voice note ${fileName}: ${error.message}`);
      return null;
    }
  }

  async deleteFile(fileId: string): Promise<void> {
    try {
      if (!this.drive) {
        throw new Error('Google Drive no está configurado. No se pueden eliminar archivos.');
      }

      await this.drive.files.delete({
        fileId: fileId,
        supportsAllDrives: true,
      });

      this.logger.log(`File deleted successfully: ${fileId}`);
    } catch (error) {
      this.logger.error(`Failed to delete file ${fileId}:`, error.message);
      throw new BadRequestException(`Failed to delete file: ${error.message}`);
    }
  }

  private async ensureFolderStructure(
    academicYear: string,
    educationalLevel: string,
    gradeLevel: string,
    subject: string
  ): Promise<string> {
    try {
      console.log('📂 ensureFolderStructure called with:', {
        academicYear,
        educationalLevel, 
        gradeLevel,
        subject
      });
      
      let currentFolderId = this.sharedDriveId;
      
      // Create folder structure only for non-empty names
      const folderLevels = [
        { name: academicYear, level: 'Academic Year' },
        { name: educationalLevel, level: 'Educational Level' }, 
        { name: gradeLevel, level: 'Grade Level' },
        { name: subject, level: 'Subject' }
      ];
      
      for (const folder of folderLevels) {
        if (folder.name && folder.name.trim() !== '') {
          this.logger.log(`Creating/finding folder: ${folder.name} (${folder.level})`);
          currentFolderId = await this.findOrCreateFolder(folder.name, currentFolderId);
        } else {
          this.logger.log(`Skipping empty ${folder.level} folder`);
        }
      }

      return currentFolderId;
    } catch (error) {
      this.logger.error('Failed to ensure folder structure:', error.message);
      throw error;
    }
  }

  private async findOrCreateFolder(folderName: string, parentId: string): Promise<string> {
    try {
      // Search for existing folder
      const searchResponse = await this.drive.files.list({
        q: `name='${folderName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        supportsAllDrives: true,
        supportsTeamDrives: true,
        includeItemsFromAllDrives: true,
        fields: 'files(id, name)',
      });

      if (searchResponse.data.files && searchResponse.data.files.length > 0) {
        return searchResponse.data.files[0].id;
      }

      // Create new folder
      const folderMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId],
      };

      const createResponse = await this.drive.files.create({
        requestBody: folderMetadata,
        supportsAllDrives: true,
        supportsTeamDrives: true,
        driveId: this.sharedDriveId,  // CRÍTICO: Especificar explícitamente el Shared Drive
        fields: 'id',
      });

      const newFolderId = createResponse.data.id;

      // Configurar permisos públicos para la carpeta
      try {
        await this.drive.permissions.create({
          fileId: newFolderId,
          requestBody: {
            role: 'reader',
            type: 'anyone'
          },
          supportsAllDrives: true,
          supportsTeamDrives: true
        });
        this.logger.log(`Public permissions set for folder: ${folderName} (${newFolderId})`);
      } catch (permissionError) {
        this.logger.warn(`Failed to set public permissions for folder ${folderName}: ${permissionError.message}`);
      }

      this.logger.log(`Created folder: ${folderName} (${newFolderId})`);
      return newFolderId;
    } catch (error) {
      this.logger.error(`Failed to find or create folder ${folderName}:`, error.message);
      throw error;
    }
  }

  async getFileInfo(fileId: string): Promise<any> {
    try {
      if (!this.drive) {
        throw new Error('Google Drive no está configurado. No se puede obtener información del archivo.');
      }

      const response = await this.drive.files.get({
        fileId: fileId,
        supportsAllDrives: true,
        fields: 'id,name,mimeType,size,webViewLink',
      });

      return {
        ...response.data,
        downloadLink: `https://drive.google.com/file/d/${fileId}/view?usp=drivesdk`,
      };
    } catch (error) {
      this.logger.error(`Failed to get file info for ${fileId}:`, error.message);
      throw new BadRequestException(`Failed to get file info: ${error.message}`);
    }
  }


  isConfigured(): boolean {
    return !!this.drive && !!this.sharedDriveId;
  }

  getConnectionStatus(): { connected: boolean; sharedDriveId?: string; message: string } {
    if (this.isConfigured()) {
      return {
        connected: true,
        sharedDriveId: this.sharedDriveId,
        message: 'Connected to Google Drive shared drive',
      };
    } else {
      return {
        connected: false,
        message: 'Google Drive not configured or connection failed',
      };
    }
  }

  /**
   * Configura permisos públicos para un archivo existente
   * Útil para archivos que ya fueron subidos antes de esta implementación
   */
  async setPublicPermissions(fileId: string): Promise<boolean> {
    try {
      if (!this.drive) {
        throw new Error('Google Drive no está configurado. No se pueden establecer permisos.');
      }

      await this.drive.permissions.create({
        fileId: fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone'
        },
        supportsAllDrives: true,
        supportsTeamDrives: true
      });

      this.logger.log(`Public permissions set for existing file: ${fileId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to set public permissions for file ${fileId}:`, error.message);
      return false;
    }
  }

  /**
   * Verifica si un archivo tiene permisos públicos
   */
  async hasPublicPermissions(fileId: string): Promise<boolean> {
    try {
      if (!this.drive) {
        throw new Error('Google Drive no está configurado. No se pueden verificar permisos.');
      }

      const response = await this.drive.permissions.list({
        fileId: fileId,
        supportsAllDrives: true,
        fields: 'permissions(type,role)'
      });

      const permissions = response.data.permissions || [];
      return permissions.some((permission: any) => 
        permission.type === 'anyone' && permission.role === 'reader'
      );
    } catch (error) {
      this.logger.error(`Failed to check permissions for file ${fileId}:`, error.message);
      return false;
    }
  }

  /**
   * Obtiene la lista de backups desde Google Drive (limitado a los 5 más recientes)
   */
  async getBackupsList(): Promise<any[]> {
    try {
      if (!this.drive || !this.sharedDriveId) {
        this.logger.warn('Google Drive not configured, returning empty backup list');
        return [];
      }

      // Buscar la carpeta de Backups
      const backupsFolderId = await this.findBackupsFolder();
      if (!backupsFolderId) {
        this.logger.warn('Backups folder not found in Google Drive');
        return [];
      }

      // Buscar archivos de backup en la carpeta
      const response = await this.drive.files.list({
        q: `'${backupsFolderId}' in parents and trashed=false and (name contains '.sql.gz' or name contains '.tar.gz')`,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        fields: 'files(id,name,size,createdTime,modifiedTime)',
        orderBy: 'createdTime desc',
        pageSize: 10  // Get a few extra to handle cleanup
      });

      const files = response.data.files || [];
      this.logger.log(`Found ${files.length} backup files in Google Drive`);

      // Limit to 5 most recent and auto-delete older ones
      const recentFiles = files.slice(0, 5);
      const oldFiles = files.slice(5);

      // Auto-delete files beyond the 5 most recent
      if (oldFiles.length > 0) {
        this.logger.log(`Auto-deleting ${oldFiles.length} old backup files`);
        for (const oldFile of oldFiles) {
          try {
            await this.deleteBackupFile(oldFile.id);
            this.logger.log(`Deleted old backup: ${oldFile.name}`);
          } catch (error) {
            this.logger.error(`Failed to delete old backup ${oldFile.name}:`, error.message);
          }
        }
      }

      return recentFiles.map(file => ({
        id: file.id,
        name: file.name,
        size: file.size,
        createdTime: file.createdTime,
        modifiedTime: file.modifiedTime,
        driveFileId: file.id  // Include drive file ID for deletion
      }));

    } catch (error) {
      this.logger.error('Failed to get backups list:', error.message);
      return [];
    }
  }

  /**
   * Obtiene lista completa de backups para cleanup (sin límite)
   */
  async getAllBackupsForCleanup(): Promise<any[]> {
    try {
      if (!this.drive || !this.sharedDriveId) {
        return [];
      }

      const backupsFolderId = await this.findBackupsFolder();
      if (!backupsFolderId) {
        return [];
      }

      const response = await this.drive.files.list({
        q: `'${backupsFolderId}' in parents and trashed=false and (name contains '.sql.gz' or name contains '.tar.gz')`,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        fields: 'files(id,name,size,createdTime,modifiedTime)',
        orderBy: 'createdTime desc'
      });

      return response.data.files || [];
    } catch (error) {
      this.logger.error('Failed to get all backups for cleanup:', error.message);
      return [];
    }
  }

  /**
   * Busca la carpeta de Backups en Google Drive
   */
  private async findBackupsFolder(): Promise<string | null> {
    try {
      // Buscar carpeta "Administración"
      const adminResponse = await this.drive.files.list({
        q: `name='Administración' and '${this.sharedDriveId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        fields: 'files(id, name)',
      });

      if (!adminResponse.data.files || adminResponse.data.files.length === 0) {
        this.logger.warn('Administración folder not found');
        return null;
      }

      const adminFolderId = adminResponse.data.files[0].id;
      
      // Buscar carpeta "Backups" dentro de "Administración"
      const backupsResponse = await this.drive.files.list({
        q: `name='Backups' and '${adminFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        fields: 'files(id, name)',
      });

      if (!backupsResponse.data.files || backupsResponse.data.files.length === 0) {
        this.logger.warn('Backups folder not found in Administración');
        return null;
      }

      return backupsResponse.data.files[0].id;
    } catch (error) {
      this.logger.error('Failed to find backups folder:', error.message);
      return null;
    }
  }

  /**
   * Descarga un archivo de backup desde Google Drive al sistema local
   */
  async downloadBackup(fileId: string, localPath: string): Promise<boolean> {
    try {
      if (!this.drive) {
        this.logger.error('Google Drive no está configurado. No se pueden descargar archivos.');
        return false;
      }

      this.logger.log(`Starting download of backup file ${fileId} to ${localPath}`);

      // Get file information first
      const fileInfo = await this.drive.files.get({
        fileId: fileId,
        supportsAllDrives: true,
        fields: 'id,name,size'
      });

      this.logger.log(`Downloading file: ${fileInfo.data.name} (${fileInfo.data.size} bytes)`);

      // Download the file
      const response = await this.drive.files.get({
        fileId: fileId,
        alt: 'media',
        supportsAllDrives: true,
      }, {
        responseType: 'stream'
      });

      // Ensure directory exists
      const fs = require('fs');
      const path = require('path');
      const dir = path.dirname(localPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Write file to local system
      return new Promise((resolve, reject) => {
        const writeStream = fs.createWriteStream(localPath);
        
        response.data.on('error', (error: any) => {
          this.logger.error(`Download stream error: ${error.message}`);
          reject(error);
        });

        writeStream.on('error', (error: any) => {
          this.logger.error(`Write stream error: ${error.message}`);
          reject(error);
        });

        writeStream.on('finish', () => {
          this.logger.log(`Download completed: ${localPath}`);
          resolve(true);
        });

        response.data.pipe(writeStream);
      });

    } catch (error) {
      this.logger.error(`Failed to download backup file ${fileId}:`, error.message);
      return false;
    }
  }

  /**
   * Elimina un archivo de backup de Google Drive
   */
  async deleteBackupFile(fileId: string): Promise<void> {
    try {
      if (!this.drive) {
        throw new Error('Google Drive no está configurado. No se pueden eliminar archivos.');
      }

      await this.drive.files.delete({
        fileId: fileId,
        supportsAllDrives: true,
      });

      this.logger.log(`Backup file deleted successfully: ${fileId}`);
    } catch (error) {
      this.logger.error(`Failed to delete backup file ${fileId}:`, error.message);
      throw new Error(`Failed to delete backup file: ${error.message}`);
    }
  }

  // ====================================================================
  // TASK ATTACHMENTS MODULE SPECIFIC METHODS
  // ====================================================================

  /**
   * Crea estructura de carpetas específica para archivos adjuntos de tareas
   * Estructura: Academic Year > Subject > Task > [Student/Teacher folders]
   */
  async ensureTaskAttachmentFolderStructure(
    academicYear: string,
    subject: string,
    taskTitle: string,
    isStudentSubmission: boolean = false,
    studentName?: string
  ): Promise<string> {
    try {
      if (!this.drive || !this.sharedDriveId) {
        throw new Error('Google Drive no está configurado.');
      }

      let currentFolderId = this.sharedDriveId;
      
      // Estructura específica para attachments: Academic Year > Subject > Tasks > TaskTitle
      const folderLevels = [
        { name: academicYear, level: 'Academic Year' },
        { name: subject, level: 'Subject' }, 
        { name: 'Tareas', level: 'Tasks Container' },
        { name: this.sanitizeFileName(taskTitle), level: 'Task' }
      ];

      // Si es submisión de estudiante, añadir carpeta de estudiante
      if (isStudentSubmission && studentName) {
        folderLevels.push({ 
          name: `Entregas_${this.sanitizeFileName(studentName)}`, 
          level: 'Student Submissions' 
        });
      }
      
      for (const folder of folderLevels) {
        if (folder.name && folder.name.trim() !== '') {
          this.logger.log(`Creating/finding attachment folder: ${folder.name} (${folder.level})`);
          currentFolderId = await this.findOrCreateFolder(folder.name, currentFolderId);
        }
      }

      return currentFolderId;
    } catch (error) {
      this.logger.error('Failed to ensure task attachment folder structure:', error.message);
      throw error;
    }
  }


  /**
   * Obtiene stream de descarga para un archivo adjunto
   */
  async downloadTaskAttachment(fileId: string): Promise<any> {
    try {
      if (!this.drive) {
        throw new Error('Google Drive no está configurado.');
      }

      this.logger.log(`Downloading task attachment: ${fileId}`);

      const response = await this.drive.files.get({
        fileId: fileId,
        alt: 'media',
        supportsAllDrives: true,
      }, {
        responseType: 'stream'
      });

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to download task attachment ${fileId}:`, error.message);
      throw new BadRequestException(`Failed to download attachment: ${error.message}`);
    }
  }

  /**
   * Mueve un archivo a una nueva ubicación (para reorganización)
   */
  async moveTaskAttachment(fileId: string, newFolderId: string): Promise<void> {
    try {
      if (!this.drive) {
        throw new Error('Google Drive no está configurado.');
      }

      // Obtener parents actuales
      const fileInfo = await this.drive.files.get({
        fileId: fileId,
        fields: 'parents',
        supportsAllDrives: true,
      });

      const previousParents = fileInfo.data.parents.join(',');

      // Mover archivo
      await this.drive.files.update({
        fileId: fileId,
        addParents: newFolderId,
        removeParents: previousParents,
        supportsAllDrives: true,
        supportsTeamDrives: true,
      });

      this.logger.log(`Task attachment moved successfully: ${fileId} to folder ${newFolderId}`);
    } catch (error) {
      this.logger.error(`Failed to move task attachment ${fileId}:`, error.message);
      throw new BadRequestException(`Failed to move attachment: ${error.message}`);
    }
  }

  /**
   * Obtiene información detallada de un archivo adjunto
   */
  async getTaskAttachmentInfo(fileId: string): Promise<any> {
    try {
      if (!this.drive) {
        throw new Error('Google Drive no está configurado.');
      }

      const response = await this.drive.files.get({
        fileId: fileId,
        supportsAllDrives: true,
        fields: 'id,name,mimeType,size,webViewLink,thumbnailLink,createdTime,modifiedTime,description',
      });

      return {
        ...response.data,
        downloadLink: `https://drive.google.com/file/d/${fileId}/view?usp=drivesdk`,
        humanSize: this.formatFileSize(response.data.size),
      };
    } catch (error) {
      this.logger.error(`Failed to get task attachment info for ${fileId}:`, error.message);
      throw new BadRequestException(`Failed to get attachment info: ${error.message}`);
    }
  }

  /**
   * Lista archivos en una carpeta específica de tareas
   */
  async listTaskAttachments(folderId: string): Promise<any[]> {
    try {
      if (!this.drive) {
        throw new Error('Google Drive no está configurado.');
      }

      const response = await this.drive.files.list({
        q: `'${folderId}' in parents and trashed=false`,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        fields: 'files(id,name,mimeType,size,webViewLink,thumbnailLink,createdTime,modifiedTime)',
        orderBy: 'modifiedTime desc',
      });

      const files = response.data.files || [];

      return files.map(file => ({
        ...file,
        downloadLink: `https://drive.google.com/file/d/${file.id}/view?usp=drivesdk`,
        humanSize: this.formatFileSize(file.size),
      }));
    } catch (error) {
      this.logger.error(`Failed to list task attachments in folder ${folderId}:`, error.message);
      throw new BadRequestException(`Failed to list attachments: ${error.message}`);
    }
  }

  /**
   * Normaliza nombres de archivo preservando caracteres especiales españoles (ñ, acentos)
   * Usa NFC (Normalization Form Composed) para mantener caracteres como "ó" en forma compuesta
   * Esto evita problemas de codificación en Google Drive
   */
  private normalizeFileName(fileName: string): string {
    // Usar NFC (Composed) en lugar de NFD (Decomposed) para preservar acentos correctamente
    // NFC: "ó" = U+00F3 (un solo carácter)
    // NFD: "ó" = U+006F + U+0301 (o + acento combinado) ← EVITAR
    return fileName
      .normalize('NFC') // ✅ CRÍTICO: NFC mantiene acentos correctamente
      .trim()
      .substring(0, 255); // Google Drive limit
  }

  /**
   * Sanitiza nombres de archivo para carpetas (sin tildes, espacios, caracteres especiales)
   * Solo para nombres de carpetas donde queremos evitar caracteres especiales
   */
  private sanitizeFileName(fileName: string): string {
    return fileName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Eliminar tildes y acentos
      .replace(/[^a-zA-Z0-9\.\-_]/g, '_') // Reemplazar caracteres especiales con _
      .replace(/_{2,}/g, '_') // Eliminar múltiples _ consecutivos
      .replace(/^_|_$/g, '') // Eliminar _ al inicio y final
      .substring(0, 100); // Limitar longitud
  }

  /**
   * Sube un archivo adjunto de tarea a Google Drive siguiendo la estructura específica
   * 
   * Estructura para material del profesor:
   * Archivos_Adjuntos/Tareas/{CursoAcademico}/{Asignatura}/{Tarea}/Material_Profesor
   * 
   * Estructura para entrega del alumno:
   * Archivos_Adjuntos/Tareas/{CursoAcademico}/{NombreDelCurso}/{Asignatura}/{Tarea}/Entregas/{NombreDelAlumno}
   */
  async uploadTaskAttachment(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    attachmentType: 'instruction' | 'resource' | 'submission',
    taskData: {
      academicYear: string;
      courseName?: string; // Solo para entregas de alumno
      subject: string;
      taskTitle: string;
      studentName?: string; // Solo para entregas de alumno
    }
  ): Promise<{ fileId: string; webViewLink: string; downloadLink: string; folderId: string; folderPath: string[] }> {
    try {
      if (!this.drive || !this.sharedDriveId) {
        throw new Error(
          'Google Drive no está configurado correctamente. ' +
          'Verifique que las credenciales estén montadas como volumen en el contenedor Docker.'
        );
      }

      // Normalizar nombres para crear carpetas válidas
      const normalize = (name: string): string => {
        return name
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
          .replace(/[^a-zA-Z0-9\s]/g, '') // Eliminar caracteres especiales
          .replace(/\s+/g, '_') // Reemplazar espacios con guiones bajos
          .trim();
      };

      // Construir la ruta de carpetas según el tipo de archivo
      let folderPath: string[] = ['Archivos_Adjuntos', 'Tareas', normalize(taskData.academicYear)];
      
      if (attachmentType === 'submission' && taskData.courseName && taskData.studentName) {
        // Estructura para entregas de alumno
        folderPath.push(
          normalize(taskData.courseName),
          normalize(taskData.subject),
          normalize(taskData.taskTitle),
          'Entregas',
          normalize(taskData.studentName)
        );
      } else {
        // Estructura para material del profesor (instruction/resource)
        folderPath.push(
          normalize(taskData.subject),
          normalize(taskData.taskTitle),
          attachmentType === 'instruction' ? 'Material_Profesor' : 'Recursos_Adicionales'
        );
      }

      this.logger.log(`Creating task attachment folder structure: ${folderPath.join('/')}`);

      // Crear la estructura de carpetas
      const folderId = await this.createFolderPath(folderPath);

      // Normalizar nombre de archivo para preservar acentos correctamente
      const normalizedFileName = this.normalizeFileName(fileName);
      this.logger.log(`Uploading task attachment with normalized name: "${fileName}" → "${normalizedFileName}"`);

      // Subir archivo a Google Drive
      const fileMetadata = {
        name: normalizedFileName,
        parents: [folderId],
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
        fields: 'id,webViewLink',
      });

      const fileId = response.data.id;
      const webViewLink = response.data.webViewLink;
      const downloadLink = `https://drive.google.com/file/d/${fileId}/view?usp=drivesdk`;

      // Configurar permisos públicos para el archivo
      try {
        await this.drive.permissions.create({
          fileId: fileId,
          requestBody: {
            role: 'reader',
            type: 'anyone',
          },
          supportsAllDrives: true,
          supportsTeamDrives: true,
        });
        this.logger.log(`Set public permissions for task attachment: ${fileName}`);
      } catch (permError) {
        this.logger.warn(`Could not set public permissions for ${fileName}: ${permError.message}`);
      }

      this.logger.log(`Task attachment uploaded successfully: ${fileName} (${fileId})`);
      
      return {
        fileId,
        webViewLink,
        downloadLink,
        folderId,
        folderPath: folderPath
      };

    } catch (error) {
      this.logger.error(`Failed to upload task attachment ${fileName}:`, error.message);
      throw error;
    }
  }

  /**
   * Crea una ruta de carpetas completa en Google Drive
   */
  private async createFolderPath(folderPath: string[]): Promise<string> {
    let currentFolderId = this.sharedDriveId;
    
    for (const folderName of folderPath) {
      if (folderName && folderName.trim() !== '') {
        this.logger.log(`Creating/finding folder: ${folderName}`);
        currentFolderId = await this.findOrCreateFolder(folderName, currentFolderId);
      }
    }
    
    return currentFolderId;
  }

  /**
   * Sube un archivo a la carpeta específica de apuntes del estudiante
   * 
   * Estructura:
   * Drive Principal/Apuntes Alumnado/{AñoAcademico}/{ID_Estudiante}/{TipoArchivo}/
   */
  async uploadStudentNote(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    studentId: string,
    noteType: 'text' | 'voice' | 'drawing' | 'mixed'
  ): Promise<{
    fileId: string;
    webViewLink: string;
    downloadLink: string;
    folderId: string;
    folderPath: string;
  }> {
    try {
      if (!this.drive) {
        throw new BadRequestException('Google Drive no está configurado correctamente. Verifique que las credenciales estén montadas como volumen en el contenedor Docker.');
      }

      // Obtener año académico actual
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth(); // 0-11
      
      // Año académico va de septiembre a agosto
      let academicYear: string;
      if (currentMonth >= 8) { // Septiembre (8) en adelante
        academicYear = `${currentYear}-${currentYear + 1}`;
      } else { // Enero a agosto
        academicYear = `${currentYear - 1}-${currentYear}`;
      }

      // Mapear tipo de nota a carpeta
      const folderMapping = {
        'text': 'Notas',
        'voice': 'Audio',
        'drawing': 'Presentaciones',
        'mixed': 'Documentos'
      };

      const typeFolder = folderMapping[noteType] || 'Documentos';

      // Estructura de carpetas específica para apuntes
      const folderPath = [
        'Apuntes Alumnado',
        academicYear,
        studentId,
        typeFolder
      ];

      this.logger.log(`Creating student note folder structure: ${folderPath.join(' / ')}`);
      const folderId = await this.createFolderPath(folderPath);

      // Normalizar nombre de archivo para preservar acentos correctamente
      const normalizedFileName = this.normalizeFileName(fileName);

      // Añadir timestamp para evitar duplicados
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const finalFileName = `${timestamp}_${normalizedFileName}`;

      this.logger.log(`Uploading student note: "${fileName}" → "${finalFileName}" to folder ${folderId}`);

      // Subir archivo
      // Usar EXACTAMENTE el mismo patrón que uploadFile (que funciona)
      const fileMetadata = {
        name: finalFileName,
        parents: [folderId],
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
        fields: 'id,webViewLink',
      });

      const fileId = response.data.id;
      const webViewLink = response.data.webViewLink;
      const downloadLink = `https://drive.google.com/file/d/${fileId}/view?usp=drivesdk`;

      this.logger.log(`Student note uploaded successfully: ${fileId}`);
      
      return {
        fileId,
        webViewLink,
        downloadLink,
        folderId,
        folderPath: folderPath.join(' / ')
      };

    } catch (error) {
      this.logger.error(`Failed to upload student note ${fileName}:`, error.message);
      throw new BadRequestException(`Error al subir apunte del estudiante: ${error.message}`);
    }
  }

  /**
   * Descarga un archivo por su ID y devuelve el buffer
   * Método específico para apuntes compartidos y otros archivos que necesiten streaming
   */
  async downloadFile(fileId: string): Promise<Buffer> {
    try {
      if (!this.drive) {
        throw new Error('Google Drive no está configurado.');
      }

      this.logger.log(`Downloading file: ${fileId}`);

      const response = await this.drive.files.get({
        fileId: fileId,
        alt: 'media',
        supportsAllDrives: true,
      }, {
        responseType: 'arraybuffer'
      });

      this.logger.log(`File downloaded successfully: ${fileId}`);
      return Buffer.from(response.data);
    } catch (error) {
      this.logger.error(`Failed to download file ${fileId}:`, error.message);
      throw new BadRequestException(`Failed to download file: ${error.message}`);
    }
  }

  /**
   * Formatea tamaño de archivo en formato legible
   */
  private formatFileSize(bytes: number): string {
    if (!bytes) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

}