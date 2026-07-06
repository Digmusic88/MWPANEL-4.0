/**
 * @archivo: dateUtils.ts
 * @módulo: Utils (Utilidades de Fecha y Hora)
 * @función: Formateo y conversión de fechas usando timezone de Madrid
 * @crítico: SÍ - Afecta todos los timestamps mostrados en la plataforma
 * @dependencias: apiClient para obtener configuración del sistema
 * @relacionado_con: TimezoneService, todas las páginas que muestran fechas
 */

import React from 'react';
import apiClient from '../services/apiClient';

interface TimezoneConfig {
  timezone: string;
  displayFormat: string;
  autoDST: boolean;
}

interface TimezoneInfo {
  timezone: string;
  displayName: string;
  abbreviation: string;
  offset: string;
  isDST: boolean;
  currentTime: string;
}

// Cache para la configuración de timezone
let cachedTimezoneConfig: TimezoneConfig | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Obtiene la configuración de timezone del sistema
 */
export async function getTimezoneConfig(): Promise<TimezoneConfig> {
  const now = Date.now();

  // Usar caché si está válido
  if (cachedTimezoneConfig && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedTimezoneConfig;
  }

  try {
    // Intentar obtener configuración del endpoint (requiere autenticación admin pero fallback funciona)
    const response = await apiClient.get('/settings/timezone/config');
    cachedTimezoneConfig = response.data.data;
    cacheTimestamp = now;
    return cachedTimezoneConfig;
  } catch (error) {
    console.warn('Error obteniendo configuración de timezone, usando defaults:', error);
    // Retornar configuración por defecto para Madrid Y ESTABLECER CACHE
    const defaultConfig = {
      timezone: 'Europe/Madrid',
      displayFormat: 'DD/MM/YYYY HH:mm',
      autoDST: true,
    };

    // CRÍTICO: Establecer el cache con la configuración por defecto
    cachedTimezoneConfig = defaultConfig;
    cacheTimestamp = now;

    return defaultConfig;
  }
}

/**
 * Obtiene información detallada de la timezone actual
 */
export async function getTimezoneInfo(): Promise<TimezoneInfo> {
  try {
    const response = await apiClient.get('/settings/timezone/info');
    return response.data.data;
  } catch (error) {
    console.warn('Error obteniendo información de timezone:', error);
    // Retornar información básica por defecto
    const now = new Date();
    return {
      timezone: 'Europe/Madrid',
      displayName: 'Madrid (España)',
      abbreviation: now.toLocaleString('es-ES', { timeZoneName: 'short' }).split(' ').pop() || 'CET',
      offset: '+01:00',
      isDST: isDaylightSavingTime(now),
      currentTime: formatDateToMadrid(now),
    };
  }
}

/**
 * Convierte una fecha usando la configuración de timezone del sistema
 * ACTUALIZADO: Ahora usa TimezoneService en lugar de hardcodear Madrid
 */
