import React from 'react';
import './WorldLoader.css'; // Asegúrate de importar los estilos

interface WorldLoaderProps {
  visible: boolean;
  message?: string;
}

const WorldLoader: React.FC<WorldLoaderProps> = ({ visible, message = 'Cargando datos' }) => {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex flex-col items-center justify-center">
      <div className="w-16 h-16 animate-spin-slow mb-4">
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="48" stroke="#579172" strokeWidth="4" fill="#EDF6F1" />
          <path
            d="M50 2 A48 48 0 0 1 98 50 A48 48 0 0 1 50 98 A48 48 0 0 1 2 50 A48 48 0 0 1 50 2 Z"
            fill="#8DBDD9"
            opacity="0.5"
          />
          <path d="M30 40 L40 45 L35 55 L25 50 Z" fill="#3F6E58" />
          <path d="M60 30 L70 35 L68 45 L58 40 Z" fill="#3F6E58" />
        </svg>
      </div>
      <p className="text-white text-sm fade-in">
        {message}
        <span className="dot-anim">.</span>
      </p>
    </div>
  );
};

export default WorldLoader;