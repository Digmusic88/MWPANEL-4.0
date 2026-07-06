import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import pptxgen from 'pptxgenjs';

// Interfaces para exportación
interface ExportOptions {
  format: 'pdf' | 'pptx';
  includeNotes?: boolean;
  pageSize?: 'A4' | 'Letter' | '16:9' | '4:3';
  quality?: 'low' | 'medium' | 'high';
  theme?: 'light' | 'dark';
}

interface Slide {
  id: string;
  title: string;
  content: string;
  backgroundColor: string;
  textColor: string;
  fontSize: number;
  fontFamily: string;
  alignment: 'left' | 'center' | 'right';
  backgroundImage?: string;
  notes: string;
}

interface PresentationData {
  slides: Slide[];
  metadata?: {
    title?: string;
    author?: string;
    totalSlides: number;
    createdAt: string;
    version: string;
  };
}

class PresentationExportService {
  
  /**
   * Exportar presentación a PDF
   */
  async exportToPDF(
    presentationData: PresentationData, 
    options: ExportOptions = { format: 'pdf', pageSize: 'A4', quality: 'medium' }
  ): Promise<void> {
    try {
      const { slides, metadata } = presentationData;
      
      // Configuración del PDF
      const pageFormat = this.getPageDimensions(options.pageSize || 'A4');
      const pdf = new jsPDF({
        orientation: pageFormat.width > pageFormat.height ? 'landscape' : 'portrait',
        unit: 'mm',
        format: [pageFormat.width, pageFormat.height]
      });

      // Agregar metadata
      if (metadata) {
        pdf.setProperties({
          title: metadata.title || 'Presentación MW Panel',
          author: metadata.author || 'MW Panel',
          creator: 'MW Panel - Sistema de Gestión Escolar',
          creationDate: new Date()
        });
      }

      let isFirstPage = true;

      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        
        if (!isFirstPage) {
          pdf.addPage();
        }
        isFirstPage = false;

        // Renderizar slide en el PDF
        await this.renderSlideInPDF(pdf, slide, i + 1, slides.length, pageFormat, options);
        
        // Agregar notas si están habilitadas
        if (options.includeNotes && slide.notes.trim()) {
          pdf.addPage();
          this.addNotesToPDF(pdf, slide, i + 1, pageFormat);
        }
      }

      // Generar y descargar PDF
      const fileName = metadata?.title 
        ? `${metadata.title.replace(/[^a-z0-9]/gi, '_')}.pdf`
        : `Presentacion_${new Date().toISOString().slice(0, 10)}.pdf`;
      
      pdf.save(fileName);
      
    } catch (error) {
      console.error('Error exportando a PDF:', error);
      throw new Error('Error al generar PDF: ' + (error as Error).message);
    }
  }

  /**
   * Exportar presentación a PPTX
   */
  async exportToPPTX(
    presentationData: PresentationData, 
    options: ExportOptions = { format: 'pptx', pageSize: '16:9' }
  ): Promise<void> {
    try {
      const { slides, metadata } = presentationData;
      
      // Crear nueva presentación
      const pres = new pptxgen();
      
      // Configurar metadata
      pres.author = metadata?.author || 'MW Panel';
      pres.company = 'MW Panel - Sistema de Gestión Escolar';
      pres.title = metadata?.title || 'Presentación MW Panel';
      
      // Configurar layout
      pres.defineLayout({ 
        name: 'MW_LAYOUT', 
        width: options.pageSize === '4:3' ? 10 : 13.33, 
        height: options.pageSize === '4:3' ? 7.5 : 7.5 
      });
      pres.layout = 'MW_LAYOUT';

      for (const slide of slides) {
        const pptxSlide = pres.addSlide();
        await this.renderSlideInPPTX(pptxSlide, slide, options);
      }

      // Generar y descargar PPTX
      const fileName = metadata?.title 
        ? `${metadata.title.replace(/[^a-z0-9]/gi, '_')}.pptx`
        : `Presentacion_${new Date().toISOString().slice(0, 10)}.pptx`;
      
      await pres.writeFile({ fileName });
      
    } catch (error) {
      console.error('Error exportando a PPTX:', error);
      throw new Error('Error al generar PPTX: ' + (error as Error).message);
    }
  }

  /**
   * Capturar slide como imagen usando html2canvas
   */
  private async captureSlideAsImage(slideElement: HTMLElement, options: ExportOptions): Promise<string> {
    try {
      const quality = this.getCanvasQuality(options.quality || 'medium');
      
      const canvas = await html2canvas(slideElement, {
        backgroundColor: null,
        scale: quality.scale,
        useCORS: true,
        allowTaint: true,
        scrollX: 0,
        scrollY: 0,
        width: slideElement.offsetWidth,
        height: slideElement.offsetHeight
      });

      return canvas.toDataURL('image/png', quality.imageQuality);
    } catch (error) {
      console.error('Error capturando slide:', error);
      throw error;
    }
  }

  /**
   * Renderizar slide en PDF
   */
  private async renderSlideInPDF(
    pdf: jsPDF, 
    slide: Slide, 
    slideNumber: number, 
    totalSlides: number,
    pageFormat: { width: number; height: number },
    options: ExportOptions
  ): Promise<void> {
    const margin = 20;
    const contentWidth = pageFormat.width - (margin * 2);
    const contentHeight = pageFormat.height - (margin * 2);

    // Fondo de la slide
    if (slide.backgroundColor && slide.backgroundColor !== '#ffffff') {
      pdf.setFillColor(slide.backgroundColor);
      pdf.rect(0, 0, pageFormat.width, pageFormat.height, 'F');
    }

    // Título
    if (slide.title) {
      pdf.setFontSize(24);
      pdf.setTextColor(slide.textColor);
      
      const titleLines = pdf.splitTextToSize(slide.title, contentWidth);
      pdf.text(titleLines, margin, margin + 15);
    }

    // Contenido
    if (slide.content) {
      // Limpiar HTML para texto plano
      const cleanContent = this.stripHTML(slide.content);
      
      pdf.setFontSize(slide.fontSize || 16);
      pdf.setTextColor(slide.textColor);
      
      const contentLines = pdf.splitTextToSize(cleanContent, contentWidth);
      const startY = slide.title ? margin + 35 : margin + 15;
      
      pdf.text(contentLines, margin, startY);
    }

    // Número de slide
    pdf.setFontSize(10);
    pdf.setTextColor('#666666');
    pdf.text(
      `${slideNumber} / ${totalSlides}`, 
      pageFormat.width - 30, 
      pageFormat.height - 10
    );
  }

  /**
   * Renderizar slide en PPTX
   */
  private async renderSlideInPPTX(pptxSlide: any, slide: Slide, options: ExportOptions): Promise<void> {
    // Fondo de la slide
    if (slide.backgroundColor) {
      pptxSlide.background = { color: slide.backgroundColor };
    }

    // Título
    if (slide.title) {
      pptxSlide.addText(slide.title, {
        x: 0.5,
        y: 0.5,
        w: '90%',
        h: 1.5,
        fontSize: Math.max(24, (slide.fontSize || 24) + 8),
        color: slide.textColor,
        align: slide.alignment,
        bold: true,
        fontFace: this.convertFontFamily(slide.fontFamily)
      });
    }

    // Contenido
    if (slide.content) {
      const cleanContent = this.stripHTML(slide.content);
      
      pptxSlide.addText(cleanContent, {
        x: 0.5,
        y: slide.title ? 2.5 : 1,
        w: '90%',
        h: slide.title ? 4.5 : 6,
        fontSize: slide.fontSize || 16,
        color: slide.textColor,
        align: slide.alignment,
        fontFace: this.convertFontFamily(slide.fontFamily),
        valign: 'top'
      });
    }

    // Notas del presentador
    if (slide.notes) {
      pptxSlide.addNotes(slide.notes);
    }
  }

  /**
   * Agregar notas a PDF
   */
  private addNotesToPDF(
    pdf: jsPDF, 
    slide: Slide, 
    slideNumber: number, 
    pageFormat: { width: number; height: number }
  ): void {
    const margin = 20;
    const contentWidth = pageFormat.width - (margin * 2);

    // Título de la página de notas
    pdf.setFontSize(18);
    pdf.setTextColor('#333333');
    pdf.text(`Notas - Slide ${slideNumber}`, margin, margin + 10);

    // Título de la slide
    pdf.setFontSize(14);
    pdf.setTextColor('#666666');
    pdf.text(`"${slide.title}"`, margin, margin + 25);

    // Contenido de las notas
    pdf.setFontSize(12);
    pdf.setTextColor('#000000');
    const notesLines = pdf.splitTextToSize(slide.notes, contentWidth);
    pdf.text(notesLines, margin, margin + 40);
  }

  /**
   * Obtener dimensiones de página
   */
  private getPageDimensions(pageSize: string): { width: number; height: number } {
    switch (pageSize) {
      case 'A4':
        return { width: 297, height: 210 }; // A4 Landscape
      case 'Letter':
        return { width: 279, height: 216 }; // Letter Landscape  
      case '16:9':
        return { width: 297, height: 167 }; // 16:9 Aspect Ratio
      case '4:3':
        return { width: 297, height: 223 }; // 4:3 Aspect Ratio
      default:
        return { width: 297, height: 210 };
    }
  }

  /**
   * Obtener configuración de calidad de canvas
   */
  private getCanvasQuality(quality: string): { scale: number; imageQuality: number } {
    switch (quality) {
      case 'low':
        return { scale: 1, imageQuality: 0.5 };
      case 'medium':
        return { scale: 1.5, imageQuality: 0.8 };
      case 'high':
        return { scale: 2, imageQuality: 0.95 };
      default:
        return { scale: 1.5, imageQuality: 0.8 };
    }
  }

  /**
   * Limpiar HTML para texto plano
   */
  private stripHTML(html: string): string {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }

  /**
   * Convertir familia de fuente para PPTX
   */
  private convertFontFamily(fontFamily: string): string {
    if (fontFamily.includes('Arial')) return 'Arial';
    if (fontFamily.includes('Georgia')) return 'Georgia';
    if (fontFamily.includes('Times')) return 'Times New Roman';
    if (fontFamily.includes('Courier')) return 'Courier New';
    if (fontFamily.includes('Helvetica')) return 'Helvetica';
    return 'Arial'; // Default
  }

  /**
   * Mostrar progreso de exportación
   */
  showExportProgress(current: number, total: number, message: string): void {
    const percent = Math.round((current / total) * 100);
    console.log(`Exportando... ${percent}% - ${message}`);
    
    // Aquí podrías emitir eventos para actualizar UI
    const event = new CustomEvent('exportProgress', {
      detail: { current, total, percent, message }
    });
    window.dispatchEvent(event);
  }
}

// Crear instancia singleton
export const presentationExportService = new PresentationExportService();
export default presentationExportService;