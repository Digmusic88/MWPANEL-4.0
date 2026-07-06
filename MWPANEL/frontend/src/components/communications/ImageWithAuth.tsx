import React, { useEffect, useState } from 'react';
import { Spin } from 'antd';
import apiClient from '../../services/apiClient';

interface ImageWithAuthProps {
  attachmentId: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent) => void;
}

/**
 * Componente para cargar imágenes que requieren autenticación JWT.
 * Usa fetch con el token para obtener la imagen y la convierte a blob URL.
 */
const ImageWithAuth: React.FC<ImageWithAuthProps> = ({
  attachmentId,
  alt,
  className,
  style,
  onClick,
}) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;

    const loadImage = async () => {
      try {
        setLoading(true);
        setError(false);

        // Usar apiClient que ya incluye el token JWT en los headers
        const response = await apiClient.get(
          `/communications/attachments/${attachmentId}/view`,
          {
            responseType: 'blob',
          }
        );

        // Crear un blob URL para la imagen
        objectUrl = URL.createObjectURL(response.data);
        setImageSrc(objectUrl);
      } catch (err) {
        console.error('Error loading image:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadImage();

    // Cleanup: liberar el blob URL cuando el componente se desmonte
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [attachmentId]);

  if (loading) {
    return (
      <div
        className="flex items-center justify-center"
        style={{
          minHeight: '100px',
          backgroundColor: '#f0f0f0',
          borderRadius: '8px',
          ...style,
        }}
      >
        <Spin />
      </div>
    );
  }

  if (error || !imageSrc) {
    return (
      <div
        className="flex items-center justify-center"
        style={{
          minHeight: '100px',
          backgroundColor: '#f5f5f5',
          borderRadius: '8px',
          color: '#999',
          ...style,
        }}
      >
        Error al cargar la imagen
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      style={style}
      onClick={onClick}
    />
  );
};

export default ImageWithAuth;
