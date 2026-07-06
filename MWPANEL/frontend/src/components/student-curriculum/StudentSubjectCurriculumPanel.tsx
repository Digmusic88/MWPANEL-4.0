import React, { useCallback, useEffect, useState } from 'react';
import { Card, Select, Tag, Button, Modal, Form, Input, Spin, Empty, Space, Typography, Divider, message } from 'antd';
import { PlusOutlined, SwapOutlined } from '@ant-design/icons';
import { apiClient } from '@services/apiClient';
import { useStudentSubjectCurriculum } from '@hooks/useStudentSubjectCurriculum';
import SaberKnowledgePopover from './SaberKnowledgePopover';

const { Text, Title } = Typography;

interface SubjectOpt { subjectId: string; name: string }
interface CourseOpt { id: string; name: string }

const StudentSubjectCurriculumPanel: React.FC<{ studentId: string; academicYearId: string }> = ({ studentId, academicYearId }) => {
  const { view, loading, saving, load, changeBlock, addCourse, removeCourse } = useStudentSubjectCurriculum();
  const [subjects, setSubjects] = useState<SubjectOpt[]>([]);
  const [courses, setCourses] = useState<CourseOpt[]>([]);
  const [subjectId, setSubjectId] = useState<string | undefined>();
  const [changeOpen, setChangeOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removeCourseId, setRemoveCourseId] = useState<string | undefined>();
  const [form] = Form.useForm();
  const [addForm] = Form.useForm();
  const [removeForm] = Form.useForm();

  useEffect(() => {
    if (!studentId || !academicYearId) return;
    apiClient.get('/grades/student/' + studentId, { params: { academicYearId } })
      .then((r) => setSubjects((r.data?.subjectGrades || []).map((s: any) => ({ subjectId: s.subjectId, name: s.subjectName }))))
      .catch(() => message.error('No se pudieron cargar las asignaturas del alumno'));
    apiClient.get('/educational-levels/courses/all')
      .then((r) => setCourses((r.data || []).map((c: any) => ({ id: c.id, name: c.name }))))
      .catch(() => {});
  }, [studentId, academicYearId]);

  useEffect(() => { if (subjectId) load(studentId, subjectId, academicYearId); }, [subjectId, studentId, academicYearId, load]);

  const onChangeBlock = useCallback(async (values: any) => {
    if (!subjectId) return;
    await changeBlock(studentId, subjectId, { academicYearId, newCourseId: values.courseId, reason: values.reason });
    setChangeOpen(false); form.resetFields();
  }, [subjectId, studentId, academicYearId, changeBlock, form]);

  const onAddCourse = useCallback(async (values: any) => {
    if (!subjectId) return;
    await addCourse(studentId, subjectId, { academicYearId, courseId: values.courseId, reason: values.reason });
    setAddOpen(false); addForm.resetFields();
  }, [subjectId, studentId, academicYearId, addCourse, addForm]);

  const openRemove = useCallback((courseId: string) => { setRemoveCourseId(courseId); setRemoveOpen(true); }, []);

  const onRemoveConfirm = useCallback(async (values: any) => {
    if (!subjectId || !removeCourseId) return;
    await removeCourse(studentId, subjectId, removeCourseId, { academicYearId, reason: values.reason });
    setRemoveOpen(false); setRemoveCourseId(undefined); removeForm.resetFields();
  }, [subjectId, removeCourseId, studentId, academicYearId, removeCourse, removeForm]);

  return (
    <Card size="small">
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Select
          style={{ minWidth: 280 }} placeholder="Elige una asignatura"
          value={subjectId} onChange={setSubjectId}
          options={subjects.map((s) => ({ value: s.subjectId, label: s.name }))}
          showSearch optionFilterProp="label"
        />
        {!subjectId ? <Empty description="Selecciona una asignatura para ver y ajustar su nivel" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          : loading ? <Spin /> : view ? (
          <>
            <Space wrap>
              <Text strong>Cursos activos:</Text>
              {(view.activeCourses || []).length === 0 && <Text type="secondary">Ninguno (usa el curso de referencia)</Text>}
              {(view.activeCourses || []).map((ac) => (
                <Tag key={ac.courseId} color="blue" closable onClose={(e) => { e.preventDefault(); openRemove(ac.courseId); }}>
                  {ac.courseName || ac.courseId}
                </Tag>
              ))}
              <Button size="small" icon={<SwapOutlined />} onClick={() => setChangeOpen(true)} loading={saving}>Cambiar nivel</Button>
              <Button size="small" icon={<PlusOutlined />} onClick={() => setAddOpen(true)} loading={saving}>Añadir segundo curso</Button>
            </Space>
            <Divider style={{ margin: '8px 0' }} />
            {(view.catalog || []).length === 0 ? <Empty description="El/los curso(s) activo(s) no tienen criterios ni saberes LOMLOE cargados para esta asignatura." image={Empty.PRESENTED_IMAGE_SIMPLE} />
              : (view.catalog || []).map((group) => (
              <div key={group.courseId} style={{ marginBottom: 12 }}>
                <Title level={5} style={{ marginBottom: 4 }}>Curso: {group.courseName}</Title>
                {group.competencies.map((comp) => (
                  <div key={comp.id} style={{ marginBottom: 8 }}>
                    <Text strong>{comp.code} — {comp.name}</Text>
                    {comp.criteria.map((c) => (
                      <div key={c.id} style={{ paddingLeft: 12 }}>
                        <Tag>{c.code}</Tag> {c.description} <Tag color="default">sin marcar</Tag>
                      </div>
                    ))}
                  </div>
                ))}
                {(group.saberes || []).length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <Text strong>Saberes básicos del curso</Text>
                    <div style={{ paddingLeft: 12, marginTop: 4 }}>
                      {group.saberes.map((s) => (
                        <Space key={s.id} size={2} style={{ marginRight: 6, marginBottom: 4 }}>
                          <Tag>{s.code || s.title}</Tag><SaberKnowledgePopover saber={s} />
                        </Space>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </>
        ) : null}
      </Space>

      <Modal title="Cambiar nivel de la asignatura" open={changeOpen} onCancel={() => setChangeOpen(false)} onOk={() => form.submit()} okText="Cambiar" confirmLoading={saving}>
        <Form form={form} layout="vertical" onFinish={onChangeBlock}>
          <Form.Item name="courseId" label="Nuevo curso" rules={[{ required: true, message: 'Elige un curso' }]}>
            <Select options={courses.map((c) => ({ value: c.id, label: c.name }))} showSearch optionFilterProp="label" />
          </Form.Item>
          <Form.Item name="reason" label="Motivo (obligatorio)" rules={[{ required: true, message: 'Indica el motivo' }]}>
            <Input.TextArea rows={2} placeholder="p. ej. Tras evaluación inicial no alcanza los criterios de 5º" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="Añadir segundo curso" open={addOpen} onCancel={() => setAddOpen(false)} onOk={() => addForm.submit()} okText="Añadir" confirmLoading={saving}>
        <Form form={addForm} layout="vertical" onFinish={onAddCourse}>
          <Form.Item name="courseId" label="Curso a añadir" rules={[{ required: true, message: 'Elige un curso' }]}>
            <Select options={courses.map((c) => ({ value: c.id, label: c.name }))} showSearch optionFilterProp="label" />
          </Form.Item>
          <Form.Item name="reason" label="Motivo (obligatorio)" rules={[{ required: true, message: 'Indica el motivo' }]}>
            <Input.TextArea rows={2} placeholder="p. ej. Alumno a caballo entre 4º y 5º" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="Retirar curso de la asignatura" open={removeOpen} onCancel={() => { setRemoveOpen(false); setRemoveCourseId(undefined); }} onOk={() => removeForm.submit()} okText="Retirar" okButtonProps={{ danger: true }} confirmLoading={saving}>
        <Form form={removeForm} layout="vertical" onFinish={onRemoveConfirm}>
          <Form.Item name="reason" label="Motivo (obligatorio)" rules={[{ required: true, message: 'Indica el motivo' }]}>
            <Input.TextArea rows={2} placeholder="p. ej. Cerrados los criterios pendientes del curso inferior" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default StudentSubjectCurriculumPanel;
