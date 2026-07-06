/**
 * @archivo: SafeBadge.tsx
 * @módulo: Common Components (Badge de Conteo Seguro)
 * @función: Wrapper de Ant Design Badge con validación de tipos para evitar errores React
 * @crítico: SÍ - Usado en TODO el sistema para mostrar contadores de notificaciones
 * @dependencias: Ant Design Badge
 * @no_modificar: Lógica de validación de objetos vs números
 * @relacionado_con: DashboardLayout.tsx, NotificationCenter.tsx, useUnreadMessages
 */

/**
 * COMPONENTE: SafeBadge
 * UBICACIÓN: /frontend/src/components/common/SafeBadge.tsx
 * FUNCIÓN: Badge wrapper que previene errores de React por objects como count
 * NO USAR PARA: Badges decorativos sin conteo numérico
 * PROPS CRÍTICAS:
 *   - count: any - Acepta cualquier tipo, valida internamente
 *   - ...props: BadgeProps - Todas las props estándar de Ant Design Badge
 * 
 * PROBLEMA QUE RESUELVE:
 * - React error: "Objects are not valid as a React child"
 * - Backend a veces devuelve { type: 'count', count: 5 } en lugar de 5
 * - Inconsistencias de tipos en APIs de conteo
 * 
 * VALIDACIONES IMPLEMENTADAS:
 * - Detecta si count es object y extrae count property
 * - Convierte valores no-numéricos a 0
 * - Console.error para debugging cuando detecta objects
 * - Fallback seguro a 0 para todos los casos edge
 * 
 * CASOS DE USO:
 * - Notificaciones no leídas en DashboardLayout
 * - Mensajes pendientes en navegación
 * - Cualquier contador que pueda recibir datos inconsistentes
 * 
 * ESTADO ACTUAL: ✅ FUNCIONAL Y ESTABLE
 * - Evita crashes de React por tipos incorrectos
 * - Logging para debugging de API inconsistente
 * - Usado extensivamente en todo el sistema
 */

import React from 'react';
import { Badge, BadgeProps } from 'antd';

interface SafeBadgeProps extends BadgeProps {
  count?: any; // Allow any type, we'll validate it
}

const SafeBadge: React.FC<SafeBadgeProps> = ({ count, children, ...props }) => {
  // Ensure count is always a number or 0
  const safeCount = (() => {
    if (count && typeof count === 'object' && !Array.isArray(count)) {
      console.error('🚨 SafeBadge detected object being passed as count:', count);
      // If it's an object with type and count properties, extract count
      if ('type' in count && 'count' in count) {
        return typeof count.count === 'number' ? count.count : 0;
      }
      return 0;
    }
    return typeof count === 'number' ? count : 0;
  })();

  // FIXED: Ensure children is a single React element to avoid React.Children.only errors
  // If children is not provided, undefined, null, or not a valid React element, use a safe default
  const safeChildren = React.isValidElement(children) ? children : <span style={{ display: 'inline-block' }} />;

  // Additional safety: if children is an array, wrap it in a single element
  if (Array.isArray(children)) {
    console.warn('🚨 SafeBadge: children is an array, wrapping in single element to avoid React.Children.only errors');
    return <Badge {...props} count={safeCount}><span>{children}</span></Badge>;
  }

  return <Badge {...props} count={safeCount}>{safeChildren}</Badge>;
};

export default SafeBadge;