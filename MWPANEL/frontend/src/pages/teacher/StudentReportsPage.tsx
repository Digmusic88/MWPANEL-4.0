/**
 * @archivo: StudentReportsPage.tsx
 * @módulo: Student Reports (Visión 360º)
 * @función: Página principal para visualizar y crear reportes de estudiantes
 * @descripción: Integra el dashboard y el drawer de edición
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Select,
  Space,
  Typography,
  Breadcrumb,
  Button,
  Spin,
  Empty,
  message,
  Modal,
} from 'antd';
import {
  HomeOutlined,
  UserOutlined,
  FileTextOutlined,
  PlusOutlined,
  ReloadOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { StudentReportsDashboard, ReportEditorDrawer } from '../../components/student-reports';
import useStudentReports from '../../hooks/useStudentReports';
import apiClient from '../../services/apiClient';

const { Title, Text } = Typography;
const { confirm } = Modal;

// ===== TYPES =====

interface StudentInfo {
  id: string;
  firstName: string;
  lastName: string;
  enrollmentNumber: string;
  photoUrl?: string;
  classGroup?: {
    id: string;
    name: string;
  };
}

interface AcademicYear {
  id: string;
  name: string;
  isCurrent: boolean;
}

// ===== COMPONENT =====

const StudentReportsPage: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();

  // Student and year state
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string | undefined>();
  const [loadingStudent, setLoadingStudent] = useState(true);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<any | null>(null);

  // Reports hook
  const {
    reports,
    groupedBySubject,
    groupedByCustomTag,
    loading,
    loadingSubjects,
    subjectsAndCategories,
    fetchStudentReports,
    fetchSubjectsAndCategories,
    createReport,
    updateReport,
    deleteReport,
    saving,
  } = useStudentReports();

  // Fetch student info and academic years
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!studentId) return;

      setLoadingStudent(true);
      try {
        // Fetch student info
        const studentResponse = await apiClient.get(`/students/${studentId}`);
        const studentData = studentResponse.data.data || studentResponse.data;

        setStudent({
          id: studentData.id,
          firstName: studentData.user?.profile?.firstName || studentData.firstName || 'Estudiante',
          lastName: studentData.user?.profile?.lastName || studentData.lastName || '',
          enrollmentNumber: studentData.enrollmentNumber,
          photoUrl: studentData.user?.profile?.avatarUrl || studentData.photoUrl,
          classGroup: studentData.classGroups?.[0] || studentData.classGroup,
        });

        // Fetch academic years
        const yearsResponse = await apiClient.get('/academic-years');
        const years = yearsResponse.data.data || yearsResponse.data || [];
        setAcademicYears(years);

        // Set current year as default
        const currentYear = years.find((y: AcademicYear) => y.isCurrent);
        if (currentYear) {
          setSelectedYearId(currentYear.id);
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
        message.error('Error al cargar los datos del estudiante');
      } finally {
        setLoadingStudent(false);
      }
    };

    fetchInitialData();
  }, [studentId]);

  // Fetch reports when student or year changes
  useEffect(() => {
    if (studentId && selectedYearId) {
      fetchStudentReports(studentId, { academicYearId: selectedYearId });
      fetchSubjectsAndCategories(studentId, selectedYearId);
    }
  }, [studentId, selectedYearId, fetchStudentReports, fetchSubjectsAndCategories]);

  // Handlers
  const handleCreateReport = () => {
    setEditingReport(null);
    setDrawerOpen(true);
  };

  const handleViewReport = (report: any) => {
    // For now, open in edit mode
    setEditingReport(report);
    setDrawerOpen(true);
  };

  const handleEditReport = (report: any) => {
    setEditingReport(report);
    setDrawerOpen(true);
  };

  const handleDeleteReport = (report: any) => {
    confirm({
      title: '¿Eliminar este reporte?',
      icon: <ExclamationCircleOutlined />,
      content: 'Esta acción no se puede deshacer.',
      okText: 'Eliminar',
      okType: 'danger',
      cancelText: 'Cancelar',
      onOk: async () => {
        await deleteReport(report.id);
        if (studentId && selectedYearId) {
          fetchStudentReports(studentId, { academicYearId: selectedYearId });
        }
      },
    });
  };

  const handleSaveReport = async (data: any) => {
    if (editingReport) {
      // Update
      const result = await updateReport(editingReport.id, data);
      if (result && studentId && selectedYearId) {
        fetchStudentReports(studentId, { academicYearId: selectedYearId });
      }
    } else {
      // Create
      const result = await createReport(data);
      if (result && studentId && selectedYearId) {
        fetchStudentReports(studentId, { academicYearId: selectedYearId });
      }
    }
    setDrawerOpen(false);
    setEditingReport(null);
  };

  const handleRefresh = () => {
    if (studentId && selectedYearId) {
      fetchStudentReports(studentId, { academicYearId: selectedYearId });
    }
  };

  if (loadingStudent) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spin size="large" tip="Cargando..." />
      </div>
    );
  }

  if (!student) {
    return (
      <Empty
        description="Estudiante no encontrado"
        className="mt-12"
      >
        <Button type="primary" onClick={() => navigate(-1)}>
          Volver
        </Button>
      </Empty>
    );
  }

  return (
    <div className="student-reports-page p-4">
      {/* Breadcrumb */}
      <Breadcrumb className="mb-4">
        <Breadcrumb.Item>
          <Link to="/teacher">
            <HomeOutlined /> Inicio
          </Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <Link to="/teacher/students">
            <UserOutlined /> Estudiantes
          </Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <FileTextOutlined /> Reportes
        </Breadcrumb.Item>
      </Breadcrumb>

      {/* Header */}
      <Card className="mb-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <Title level={3} className="mb-1">
              Visión 360º - {student.firstName} {student.lastName}
            </Title>
            <Space>
              <Text type="secondary">{student.enrollmentNumber}</Text>
              {student.classGroup && (
                <Text type="secondary">• {student.classGroup.name}</Text>
              )}
            </Space>
          </div>

          <Space wrap>
            <Select
              value={selectedYearId}
              onChange={setSelectedYearId}
              style={{ width: 150 }}
              placeholder="Año académico"
            >
              {academicYears.map((year) => (
                <Select.Option key={year.id} value={year.id}>
                  {year.name} {year.isCurrent && '(Actual)'}
                </Select.Option>
              ))}
            </Select>

            <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
              Actualizar
            </Button>

            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreateReport}
            >
              Nuevo Reporte
            </Button>
          </Space>
        </div>
      </Card>

      {/* Dashboard */}
      <StudentReportsDashboard
        studentId={student.id}
        studentName={`${student.firstName} ${student.lastName}`}
        reports={reports}
        groupedBySubject={groupedBySubject}
        groupedByTag={groupedByCustomTag}
        loading={loading}
        onViewReport={handleViewReport}
        onEditReport={handleEditReport}
        showCreateButton={false}
        onCreateReport={handleCreateReport}
      />

      {/* Editor Drawer */}
      <ReportEditorDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditingReport(null);
        }}
        onSave={handleSaveReport}
        student={{
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          enrollmentNumber: student.enrollmentNumber,
        }}
        teacherSubjects={subjectsAndCategories?.subjects || []}
        customCategories={subjectsAndCategories?.customCategories || []}
        editingReport={editingReport}
        loading={saving}
        loadingSubjects={loadingSubjects}
      />
    </div>
  );
};

export default StudentReportsPage;
