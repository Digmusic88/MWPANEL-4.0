import apiClient from './apiClient';

export interface AttachStudentNoteDto {
  studentNoteId: string;
  description?: string;
}

export interface AttachStudentNotesToSubmissionDto {
  submissionId: string;
  studentNotes: AttachStudentNoteDto[];
}

export interface AttachNotesResponse {
  message: string;
  attachedNotes: Array<{
    id: string;
    type: string;
    studentNote: {
      id: string;
      title: string;
      type: string;
    };
    description?: string;
    attachedAt: string;
  }>;
}

class TasksApiService {
  
  /**
   * Adjuntar apuntes del estudiante a una entrega de tarea
   */
  async attachStudentNotesToSubmission(
    submissionId: string,
    studentNotes: Array<{ noteId: string; description?: string }>
  ): Promise<AttachNotesResponse> {
    try {
      const requestData: AttachStudentNotesToSubmissionDto = {
        submissionId,
        studentNotes: studentNotes.map(note => ({
          studentNoteId: note.noteId,
          description: note.description,
        }))
      };

      const response = await apiClient.post(
        `/tasks/submissions/${submissionId}/attach-student-notes`,
        requestData
      );

      return response.data;
    } catch (error: any) {
      console.error('Error attaching student notes to submission:', error);
      throw new Error(
        error.response?.data?.message || 
        'Error al adjuntar los apuntes a la entrega'
      );
    }
  }

  /**
   * Obtener adjuntos de una entrega (archivos + apuntes)
   */
  async getSubmissionAttachments(submissionId: string) {
    try {
      const response = await apiClient.get(`/tasks/submissions/${submissionId}/attachments`);
      return response.data;
    } catch (error: any) {
      console.error('Error getting submission attachments:', error);
      throw new Error(
        error.response?.data?.message || 
        'Error al obtener los adjuntos de la entrega'
      );
    }
  }

  /**
   * Obtener detalles de una entrega de tarea
   */
  async getSubmissionDetails(submissionId: string) {
    try {
      const response = await apiClient.get(`/tasks/submissions/${submissionId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error getting submission details:', error);
      throw new Error(
        error.response?.data?.message || 
        'Error al obtener los detalles de la entrega'
      );
    }
  }

  /**
   * Entregar una tarea (método helper que puede incluir adjuntar apuntes)
   */
  async submitTask(taskId: string, data: {
    content?: string;
    submissionNotes?: string;
    attachStudentNotes?: Array<{ noteId: string; description?: string }>;
  }) {
    try {
      // 1. Primero enviar la entrega básica
      const submitResponse = await apiClient.post(`/tasks/${taskId}/submit`, {
        content: data.content,
        submissionNotes: data.submissionNotes,
      });

      const submission = submitResponse.data;

      // 2. Si hay apuntes para adjuntar, adjuntarlos después
      if (data.attachStudentNotes && data.attachStudentNotes.length > 0) {
        await this.attachStudentNotesToSubmission(
          submission.id,
          data.attachStudentNotes
        );
      }

      return submission;
    } catch (error: any) {
      console.error('Error submitting task with notes:', error);
      throw new Error(
        error.response?.data?.message || 
        'Error al enviar la tarea con apuntes adjuntos'
      );
    }
  }
}

const tasksApi = new TasksApiService();
export default tasksApi;