/**
 * TaskAttachmentsApiService - Servicio real para gestión de archivos adjuntos de tareas
 * Conecta con el backend MW Panel API para funcionalidad completa
 */

import axios, { AxiosResponse } from 'axios';

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://plataforma.mundoworld.school/api'
  : 'http://localhost:3000/api';

interface ApiResponse<T> {
  data: T;
  message?: string;
  status: number;
}

interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  subject: string;
  classGroup: string;
  status: 'draft' | 'published' | 'completed';
  totalStudents: number;
  submittedCount: number;
  requiresFile?: boolean;
  allowedFileTypes?: string[];
  maxFileSizeMB?: number;
  subjectAssignment?: {
    id: string;
    subject: {
      name: string;
    };
    classGroup: {
      name: string;
    };
  };
}

interface TaskAttachment {
  id: string;
  taskId: string;
  originalFileName: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  uploadedAt: string;
  isStudentSubmission: boolean;
  metadata?: {
    description?: string;
    tags?: string[];
  };
}

interface BackendTaskAttachment {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: string;
  path: string;
  type: string;
  description: string;
  downloadCount: number;
  isActive: boolean;
  uploadedAt: string;
  taskId: string;
}

interface SubmissionAttachment {
  id: string;
  submissionId: string;
  originalFileName: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
}

