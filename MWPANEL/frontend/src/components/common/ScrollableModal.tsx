import React from 'react';
import { Modal, ModalProps } from 'antd';

/**
 * ScrollableModal - Modal wrapper con scroll automático
 *
 * Este componente wrappea el Modal de Ant Design añadiendo scroll automático
 * cuando el contenido excede la altura de la ventana.
 *
 * Características:
 * - Scroll automático cuando el contenido es muy largo
 * - Funciona en móvil, tablet y desktop
 * - Mantiene todas las props del Modal original de Ant Design
 * - Altura máxima del 90% de la ventana (vh)
 * - Body con scroll interno
 */

interface ScrollableModalProps extends ModalProps {
  /**
   * Altura máxima personalizada (opcional)
   * Por defecto: '90vh' (90% de la altura de la ventana)
   */
  maxBodyHeight?: string;

  /**
   * Si se debe aplicar padding al body del modal
   * Por defecto: true
   */
  applyBodyPadding?: boolean;

  /**
   * Tamaño predefinido del modal
   * small: 520px, medium: 720px, large: 900px, xlarge: 1200px
   * Por defecto: usa la prop width si está definida, sino 'medium' (720px)
   */
  size?: 'small' | 'medium' | 'large' | 'xlarge';
}

const ScrollableModal: React.FC<ScrollableModalProps> = ({
  children,
  maxBodyHeight = '90vh',
  applyBodyPadding = true,
  size = 'medium',
  style,
  bodyStyle,
  width,
  ...restProps
}) => {
  // Map de tamaños predefinidos
  const sizeMap = {
    small: 520,
    medium: 720,
    large: 900,
    xlarge: 1200,
  };

  // Usar width si está definido, sino usar el tamaño predefinido
  const modalWidth = width !== undefined ? width : sizeMap[size];

  // Estilos base para el modal
  const modalStyle: React.CSSProperties = {
    top: 20, // Margen superior de 20px
    paddingBottom: 0,
    ...style,
  };

  // Estilos para el body con scroll
  const scrollableBodyStyle: React.CSSProperties = {
    maxHeight: `calc(${maxBodyHeight} - 110px)`, // 110px para header + footer
    overflowY: 'auto',
    overflowX: 'hidden',
    padding: applyBodyPadding ? '24px' : 0,
    // Estilos de scrollbar personalizados
    scrollbarWidth: 'thin',
    scrollbarColor: '#c5ddc3 #f0f0f0',
    ...bodyStyle,
  };

  return (
    <Modal
      {...restProps}
      width={modalWidth}
      style={modalStyle}
      bodyStyle={scrollableBodyStyle}
      // Asegurar que el modal está centrado verticalmente si es pequeño
      centered={restProps.centered !== undefined ? restProps.centered : true}
    >
      {children}
    </Modal>
  );
};

export default ScrollableModal;
