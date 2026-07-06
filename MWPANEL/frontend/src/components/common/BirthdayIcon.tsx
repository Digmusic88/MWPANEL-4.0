/**
 * @archivo: BirthdayIcon.tsx
 * @módulo: Components - Birthday Visual System
 * @función: Icono de cumpleaños reutilizable para mostrar junto a nombres en listados
 * @creado_por: Sistema de Cumpleaños MW Panel 2.0
 * @fecha: 2025-07-13
 * @propósito: Indicador visual de cumpleaños sin modificar sistema de notificaciones
 * 
 * UBICACIONES DE USO:
 * - StudentsPage.tsx: Listado principal de estudiantes (columna "Estudiante")
 * - TeachersPage.tsx: Listado principal de profesores (columna "Profesor")
 * - ClassGroupsPage.tsx: Listas de estudiantes en grupos y tutores
 * - TeacherGradesPage.tsx: Tabla de calificaciones con estudiantes
 * - FamiliesPage.tsx: Contactos familiares y estudiantes asociados
 * - Cualquier listado que muestre nombres de usuarios
 * 
 * IMPORTANTE:
 * - NO modifica el sistema de emails automáticos existente
 * - NO toca las plantillas de notificaciones
 * - Solo proporciona feedback visual en la interfaz
 * - Se basa en el servicio birthdayService.ts para detección
 */

import React from 'react';
import { Tooltip } from 'antd';
import { GiftOutlined } from '@ant-design/icons';
import birthdayService, { UserWithBirthday } from '../../services/birthdayService';

/**
 * Props para el componente BirthdayIcon
 */
interface BirthdayIconProps {
  /** Usuario para verificar cumpleaños */
  user: UserWithBirthday;
  /** Tamaño del icono (default: 16px) */
  size?: number;
  /** Color del icono (default: #ff69b4) */
  color?: string;
  /** Mostrar solo si es cumpleaños hoy (default: true) */
  onlyToday?: boolean;
  /** Clase CSS adicional */
  className?: string;
  /** Estilo personalizado */
  style?: React.CSSProperties;
  /** Callback cuando se hace hover */
  onHover?: () => void;
}

/**
 * Componente de icono de cumpleaños
 * 
 * Uso básico:
 * ```tsx
 * <BirthdayIcon user={student} />
 * ```
 * 
 * Uso con personalización:
 * ```tsx
 * <BirthdayIcon 
 *   user={teacher}
 *   size={20}
 *   color="#f39c12"
 *   onHover={() => console.log('Birthday hover')}
 * />
 * ```
 */
const BirthdayIcon: React.FC<BirthdayIconProps> = ({
  user,
  size = 16,
  color = '#ff69b4',
  onlyToday = true,
  className = '',
  style = {},
  onHover,
}) => {
  // Verificar si debe mostrar el icono
  const shouldShow = onlyToday ? birthdayService.isBirthdayToday(user) : !!user.dateOfBirth;

  if (!shouldShow) {
    return null;
  }

  // Generar información de cumpleaños
  const birthdayInfo = birthdayService.processBirthdayInfo(user);
  const tooltipText = birthdayService.generateBirthdayTooltip(birthdayInfo.fullName);

  /**
   * Estilos del icono con animación sutil
   */
  const iconStyle: React.CSSProperties = {
    fontSize: size,
    color: color,
    marginLeft: '6px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    animation: 'birthday-glow 2s ease-in-out infinite alternate',
    filter: 'drop-shadow(0 0 2px rgba(255, 105, 180, 0.6))',
    ...style,
  };

  /**
   * Estilos CSS para la animación (se inyectan dinámicamente)
   */
  React.useEffect(() => {
    const styleId = 'birthday-icon-animation';
    
    // Verificar si ya existe el estilo
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @keyframes birthday-glow {
          0% {
            transform: scale(1);
            filter: drop-shadow(0 0 2px rgba(255, 105, 180, 0.6));
          }
          50% {
            transform: scale(1.1);
            filter: drop-shadow(0 0 4px rgba(255, 105, 180, 0.8));
          }
          100% {
            transform: scale(1);
            filter: drop-shadow(0 0 2px rgba(255, 105, 180, 0.6));
          }
        }
        
        .birthday-icon:hover {
          transform: scale(1.2) !important;
          filter: drop-shadow(0 0 6px rgba(255, 105, 180, 1)) !important;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  return (
    <Tooltip 
      title={tooltipText}
      placement="top"
      overlayClassName="birthday-tooltip"
    >
      <GiftOutlined
        className={`birthday-icon ${className}`}
        style={iconStyle}
        onMouseEnter={onHover}
        aria-label={`Cumpleaños de ${birthdayInfo.fullName}`}
        role="img"
      />
    </Tooltip>
  );
};

/**
 * Versión simplificada para uso en tablas compactas
 */
export const BirthdayIconCompact: React.FC<Pick<BirthdayIconProps, 'user' | 'className'>> = ({ 
  user, 
  className = '' 
}) => (
  <BirthdayIcon 
    user={user} 
    size={14} 
    color="#f39c12" 
    className={className}
  />
);

/**
 * Versión destacada para dashboards
 */
export const BirthdayIconProminent: React.FC<Pick<BirthdayIconProps, 'user' | 'onHover'>> = ({ 
  user, 
  onHover 
}) => (
  <BirthdayIcon 
    user={user} 
    size={20} 
    color="#e74c3c" 
    onHover={onHover}
  />
);

/**
 * Hook personalizado para verificar cumpleaños en listas
 * Útil para componentes que manejan múltiples usuarios
 */
export const useBirthdayDetection = (users: UserWithBirthday[]) => {
  const [birthdaysToday, setBirthdaysToday] = React.useState<string[]>([]);

  React.useEffect(() => {
    const todaysBirthdays = birthdayService.getTodaysBirthdays(users);
    setBirthdaysToday(todaysBirthdays.map(b => b.userId));
  }, [users]);

  return {
    birthdaysToday,
    hasBirthdaysToday: birthdaysToday.length > 0,
    birthdayCount: birthdaysToday.length,
  };
};

export default BirthdayIcon;