/**
 * @page: DuaAccommodationsPage
 * @module: DUA (Diseño Universal para el Aprendizaje)
 * @description: Página principal para gestión de acomodaciones DUA
 * @role: Teacher, Admin
 * @features: CRUD de acomodaciones, workflow de aprobación, efectividad
 */

import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOutlined } from '@ant-design/icons';
import AccommodationSystem from '../../components/dua/AccommodationSystem';
import { DuaPageHeader } from '../../components/dua/DuaPageHeader';

const DuaAccommodationsPage: React.FC = () => {
  const navigate = useNavigate();

  // Safe Navigation: Protección condicional para evitar errores de navegación
  const safeNavigate = useCallback((path: string, options?: any) => {
    if (navigate && typeof navigate === "function") {
      try {
        navigate(path, options);
      } catch (error) {
        console.warn("Navigation error:", error, "Path:", path);
      }
    } else {
      console.warn("Navigate function not available:", path);
    }
  }, [navigate]);

  return (
    <div style={{ padding: 16 }}>
      <DuaPageHeader
        title="Sistema de Acomodaciones DUA"
        subtitle="Gestiona las acomodaciones del Diseño Universal para el Aprendizaje para tus estudiantes"
        icon={<BookOutlined />}
      />

      {/* Main Content */}
      <AccommodationSystem />
    </div>
  );
};

export default DuaAccommodationsPage;