export function formatDateToMadrid(date: Date | string): string {
  // Si es string, asegurar que se interprete como UTC añadiendo 'Z' si no la tiene
  let dateObj: Date;
  if (typeof date === 'string') {
    // Si el string no termina en 'Z' y parece un timestamp de BD, añadir 'Z' para interpretarlo como UTC
    const dateString = date.includes('T') ? date : date.replace(' ', 'T');
    dateObj = new Date(dateString.endsWith('Z') ? dateString : dateString + 'Z');
  } else {
    dateObj = date;
  }

  // NO CORRECTIONS - let native timezone handling work
  // Intentar usar la configuración del sistema de forma síncrona si está en caché
  if (cachedTimezoneConfig) {
    const formatter = new Intl.DateTimeFormat('es-ES', {
      timeZone: cachedTimezoneConfig.timezone,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    return formatter.format(dateObj);
  }

  // Fallback a Madrid si no hay configuración cacheada
  const formatter = new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  return formatter.format(dateObj);
}

/**
 * FUNCIÓN ALTERNATIVA: Convertir usando offset manual para Madrid
 */
export function formatDateToMadridAlternative(date: Date | string): string {
  // Si es string, asegurar que se interprete como UTC añadiendo 'Z' si no la tiene
  let dateObj: Date;
  if (typeof date === 'string') {
    const dateString = date.includes('T') ? date : date.replace(' ', 'T');
    dateObj = new Date(dateString.endsWith('Z') ? dateString : dateString + 'Z');
  } else {
    dateObj = date;
  }

  // Madrid está en UTC+1 (invierno) o UTC+2 (verano)
  // Septiembre: horario de verano, UTC+2
  const madridOffset = 2; // Para septiembre (horario de verano)

  const madridTime = new Date(dateObj.getTime() + (madridOffset * 60 * 60 * 1000));

  const day = madridTime.getUTCDate().toString().padStart(2, '0');
  const month = (madridTime.getUTCMonth() + 1).toString().padStart(2, '0');
  const year = madridTime.getUTCFullYear();
  const hours = madridTime.getUTCHours().toString().padStart(2, '0');
  const minutes = madridTime.getUTCMinutes().toString().padStart(2, '0');

  return `${day}/${month}/${year}, ${hours}:${minutes}`;
}

/**
 * Convierte una fecha mostrando día, mes y hora (sin año)
 * Formato: "DD/MM a las HH:mm" - Ideal para listas de mensajes
 */
export function formatDateTimeShort(date: Date | string): string {
  // Si es string, asegurar que se interprete como UTC añadiendo 'Z' si no la tiene
  let dateObj: Date;
  if (typeof date === 'string') {
    const dateString = date.includes('T') ? date : date.replace(' ', 'T');
    dateObj = new Date(dateString.endsWith('Z') ? dateString : dateString + 'Z');
  } else {
    dateObj = date;
  }

  // Usar configuración cacheada si está disponible
  const timezone = cachedTimezoneConfig?.timezone || 'Europe/Madrid';

  const dayMonth = dateObj.toLocaleDateString('es-ES', {
    timeZone: timezone,
    day: '2-digit',
    month: '2-digit',
  });

  const time = dateObj.toLocaleTimeString('es-ES', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return `${dayMonth} ${time}`;
}

/**
 * Convierte una fecha usando la configuración de timezone del sistema (solo fecha)
 * ACTUALIZADO: Ahora usa TimezoneService en lugar de hardcodear Madrid
 */
export function formatDateOnlyToMadrid(date: Date | string): string {
  // Si es string, asegurar que se interprete como UTC añadiendo 'Z' si no la tiene
  let dateObj: Date;
  if (typeof date === 'string') {
    const dateString = date.includes('T') ? date : date.replace(' ', 'T');
    dateObj = new Date(dateString.endsWith('Z') ? dateString : dateString + 'Z');
  } else {
    dateObj = date;
  }

  // Usar configuración cacheada si está disponible
  const timezone = cachedTimezoneConfig?.timezone || 'Europe/Madrid';

  return dateObj.toLocaleDateString('es-ES', {
    timeZone: timezone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Convierte una fecha usando la configuración de timezone del sistema (solo hora)
 * ACTUALIZADO: Ahora usa TimezoneService en lugar de hardcodear Madrid
 */
export function formatTimeOnlyToMadrid(date: Date | string): string {
  // Si es string, asegurar que se interprete como UTC añadiendo 'Z' si no la tiene
  let dateObj: Date;
  if (typeof date === 'string') {
    const dateString = date.includes('T') ? date : date.replace(' ', 'T');
    dateObj = new Date(dateString.endsWith('Z') ? dateString : dateString + 'Z');
  } else {
    dateObj = date;
  }

  // Usar configuración cacheada si está disponible
  const timezone = cachedTimezoneConfig?.timezone || 'Europe/Madrid';

  return dateObj.toLocaleTimeString('es-ES', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Formato relativo (hace X tiempo) en español
 */
export function formatRelativeTime(date: Date | string): string {
  let dateObj: Date;
  if (typeof date === 'string') {
    // Asegurar que el string se interprete como UTC si no tiene 'Z'
    const dateString = date.includes('T') ? date : date.replace(' ', 'T');
    dateObj = new Date(dateString.endsWith('Z') ? dateString : dateString + 'Z');
  } else {
    dateObj = date;
  }

  // NO CORRECTIONS - use date as is
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) {
    return 'Ahora';
  } else if (diffMinutes < 60) {
    return `Hace ${diffMinutes} min`;
  } else if (diffHours < 24) {
    return `Hace ${diffHours}h`;
  } else if (diffDays < 7) {
    return `Hace ${diffDays}d`;
  } else {
    return formatDateOnlyToMadrid(dateObj);
  }
}

/**
 * Verifica si una fecha está en horario de verano (aproximación para España)
 */
export function isDaylightSavingTime(date?: Date): boolean {
  const now = date || new Date();
  const year = now.getFullYear();

  // Horario de verano en España: último domingo de marzo a último domingo de octubre
  const startDST = getLastSundayOfMonth(year, 2); // Marzo (índice 2)
  const endDST = getLastSundayOfMonth(year, 9);   // Octubre (índice 9)

  if (!startDST || !endDST) {
    return false;
  }

  return now >= startDST && now < endDST;
}

/**
 * Obtiene el último domingo de un mes
 */
function getLastSundayOfMonth(year: number, month: number): Date | null {
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const lastSunday = lastDayOfMonth.getDate() - lastDayOfMonth.getDay();

  if (lastSunday > 0) {
    return new Date(year, month, lastSunday, 2, 0, 0); // 2:00 AM
  }

  return null;
}

/**
 * Formatea una fecha usando la configuración del sistema
 */
export async function formatDateWithSystemConfig(date: Date | string): Promise<string> {
  try {
    const config = await getTimezoneConfig();
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    // Convertir el formato del sistema a opciones de Intl.DateTimeFormat
    const formatOptions = parseDisplayFormat(config.displayFormat);

    return dateObj.toLocaleString('es-ES', {
      timeZone: config.timezone,
      ...formatOptions,
    });
  } catch (error) {
    console.warn('Error formateando fecha con configuración del sistema:', error);
    return formatDateToMadrid(date);
  }
}

/**
 * Convierte el formato de display del sistema a opciones de Intl.DateTimeFormat
 */
function parseDisplayFormat(format: string): Intl.DateTimeFormatOptions {
  const options: Intl.DateTimeFormatOptions = {};

  if (format.includes('DD')) {
    options.day = '2-digit';
  }
  if (format.includes('MM')) {
    options.month = '2-digit';
  }
  if (format.includes('YYYY')) {
    options.year = 'numeric';
  }
  if (format.includes('HH')) {
    options.hour = '2-digit';
  }
  if (format.includes('mm')) {
    options.minute = '2-digit';
  }

  return options;
}

/**
 * Obtiene la hora actual del sistema en Madrid
 */
export async function getCurrentSystemTime(): Promise<{
  currentTime: string;
  timezone: string;
  formatted: string;
}> {
  try {
    const response = await apiClient.get('/settings/timezone/current-time');
    return response.data.data;
  } catch (error) {
    console.warn('Error obteniendo hora actual del sistema:', error);
    const now = new Date();
    return {
      currentTime: now.toISOString(),
      timezone: 'Europe/Madrid',
      formatted: formatDateToMadrid(now),
    };
  }
}

/**
 * Invalida el cache de configuración de timezone (útil después de cambios)
 */
export function invalidateTimezoneCache(): void {
  cachedTimezoneConfig = null;
  cacheTimestamp = 0;
  console.log('🕐 Cache de timezone invalidado en frontend');
}

/**
 * Fuerza la recarga de la configuración de timezone desde el servidor
 */
export async function reloadTimezoneConfig(): Promise<TimezoneConfig> {
  invalidateTimezoneCache();
  return await getTimezoneConfig();
}

/**
 * Inicializar configuración de timezone al cargar el módulo
 */
function initializeTimezoneConfig() {
  // Establecer configuración por defecto inmediatamente para evitar problemas de cache
  if (!cachedTimezoneConfig) {
    cachedTimezoneConfig = {
      timezone: 'Europe/Madrid',
      displayFormat: 'DD/MM/YYYY HH:mm',
      autoDST: true,
    };
    cacheTimestamp = Date.now();
    console.log('🕐 Timezone inicializado con configuración por defecto Madrid');
  }

  // Intentar cargar la configuración real del servidor en segundo plano
  getTimezoneConfig().catch(() => {
    console.log('🕐 No se pudo cargar configuración del servidor, usando Madrid por defecto');
  });
}

// Inicializar automáticamente al importar el módulo
initializeTimezoneConfig();

// Exportar función de invalidación a nivel global para componentes
declare global {
  interface Window {
    __invalidateTimezoneCache?: () => void;
    __reloadTimezoneConfig?: () => Promise<TimezoneConfig>;
  }
}

// Establecer funciones globales para uso desde componentes
if (typeof window !== 'undefined') {
  window.__invalidateTimezoneCache = invalidateTimezoneCache;
  window.__reloadTimezoneConfig = reloadTimezoneConfig;
}

/**
 * Hook para usar en componentes React con preload de configuración
 */
export function useMadridTime() {
  // Precargar la configuración de timezone al usar el hook
  React.useEffect(() => {
    getTimezoneConfig().catch(console.warn);
  }, []);

  const formatDate = (date: Date | string) => formatDateToMadrid(date);
  const formatDateOnly = (date: Date | string) => formatDateOnlyToMadrid(date);
  const formatTimeOnly = (date: Date | string) => formatTimeOnlyToMadrid(date);
  const formatRelative = (date: Date | string) => formatRelativeTime(date);

  return {
    formatDate,
    formatDateOnly,
    formatTimeOnly,
    formatRelative,
    getTimezoneConfig,
    getTimezoneInfo,
    getCurrentSystemTime,
  };
}

/**
 * ============================================================================
 * NUEVAS FUNCIONES PARA PARSEO LOCAL SIN CONVERSIÓN UTC
 * ============================================================================
 * Backend envía fechas como "2024-10-13T14:00:00.000" representando hora local
 * de Madrid. NO debemos añadir 'Z' ni interpretar como UTC.
 */

import dayjs, { Dayjs } from 'dayjs';

/**
 * Parse a date string from backend WITHOUT UTC conversion
 * Backend sends dates like "2024-10-13T14:00:00.000" which represent LOCAL Madrid time
 * We parse the components manually to avoid UTC interpretation
 *
 * @param dateString - ISO-like date string from backend
 * @returns Dayjs object representing local Madrid time
 */
export function parseLocalDate(dateString: string | Date | null | undefined): Dayjs {
  if (!dateString) return dayjs();

  // If it's already a Date object, create dayjs from it
  if (dateString instanceof Date) {
    return dayjs(dateString);
  }

  // Parse the string components manually to avoid UTC interpretation
  // Example: "2024-10-13T14:00:00.000" -> local Madrid time 14:00
  const dateStr = String(dateString);

  // Extract components from the ISO string
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
  if (match) {
    const [, year, month, day, hour, minute, second] = match;
    // Create dayjs with explicit components (this creates local time, not UTC)
    return dayjs()
      .year(parseInt(year))
      .month(parseInt(month) - 1) // month is 0-indexed
      .date(parseInt(day))
      .hour(parseInt(hour))
      .minute(parseInt(minute))
      .second(parseInt(second))
      .millisecond(0);
  }

  // Fallback to normal parsing if format doesn't match
  return dayjs(dateStr);
}

/**
 * Parse a date string from backend as native Date object WITHOUT UTC conversion
 * Same logic as parseLocalDate but returns native Date
 *
 * @param dateString - ISO-like date string from backend
 * @returns Date object representing local Madrid time
 */
export function parseLocalDateNative(dateString: string | Date | null | undefined): Date {
  if (!dateString) return new Date();

  // If it's already a Date object, return it
  if (dateString instanceof Date) {
    return dateString;
  }

  // Parse the string components manually to avoid UTC interpretation
  const dateStr = String(dateString);

  // Extract components from the ISO string
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
  if (match) {
    const [, year, month, day, hour, minute, second] = match;
    // Create Date with explicit components (local time, not UTC)
    return new Date(
      parseInt(year),
      parseInt(month) - 1, // month is 0-indexed
      parseInt(day),
      parseInt(hour),
      parseInt(minute),
      parseInt(second)
    );
  }

  // Fallback to normal parsing if format doesn't match
  return new Date(dateStr);
}

/**
 * Format a local date for display
 *
 * @param date - Date to format
 * @param format - Format string (dayjs format)
 * @returns Formatted date string
 */
export function formatLocalDateString(date: string | Date | Dayjs, format: string = 'DD/MM/YYYY HH:mm'): string {
  if (!date) return '';

  const dayjsDate = typeof date === 'string' || date instanceof Date
    ? parseLocalDate(date)
    : date;

  return dayjsDate.format(format);
}

// Exportar funciones individuales para conveniencia
export {
  formatDateToMadrid as formatDate,
  formatDateOnlyToMadrid as formatDateOnly,
  formatTimeOnlyToMadrid as formatTimeOnly,
  formatRelativeTime as formatRelative,
};