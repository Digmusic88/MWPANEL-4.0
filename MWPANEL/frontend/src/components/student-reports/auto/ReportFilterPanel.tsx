import React, { useMemo, useState } from 'react';
import { Card, Select, Checkbox, Button, Space, Row, Col, Typography } from 'antd';
import { FileTextOutlined, FilePdfOutlined } from '@ant-design/icons';
import { StudentAutoReportOptions, AutoReportSectionKey } from '@/types/studentAutoReport';

const { Text } = Typography;

const SECTION_TOGGLES: { label: string; keys: AutoReportSectionKey[] }[] = [
  { label: 'Académico', keys: ['academic'] },
  { label: 'Competencias', keys: ['competencies'] },
  { label: 'Socioemocional', keys: ['socioEmotional'] },
  { label: 'Asistencia, DUA y cualitativos', keys: ['attendance', 'dua', 'qualitative'] },
];
const ALL_KEYS = SECTION_TOGGLES.flatMap((t) => t.keys);

export interface FilterConfig {
  academicYearId: string;
  subjectIds: string[];
  activeSections: Set<AutoReportSectionKey>;
  sectionsParam: AutoReportSectionKey[];
  detailed: boolean;
}

interface Props {
  options: StudentAutoReportOptions | null;
  defaultYearId?: string;
  generating: boolean; downloading: boolean; disabled: boolean;
  onGenerate: (cfg: FilterConfig) => void;
  onDownloadPdf: (cfg: FilterConfig) => void;
}

export const ReportFilterPanel: React.FC<Props> = ({ options, defaultYearId, generating, downloading, disabled, onGenerate, onDownloadPdf }) => {
  const years = options?.academicYears ?? [];
  const subjects = options?.subjects ?? [];
  const [yearId, setYearId] = useState<string | undefined>(defaultYearId);
  const [subjectIds, setSubjectIds] = useState<string[]>([]); // vacío = todas
  const [enabledToggles, setEnabledToggles] = useState<string[]>(SECTION_TOGGLES.map((t) => t.label));
  const [detailed, setDetailed] = useState(false);

  const cfg = useMemo<FilterConfig>(() => {
    const keys = SECTION_TOGGLES.filter((t) => enabledToggles.includes(t.label)).flatMap((t) => t.keys);
    return {
      academicYearId: yearId ?? defaultYearId ?? '',
      subjectIds,
      activeSections: new Set<AutoReportSectionKey>(keys),
      sectionsParam: keys.length === ALL_KEYS.length ? [] : keys, // [] => todas (no enviar)
      detailed,
    };
  }, [yearId, defaultYearId, subjectIds, enabledToggles, detailed]);

  const ready = !!cfg.academicYearId && cfg.activeSections.size > 0;

  return (
    <Card title="Configuración del informe" style={{ marginBottom: 16 }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Text>Año académico</Text>
          <Select style={{ width: '100%' }} value={yearId} onChange={setYearId} placeholder="Año"
            options={years.map((y) => ({ value: y.id, label: y.name }))} />
        </Col>
        <Col xs={24} md={16}>
          <Text>Asignaturas (vacío = todas)</Text>
          <Select mode="multiple" allowClear style={{ width: '100%' }} value={subjectIds} onChange={setSubjectIds}
            placeholder="Todas las asignaturas"
            options={subjects.map((s) => ({ value: s.id, label: s.name }))} />
        </Col>
        <Col span={24}>
          <Text>Secciones</Text>
          <div>
            <Checkbox.Group
              options={SECTION_TOGGLES.map((t) => ({ label: t.label, value: t.label }))}
              value={enabledToggles}
              onChange={(v) => setEnabledToggles(v as string[])}
            />
          </div>
        </Col>
        <Col span={24}>
          <Checkbox checked={detailed} onChange={(e) => setDetailed(e.target.checked)}>
            Informe detallado (IA con trabajos concretos + LOMLOE)
          </Checkbox>
        </Col>
        <Col span={24}>
          <Space>
            <Button type="primary" icon={<FileTextOutlined />} loading={generating}
              disabled={disabled || !ready} onClick={() => onGenerate(cfg)}>Generar informe</Button>
            <Button icon={<FilePdfOutlined />} loading={downloading}
              disabled={disabled || !ready} onClick={() => onDownloadPdf(cfg)}>Descargar PDF</Button>
          </Space>
        </Col>
      </Row>
    </Card>
  );
};
