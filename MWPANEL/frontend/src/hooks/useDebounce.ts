/**
 * @archivo: useDebounce.ts
 * @módulo: Hooks - Utilities
 * @función: Hook para debouncing de valores
 * @proyecto: MW Panel 2.0
 * @fecha: 9 de agosto de 2025
 * @version: 1.0.0
 * 
 * DESCRIPCIÓN:
 * Hook personalizado que implementa debouncing para optimizar
 * búsquedas y llamadas API reduciendo la frecuencia de updates.
 */

import { useState, useEffect } from 'react';

/**
 * Hook que debounce un valor por el delay especificado
 * 
 * @param value - Valor a debounce
 * @param delay - Delay en milisegundos
 * @returns Valor debounced
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}