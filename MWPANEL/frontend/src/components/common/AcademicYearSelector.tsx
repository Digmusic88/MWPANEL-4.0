import React, { useEffect, useState } from 'react';
import { Select, Tag, Space } from 'antd';
import apiClient from '@services/apiClient';

export interface AvailableYear {
  id: string;
  name: string;
  isCurrent: boolean;
  isArchived: boolean;
}

export interface AcademicYearSelectorProps {
  studentId?: string;
  value?: string;
  onChange: (academicYearId: string) => void;
  onYearMetaChange?: (meta: { id: string | undefined; isArchived: boolean }) => void;
}

/**
 * Selector de año académico.
 * - Con `studentId`: solo ofrece años CON DATOS para el alumno
 *   (`/grades/student/:id/available-years`).
 * - Sin `studentId` (modo global): lista TODOS los años académicos
 *   (`/academic-years`), para páginas no ligadas a un alumno concreto.
 * Default: el año isCurrent si está en la lista; si no, el más reciente (primero,
 * porque el backend devuelve ordenado por startDate desc).
 * Lista vacía -> deshabilitado con aviso.
 */
const AcademicYearSelector: React.FC<AcademicYearSelectorProps> = ({ studentId, value, onChange, onYearMetaChange }) => {
  const [years, setYears] = useState<AvailableYear[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    const fetchYears = async () => {
      setLoading(true);
      try {
        const url = studentId
          ? `/grades/student/${studentId}/available-years`
          : `/academic-years`;
        const response = await apiClient.get(url);
        const data: AvailableYear[] = response.data || [];
        if (cancelled) return;
        setYears(data);
        // Default: año actual de la lista, o el primero (más reciente)
        // NOTE (parent contract): the parent MUST clear `value` when `studentId` changes;
        // otherwise this guard is skipped and a stale year id from the previous student remains.
        if (!value && data.length > 0) {
          const defaultYear = data.find((y) => y.isCurrent) || data[0];
          onChange(defaultYear.id);
          onYearMetaChange?.({ id: defaultYear.id, isArchived: defaultYear.isArchived ?? false });
        }
      } catch {
        if (!cancelled) setYears([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchYears();
    return () => {
      cancelled = true;
    };
    // Se re-evalúa solo si cambia el alumno (o si se pasa a modo global / viceversa)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  const handleChange = (academicYearId: string) => {
    onChange(academicYearId);
    const selectedYear = years.find((y) => y.id === academicYearId);
    onYearMetaChange?.({ id: academicYearId, isArchived: selectedYear?.isArchived ?? false });
  };

  if (!loading && years.length === 0) {
    return (
      <Select
        style={{ width: 220 }}
        disabled
        placeholder={studentId ? 'Sin datos para este alumno' : 'Sin años académicos'}
        data-testid="academic-year-selector-empty"
      />
    );
  }

  return (
    <Select
      style={{ width: 220 }}
      loading={loading}
      value={value}
      onChange={handleChange}
      placeholder="Año académico"
      data-testid="academic-year-selector"
    >
      {years.map((year) => (
        <Select.Option key={year.id} value={year.id}>
          <Space size={4}>
            {year.name}
            {year.isCurrent && <Tag color="green">Actual</Tag>}
            {year.isArchived && <Tag color="default">Archivado</Tag>}
          </Space>
        </Select.Option>
      ))}
    </Select>
  );
};

export default AcademicYearSelector;
