/**
 * @service: DuaExportService
 * @description: Servicio para manejo de exportaciones del dashboard DUA
 * @features: Excel/PDF export, descarga de archivos, integración con API
 */

import { ExportParams } from '../components/dua/ExportModal';

class DuaExportService {
  private baseURL = '/api/dua';

  /**
   * Exportar dashboard DUA
   */
  async exportDashboard(params: ExportParams): Promise<void> {
    try {
      const queryParams = new URLSearchParams();
      
      // Agregar parámetros de consulta
      queryParams.append('format', params.format);
      
      if (params.startDate) {
        queryParams.append('startDate', params.startDate);
      }
      if (params.endDate) {
        queryParams.append('endDate', params.endDate);
      }
      
      queryParams.append('includeCharts', params.includeCharts.toString());
      queryParams.append('includeProfiles', params.includeProfiles.toString());
      queryParams.append('includeAccommodations', params.includeAccommodations.toString());

      // Obtener token de autenticación
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('Token de autenticación no encontrado');
      }

      // Realizar petición a la API
      const response = await fetch(`${this.baseURL}/export/dashboard?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al exportar los datos');
      }

      const exportData = await response.json();
      
      if (!exportData.success) {
        throw new Error(exportData.message || 'Error en la exportación');
      }

      // Procesar la exportación según el formato
      if (params.format === 'excel') {
        await this.downloadExcelFile(exportData.data);
      } else if (params.format === 'pdf') {
        await this.downloadPDFFile(exportData.data);
      }

    } catch (error) {
      console.error('Error en exportación DUA:', error);
      throw error;
    }
  }

  /**
   * Descargar archivo Excel
   */
  private async downloadExcelFile(data: any): Promise<void> {
    try {
      // Importar dinámicamente la librería para Excel
      const XLSX = await this.loadXLSXLibrary();
      
      // Crear workbook
      const workbook = XLSX.utils.book_new();

      // Agregar hojas de cálculo
      if (data.worksheets && Array.isArray(data.worksheets)) {
        data.worksheets.forEach((worksheet: any) => {
          const ws = XLSX.utils.json_to_sheet(worksheet.data);
          XLSX.utils.book_append_sheet(workbook, ws, worksheet.name);
        });
      } else {
        // Hoja principal con resumen
        const summaryData = this.prepareSummaryForExcel(data);
        const ws = XLSX.utils.json_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(workbook, ws, 'Resumen DUA');
      }

      // Generar archivo y descargar
      const fileName = `reporte-dua-${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);

    } catch (error) {
      console.error('Error al generar archivo Excel:', error);
      throw new Error('Error al generar el archivo Excel');
    }
  }

