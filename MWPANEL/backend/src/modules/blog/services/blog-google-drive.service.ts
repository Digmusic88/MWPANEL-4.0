import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { google } from 'googleapis';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs';
import axios from 'axios';

@Injectable()
export class BlogGoogleDriveService {
  private readonly logger = new Logger(BlogGoogleDriveService.name);
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

      this.logger.log(`Connecting to shared drive for blog multimedia: "${sharedDriveName}"`);

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
        this.logger.warn('No Google credentials configured. Blog multimedia features will be disabled.');
        return;
      }

      this.auth = new google.auth.GoogleAuth({
        credentials: credentials,
        scopes: ['https://www.googleapis.com/auth/drive'],
      });

      this.drive = google.drive({ version: 'v3', auth: this.auth });

      // Use direct shared drive ID if available, otherwise search by name
      if (sharedDriveId) {
        this.sharedDriveId = sharedDriveId;
        this.logger.log(`Using direct shared drive ID for blog: ${sharedDriveId}`);
        
        // Verify the drive exists
        try {
          const driveInfo = await this.drive.drives.get({ driveId: sharedDriveId });
          this.logger.log(`Connected to shared drive for blog: ${driveInfo.data.name} (${this.sharedDriveId})`);
        } catch (error) {
          this.logger.error(`Failed to access shared drive ${sharedDriveId}: ${error.message}`);
          this.sharedDriveId = null;
        }
      } else {
        // Find the shared drive by name
        const sharedDrives = await this.drive.drives.list();
        const targetDrive = sharedDrives.data.drives?.find(
          (drive: any) => drive.name === sharedDriveName
        );

        if (targetDrive) {
          this.sharedDriveId = targetDrive.id;
          this.logger.log(`Connected to shared drive for blog: ${sharedDriveName} (${this.sharedDriveId})`);
        } else {
          this.logger.warn(`Shared drive "${sharedDriveName}" not found for blog multimedia.`);
        }
      }
    } catch (error) {
      this.logger.error('Failed to initialize Google Drive service for blog:', error.message);
    }
  }

  /**
   * Crea una sesión de upload resumable para Google Drive
   * Retorna URL de upload y metadata para chunked upload
   */
  async createResumableUploadSession(
    fileName: string,
    fileSize: number,
    mimeType: string,
    mediaType: 'image' | 'video' | 'audio' | 'document' | 'gallery',
    uploadedById: string
  ): Promise<{
    uploadUrl: string;
    sessionId: string;
    folderId: string;
    folderPath: string[];
    fileName: string;
  }> {
    try {
      if (!this.drive || !this.sharedDriveId) {
        throw new Error('Google Drive no está configurado correctamente.');
      }

      // Crear estructura de carpetas
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth();
      
      let academicYear: string;
      if (currentMonth >= 8) {
        academicYear = `${currentYear}-${currentYear + 1}`;
      } else {
        academicYear = `${currentYear - 1}-${currentYear}`;
      }

      const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ];
      const monthName = monthNames[currentMonth];
      const folderPath = ['Galería multimedia y blog', academicYear, monthName];
      const folderId = await this.createFolderPath(folderPath);

      const sanitizedFileName = this.sanitizeFileName(fileName);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const finalFileName = `${timestamp}_${sanitizedFileName}`;

      // Generar sessionId único para tracking
      const sessionId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      this.logger.log(`🔄 [BlogGoogleDrive] Creating resumable upload session for ${finalFileName} (${this.formatFileSize(fileSize)})`);

      // Inicializar sesión de upload resumable con Google Drive API
      const fileMetadata = {
        name: finalFileName,
        parents: [folderId],
      };

      // Crear URL de sesión resumable usando el approach directo de googleapis
      const authClient = await this.auth.getClient();
      const accessToken = await authClient.getAccessToken();

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': mimeType,
          'X-Upload-Content-Length': fileSize.toString(),
        },
        body: JSON.stringify(fileMetadata)
      });

      if (!response.ok) {
        throw new Error(`Failed to create resumable upload session: ${response.status} ${response.statusText}`);
      }

      const uploadUrl = response.headers.get('location');
      if (!uploadUrl) {
        throw new Error('No upload URL returned from Google Drive');
      }

      this.logger.log(`✅ [BlogGoogleDrive] Resumable upload session created: ${sessionId}`);

      return {
        uploadUrl,
        sessionId,
        folderId,
        folderPath,
        fileName: finalFileName
      };

    } catch (error) {
      this.logger.error(`Failed to create resumable upload session for ${fileName}:`, error.message);
      throw new BadRequestException(`Error al crear sesión de upload: ${error.message}`);
    }
  }

  /**
   * Sube un chunk de datos a una sesión resumable existente
   */
  async uploadChunk(
    uploadUrl: string,
    chunkBuffer: Buffer,
    chunkIndex: number,
    totalChunks: number,
    startByte: number,
    endByte: number,
    totalFileSize: number
  ): Promise<{
    success: boolean;
    progress: number;
    fileId?: string;
    completed: boolean;
  }> {
    try {
      // Fix para Google Drive API: Ajustar parámetros para formato correcto
      const actualEndByte = Math.min(endByte, totalFileSize) - 1; // endByte es exclusivo, pero Google Drive espera inclusivo
      const actualChunkSize = chunkBuffer.length;
      const contentRange = `bytes ${startByte}-${actualEndByte}/${totalFileSize}`;
      
      this.logger.log(`📤 [BlogGoogleDrive] Uploading chunk ${chunkIndex + 1}/${totalChunks} (${startByte}-${actualEndByte}/${totalFileSize}) - ChunkSize: ${actualChunkSize}`);
      this.logger.log(`🔧 [BlogGoogleDrive] Content-Range: ${contentRange}`);

      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Length': actualChunkSize.toString(),
          'Content-Range': contentRange,
        },
        body: new Uint8Array(chunkBuffer) // Convert Buffer to Uint8Array
      });

      const progress = ((endByte) / totalFileSize) * 100;

      if (response.status === 200 || response.status === 201) {
        // Upload completo
        const responseData = await response.json();
        this.logger.log(`✅ [BlogGoogleDrive] Upload completed! FileId: ${responseData.id}`);
        
        // Configurar permisos públicos
        try {
          const authClient = await this.auth.getClient();
          await this.drive.permissions.create({
            fileId: responseData.id,
            requestBody: {
              role: 'reader',
              type: 'anyone',
            },
            supportsAllDrives: true,
            supportsTeamDrives: true,
          });
          this.logger.log(`🔓 [BlogGoogleDrive] Public permissions set for ${responseData.id}`);
        } catch (permError) {
          this.logger.warn(`Could not set public permissions: ${permError.message}`);
        }

        return {
          success: true,
          progress: 100,
          fileId: responseData.id,
          completed: true
        };
      } else if (response.status === 308) {
        // Chunk uploaded, continue
        this.logger.log(`⏳ [BlogGoogleDrive] Chunk ${chunkIndex + 1}/${totalChunks} uploaded (${progress.toFixed(1)}%)`);
        return {
          success: true,
          progress: Math.round(progress),
          completed: false
        };
      } else {
        // Obtener más información del error para debugging
        let errorDetails = `${response.status} ${response.statusText}`;
        try {
          const errorText = await response.text();
          errorDetails += ` - Response: ${errorText}`;
        } catch (e) {
          // Si no puede leer la respuesta, continuar con el error básico
        }
        
        this.logger.error(`❌ [BlogGoogleDrive] Upload chunk failed: ${errorDetails}`);
        this.logger.error(`🔧 [BlogGoogleDrive] Request details - Content-Range: ${contentRange}, Content-Length: ${actualChunkSize}, Upload URL: ${uploadUrl}`);
        
        throw new Error(`Unexpected response status: ${errorDetails}`);
      }

    } catch (error) {
      this.logger.error(`Failed to upload chunk ${chunkIndex + 1}/${totalChunks}:`, error.message);
      throw new BadRequestException(`Error uploading chunk: ${error.message}`);
    }
  }

  async uploadBlogMedia(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    mediaType: 'image' | 'video' | 'audio' | 'document' | 'gallery',
    uploadedById: string
  ): Promise<{
    fileId: string;
    webViewLink: string;
    downloadLink: string;
    thumbnailLink?: string;
    folderId: string;
    folderPath: string[];
  }> {
    try {
      if (!this.drive || !this.sharedDriveId) {
        throw new Error(
          'Google Drive no está configurado correctamente. ' +
          'Verifique que las credenciales estén montadas como volumen en el contenedor Docker.'
        );
      }

      // Obtener año académico y mes actual
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

      // Obtener nombre del mes
      const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ];
      const monthName = monthNames[currentMonth];

      // Crear estructura de carpetas: Galería multimedia y blog/[año académico]/[mes]/
      const folderPath = [
        'Galería multimedia y blog',
        academicYear,
        monthName
      ];

      this.logger.log(`Creating blog media folder structure: ${folderPath.join('/')}`);
      const folderId = await this.createFolderPath(folderPath);

      // Limpiar nombre de archivo
      const sanitizedFileName = this.sanitizeFileName(fileName);
      
      // Añadir timestamp para evitar duplicados
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const finalFileName = `${timestamp}_${sanitizedFileName}`;

      // Subir archivo a Google Drive
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
        fields: 'id,webViewLink,thumbnailLink',
      });

      const fileId = response.data.id;
      const webViewLink = response.data.webViewLink;
      const thumbnailLink = response.data.thumbnailLink;
      // URL directa para reproducción de multimedia (especialmente videos)
      const downloadLink = `https://drive.google.com/uc?export=download&id=${fileId}`;
      const directViewLink = `https://drive.google.com/file/d/${fileId}/preview`;

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
        this.logger.log(`Set public permissions for blog media: ${finalFileName}`);
      } catch (permError) {
        this.logger.warn(`Could not set public permissions for ${finalFileName}: ${permError.message}`);
      }

      this.logger.log(`Blog media uploaded successfully: ${finalFileName} (${fileId})`);
      
      return {
        fileId,
        webViewLink,
        downloadLink,
        thumbnailLink,
        folderId,
        folderPath
      };

    } catch (error) {
      this.logger.error(`Failed to upload blog media ${fileName}:`, error.message);
      throw new BadRequestException(`Error al subir archivo multimedia: ${error.message}`);
    }
  }

  /**
   * Descarga el thumbnail de un fichero de Drive usando las credenciales del bot,
   * devolviéndolo como Buffer + content-type. Esto permite servirlo desde nuestro
   * backend (proxy) sin depender de los permisos públicos del fichero.
   *
   * Para vídeos, Drive auto-genera un fotograma poco después del upload.
   */
  async fetchThumbnailBytes(fileId: string): Promise<{ buffer: Buffer; contentType: string }> {
    if (!this.drive) {
      throw new Error('Google Drive no está configurado.');
    }

    // Obtener el thumbnailLink del fichero (URL autenticada de Google).
    const meta = await this.drive.files.get({
      fileId,
      supportsAllDrives: true,
      fields: 'id,thumbnailLink',
    });

    const thumbnailLink: string | undefined = meta.data.thumbnailLink;
    if (!thumbnailLink) {
      throw new Error('Drive aún no ha generado un thumbnail para este fichero');
    }

    // Drive devuelve URLs con `=s220` por defecto. Sustituir por uno más grande
    // (mantiene aspect ratio si solo das un eje).
    const upgradedUrl = thumbnailLink.replace(/=s\d+$/, '=s640');

    // Pedir bytes autenticados con el token del bot.
    const authClient = await this.auth.getClient();
    const accessToken = await authClient.getAccessToken();
    const token = accessToken?.token;
    if (!token) {
      throw new Error('No se pudo obtener token de Drive');
    }

    const res = await axios.get(upgradedUrl, {
      responseType: 'arraybuffer',
      headers: { Authorization: `Bearer ${token}` },
      timeout: 15000,
      validateStatus: (s) => s < 400,
    });

    const rawCt = res.headers['content-type'];
    const contentType = typeof rawCt === 'string' && rawCt.length > 0 ? rawCt : 'image/jpeg';

    return {
      buffer: Buffer.from(res.data),
      contentType,
    };
  }

  /**
   * Obtiene información de un archivo multimedia
   */
  async getBlogMediaInfo(fileId: string): Promise<any> {
    try {
      if (!this.drive) {
        throw new Error('Google Drive no está configurado.');
      }

      const response = await this.drive.files.get({
        fileId: fileId,
        supportsAllDrives: true,
        fields: 'id,name,mimeType,size,webViewLink,thumbnailLink,createdTime,modifiedTime,imageMediaMetadata,videoMediaMetadata',
      });

      return {
        ...response.data,
        downloadLink: `https://drive.google.com/file/d/${fileId}/view?usp=drivesdk`,
        humanSize: this.formatFileSize(response.data.size),
      };
    } catch (error) {
      this.logger.error(`Failed to get blog media info for ${fileId}:`, error.message);
      throw new BadRequestException(`Failed to get media info: ${error.message}`);
    }
  }

  /**
   * Lista archivos multimedia en una carpeta específica
   */
  async listBlogMediaByMonth(academicYear: string, month: string): Promise<any[]> {
    try {
      if (!this.drive || !this.sharedDriveId) {
        throw new Error('Google Drive no está configurado.');
      }

      // Buscar la carpeta específica
      const folderPath = ['Galería multimedia y blog', academicYear, month];
      const folderId = await this.findFolderByPath(folderPath);
      
      if (!folderId) {
        this.logger.log(`Folder not found: ${folderPath.join('/')}`);
        return [];
      }

      const response = await this.drive.files.list({
        q: `'${folderId}' in parents and trashed=false and mimeType != 'application/vnd.google-apps.folder'`,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        fields: 'files(id,name,mimeType,size,webViewLink,thumbnailLink,createdTime,modifiedTime,imageMediaMetadata,videoMediaMetadata)',
        orderBy: 'modifiedTime desc',
      });

      const files = response.data.files || [];

      return files.map(file => ({
        ...file,
        downloadLink: `https://drive.google.com/file/d/${file.id}/view?usp=drivesdk`,
        humanSize: this.formatFileSize(file.size),
        mediaType: this.getMediaTypeFromMimeType(file.mimeType),
      }));
    } catch (error) {
      this.logger.error(`Failed to list blog media for ${academicYear}/${month}:`, error.message);
      throw new BadRequestException(`Failed to list media: ${error.message}`);
    }
  }

  /**
   * Lista todos los meses disponibles para un año académico
   */
  async getAvailableMonths(academicYear: string): Promise<string[]> {
    try {
      if (!this.drive || !this.sharedDriveId) {
        return [];
      }

      // Buscar carpeta del año académico
      const yearFolderId = await this.findFolderByPath(['Galería multimedia y blog', academicYear]);
      if (!yearFolderId) {
        return [];
      }

      const response = await this.drive.files.list({
        q: `'${yearFolderId}' in parents and trashed=false and mimeType='application/vnd.google-apps.folder'`,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        fields: 'files(name)',
        orderBy: 'name',
      });

      return (response.data.files || []).map(folder => folder.name);
    } catch (error) {
      this.logger.error(`Failed to get available months for ${academicYear}:`, error.message);
      return [];
    }
  }

  /**
   * Lista todos los años académicos disponibles
   */
  async getAvailableAcademicYears(): Promise<string[]> {
    try {
      if (!this.drive || !this.sharedDriveId) {
        return [];
      }

      // Buscar carpeta principal
      const mainFolderId = await this.findFolderByPath(['Galería multimedia y blog']);
      if (!mainFolderId) {
        return [];
      }

      const response = await this.drive.files.list({
        q: `'${mainFolderId}' in parents and trashed=false and mimeType='application/vnd.google-apps.folder'`,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        fields: 'files(name)',
        orderBy: 'name desc',
      });

      return (response.data.files || []).map(folder => folder.name);
    } catch (error) {
      this.logger.error('Failed to get available academic years:', error.message);
      return [];
    }
  }

  /**
   * Elimina un archivo multimedia
   */
  async deleteBlogMedia(fileId: string): Promise<void> {
    try {
      if (!this.drive) {
        throw new Error('Google Drive no está configurado.');
      }

      await this.drive.files.delete({
        fileId: fileId,
        supportsAllDrives: true,
      });

      this.logger.log(`Blog media deleted successfully: ${fileId}`);
    } catch (error) {
      this.logger.error(`Failed to delete blog media ${fileId}:`, error.message);
      throw new BadRequestException(`Failed to delete media: ${error.message}`);
    }
  }

  // ====================================================================
  // MÉTODOS PRIVADOS AUXILIARES
  // ====================================================================

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
   * Busca una carpeta por ruta completa
   */
  private async findFolderByPath(folderPath: string[]): Promise<string | null> {
    let currentFolderId = this.sharedDriveId;
    
    for (const folderName of folderPath) {
      if (folderName && folderName.trim() !== '') {
        const folderId = await this.findFolderInParent(folderName, currentFolderId);
        if (!folderId) {
          return null;
        }
        currentFolderId = folderId;
      }
    }
    
    return currentFolderId;
  }

  /**
   * Busca una carpeta específica dentro de un padre
   */
  private async findFolderInParent(folderName: string, parentId: string): Promise<string | null> {
    try {
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

      return null;
    } catch (error) {
      this.logger.error(`Failed to find folder ${folderName} in parent ${parentId}:`, error.message);
      return null;
    }
  }

  /**
   * Encuentra o crea una carpeta (reutilizada del servicio original)
   */
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
        driveId: this.sharedDriveId,
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
        this.logger.log(`Public permissions set for blog folder: ${folderName} (${newFolderId})`);
      } catch (permissionError) {
        this.logger.warn(`Failed to set public permissions for folder ${folderName}: ${permissionError.message}`);
      }

      this.logger.log(`Created blog folder: ${folderName} (${newFolderId})`);
      return newFolderId;
    } catch (error) {
      this.logger.error(`Failed to find or create blog folder ${folderName}:`, error.message);
      throw error;
    }
  }

  /**
   * Sanitiza nombres de archivo para Google Drive
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
   * Formatea tamaño de archivo en formato legible
   */
  private formatFileSize(bytes: number): string {
    if (!bytes) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Determina el tipo de media desde el MIME type
   */
  private getMediaTypeFromMimeType(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'document';
  }

  /**
   * Verifica si el servicio está configurado correctamente
   */
  isConfigured(): boolean {
    return !!this.drive && !!this.sharedDriveId;
  }

  /**
   * Obtiene el estado de la conexión
   */
  getConnectionStatus(): { connected: boolean; sharedDriveId?: string; message: string } {
    if (this.isConfigured()) {
      return {
        connected: true,
        sharedDriveId: this.sharedDriveId,
        message: 'Connected to Google Drive shared drive for blog multimedia',
      };
    } else {
      return {
        connected: false,
        message: 'Google Drive not configured or connection failed for blog multimedia',
      };
    }
  }
}