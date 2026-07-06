/**
 * @archivo: BirthdayBanner.tsx
 * @módulo: Components - Birthday Visual System
 * @función: Banner superior de cumpleaños con mensaje personalizado y opción de cerrar
 * @creado_por: Sistema de Cumpleaños MW Panel 2.0
 * @fecha: 2025-07-13
 * @propósito: Mostrar mensaje de felicitación en la parte superior de la plataforma
 * 
 * CARACTERÍSTICAS:
 * - Aparece solo el día del cumpleaños del usuario logueado
 * - Mensaje personalizado con nombre y edad
 * - Botón para cerrar que persiste hasta el día siguiente
 * - Diseño discreto pero llamativo
 * - Compatible con el tema de MW Panel
 * - Responsivo para móvil y desktop
 * 
 * INTEGRACIÓN:
 * - Se integra en DashboardLayout.tsx como banner fijo superior
 * - Usa el servicio birthdayService.ts para detección y persistencia
 * - No modifica sistema de notificaciones automáticas existente
 * 
 * IMPORTANTE:
 * - NO toca el sistema de plantillas de email
 * - NO modifica la estructura del sistema de comunicaciones
 * - Solo gestiona el aspecto visual de la experiencia de cumpleaños
 */

import React, { useState, useEffect } from 'react';
import { Alert, Button, Space } from 'antd';
import { CloseOutlined, GiftOutlined } from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import birthdayService from '../../services/birthdayService';
import { useAuth } from '../../hooks/useAuth';

/**
 * Props para el componente BirthdayBanner
 */
interface BirthdayBannerProps {
  /** Clase CSS adicional */
  className?: string;
  /** Posición fija del banner (default: true) */
  fixed?: boolean;
  /** Mostrar animación de entrada (default: true) */
  animated?: boolean;
  /** Callback cuando se cierra el banner */
  onClose?: () => void;
  /** Forzar mostrar banner para testing */
  forceShow?: boolean;
}

/**
 * Componente del banner de cumpleaños
 * 
 * Uso básico:
 * ```tsx
 * <BirthdayBanner />
 * ```
 * 
 * Uso con callbacks:
 * ```tsx
 * <BirthdayBanner 
 *   onClose={() => console.log('Banner cerrado')}
 *   className="custom-banner"
 * />
 * ```
 */
