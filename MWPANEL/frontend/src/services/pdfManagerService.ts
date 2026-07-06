import { apiClient } from './apiClient';

export interface PdfFileInfo {
  id: string;
  filename: string;
  filepath: string;
  size: number;
  formattedSize: string;
  createdAt: string;
  lastAccessed: string;
  accessCount: number;
  type: 'report' | 'certificate' | 'backup' | 'export' | 'temp';
  category: string;
  userId?: string;
  isTemporary: boolean;
  expiresAt?: string;
  metadata?: Record<string, any>;
}

export interface PdfStorageStats {
  totalFiles: number;
  totalSize: number;
  formattedTotalSize: string;
  tempFiles: number;
  tempSize: number;
  formattedTempSize: string;
  oldestFile: string;
  newestFile: string;
  averageSize: number;
  byType: Record<string, { count: number; size: number }>;
  diskUsage: {
    total: number;
    used: number;
    available: number;
    usagePercentage: number;
  };
}

export interface PdfCleanupOptions {
  maxAge?: number;
  maxSize?: number;
  keepRecentCount?: number;
  removeUnused?: boolean;
  removeDuplicates?: boolean;
  dryRun?: boolean;
  types?: string[];
}

export interface PdfCleanupResult {
  success: boolean;
  message: string;
  filesRemoved: number;
  spaceFreed: number;
  formattedSpaceFreed: string;
  errors: string[];
  details: {
    expiredFiles: number;
    tempFiles: number;
    unusedFiles: number;
    duplicateFiles: number;
  };
  duration: number;
}

export interface PdfListResponse {
  pdfs: PdfFileInfo[];
  total: number;
  stats: {
    totalSize: number;
    formattedTotalSize: string;
    byType: Record<string, number>;
  };
}

export interface PdfManagementSummary {
  storageStats: PdfStorageStats;
  recentActivity: {
    recentFiles: number;
    recentAccesses: number;
    cleanupsDue: number;
  };
  recommendations: string[];
  nextCleanup: string;
}

export interface PdfCategory {
  name: string;
  count: number;
  size: number;
  formattedSize: string;
}

export interface OptimizationResult {
  success: boolean;
  optimizations: string[];
  spaceSaved: number;
}

class PdfManagerService {
  async getStorageStats(): Promise<PdfStorageStats> {
    const response = await apiClient.get('/settings/pdf-manager/stats');
    return response.data;
  }

  async getPdfFiles(type?: string, category?: string, limit: number = 50): Promise<PdfListResponse> {
    const params: Record<string, any> = { limit };
    if (type) params.type = type;
    if (category) params.category = category;

    const response = await apiClient.get('/settings/pdf-manager/files', { params });
    return response.data;
  }

  async getPdfInfo(fileId: string): Promise<PdfFileInfo> {
    const response = await apiClient.get(`/settings/pdf-manager/files/${fileId}`);
    return response.data;
  }

  async deletePdf(fileId: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete(`/settings/pdf-manager/files/${fileId}`);
    return response.data;
  }

  async cleanupPdfs(options: PdfCleanupOptions): Promise<PdfCleanupResult> {
    const response = await apiClient.post('/settings/pdf-manager/cleanup', options);
    return response.data;
  }

  async optimizeStorage(): Promise<OptimizationResult> {
    const response = await apiClient.post('/settings/pdf-manager/optimize');
    return response.data;
  }

  async getManagementSummary(): Promise<PdfManagementSummary> {
    const response = await apiClient.get('/settings/pdf-manager/management-summary');
    return response.data;
  }

  async previewCleanup(maxAge: number = 7, types: string[] = ['temp']): Promise<PdfCleanupResult> {
    const response = await apiClient.get('/settings/pdf-manager/cleanup/preview', {
      params: {
        maxAge,
        types: types.join(',')
      }
    });
    return response.data;
  }

  async getCategories(): Promise<{ categories: PdfCategory[] }> {
    const response = await apiClient.get('/settings/pdf-manager/categories');
    return response.data;
  }

  // Helper methods for frontend usage