interface TaskSubmission {
  id: string;
  taskId: string;
  studentId: string;
  content: string;
  submittedAt: string;
  grade?: number;
  feedback?: string;
  attachments?: SubmissionAttachment[];
  student?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

class TaskAttachmentsApiService {
  /**
   * Get auth data from Zustand store (same as useAuthStore)
   */
  private getAuthData() {
    try {
      const storedData = localStorage.getItem('mw-panel-auth');
      if (!storedData) return null;
      
      const authData = JSON.parse(storedData);
      return authData.state || authData; // Handle different persistence formats
    } catch (error) {
      console.error('Error parsing auth data:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const authData = this.getAuthData();
    const token = authData?.accessToken;
    const isAuth = authData?.isAuthenticated;
    
    // Log for debugging
    console.log('🔑 Auth Check:', {
      hasAuthData: !!authData,
      hasToken: !!token,
      tokenPreview: token ? `${token.substring(0, 20)}...` : null,
      isAuthenticated: isAuth,
    });
    
    return !!(token && isAuth);
  }

  /**
   * Get current token info for debugging
   */
  getTokenInfo(): { hasToken: boolean; tokenPreview?: string; isAuthenticated?: boolean; user?: any } {
    const authData = this.getAuthData();
    const token = authData?.accessToken;
    
    return {
      hasToken: !!token,
      tokenPreview: token ? `${token.substring(0, 20)}...` : undefined,
      isAuthenticated: authData?.isAuthenticated,
      user: authData?.user ? { id: authData.user.id, email: authData.user.email, role: authData.user.role } : null,
    };
  }

  private getAuthHeaders() {
    const authData = this.getAuthData();
    const token = authData?.accessToken;
    
    if (!token) {
      throw new Error('No hay token de autenticación. Por favor, inicia sesión nuevamente.');
    }
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  private getAuthHeadersForUpload() {
    const authData = this.getAuthData();
    const token = authData?.accessToken;
    
    if (!token) {
      throw new Error('No hay token de autenticación. Por favor, inicia sesión nuevamente.');
    }
    return {
      'Authorization': `Bearer ${token}`,
      // Note: Don't set Content-Type for FormData uploads
    };
  }

  // ==================== TASK MANAGEMENT ====================

  /**
   * Obtener todas las tareas del profesor logueado
   */
  async getMyTasks(): Promise<Task[]> {
    try {
      const response: AxiosResponse<any> = await axios.get(
        `${API_BASE_URL}/tasks/teacher/my-tasks`,
        { headers: this.getAuthHeaders() }
      );
      
      console.log('🔍 Raw API Response:', response.data);
      
      // Transform the response to match our frontend interface
      // The API returns { tasks: [...], total: number }
      const tasks = response.data.tasks || response.data.data || response.data;
      
      console.log('🔍 Tasks extracted:', tasks?.length || 0);
      
      if (!Array.isArray(tasks)) {
        console.warn('⚠️ Tasks is not an array:', tasks);
        return [];
      }
      
      const transformedTasks = tasks.map(this.transformTaskData);
      console.log('🔍 Transformed tasks:', transformedTasks.length);
      
      return transformedTasks;
    } catch (error) {
      console.error('Error fetching my tasks:', error);
      throw new Error('No se pudieron cargar las tareas');
    }
  }

  /**
   * Obtener una tarea específica por ID con sus entregas
   */
  async getTaskById(taskId: string): Promise<Task> {
    try {
      console.log('🔍 getTaskById: Requesting taskId:', taskId);
      
      const response: AxiosResponse<any> = await axios.get(
        `${API_BASE_URL}/tasks/${taskId}`,
        { headers: this.getAuthHeaders() }
      );
      
      console.log('✅ getTaskById: Response received:', response.data);
      
      return this.transformTaskData(response.data);
    } catch (error) {
      console.error('❌ Error fetching task by ID:', error);
      throw new Error('No se pudo cargar la tarea');
    }
  }

  /**
   * Transform backend task data to frontend format
   */
  private transformTaskData(backendTask: any): Task {
    console.log('🔄 Transforming task:', { id: backendTask.id, title: backendTask.title });
    
    // Calculate submitted count from submissions array
    const submittedCount = backendTask.submissions ? 
      backendTask.submissions.filter((sub: any) => sub.status === 'submitted' || sub.status === 'graded').length : 0;
    
    // Calculate total students from submissions array (all submissions for the task)
    const totalStudents = backendTask.submissions ? backendTask.submissions.length : 0;
    
    const transformed = {
      id: backendTask.id,
      title: backendTask.title,
      description: backendTask.description || backendTask.instructions || '',
      dueDate: backendTask.dueDate,
      subject: backendTask.subjectAssignment?.subject?.name || backendTask.subject || 'Sin asignatura',
      classGroup: backendTask.subjectAssignment?.classGroup?.name || backendTask.classGroup || 'Sin grupo',
      status: backendTask.status || 'draft',
      totalStudents: totalStudents,
      submittedCount: submittedCount,
      requiresFile: backendTask.requiresFile || false,
      allowedFileTypes: backendTask.allowedFileTypes ? 
        (typeof backendTask.allowedFileTypes === 'string' ? 
          (() => {
            try { return JSON.parse(backendTask.allowedFileTypes); } 
            catch { return []; }
          })() : 
          backendTask.allowedFileTypes
        ) : [],
      maxFileSizeMB: backendTask.maxFileSize ? backendTask.maxFileSize / (1024 * 1024) : 10,
      subjectAssignment: backendTask.subjectAssignment,
    };
    
    console.log('✅ Transformed task result:', transformed);
    return transformed;
  }

  // ==================== TASK ATTACHMENTS ====================

  /**
   * Obtener todos los archivos adjuntos de una tarea (material del profesor + entregas de estudiantes)
   */
  async getTaskAttachments(taskId: string): Promise<TaskAttachment[]> {
    try {
      console.log('🔍 getTaskAttachments: Requesting taskId:', taskId);
      
      // Get the task with all its data including submissions
      const task = await this.getTaskById(taskId);
      console.log('✅ getTaskAttachments: Task data received:', task);
      
      let allAttachments: TaskAttachment[] = [];
      
      // 1. Get task attachments (material del profesor)
      try {
        const taskAttachmentsResponse: AxiosResponse<BackendTaskAttachment[]> = await axios.get(
          `${API_BASE_URL}/tasks/${taskId}/attachments`,
          { headers: this.getAuthHeaders() }
        );
        
        const taskAttachments = taskAttachmentsResponse.data || [];
        const transformedTaskAttachments = taskAttachments.map(this.transformAttachment);
        allAttachments.push(...transformedTaskAttachments);
        
        console.log('✅ Task attachments:', transformedTaskAttachments.length);
      } catch (error) {
        console.warn('⚠️ Could not fetch task attachments:', error.response?.status);
      }
      
      // 2. Get submission attachments (entregas de estudiantes)
      try {
        // Get task details that should include submissions
        const taskResponse: AxiosResponse<any> = await axios.get(
          `${API_BASE_URL}/tasks/${taskId}`,
          { headers: this.getAuthHeaders() }
        );
        
        const taskData = taskResponse.data;
        console.log('🔍 FULL TASK DATA:', {
          taskId: taskData.id,
          title: taskData.title,
          submissionsCount: taskData.submissions?.length || 0,
          fullTaskData: taskData
        });
        
        if (taskData.submissions && Array.isArray(taskData.submissions)) {
          console.log('✅ Found submissions:', taskData.submissions.length);
          
          // Debug each submission in detail
          taskData.submissions.forEach((submission, index) => {
            console.log(`🔍 SUBMISSION ${index + 1}:`, {
              id: submission.id,
              studentId: submission.studentId,
              student: submission.student,
              studentUser: submission.student?.user,
              studentProfile: submission.student?.user?.profile,
              attachmentsCount: submission.attachments?.length || 0
            });
          });
          
          for (const submission of taskData.submissions) {
            if (submission.attachments && Array.isArray(submission.attachments)) {
              // ENHANCED DEBUG: Check all possible student data sources
              let studentName = '';
              let studentData = null;
              
              console.log('🔍 STUDENT NAME EXTRACTION - Raw submission.student:', submission.student);
              
              // Try different ways to get student name
              if (submission.student) {
                studentData = submission.student;
                
                // Method 1: Direct firstName/lastName
                if (submission.student.firstName || submission.student.lastName) {
                  studentName = `${submission.student.firstName || ''} ${submission.student.lastName || ''}`.trim();
                  console.log('✅ Method 1 - Direct fields:', { firstName: submission.student.firstName, lastName: submission.student.lastName, result: studentName });
                }
                
                // Method 2: User profile
                if (!studentName && submission.student.user?.profile) {
                  const profile = submission.student.user.profile;
                  studentName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
                  console.log('✅ Method 2 - User profile:', { firstName: profile.firstName, lastName: profile.lastName, result: studentName });
                }
                
                // Method 3: User direct fields
                if (!studentName && submission.student.user) {
                  const user = submission.student.user;
                  studentName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
                  console.log('✅ Method 3 - User direct:', { firstName: user.firstName, lastName: user.lastName, result: studentName });
                }
              }
              
              console.log('📋 FINAL STUDENT NAME RESULT:', {
                submissionId: submission.id,
                finalStudentName: studentName || 'Estudiante (fallback)',
                attachmentCount: submission.attachments.length,
                studentDataKeys: studentData ? Object.keys(studentData) : 'none'
              });
              
              const submissionAttachments = submission.attachments.map(att => {
                console.log('🔍 RAW ATTACHMENT DATA:', att);
                
                // Extract filename following educational resources pattern
                // Use originalName as primary source (like educational resources use driveFileName)
                const displayFileName = att.originalName || att.filename || `archivo_${att.id}`;
                
                // Convert size to number like educational resources formatFileSize expects
                let fileSize = 0;
                if (typeof att.size === 'string') {
                  fileSize = parseInt(att.size) || 0;
                } else if (typeof att.size === 'number') {
                  fileSize = att.size;
                }
                
                console.log('📊 PROCESSED FILE DATA:', {
                  originalName: att.originalName,
                  filename: att.filename,
                  displayFileName,
                  rawSize: att.size,
                  processedSize: fileSize
                });
                
                return {
                id: att.id,
                taskId: taskId,
                originalFileName: displayFileName, // Use as display name
                fileName: att.filename || displayFileName, // Server filename
                filePath: att.path || att.filePath || '',
                fileSize: fileSize,
                mimeType: att.mimeType,
                uploadedBy: studentName || 'Estudiante',
                studentInfo: studentData, // Add full student info for downloads
                uploadedAt: att.uploadedAt,
                isStudentSubmission: true,
                metadata: {
                  description: `Entrega de ${studentName || 'estudiante'}`,
                  type: 'submission',
                  submissionId: submission.id
                }
              };
              });
              
              allAttachments.push(...submissionAttachments);
              console.log('✅ Added submission attachments:', submissionAttachments.length);
            }
          }
        }
      } catch (error) {
        console.warn('⚠️ Could not fetch submission attachments:', error.response?.status);
      }
      
      console.log('✅ getTaskAttachments: Total attachments:', allAttachments.length);
      return allAttachments;
      
    } catch (error) {
      console.error('❌ Error fetching task attachments:', error);
      console.error('❌ Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        taskId
      });
      
      // Don't return empty array on auth errors, let component handle it
      if (error.response?.status === 401) {
        throw new Error('No autorizado. Por favor, inicia sesión nuevamente.');
      }
      
      throw new Error(`Error al cargar archivos adjuntos: ${error.message}`);
    }
  }

  /**
   * Transform backend attachment format to frontend format
   */
  private transformAttachment(backendAttachment: BackendTaskAttachment): TaskAttachment {
    console.log('🔄 TRANSFORMING ATTACHMENT:', {
      id: backendAttachment.id,
      originalName: backendAttachment.originalName,
      filename: backendAttachment.filename,
      size: backendAttachment.size,
      mimeType: backendAttachment.mimeType,
      backendType: backendAttachment.type,
      fullBackendData: backendAttachment
    });
    
    // Use originalName as display name following educational resources pattern
    const displayFileName = backendAttachment.originalName || backendAttachment.filename || `archivo_${backendAttachment.id}`;
    
    // Convert size to number like educational resources
    let fileSize = 0;
    if (typeof backendAttachment.size === 'string') {
      fileSize = parseInt(backendAttachment.size) || 0;
    } else if (typeof backendAttachment.size === 'number') {
      fileSize = backendAttachment.size;
    }
    
    const transformed = {
      id: backendAttachment.id,
      taskId: backendAttachment.taskId,
      originalFileName: displayFileName, // Use as display name
      fileName: backendAttachment.filename, // Server filename
      filePath: backendAttachment.path,
      fileSize: fileSize,
      mimeType: backendAttachment.mimeType,
      uploadedBy: 'Profesor', // Display name for teacher materials
      uploadedAt: backendAttachment.uploadedAt,
      isStudentSubmission: backendAttachment.type === 'submission',
      metadata: {
        description: backendAttachment.description,
        tags: [],
        type: backendAttachment.type, // Include the attachment type from backend
      },
    };
    
    console.log('✅ TRANSFORMED TO:', {
      id: transformed.id,
      originalFileName: transformed.originalFileName,
      fileSize: transformed.fileSize,
      metadataType: transformed.metadata.type,
      isStudentSubmission: transformed.isStudentSubmission
    });
    
    return transformed;
  }

  /**
   * Subir archivos adjuntos a una tarea (material del profesor)
   */
  async uploadTaskAttachments(taskId: string, files: File[], type: 'instruction' | 'resource' = 'instruction'): Promise<{ message: string; files: string[] }> {
    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files', file);
      });
      
      // Add the attachment type
      formData.append('type', type);

      console.log(`📤 Uploading ${files.length} files as type: ${type}`);
      console.log(`📤 FormData contents:`, Array.from(formData.entries()));

      const response = await axios.post(
        `${API_BASE_URL}/tasks/${taskId}/attachments`,
        formData,
        { headers: this.getAuthHeadersForUpload() }
      );

      console.log(`📤 Backend response:`, response.data);
      return response.data;
    } catch (error) {
      console.error('Error uploading task attachments:', error);
      throw new Error('Error al subir archivos');
    }
  }