const BirthdayBanner: React.FC<BirthdayBannerProps> = ({
  className = '',
  fixed = true,
  animated = true,
  onClose,
  forceShow = false,
}) => {
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [birthdayMessage, setBirthdayMessage] = useState('');

  /**
   * Efecto para detectar cumpleaños y configurar visibilidad
   */
  useEffect(() => {
    if (!user) {
      setIsVisible(false);
      return;
    }

    // Verificar si es cumpleaños del usuario
    const userWithBirthday = {
      id: user.id,
      firstName: user.profile?.firstName || 'Usuario',
      lastName: user.profile?.lastName || '',
      dateOfBirth: user.profile?.dateOfBirth,
      role: user.role,
      email: user.email,
    };

    const isBirthday = forceShow || birthdayService.isBirthdayToday(userWithBirthday);
    const isDismissed = birthdayService.isBannerDismissed(user.id);

    if (isBirthday && !isDismissed) {
      const age = userWithBirthday.dateOfBirth ? 
        birthdayService.calculateAge(userWithBirthday.dateOfBirth) : 
        undefined;
      
      const message = birthdayService.generateBirthdayMessage(
        userWithBirthday.firstName,
        age
      );
      
      setBirthdayMessage(message);
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [user, forceShow]);

  /**
   * Maneja el cierre del banner
   */
  const handleClose = () => {
    if (user) {
      birthdayService.dismissBanner(user.id);
    }
    setIsVisible(false);
    onClose?.();
  };

  /**
   * Estilos del contenedor del banner
   */
  const bannerStyle: React.CSSProperties = {
    position: fixed ? 'fixed' : 'relative',
    top: fixed ? '0' : 'auto',
    left: fixed ? '0' : 'auto',
    right: fixed ? '0' : 'auto',
    zIndex: fixed ? 1050 : 'auto',
    margin: '0',
    borderRadius: fixed ? '0' : '8px',
    boxShadow: fixed ? '0 2px 8px rgba(0, 0, 0, 0.15)' : undefined,
  };

  /**
   * Configuración de animaciones
   */
  const animationVariants = {
    initial: { 
      opacity: 0, 
      y: -50,
      scale: 0.95 
    },
    animate: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        type: 'spring',
        damping: 20,
        stiffness: 300,
        duration: 0.6
      }
    },
    exit: { 
      opacity: 0, 
      y: -30,
      scale: 0.95,
      transition: {
        duration: 0.3
      }
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <AnimatePresence>
      {animated ? (
        <motion.div
          initial="initial"
          animate="animate"
          exit="exit"
          variants={animationVariants}
          className={className}
          style={bannerStyle}
        >
          <BirthdayBannerContent 
            message={birthdayMessage}
            onClose={handleClose}
          />
        </motion.div>
      ) : (
        <div className={className} style={bannerStyle}>
          <BirthdayBannerContent 
            message={birthdayMessage}
            onClose={handleClose}
          />
        </div>
      )}
    </AnimatePresence>
  );
};

/**
 * Contenido interno del banner
 */
interface BirthdayBannerContentProps {
  message: string;
  onClose: () => void;
}

const BirthdayBannerContent: React.FC<BirthdayBannerContentProps> = ({
  message,
  onClose,
}) => (
  <Alert
    type="success"
    showIcon={false}
    message={
      <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
        <Space align="center">
          {/* Emoji/icono de cumpleaños */}
          <span style={{ fontSize: '20px', marginRight: '8px' }}>🎂</span>
          <GiftOutlined style={{ 
            fontSize: '18px', 
            color: '#ff69b4',
            marginRight: '8px'
          }} />
          
          {/* Mensaje principal */}
          <span style={{ 
            fontSize: '15px',
            fontWeight: 500,
            color: '#1890ff',
            textShadow: '0 1px 2px rgba(0,0,0,0.1)'
          }}>
            {message}
          </span>
        </Space>

        {/* Botón de cerrar con texto personalizado */}
        <Button
          type="text"
          size="small"
          onClick={onClose}
          style={{
            color: '#666',
            fontSize: '12px',
            padding: '4px 8px',
            height: 'auto',
            borderRadius: '4px',
            border: '1px solid #d9d9d9',
            background: 'rgba(255, 255, 255, 0.8)',
          }}
          icon={<CloseOutlined style={{ fontSize: '10px' }} />}
        >
          ¡Gracias! Y no me lo muestres más, que ya lo sé
        </Button>
      </Space>
    }
    style={{
      margin: 0,
      padding: '12px 20px',
      background: 'linear-gradient(135deg, #f6f9fc 0%, #e9f7ef 100%)',
      border: '1px solid #b7eb8f',
      borderRadius: '0',
      fontSize: '14px',
    }}
    closable={false}
  />
);

/**
 * Hook para gestionar el estado del banner de cumpleaños
 * Útil para componentes padre que necesiten saber si el banner está visible
 */
export const useBirthdayBanner = () => {
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!user) {
      setIsVisible(false);
      return;
    }

    const userWithBirthday = {
      id: user.id,
      firstName: user.profile?.firstName || 'Usuario',
      lastName: user.profile?.lastName || '',
      dateOfBirth: user.profile?.dateOfBirth,
      role: user.role,
      email: user.email,
    };

    const isBirthday = birthdayService.isBirthdayToday(userWithBirthday);
    const isDismissed = birthdayService.isBannerDismissed(user.id);

    setIsVisible(isBirthday && !isDismissed);
  }, [user]);

  return {
    isVisible,
    shouldAdjustLayout: isVisible, // Para ajustar padding del contenido principal
  };
};

export default BirthdayBanner;