  validateCleanupOptions(options: Partial<PdfCleanupOptions>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (options.maxAge && (options.maxAge < 1 || options.maxAge > 365)) {
      errors.push('La edad máxima debe estar entre 1 y 365 días');
    }

    if (options.maxSize && options.maxSize < 1024 * 1024) { // 1MB minimum
      errors.push('El tamaño máximo debe ser al menos 1MB');
    }

    if (options.keepRecentCount && options.keepRecentCount < 1) {
      errors.push('Debe mantener al menos 1 archivo reciente');
    }

    if (options.types && options.types.length === 0) {
      errors.push('Debe seleccionar al menos un tipo de archivo');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  formatCleanupOptions(options: Partial<PdfCleanupOptions>): PdfCleanupOptions {
    return {
      maxAge: options.maxAge || 7,
      maxSize: options.maxSize || 500 * 1024 * 1024, // 500MB default
      keepRecentCount: options.keepRecentCount || 100,
      removeUnused: options.removeUnused ?? true,
      removeDuplicates: options.removeDuplicates ?? true,
      dryRun: options.dryRun ?? false,
      types: options.types || ['temp']
    };
  }

  // Analysis and interpretation methods

  analyzeStorageHealth(stats: PdfStorageStats): {
    level: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let level: 'healthy' | 'warning' | 'critical' = 'healthy';

    // Disk usage analysis
    if (stats.diskUsage.usagePercentage > 95) {
      level = 'critical';
      issues.push('Uso de disco crítico (>95%)');
      recommendations.push('Ejecutar limpieza inmediata y liberar espacio');
    } else if (stats.diskUsage.usagePercentage > 85) {
      level = 'warning';
      issues.push('Uso de disco alto (>85%)');
      recommendations.push('Programar limpieza automática');
    }

    // Temporary files analysis
    const tempFileRatio = stats.tempFiles / Math.max(stats.totalFiles, 1);
    if (tempFileRatio > 0.5) {
      if (level === 'healthy') level = 'warning';
      issues.push('Demasiados archivos temporales (>50%)');
      recommendations.push('Ejecutar limpieza de archivos temporales');
    }

    // Large temporary files
    const tempSizeRatio = stats.tempSize / Math.max(stats.totalSize, 1);
    if (tempSizeRatio > 0.3) {
      if (level === 'healthy') level = 'warning';
      issues.push('Archivos temporales ocupan mucho espacio (>30%)');
      recommendations.push('Revisar archivos temporales grandes');
    }

    // Total files count
    if (stats.totalFiles > 5000) {
      if (level === 'healthy') level = 'warning';
      issues.push('Muchos archivos en el sistema');
      recommendations.push('Considerar archivado automático');
    }

    if (issues.length === 0) {
      recommendations.push('Sistema de archivos PDF en buen estado');
    }

    return { level, issues, recommendations };
  }

  calculateCleanupPotential(stats: PdfStorageStats): {
    potentialFiles: number;
    potentialSpace: number;
    formattedPotentialSpace: string;
    categories: Array<{
      type: string;
      files: number;
      space: number;
      percentage: number;
    }>;
  } {
    // Estimate cleanup potential based on temporary files and file distribution
    const tempFilesData = stats.byType.temp || { count: 0, size: 0 };
    
    // Assume 70% of temp files can be cleaned
    const potentialFiles = Math.floor(tempFilesData.count * 0.7);
    const potentialSpace = Math.floor(tempFilesData.size * 0.7);

    const categories = Object.entries(stats.byType).map(([type, data]) => {
      let cleanupPercentage = 0;
      
      switch (type) {
        case 'temp':
          cleanupPercentage = 70;
          break;
        case 'export':
          cleanupPercentage = 50;
          break;
        case 'report':
          cleanupPercentage = 20;
          break;
        default:
          cleanupPercentage = 10;
      }

      return {
        type,
        files: Math.floor(data.count * (cleanupPercentage / 100)),
        space: Math.floor(data.size * (cleanupPercentage / 100)),
        percentage: cleanupPercentage
      };
    });

    return {
      potentialFiles,
      potentialSpace,
      formattedPotentialSpace: this.formatBytes(potentialSpace),
      categories
    };
  }

  getRecommendedCleanupStrategy(stats: PdfStorageStats): {
    strategy: 'conservative' | 'moderate' | 'aggressive';
    options: PdfCleanupOptions;
    description: string;
  } {
    const health = this.analyzeStorageHealth(stats);
    
    if (health.level === 'critical') {
      return {
        strategy: 'aggressive',
        options: {
          maxAge: 3,
          removeUnused: true,
          removeDuplicates: true,
          types: ['temp', 'export']
        },
        description: 'Limpieza agresiva recomendada debido al uso crítico de disco'
      };
    } else if (health.level === 'warning') {
      return {
        strategy: 'moderate',
        options: {
          maxAge: 7,
          removeUnused: true,
          removeDuplicates: true,
          types: ['temp']
        },
        description: 'Limpieza moderada para mantener el sistema saludable'
      };
    } else {
      return {
        strategy: 'conservative',
        options: {
          maxAge: 14,
          removeUnused: false,
          removeDuplicates: true,
          types: ['temp']
        },
        description: 'Limpieza conservadora de mantenimiento rutinario'
      };
    }
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    if (seconds < 60) {
      return `${seconds} segundos`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return remainingSeconds > 0 
        ? `${minutes} min ${remainingSeconds} seg`
        : `${minutes} minutos`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return minutes > 0 
        ? `${hours}h ${minutes}m`
        : `${hours} horas`;
    }
  }

  getFileTypeColor(type: string): string {
    const colors: Record<string, string> = {
      temp: '#fa8c16',
      report: '#1890ff',
      certificate: '#52c41a',
      export: '#722ed1',
      backup: '#13c2c2'
    };
    return colors[type] || '#d9d9d9';
  }

  getFileTypeDisplayName(type: string): string {
    const names: Record<string, string> = {
      temp: 'Temporal',
      report: 'Reporte',
      certificate: 'Certificado',
      export: 'Exportación',
      backup: 'Backup'
    };
    return names[type] || type;
  }

  getCategoryDisplayName(category: string): string {
    const names: Record<string, string> = {
      student: 'Estudiantes',
      teacher: 'Profesores',
      family: 'Familias',
      grades: 'Calificaciones',
      attendance: 'Asistencia',
      reports: 'Reportes',
      certificates: 'Certificados',
      backup: 'Backups',
      general: 'General'
    };
    return names[category] || category;
  }

  // Utility methods for file management

  groupFilesByDate(files: PdfFileInfo[]): Record<string, PdfFileInfo[]> {
    return files.reduce((groups, file) => {
      const date = new Date(file.createdAt).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(file);
      return groups;
    }, {} as Record<string, PdfFileInfo[]>);
  }

  sortFilesBySize(files: PdfFileInfo[], descending: boolean = true): PdfFileInfo[] {
    return [...files].sort((a, b) => 
      descending ? b.size - a.size : a.size - b.size
    );
  }

  filterFilesByAge(files: PdfFileInfo[], maxAgeInDays: number): PdfFileInfo[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAgeInDays);
    
    return files.filter(file => 
      new Date(file.createdAt) >= cutoffDate
    );
  }

  generateCleanupReport(result: PdfCleanupResult): string {
    const lines = [
      `Limpieza de Archivos PDF - ${new Date().toLocaleString()}`,
      `${'='.repeat(50)}`,
      ``,
      `Estado: ${result.success ? 'EXITOSO' : 'FALLIDO'}`,
      `Archivos eliminados: ${result.filesRemoved}`,
      `Espacio liberado: ${result.formattedSpaceFreed}`,
      `Duración: ${this.formatDuration(result.duration)}`,
      ``,
      `Detalles:`,
      `• Archivos expirados: ${result.details.expiredFiles}`,
      `• Archivos temporales: ${result.details.tempFiles}`,
      `• Archivos no utilizados: ${result.details.unusedFiles}`,
      `• Archivos duplicados: ${result.details.duplicateFiles}`,
    ];

    if (result.errors.length > 0) {
      lines.push(``, `Errores:`);
      result.errors.forEach(error => lines.push(`• ${error}`));
    }

    return lines.join('\n');
  }
}

export const pdfManagerService = new PdfManagerService();