  /**
   * Descargar archivo adjunto de tarea o submission con nombre descriptivo
   */
  async downloadTaskAttachment(attachmentId: string, attachment?: TaskAttachment, taskTitle?: string): Promise<void> {
    try {
      // Try task attachment download first
      let response;
      try {
        response = await axios.get(
          `${API_BASE_URL}/tasks/attachments/${attachmentId}/download`,
          {
            headers: this.getAuthHeaders(),
            responseType: 'blob',
          }
        );
      } catch (taskError) {
        // If task attachment fails, try submission attachment
        console.log('Trying submission attachment download...');
        response = await axios.get(
          `${API_BASE_URL}/tasks/submissions/attachments/${attachmentId}/download`,
          {
            headers: this.getAuthHeaders(),
            responseType: 'blob',
          }
        );
      }

      // Extract filename from Content-Disposition header
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'download';
      if (contentDisposition) {
        const matches = /filename="([^"]*)"/.exec(contentDisposition);
        if (matches && matches[1]) {
          filename = matches[1];
        }
      }

      // Create descriptive filename if attachment info is available
      if (attachment && attachment.isStudentSubmission && attachment.studentInfo) {
        const studentName = `${attachment.studentInfo.firstName || ''} ${attachment.studentInfo.lastName || ''}`.trim();
        const taskName = taskTitle || 'tarea';
        const originalExt = attachment.originalFileName.split('.').pop() || 'file';
        filename = `${studentName}_${taskName}_${attachment.originalFileName}`;
      } else if (attachment) {
        filename = attachment.originalFileName;
      }

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading attachment:', error);
      throw new Error('Error al descargar archivo');
    }
  }

  /**
   * Eliminar archivo adjunto de tarea o submission
   */
  async deleteTaskAttachment(attachmentId: string): Promise<void> {
    try {
      // Try to delete as task attachment first
      try {
        await axios.delete(
          `${API_BASE_URL}/tasks/attachments/${attachmentId}`,
          { headers: this.getAuthHeaders() }
        );
      } catch (taskError) {
        // If task attachment deletion fails, try submission attachment
        console.log('Trying submission attachment deletion...');
        await axios.delete(
          `${API_BASE_URL}/tasks/submissions/attachments/${attachmentId}`,
          { headers: this.getAuthHeaders() }
        );
      }
    } catch (error) {
      console.error('Error deleting attachment:', error);
      throw new Error('Error al eliminar archivo');
    }
  }

  /**
   * Descargar múltiples archivos como ZIP
   */
  async downloadMultipleAttachments(attachmentIds: string[], taskTitle: string = 'archivos', attachments?: TaskAttachment[]): Promise<void> {
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      
      console.log('Downloading multiple attachments:', attachmentIds);
      
      for (const attachmentId of attachmentIds) {
        try {
          // Try task attachment download first
          let response;
          try {
            response = await axios.get(
              `${API_BASE_URL}/tasks/attachments/${attachmentId}/download`,
              {
                headers: this.getAuthHeaders(),
                responseType: 'blob',
              }
            );
          } catch (taskError) {
            // If task attachment fails, try submission attachment
            response = await axios.get(
              `${API_BASE_URL}/tasks/submissions/attachments/${attachmentId}/download`,
              {
                headers: this.getAuthHeaders(),
                responseType: 'blob',
              }
            );
          }

          // Extract filename from Content-Disposition header
          const contentDisposition = response.headers['content-disposition'];
          let filename = `archivo_${attachmentId}`;
          if (contentDisposition) {
            const matches = /filename="([^"]*)"/.exec(contentDisposition);
            if (matches && matches[1]) {
              filename = matches[1];
            }
          }

          // Try to get attachment info from provided attachments array
          const attachmentInfo = attachments ? attachments.find(att => att.id === attachmentId) : null;
          
          if (attachmentInfo && attachmentInfo.isStudentSubmission && attachmentInfo.studentInfo) {
            const studentName = `${attachmentInfo.studentInfo.firstName || ''} ${attachmentInfo.studentInfo.lastName || ''}`.trim();
            const taskName = taskTitle || 'tarea';
            filename = `${studentName}_${taskName}_${attachmentInfo.originalFileName}`;
          } else if (attachmentInfo) {
            filename = attachmentInfo.originalFileName;
          }

          // Add file to ZIP
          zip.file(filename, response.data);
          console.log(`Added ${filename} to ZIP`);
        } catch (error) {
          console.error(`Error downloading attachment ${attachmentId}:`, error);
          // Continue with other files even if one fails
        }
      }

      // Generate ZIP and download
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${taskTitle.replace(/[^a-zA-Z0-9]/g, '_')}_archivos.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      console.log('ZIP download completed');
    } catch (error) {
      console.error('Error creating ZIP download:', error);
      throw new Error('Error al descargar archivos como ZIP');
    }
  }

  /**
   * Crear carpeta para organizar archivos adjuntos
   */
  async createFolder(taskId: string, folderName: string): Promise<{ message: string; folderId: string }> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/tasks/${taskId}/folders`,
        { name: folderName },
        { headers: this.getAuthHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Error creating folder:', error);
      throw new Error('Error al crear carpeta');
    }
  }

  // ==================== TASK SUBMISSIONS ====================

  /**
   * Obtener entregas de estudiantes para una tarea
   */
  async getTaskSubmissions(taskId: string): Promise<TaskSubmission[]> {
    try {
      // This endpoint needs to be implemented in backend or we can get it via task details
      const task = await this.getTaskById(taskId);
      // For now, return empty array. Backend should provide submissions endpoint
      return [];
    } catch (error) {
      console.error('Error fetching task submissions:', error);
      return [];
    }
  }

  /**
   * Obtener detalles de una entrega específica
   */
  async getSubmission(submissionId: string): Promise<TaskSubmission> {
    try {
      const response: AxiosResponse<TaskSubmission> = await axios.get(
        `${API_BASE_URL}/tasks/submissions/${submissionId}`,
        { headers: this.getAuthHeaders() }
      );
      
      return response.data;
    } catch (error) {
      console.error('Error fetching submission:', error);
      throw new Error('No se pudo cargar la entrega');
    }
  }

  /**
   * Descargar archivo adjunto de entrega de estudiante
   */
  async downloadSubmissionAttachment(attachmentId: string): Promise<void> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/tasks/submissions/attachments/${attachmentId}/download`,
        {
          headers: this.getAuthHeaders(),
          responseType: 'blob',
        }
      );

      // Extract filename from Content-Disposition header
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'student-submission';
      if (contentDisposition) {
        const matches = /filename="([^"]*)"/.exec(contentDisposition);
        if (matches && matches[1]) {
          filename = matches[1];
        }
      }

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading submission attachment:', error);
      throw new Error('Error al descargar entrega');
    }
  }

  // ==================== STATISTICS ====================

  /**
   * Obtener estadísticas del profesor
   */
  async getTeacherStatistics(): Promise<any> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/tasks/teacher/statistics`,
        { headers: this.getAuthHeaders() }
      );
      
      return response.data;
    } catch (error) {
      console.error('Error fetching teacher statistics:', error);
      return {
        totalTasks: 0,
        pendingGrading: 0,
        overdueTasks: 0,
        averageGrade: 0,
      };
    }
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get file type icon based on mime type
   */
  getFileTypeIcon(mimeType: string): string {
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📊';
    if (mimeType.includes('image')) return '🖼️';
    if (mimeType.includes('video')) return '🎥';
    if (mimeType.includes('audio')) return '🎵';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return '📦';
    return '📄';
  }

  /**
   * Get file type name based on mime type
   */
  getFileType(mimeType: string): string {
    if (mimeType.includes('pdf')) return 'PDF';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'Word';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'Excel';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'PowerPoint';
    if (mimeType.startsWith('image/')) return 'Imagen';
    if (mimeType.startsWith('video/')) return 'Video';
    if (mimeType.startsWith('audio/')) return 'Audio';
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return 'Archivo';
    if (mimeType.includes('text/')) return 'Texto';
    if (mimeType.includes('javascript') || mimeType.includes('json') || mimeType.includes('css')) return 'Código';
    return 'Archivo';
  }
}

export const taskAttachmentsApiService = new TaskAttachmentsApiService();
export default taskAttachmentsApiService;