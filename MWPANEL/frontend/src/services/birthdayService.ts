/**
 * @archivo: birthdayService.ts
 * @módulo: Services - Birthday Detection System
 * @función: Servicio para detectar cumpleaños y gestionar notificaciones visuales
 * @creado_por: Sistema de Cumpleaños MW Panel 2.0
 * @fecha: 2025-07-13
 * @propósito: Complementar el sistema de emails automatizados con experiencia visual
 * 
 * IMPORTANTE:
 * - Este servicio NO toca el sistema de plantillas de email existente
 * - No modifica la estructura del sistema de notificaciones automáticas  
 * - Solo gestiona aspectos visuales: iconos en listados y banner superior
 * - El envío de emails se gestiona por el sistema de EmailAutomation existente
 */

import dayjs from 'dayjs';

/**
 * Interface para usuario con información de cumpleaños
 */
export interface UserWithBirthday {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  role?: 'admin' | 'teacher' | 'student' | 'family';
  email?: string;
}

/**
 * Interface para información de cumpleaños procesada
 */
export interface BirthdayInfo {
  userId: string;
  fullName: string;
  role?: string;
  isToday: boolean;
  age?: number;
  dayOfYear: number;
}

/**
 * Servicio para detectar y gestionar cumpleaños
 */
class BirthdayService {
  
  /**
   * Detecta si un usuario tiene cumpleaños hoy
   * @param user Usuario con información de fecha de nacimiento
   * @returns true si es el cumpleaños del usuario
   */
  isBirthdayToday(user: UserWithBirthday): boolean {
    if (!user.dateOfBirth) {
      return false;
    }

    try {
      const today = dayjs();
      let birthDate = dayjs(user.dateOfBirth);
      
      // Si la fecha no es válida, intentar diferentes formatos
      if (!birthDate.isValid()) {
        // Intentar formato DD-MM-YYYY
        birthDate = dayjs(user.dateOfBirth, 'DD-MM-YYYY');
        
        if (!birthDate.isValid()) {
          // Intentar formato DD/MM/YYYY
          birthDate = dayjs(user.dateOfBirth, 'DD/MM/YYYY');
        }
      }
      
      // Si aún no es válida, retornar false
      if (!birthDate.isValid()) {
        console.warn('Fecha de nacimiento inválida:', user.dateOfBirth);
        return false;
      }
      
      // Comparar día y mes (ignorar año)
      return today.month() === birthDate.month() && today.date() === birthDate.date();
    } catch (error) {
      console.error('Error procesando fecha de nacimiento:', error);
      return false;
    }
  }

  /**
   * Calcula la edad actual del usuario
   * @param dateOfBirth Fecha de nacimiento en formato string
   * @returns Edad actual o null si no se puede calcular
   */
  calculateAge(dateOfBirth: string): number | null {
    if (!dateOfBirth) {
      return null;
    }

    try {
      const today = dayjs();
      let birthDate = dayjs(dateOfBirth);
      
      // Si la fecha no es válida, intentar diferentes formatos
      if (!birthDate.isValid()) {
        // Intentar formato DD-MM-YYYY
        birthDate = dayjs(dateOfBirth, 'DD-MM-YYYY');
        
        if (!birthDate.isValid()) {
          // Intentar formato DD/MM/YYYY
          birthDate = dayjs(dateOfBirth, 'DD/MM/YYYY');
        }
      }
      
      if (!birthDate.isValid()) {
        console.warn('Fecha de nacimiento inválida para calcular edad:', dateOfBirth);
        return null;
      }

      return today.diff(birthDate, 'year');
    } catch (error) {
      console.error('Error calculando edad:', error);
      return null;
    }
  }

