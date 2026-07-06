import { useMemo } from 'react';

/**
 * Hook personalizado para gestionar URLs de fotos de perfil de manera consistente
 * Maneja la construcción correcta de URLs y fallbacks
 */
export const useProfilePhoto = (avatarUrl?: string | null) => {
  const photoUrl = useMemo(() => {
    if (!avatarUrl) {
      return null;
    }

    // Si la URL ya es completa (empieza con http), la devolvemos tal como está
    if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
      return avatarUrl;
    }

    // Corregir URLs que tengan /api/uploads/ prefix (error histórico)
    let correctedUrl = avatarUrl;
    if (avatarUrl.startsWith('/api/uploads/')) {
      correctedUrl = avatarUrl.replace('/api/uploads/', '/uploads/');
    }

    // Si es una ruta relativa que empieza con /uploads/profiles/, usar proxy configurado
    if (correctedUrl.startsWith('/uploads/profiles/')) {
      if (window.location.hostname === 'plataforma.mundoworld.school') {
        return `https://plataforma.mundoworld.school${correctedUrl}`;
      }
      return `http://localhost:3000${correctedUrl}`;
    }

    // Si es una ruta de uploads generica, usar la ruta /api para que nginx proxy al backend
    if (correctedUrl.startsWith('/uploads/')) {
      if (window.location.hostname === 'plataforma.mundoworld.school') {
        return `https://plataforma.mundoworld.school/api${correctedUrl}`;
      }
      return `http://localhost:3000${correctedUrl}`;
    }

    // Si es una ruta relativa que no empieza con /, agregarla
    if (!correctedUrl.startsWith('/')) {
      const fullPath = `/uploads/${correctedUrl}`;
      if (window.location.hostname === 'plataforma.mundoworld.school') {
        return `https://plataforma.mundoworld.school/api${fullPath}`;
      }
      return `http://localhost:3000${fullPath}`;
    }

    // Para cualquier otra ruta relativa
    if (window.location.hostname === 'plataforma.mundoworld.school') {
      return `https://plataforma.mundoworld.school/api${correctedUrl}`;
    }
    return `http://localhost:3000${correctedUrl}`;
  }, [avatarUrl]);

  return {
    photoUrl,
    hasPhoto: !!photoUrl,
    isLoading: false // Podemos expandir esto en el futuro para estados de carga
  };
};

/**
 * Hook alternativo que también maneja estados de error y carga
 */
export const useProfilePhotoWithState = (avatarUrl?: string | null) => {
  const { photoUrl, hasPhoto } = useProfilePhoto(avatarUrl);
  
  return {
    photoUrl,
    hasPhoto,
    isLoading: false,
    hasError: false, // Podemos implementar detección de errores en el futuro
  };
};

export default useProfilePhoto;