import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Select, Spin, Alert, Typography, message } from 'antd';
import { useParams } from 'react-router-dom';
import { useStudentAutoReport } from '@/hooks/useStudentAutoReport';
import { ReportFilterPanel, FilterConfig } from '@/components/student-reports/auto/ReportFilterPanel';
import { ReportView } from '@/components/student-reports/auto/ReportView';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import studentsService, { Student } from '@/services/studentsService';

const { Title } = Typography;

interface Props {
  role: 'teacher' | 'admin';
}

export const StudentAutoReportPage: React.FC<Props> = ({ role }) => {
  const params = useParams<{ studentId?: string }>();
  const { currentAcademicYear } = useAcademicYear();
  const {
    options,
    report,
    loadingOptions,
    generating,
    downloading,
    error,
    loadOptions,
    generate,
    downloadPdf,
  } = useStudentAutoReport();

  const [students, setStudents] = useState<{ id: string; name: string }[]>([]);
  const [studentId, setStudentId] = useState<string | undefined>(params.studentId);
  const [studentName, setStudentName] = useState<string>('');
  const [activeSections, setActiveSections] = useState<FilterConfig['activeSections']>(new Set());

  // Load student list only when no studentId comes from the route
  useEffect(() => {
    if (params.studentId) return;
    const fetchStudents = async () => {
      try {
        const list: Student[] =
          role === 'teacher'
            ? await studentsService.getMyStudents()
            : await studentsService.getStudents();
        setStudents(
          (list || []).map((s) => ({
            id: s.id,
            name: `${s.user?.profile?.firstName ?? ''} ${s.user?.profile?.lastName ?? ''}`.trim(),
          })),
        );
      } catch {
        message.error('No se pudo cargar la lista de alumnos');
      }
    };
    fetchStudents();
  }, [role, params.studentId]);

  // When studentId is fixed, load options
  useEffect(() => {
    if (studentId) {
      loadOptions(studentId);
    }
  }, [studentId, loadOptions]);

  // When studentId comes from the route, fetch the student name for the PDF filename
  useEffect(() => {
    if (!params.studentId) return;
    studentsService
      .getStudent(params.studentId)
      .then((s: Student) =>
        setStudentName(
          `${s.user?.profile?.firstName ?? ''} ${s.user?.profile?.lastName ?? ''}`.trim(),
        ),
      )
      .catch(() => setStudentName('alumno'));
  }, [params.studentId]);

  const resolvedName = useMemo(
    () => studentName || students.find((s) => s.id === studentId)?.name || 'alumno',
    [studentName, students, studentId],
  );

  const buildBody = useCallback(
    (cfg: FilterConfig): Parameters<typeof generate>[0] => ({
      studentId: studentId!,
      academicYearId: cfg.academicYearId,
      subjectIds: cfg.subjectIds.length ? cfg.subjectIds : undefined,
      sections: cfg.sectionsParam.length ? cfg.sectionsParam : undefined,
      detailed: cfg.detailed || undefined,
    }),
    [studentId],
  );

  const handleGenerate = useCallback(
    (cfg: FilterConfig) => {
      setActiveSections(cfg.activeSections);
      generate(buildBody(cfg));
    },
    [generate, buildBody],
  );

  const handlePdf = useCallback(
    (cfg: FilterConfig) => {
      downloadPdf(buildBody(cfg), resolvedName);
    },
    [downloadPdf, buildBody, resolvedName],
  );

  return (
    <div style={{ padding: 16 }}>
      <Title level={3}>Informe automático del alumno</Title>

      {!params.studentId && (
        <Card style={{ marginBottom: 16 }}>
          <Select
            showSearch
            optionFilterProp="label"
            style={{ width: 360, maxWidth: '100%' }}
            placeholder="Selecciona un alumno"
            value={studentId}
            onChange={setStudentId}
            options={students.map((s) => ({ value: s.id, label: s.name }))}
          />
        </Card>
      )}

      {error && (
        <Alert type="error" message={error} style={{ marginBottom: 16 }} showIcon />
      )}

      {studentId &&
        (loadingOptions ? (
          <Spin />
        ) : (
          <ReportFilterPanel
            options={options}
            defaultYearId={currentAcademicYear?.id}
            generating={generating}
            downloading={downloading}
            disabled={!studentId}
            onGenerate={handleGenerate}
            onDownloadPdf={handlePdf}
          />
        ))}

      {report && <ReportView result={report} activeSections={activeSections} />}
    </div>
  );
};

export default StudentAutoReportPage;
