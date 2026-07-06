import React, { useEffect, useState } from 'react';
import { createRoot, Root } from 'react-dom/client';

type SessionEndReason = 'expired' | 'manual' | 'inactivity';

interface SessionExpiredModalProps {
  visible: boolean;
  countdown: number;
  reason?: SessionEndReason;
  onClose: () => void;
}

// Colores de la plataforma MW Panel
const platformColors = {
  primary: '#3b82f6',      // blue-500
  primaryDark: '#2563eb',  // blue-600
  success: '#10b981',      // emerald-500
  successDark: '#059669',  // emerald-600
  warning: '#f59e0b',      // amber-500
  warningDark: '#d97706',  // amber-600
  background: '#f8fafc',   // slate-50
  border: '#e2e8f0',       // slate-200
  textPrimary: '#1e293b',  // slate-800
  textSecondary: '#64748b', // slate-500
  textMuted: '#94a3b8',    // slate-400
};

// Contenido según el motivo del cierre
const modalContent: Record<SessionEndReason, {
  title: string;
  subtitle: string;
  message: string;
  icon: 'lock' | 'logout' | 'clock';
  color: string;
  colorDark: string;
  bgGradient: string;
}> = {
  expired: {
    title: 'Sesión Finalizada',
    subtitle: 'Protección de seguridad activa',
    message: 'Por motivos de seguridad, su sesión ha sido cerrada. Para continuar, por favor inicie sesión nuevamente.',
    icon: 'lock',
    color: platformColors.primary,
    colorDark: platformColors.primaryDark,
    bgGradient: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
  },
  manual: {
    title: 'Sesión Cerrada',
    subtitle: 'Ha cerrado su sesión correctamente',
    message: 'Su sesión ha sido cerrada de forma segura. Para volver a acceder, por favor inicie sesión nuevamente.',
    icon: 'logout',
    color: platformColors.success,
    colorDark: platformColors.successDark,
    bgGradient: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
  },
  inactivity: {
    title: 'Sesión Expirada',
    subtitle: 'Cierre automático por inactividad',
    message: 'Por su seguridad, la sesión ha sido cerrada debido a inactividad. Para continuar, por favor inicie sesión nuevamente.',
    icon: 'clock',
    color: platformColors.warning,
    colorDark: platformColors.warningDark,
    bgGradient: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
  },
};

/**
 * Modal elegante para sesión expirada/cerrada
 * Diseño profesional e institucional para centros educativos
 * Inspirado en estándares de UX de plataformas académicas
 */
