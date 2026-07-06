import { apiClient } from './apiClient';
import {
  StudentAutoReportOptions,
  StudentAutoReportResult,
  GenerateAutoReportBody,
} from '@/types/studentAutoReport';

class StudentAutoReportService {
  async getOptions(studentId: string): Promise<StudentAutoReportOptions> {
    const response = await apiClient.get('/student-reports/auto/options', { params: { studentId } });
    return response.data;
  }

  async generate(body: GenerateAutoReportBody): Promise<StudentAutoReportResult> {
    const response = await apiClient.post('/student-reports/auto/generate', body);
    return response.data;
  }

  async downloadPdf(body: GenerateAutoReportBody, studentName: string): Promise<void> {
    const response = await apiClient.post('/student-reports/auto/generate/pdf', body, { responseType: 'blob' });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Informe_${studentName.replace(/\s+/g, '_')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

export const studentAutoReportService = new StudentAutoReportService();
