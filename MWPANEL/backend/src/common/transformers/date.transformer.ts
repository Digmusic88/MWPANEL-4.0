import { ValueTransformer } from 'typeorm';

/**
 * Función helper para formatear fechas en zona horaria de Madrid
 *
 * Maneja dos casos:
 * 1. Date object de TypeORM: Ya tiene la hora correcta internamente (UTC), getHours() devuelve hora local
 * 2. String de PostgreSQL: Viene sin "Z", hay que agregarlo para interpretarlo como UTC
 */
export function formatDateLocal(value: Date | string | null | undefined): string | null {
  if (!value) return null;

  let date: Date;

  if (value instanceof Date) {
    // Date object de TypeORM - ya tiene la hora correcta
    // getHours() ya devuelve la hora local del servidor (Europe/Madrid)
    date = value;

    // Formatear directamente usando la hora local del Date object
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const milliseconds = String(date.getMilliseconds()).padStart(3, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}`;
  } else {
    // String de PostgreSQL - viene sin zona horaria, interpretarlo como UTC
    const dateStr = String(value);
    if (!dateStr.endsWith('Z') && !dateStr.match(/[+-]\d{2}:\d{2}$/)) {
      date = new Date(dateStr + 'Z');
    } else {
      date = new Date(dateStr);
    }

    // Convertir a zona horaria de Madrid
    const madridDate = new Date(date.toLocaleString('en-US', { timeZone: 'Europe/Madrid' }));

    const year = madridDate.getFullYear();
    const month = String(madridDate.getMonth() + 1).padStart(2, '0');
    const day = String(madridDate.getDate()).padStart(2, '0');
    const hours = String(madridDate.getHours()).padStart(2, '0');
    const minutes = String(madridDate.getMinutes()).padStart(2, '0');
    const seconds = String(madridDate.getSeconds()).padStart(2, '0');
    const milliseconds = String(date.getMilliseconds()).padStart(3, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}`;
  }
}

/**
 * Transformer de TypeORM para preservar hora local en fechas
 *
 * PROBLEMA: TypeORM por defecto convierte fechas a UTC al serializarlas
 * SOLUCIÓN: Formatear fechas preservando hora local sin conversión UTC
 *
 * Uso: @Column({ type: 'timestamp', transformer: new DateTransformer() })
 */
export class DateTransformer implements ValueTransformer {
  /**
   * Transforma el valor HACIA la base de datos
   * La base de datos espera Date object, no lo modificamos
   */
  to(value: Date | string | null): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    return new Date(value);
  }

  /**
   * Transforma el valor DESDE la base de datos
   * Aquí es donde preservamos la hora local
   */
  from(value: Date | null): string | null {
    return formatDateLocal(value);
  }
}

/**
 * Transformer solo para lectura - no interfiere con @CreateDateColumn/@UpdateDateColumn
 *
 * Este transformer NO transforma valores hacia la base de datos, solo preserva
 * las horas locales al leer. Ideal para campos con auto-generación de timestamps.
 *
 * Uso: @CreateDateColumn({ transformer: new ReadOnlyDateTransformer() })
 */
export class ReadOnlyDateTransformer implements ValueTransformer {
  /**
   * No transformar valores hacia la BD - dejar que TypeORM maneje la auto-generación
   */
  to(value: any): any {
    return value; // Pasar sin modificar para que @CreateDateColumn funcione
  }

  /**
   * Transforma el valor DESDE la base de datos preservando hora local
   */
  from(value: Date | null): string | null {
    return formatDateLocal(value);
  }
}