const SessionExpiredModal: React.FC<SessionExpiredModalProps> = ({
  visible,
  countdown: initialCountdown,
  reason = 'expired',
  onClose,
}) => {
  const [isActive, setIsActive] = useState(false);
  const [progressWidth, setProgressWidth] = useState(0);
  const [countdown, setCountdown] = useState(initialCountdown);

  const content = modalContent[reason];

  useEffect(() => {
    if (!visible) {
      setIsActive(false);
      setProgressWidth(0);
      return;
    }

    // Activar modal con pequeño delay para animación
    const activateTimer = setTimeout(() => {
      setIsActive(true);
    }, 50);

    // Iniciar barra de progreso
    const progressTimer = setTimeout(() => {
      setProgressWidth(100);
    }, 150);

    // Countdown
    setCountdown(initialCountdown);
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearTimeout(activateTimer);
      clearTimeout(progressTimer);
      clearInterval(countdownInterval);
    };
  }, [visible, initialCountdown, onClose]);

  if (!visible) return null;

  // Iconos SVG según el tipo
  const renderIcon = () => {
    switch (content.icon) {
      case 'logout':
        return (
          <svg
            className="session-modal-icon"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        );
      case 'clock':
        return (
          <svg
            className="session-modal-icon"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        );
      default: // lock
        return (
          <svg
            className="session-modal-icon"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        );
    }
  };

  return (
    <>
      {/* Estilos inline usando colores de la plataforma MW Panel */}
      <style>{`
        .session-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(15, 23, 42, 0.5);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 99999;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s ease;
        }

        .session-modal-overlay.active {
          opacity: 1;
          pointer-events: auto;
        }

        .session-modal-card {
          background: #ffffff;
          width: 92%;
          max-width: 400px;
          padding: 32px 28px 28px;
          border-radius: 12px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          text-align: center;
          border: 1px solid ${platformColors.border};
          border-top: 4px solid ${content.color};
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          transform: translateY(20px) scale(0.98);
          opacity: 0;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .session-modal-overlay.active .session-modal-card {
          transform: translateY(0) scale(1);
          opacity: 1;
        }

        .session-modal-icon-wrapper {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 72px;
          height: 72px;
          background: ${content.bgGradient};
          border-radius: 50%;
          margin-bottom: 20px;
        }

        .session-modal-icon {
          color: ${content.color};
          width: 36px;
          height: 36px;
        }

        .session-modal-title {
          color: ${platformColors.textPrimary};
          font-size: 1.375rem;
          font-weight: 600;
          margin: 0 0 8px 0;
          letter-spacing: -0.01em;
        }

        .session-modal-subtitle {
          color: ${platformColors.textSecondary};
          font-size: 0.875rem;
          font-weight: 500;
          margin-bottom: 20px;
        }

        .session-modal-message-box {
          background: ${platformColors.background};
          border-radius: 8px;
          padding: 16px 20px;
          margin-bottom: 24px;
          border: 1px solid ${platformColors.border};
        }

        .session-modal-message {
          color: ${platformColors.textSecondary};
          font-size: 0.875rem;
          line-height: 1.6;
          margin: 0;
        }

        .session-modal-redirect-box {
          margin-bottom: 24px;
        }

        .session-modal-redirect-label {
          display: block;
          font-size: 0.75rem;
          color: ${platformColors.textMuted};
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 500;
          margin-bottom: 10px;
        }

        .session-modal-progress-container {
          width: 100%;
          height: 4px;
          background: ${platformColors.border};
          border-radius: 2px;
          overflow: hidden;
        }

        .session-modal-progress-bar {
          height: 100%;
          background: ${content.color};
          border-radius: 2px;
          transition: width ${(initialCountdown || 5) - 0.15}s linear;
        }

        .session-modal-countdown {
          display: inline-block;
          margin-top: 8px;
          font-size: 0.8125rem;
          color: ${platformColors.textSecondary};
          font-weight: 500;
        }

        .session-modal-countdown-number {
          font-weight: 600;
          font-size: 0.875rem;
          color: ${content.color};
          margin: 0 3px;
        }

        .session-modal-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: ${content.color};
          color: #ffffff;
          border: none;
          padding: 12px 28px;
          font-size: 0.875rem;
          font-weight: 500;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: 'Inter', sans-serif;
        }

        .session-modal-button:hover {
          background: ${content.colorDark};
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .session-modal-button:active {
          transform: translateY(0);
        }

        .session-modal-footer {
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid ${platformColors.border};
        }

        .session-modal-footer-text {
          color: ${platformColors.textMuted};
          font-size: 0.75rem;
          margin: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .session-modal-lock-icon {
          width: 12px;
          height: 12px;
          color: ${platformColors.textMuted};
        }

        /* Responsive styles for mobile */
        @media (max-width: 640px) {
          .session-modal-card {
            padding: 24px 20px 20px;
            max-width: 92%;
          }

          .session-modal-icon-wrapper {
            width: 60px;
            height: 60px;
            margin-bottom: 16px;
          }

          .session-modal-icon {
            width: 30px;
            height: 30px;
          }

          .session-modal-title {
            font-size: 1.25rem;
          }

          .session-modal-subtitle {
            font-size: 0.8125rem;
            margin-bottom: 16px;
          }

          .session-modal-message-box {
            padding: 12px 16px;
            margin-bottom: 20px;
          }

          .session-modal-message {
            font-size: 0.8125rem;
            line-height: 1.5;
          }

          .session-modal-redirect-box {
            margin-bottom: 20px;
          }

          .session-modal-redirect-label {
            font-size: 0.6875rem;
          }

          .session-modal-countdown {
            font-size: 0.75rem;
          }

          .session-modal-countdown-number {
            font-size: 0.8125rem;
          }

          .session-modal-button {
            padding: 10px 24px;
            font-size: 0.8125rem;
            width: 100%;
          }

          .session-modal-footer {
            margin-top: 16px;
            padding-top: 12px;
          }

          .session-modal-footer-text {
            font-size: 0.6875rem;
          }
        }
      `}</style>

      <div className={`session-modal-overlay ${isActive ? 'active' : ''}`}>
        <div className="session-modal-card">
          {/* Icono */}
          <div className="session-modal-icon-wrapper">
            {renderIcon()}
          </div>

          {/* Título */}
          <h2 className="session-modal-title">{content.title}</h2>
          <p className="session-modal-subtitle">{content.subtitle}</p>

          {/* Mensaje principal */}
          <div className="session-modal-message-box">
            <p className="session-modal-message">{content.message}</p>
          </div>

          {/* Barra de progreso */}
          <div className="session-modal-redirect-box">
            <span className="session-modal-redirect-label">
              Redirigiendo al portal de acceso
            </span>
            <div className="session-modal-progress-container">
              <div
                className="session-modal-progress-bar"
                style={{ width: `${progressWidth}%` }}
              />
            </div>
            <span className="session-modal-countdown">
              Redirección en
              <span className="session-modal-countdown-number">{countdown}</span>
              {countdown === 1 ? 'segundo' : 'segundos'}
            </span>
          </div>

          {/* Botón de acción */}
          <button className="session-modal-button" onClick={onClose}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
            Acceder al Portal
          </button>

          {/* Pie institucional */}
          <div className="session-modal-footer">
            <p className="session-modal-footer-text">
              <svg
                className="session-modal-lock-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Protegemos su información con los más altos estándares
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

// === SISTEMA DE RENDERIZADO IMPERATIVO ===
// Permite mostrar el modal desde código no-React (como apiClient.ts)

let modalRoot: Root | null = null;
let containerElement: HTMLDivElement | null = null;

function getContainer(): HTMLDivElement {
  if (!containerElement) {
    containerElement = document.createElement('div');
    containerElement.id = 'session-expired-modal-container';
    document.body.appendChild(containerElement);
  }
  return containerElement;
}

function getRoot(): Root {
  if (!modalRoot) {
    modalRoot = createRoot(getContainer());
  }
  return modalRoot;
}

/**
 * Muestra el modal de sesión expirada de forma imperativa
 * @param redirectUrl - URL a la que redirigir después del cierre
 * @param countdownSeconds - Segundos antes de redirigir automáticamente
 * @param reason - Motivo del cierre de sesión
 */
export function showSessionExpiredModal(
  redirectUrl: string = '/',
  countdownSeconds: number = 5,
  reason: SessionEndReason = 'expired'
): void {
  const root = getRoot();

  const handleClose = () => {
    console.log('🔐 handleClose llamado, reason:', reason);

    // Primero hacer fade-out del modal
    root.render(
      <SessionExpiredModal
        visible={false}
        countdown={0}
        onClose={() => {}}
      />
    );

    // Limpiar el container del DOM
    if (containerElement) {
      containerElement.style.display = 'none';
      containerElement.style.pointerEvents = 'none';
    }

    // Delay para que se vea la animación de fade-out, luego redirigir
    setTimeout(() => {
      // Redirigir a login (esto hace un refresh completo de la página)
      if (typeof window !== 'undefined' && window.location) {
        console.log('🔐 Redirigiendo a:', redirectUrl);
        window.location.href = redirectUrl;
      }
    }, 300);
  };

  // Solo bloquear el modal si ya estamos en login Y es una expiración automática
  // Para logout manual, SIEMPRE mostrar el modal para confirmar al usuario
  const currentPath = window.location.pathname;
  const isAlreadyOnLogin = currentPath === '/' || currentPath === '/login';

  if (isAlreadyOnLogin && reason === 'expired') {
    // Ya estamos en login y es expiración automática, no mostrar modal
    console.log('🔐 Ya en página de login con sesión expirada, saltando modal');
    return;
  }

  // Asegurar que el container esté visible y pueda recibir clicks
  if (containerElement) {
    containerElement.style.display = 'block';
    containerElement.style.pointerEvents = 'auto';
  }

  root.render(
    <SessionExpiredModal
      visible={true}
      countdown={countdownSeconds}
      reason={reason}
      onClose={handleClose}
    />
  );
}

/**
 * Oculta el modal de sesión expirada
 */
export function hideSessionExpiredModal(): void {
  if (modalRoot) {
    modalRoot.render(
      <SessionExpiredModal
        visible={false}
        countdown={0}
        onClose={() => {}}
      />
    );
  }
  if (containerElement) {
    containerElement.style.pointerEvents = 'none';
    containerElement.style.display = 'none';
  }
}

export default SessionExpiredModal;
