/**
 * Navigation Utilities - Solución robusta para navegación interna
 * 
 * Este archivo proporciona funciones de navegación que funcionan
 * consistentemente en toda la plataforma, evitando problemas de
 * sincronización entre React Router y la URL del browser.
 */

/**
 * Navega a una ruta específica usando window.location
 * Esta implementación evita problemas de sincronización con React Router
 * 
 * @param path - Ruta de destino (ej: '/admin/users', '/teacher/classes')
 * @param options - Opciones adicionales (opcional)
 */
export const safeNavigate = (path: string, options?: { replace?: boolean }) => {
  console.log('🚀 SafeNavigate: Navigating to:', path);
  
  try {
    if (options?.replace) {
      window.location.replace(path);
    } else {
      window.location.href = path;
    }
  } catch (error) {
    console.error('❌ Navigation error:', error);
    // Fallback: try direct assignment
    window.location.href = path;
  }
};

/**
 * Navega hacia atrás en el historial
 */
export const goBack = () => {
  console.log('🔙 SafeNavigate: Going back');
  window.history.back();
};

/**
 * Navega hacia adelante en el historial
 */
export const goForward = () => {
  console.log('🔜 SafeNavigate: Going forward');
  window.history.forward();
};

/**
 * Recarga la página actual
 */
export const reloadPage = () => {
  console.log('🔄 SafeNavigate: Reloading page');
  window.location.reload();
};

/**
 * Construye rutas específicas por rol
 */
export const buildRolePath = (role: string, subPath: string) => {
  return `/${role}/${subPath}`;
};

/**
 * Rutas de dashboard por rol
 */
export const getDashboardPath = (role: string) => {
  switch (role.toLowerCase()) {
    case 'admin':
      return '/admin';
    case 'teacher':
      return '/teacher';
    case 'student':
      return '/student';
    case 'family':
      return '/family';
    default:
      return '/login';
  }
};

/**
 * Hook personalizado para navegación segura (para compatibilidad)
 * Retorna la función safeNavigate para usar en componentes
 */
export const useSafeNavigate = () => {
  return safeNavigate;
};