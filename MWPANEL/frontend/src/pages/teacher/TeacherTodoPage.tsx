/**
 * @archivo: TeacherTodoPage.tsx
 * @módulo: Teacher (Página Dashboard TODO)
 * @función: Página principal del dashboard de tareas pendientes
 * @características:
 *   - Layout responsive
 *   - Integración con TeacherTodoDashboard
 *   - Breadcrumbs y navegación
 *   - Protección por roles
 */

import React from 'react';
import { Breadcrumb, Typography } from 'antd';
import { HomeOutlined, CheckSquareOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import TeacherTodoDashboard from '@components/teacher/TeacherTodoDashboard';
import SectionInfoBanner from '../../components/common/SectionInfoBanner';

const { Title } = Typography;

const TeacherTodoPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Breadcrumb>
            <Breadcrumb.Item>
              <Link to="/teacher">
                <HomeOutlined />
                <span className="ml-1">Dashboard</span>
              </Link>
            </Breadcrumb.Item>
            <Breadcrumb.Item>
              <CheckSquareOutlined />
              <span className="ml-1">Tareas Pendientes</span>
            </Breadcrumb.Item>
          </Breadcrumb>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <SectionInfoBanner text="Tu cola de entregas por corregir." />
        <TeacherTodoDashboard />
      </div>
    </div>
  );
};

export default TeacherTodoPage;