  /**
   * Procesa información de cumpleaños para un usuario
   * @param user Usuario a procesar
   * @returns Información de cumpleaños procesada
   */
  processBirthdayInfo(user: UserWithBirthday): BirthdayInfo {
    const fullName = `${user.firstName} ${user.lastName}`.trim();
    const isToday = this.isBirthdayToday(user);
    const age = user.dateOfBirth ? this.calculateAge(user.dateOfBirth) : undefined;
    
    // Calcular día del año para uso futuro (recordatorios, etc.)
    let dayOfYear = 0;
    if (user.dateOfBirth) {
      try {
        let birthDate = dayjs(user.dateOfBirth);
        
        // Si la fecha no es válida, intentar diferentes formatos
        if (!birthDate.isValid()) {
          birthDate = dayjs(user.dateOfBirth, 'DD-MM-YYYY');
          
          if (!birthDate.isValid()) {
            birthDate = dayjs(user.dateOfBirth, 'DD/MM/YYYY');
          }
        }
        
        if (birthDate.isValid()) {
          // Calcular día del año manualmente (más compatible)
          const startOfYear = dayjs(birthDate).startOf('year');
          dayOfYear = birthDate.diff(startOfYear, 'day') + 1;
        }
      } catch (error) {
        console.error('Error calculando día del año:', error);
        dayOfYear = 0;
      }
    }

    return {
      userId: user.id,
      fullName,
      role: user.role,
      isToday,
      age,
      dayOfYear,
    };
  }

  /**
   * Filtra usuarios que tienen cumpleaños hoy de una lista
   * @param users Lista de usuarios
   * @returns Lista de usuarios que cumplen años hoy
   */
  getTodaysBirthdays(users: UserWithBirthday[]): BirthdayInfo[] {
    return users
      .map(user => this.processBirthdayInfo(user))
      .filter(info => info.isToday);
  }

  /**
   * Genera mensaje de cumpleaños personalizado
   * @param userName Nombre del usuario
   * @param age Edad (opcional)
   * @returns Mensaje de felicitación
   */
  generateBirthdayMessage(userName: string, age?: number): string {
    const ageText = age ? ` ¡Cumples ${age} años!` : '';
    return `¡Muchas felicidades, ${userName}!${ageText} Desde Mundo World School te deseamos un día maravilloso. ¡Disfruta mucho de tu cumpleaños!`;
  }

  /**
   * Genera tooltip para icono de cumpleaños
   * @param userName Nombre del usuario
   * @returns Texto del tooltip
   */
  generateBirthdayTooltip(userName: string): string {
    return `¡Hoy es el cumpleaños de ${userName}!`;
  }

  /**
   * Gestiona el estado de "no mostrar más" del banner
   */
  private getBannerStorageKey(userId: string): string {
    const today = dayjs().format('YYYY-MM-DD');
    return `birthday-banner-dismissed-${userId}-${today}`;
  }

  /**
   * Verifica si el banner fue cerrado por el usuario hoy
   * @param userId ID del usuario
   * @returns true si el banner fue cerrado
   */
  isBannerDismissed(userId: string): boolean {
    const key = this.getBannerStorageKey(userId);
    return localStorage.getItem(key) === 'true';
  }

  /**
   * Marca el banner como cerrado para hoy
   * @param userId ID del usuario
   */
  dismissBanner(userId: string): void {
    const key = this.getBannerStorageKey(userId);
    localStorage.setItem(key, 'true');
  }

  /**
   * Limpia banderas antiguas de localStorage (más de 7 días)
   * Se ejecuta automáticamente para mantener limpio el storage
   */
  cleanupOldBannerFlags(): void {
    const prefix = 'birthday-banner-dismissed-';
    const sevenDaysAgo = dayjs().subtract(7, 'days');
    
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(prefix)) {
        // Extraer fecha del key
        const dateMatch = key.match(/-(\d{4}-\d{2}-\d{2})$/);
        if (dateMatch) {
          const flagDate = dayjs(dateMatch[1]);
          if (flagDate.isBefore(sevenDaysAgo)) {
            localStorage.removeItem(key);
          }
        }
      }
    });
  }

  /**
   * Inicializa el servicio (limpia flags antiguos)
   */
  initialize(): void {
    this.cleanupOldBannerFlags();
  }
}

// Instancia singleton del servicio
export const birthdayService = new BirthdayService();

// Inicializar automáticamente
birthdayService.initialize();

export default birthdayService;