  /**
   * Descargar archivo PDF
   */
  private async downloadPDFFile(data: any): Promise<void> {
    try {
      // Importar dinámicamente la librería para PDF
      const jsPDF = await this.loadJsPDFLibrary();
      
      // Crear documento PDF
      const doc = new jsPDF();
      
      // Configurar fuente
      doc.setFont('helvetica');
      
      // Título del reporte
      doc.setFontSize(20);
      doc.text('Reporte Dashboard DUA', 20, 20);
      
      // Fecha de generación
      doc.setFontSize(12);
      doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')}`, 20, 35);
      
      let yPosition = 50;
      
      // Resumen ejecutivo
      if (data.summary) {
        doc.setFontSize(16);
        doc.text('Resumen Ejecutivo', 20, yPosition);
        yPosition += 15;
        
        doc.setFontSize(12);
        const summaryText = [
          `Perfiles Activos: ${data.summary.totalActiveProfiles}`,
          `Crecimiento: ${data.summary.profilesGrowth}%`,
          `Cobertura: ${data.summary.profileCoverage}%`,
          `Revisiones Pendientes: ${data.summary.pendingReviews}`,
        ];
        
        summaryText.forEach(text => {
          doc.text(text, 20, yPosition);
          yPosition += 10;
        });
        yPosition += 10;
      }
      
      // Información del período
      if (data.metadata) {
        doc.setFontSize(14);
        doc.text('Información del Período', 20, yPosition);
        yPosition += 15;
        
        doc.setFontSize(12);
        doc.text(`Desde: ${data.metadata.periodStart}`, 20, yPosition);
        yPosition += 10;
        doc.text(`Hasta: ${data.metadata.periodEnd}`, 20, yPosition);
        yPosition += 20;
      }
      
      // Nota sobre gráficos
      if (data.charts) {
        doc.setFontSize(12);
        doc.text('Nota: Los gráficos detallados están disponibles en el dashboard web.', 20, yPosition);
        yPosition += 15;
      }
      
      // Agregar tabla de perfiles si están incluidos
      if (data.profiles && data.profiles.data && data.profiles.data.length > 0) {
        doc.setFontSize(14);
        doc.text('Perfiles DUA', 20, yPosition);
        yPosition += 15;
        
        doc.setFontSize(10);
        data.profiles.data.slice(0, 10).forEach((profile: any, index: number) => {
          const profileText = `${index + 1}. ${profile.studentName} - ${new Date(profile.assessmentDate).toLocaleDateString('es-ES')}`;
          doc.text(profileText, 20, yPosition);
          yPosition += 8;
        });
        
        if (data.profiles.data.length > 10) {
          doc.text(`... y ${data.profiles.data.length - 10} perfiles más`, 20, yPosition);
          yPosition += 15;
        }
      }
      
      // Generar archivo y descargar
      const fileName = `reporte-dua-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

    } catch (error) {
      console.error('Error al generar archivo PDF:', error);
      throw new Error('Error al generar el archivo PDF');
    }
  }

  /**
   * Preparar datos de resumen para Excel
   */
  private prepareSummaryForExcel(data: any): any[] {
    const summary = [];
    
    // Metadatos
    summary.push({ Campo: 'Fecha de Exportación', Valor: new Date().toLocaleDateString('es-ES') });
    if (data.metadata) {
      summary.push({ Campo: 'Período Inicio', Valor: data.metadata.periodStart });
      summary.push({ Campo: 'Período Fin', Valor: data.metadata.periodEnd });
      summary.push({ Campo: 'Formato', Valor: data.metadata.format });
    }
    
    // Separador
    summary.push({ Campo: '', Valor: '' });
    summary.push({ Campo: 'MÉTRICAS PRINCIPALES', Valor: '' });
    
    // Resumen
    if (data.summary) {
      summary.push({ Campo: 'Perfiles Activos', Valor: data.summary.totalActiveProfiles });
      summary.push({ Campo: 'Crecimiento de Perfiles (%)', Valor: data.summary.profilesGrowth });
      summary.push({ Campo: 'Cobertura de Perfiles (%)', Valor: data.summary.profileCoverage });
      summary.push({ Campo: 'Revisiones Pendientes', Valor: data.summary.pendingReviews });
      summary.push({ Campo: 'Aprobaciones Pendientes', Valor: data.summary.pendingApprovals });
      summary.push({ Campo: 'Revisiones Próximas', Valor: data.summary.upcomingReviews });
    }
    
    return summary;
  }

  /**
   * Cargar librería XLSX dinámicamente
   */
  private async loadXLSXLibrary(): Promise<any> {
    try {
      // Intentar cargar desde CDN
      if (!(window as any).XLSX) {
        await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
      }
      return (window as any).XLSX;
    } catch (error) {
      throw new Error('No se pudo cargar la librería para generar archivos Excel');
    }
  }

  /**
   * Cargar librería jsPDF dinámicamente
   */
  private async loadJsPDFLibrary(): Promise<any> {
    try {
      // Intentar cargar desde CDN
      if (!(window as any).jsPDF) {
        await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
      }
      return (window as any).jsPDF.jsPDF;
    } catch (error) {
      throw new Error('No se pudo cargar la librería para generar archivos PDF');
    }
  }

  /**
   * Cargar script dinámicamente
   */
  private loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.head.appendChild(script);
    });
  }

  /**
   * Exportar perfil individual
   */
  async exportProfile(profileId: string): Promise<void> {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('Token de autenticación no encontrado');
      }

      const response = await fetch(`${this.baseURL}/export/profile/${profileId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al exportar el perfil');
      }

      const exportData = await response.json();
      
      if (!exportData.success) {
        throw new Error(exportData.message || 'Error en la exportación del perfil');
      }

      // Crear archivo JSON con los datos del perfil
      const dataStr = JSON.stringify(exportData.data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(dataBlob);
      link.download = `perfil-dua-${profileId}-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      URL.revokeObjectURL(link.href);

    } catch (error) {
      console.error('Error en exportación de perfil:', error);
      throw error;
    }
  }
}

export const duaExportService = new DuaExportService();