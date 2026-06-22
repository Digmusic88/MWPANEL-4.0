import React, { useState, useEffect } from 'react';
import {
  Drawer, Form, Input, InputNumber, Select, Switch, Button,
  Row, Col, Divider, Alert, Tag, Space, message, Typography, Grid,
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { api } from '../api';
import { useRoomPresence } from '../realtime/useRoomPresence';
import { PresenceBar } from './PresenceBar';
import { EditingBadge } from './EditingBadge';

const { Text } = Typography;

const RELATIONSHIPS = [
  { value: 'madre', label: 'Madre' },
  { value: 'padre', label: 'Padre' },
  { value: 'tutor', label: 'Tutor/a' },
  { value: 'otro', label: 'Otro' },
];
const STATUSES = [
  { value: 'preinscrito', label: 'Preinscrito' },
  { value: 'matriculado', label: 'Matriculado' },
];
const METHODS = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'bizum', label: 'Bizum' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'tpv', label: 'TPV' },
];
const DAYS = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

interface Props {
  open: boolean;
  editingStudentId?: string | null;
  onClose: () => void;
  onSaved: () => void;
}

export function InscripcionDrawer({ open, editingStudentId, onClose, onSaved }: Props) {
  const screens = Grid.useBreakpoint();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [showG2, setShowG2] = useState(false);
  const [matriculaPaid, setMatriculaPaid] = useState(false);
  const [matriculaOverridden, setMatriculaOverridden] = useState(false);
  const [services, setServices] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [scheduleMap, setScheduleMap] = useState<Record<string, any[]>>({});
  const [feeMap, setFeeMap] = useState<Record<string, { matricula: number | null; mensualidad: number | null }>>({});
  const [pendingItems, setPendingItems] = useState<string[]>([]);
  const [isMwPanel, setIsMwPanel] = useState(false);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [families, setFamilies] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);   // servicios inscritos (modo edición)
  const [addSvc, setAddSvc] = useState<string | undefined>();  // servicio a añadir (modo edición)
  const [editUpdatedAt, setEditUpdatedAt] = useState<string | null>(null);

  const { present, startEditing } = useRoomPresence(open && editingStudentId ? `student:${editingStudentId}` : null);

  // Marcar como editando mientras el drawer está abierto en modo edición
  useEffect(() => {
    if (open && editingStudentId) {
      startEditing('ficha');
    }
  }, [open, editingStudentId]);

  const enrollmentsWatch: any[] = Form.useWatch('enrollments', form) || [];
  const matriculaAmountWatch = Form.useWatch('matriculaAmount', form);

  const feeKey = (serviceId?: string, groupId?: string | null) => `${serviceId || ''}|${groupId || ''}`;
  const feeFor = (e: any) => (e?.serviceId ? feeMap[feeKey(e.serviceId, e.groupId)] : undefined);
  const eur = (n: number | null | undefined) => (n == null ? '—' : `${Number(n).toFixed(2)} €`);

  // Desglose de matrícula por servicio inscrito + total resuelto desde tarifas
  const matriculaBreakdown = enrollmentsWatch
    .filter((e) => e?.serviceId)
    .map((e) => ({
      serviceName: services.find((s) => s.id === e.serviceId)?.name || 'Servicio',
      matricula: feeFor(e)?.matricula ?? null,
    }));
  const autoMatriculaTotal = matriculaBreakdown.reduce((sum, b) => sum + (b.matricula || 0), 0);

  // Catálogo
  useEffect(() => {
    api.get('/catalog/services').then(r => setServices(r.data));
    api.get('/catalog/programs').then(r => setPrograms(r.data));
    api.get('/catalog/groups').then(r => setGroups(r.data));
    api.get('/families').then(r => setFamilies(r.data)).catch(() => {});
  }, []);

  // Cargar alumno en modo edición
  useEffect(() => {
    if (!open) { setEditUpdatedAt(null); return; }
    if (editingStudentId) {
      api.get(`/students/${editingStudentId}/full`).then(r => {
        const d = r.data;
        setEditUpdatedAt(d.updatedAt || null);
        setIsMwPanel(!!d.mwpanelStudentId);
        setPendingItems(d.pendingItems || []);
        setEnrollments(d.enrollments || []);
        setFamilyId(d.familyId || null);
        const g1 = d.guardians?.find((g: any) => g.isPrimary);
        const g2 = d.guardians?.find((g: any) => !g.isPrimary);
        if (g2) setShowG2(true);
        form.setFieldsValue({
          firstName: d.firstName,
          lastName: d.lastName,
          birthDate: d.birthDate ? String(d.birthDate).slice(0, 10) : undefined,
          gradeLabel: d.gradeLabel,
          schoolOrigin: d.schoolOrigin,
          address: d.address,
          postalCode: d.postalCode,
          city: d.city,
          notes: d.notes,
          g1FullName: g1?.fullName,
          g1Relationship: g1?.relationship,
          g1Phone: g1?.phone,
          g1PhoneAlt: g1?.phoneAlt,
          g1Email: g1?.email,
          g1Nif: g1?.nif,
          g2FullName: g2?.fullName,
          g2Relationship: g2?.relationship,
          g2Phone: g2?.phone,
          g2PhoneAlt: g2?.phoneAlt,
          g2Email: g2?.email,
          g2Nif: g2?.nif,
        });
      });
    } else {
      form.resetFields();
      setShowG2(false);
      setMatriculaPaid(false);
      setPendingItems([]);
      setEnrollments([]);
      setAddSvc(undefined);
      setIsMwPanel(false);
      setFamilyId(null);
      // Restaura el borrador de una inscripción nueva sin terminar (autoguardado)
      try {
        const draft = localStorage.getItem('inscripcion_draft');
        if (draft) {
          const v = JSON.parse(draft);
          form.setFieldsValue(v);
          if (v.g2FullName) setShowG2(true);
        }
      } catch { /* borrador inválido */ }
    }
  }, [open, editingStudentId]);

  // Cargar horario de un grupo cuando se selecciona
  const loadSchedule = async (groupId: string) => {
    if (!groupId || scheduleMap[groupId] !== undefined) return;
    try {
      const r = await api.get('/schedule', { params: { groupId } });
      setScheduleMap(prev => ({ ...prev, [groupId]: r.data }));
    } catch { /* sin horario */ }
  };

  const formatSchedule = (slots: any[]) => {
    if (!slots?.length) return 'Sin horario configurado';
    return slots.map(s => `${DAYS[s.weekday]} ${s.startTime}–${s.endTime}`).join(' · ');
  };

  // Grupos del servicio seleccionado
  const groupsForService = (serviceId: string) => {
    const progIds = programs.filter(p => p.serviceId === serviceId).map(p => p.id);
    return groups.filter(g => progIds.includes(g.programId));
  };

  // --- Edición de servicios inscritos (modo edición) — cambios inmediatos, como en Matrículas ---
  const reloadEnrollments = async () => {
    if (!editingStudentId) return;
    try {
      const { data } = await api.get(`/students/${editingStudentId}/full`);
      setEditUpdatedAt(data.updatedAt || null);
      setEnrollments(data.enrollments || []);
      setPendingItems(data.pendingItems || []);
      onSaved(); // refresca el listado de Alumnos del fondo
    } catch { /* ignore */ }
  };
  const changeEnrService = async (enrId: string, serviceId: string) => {
    try {
      const { data } = await api.patch(`/enrollments/${enrId}`, { serviceId });
      if (data?.ok === false) message.warning(data.error || 'No se pudo cambiar el servicio');
      else message.success('Servicio cambiado (se ha quitado el grupo anterior)');
      reloadEnrollments();
    } catch { message.error('Error al cambiar el servicio'); }
  };
  const changeEnrGroup = async (enrId: string, groupId: string | null) => {
    try { await api.patch(`/enrollments/${enrId}`, { groupId: groupId || null }); message.success('Grupo actualizado'); reloadEnrollments(); }
    catch { message.error('Error al asignar el grupo'); }
  };
  const changeEnrStatus = async (enrId: string, status: string) => {
    try { await api.patch(`/enrollments/${enrId}`, { status }); message.success('Estado actualizado'); reloadEnrollments(); }
    catch { message.error('Error al cambiar el estado'); }
  };
  const addEnrService = async () => {
    if (!addSvc || !editingStudentId) return;
    try {
      const { data } = await api.post(`/students/${editingStudentId}/enroll`, { serviceId: addSvc });
      if (data?.ok === false) message.warning(data.error || 'No se pudo añadir el servicio');
      else message.success('Servicio añadido (preinscrito)');
      setAddSvc(undefined); reloadEnrollments();
    } catch { message.error('Error al añadir el servicio'); }
  };
  const removeEnrService = async (enrId: string) => {
    if (!window.confirm('¿Dar de baja este servicio del alumno?')) return;
    try { await api.patch(`/enrollments/${enrId}`, { status: 'baja' }); message.success('Servicio dado de baja'); reloadEnrollments(); }
    catch { message.error('Error al dar de baja'); }
  };

  // Registra la cuenta bancaria/domiciliación de la familia (de cara a la remesa SEPA), si se indicó IBAN.
  const saveIban = async (famId: string | null, values: any) => {
    if (!famId || !values.iban) return;
    try {
      await api.post(`/sepa/families/${famId}/bank-accounts`, {
        iban: values.iban, holderName: values.ibanHolder || undefined,
        mandateRef: values.mandateRef || undefined, mandateDate: values.mandateDate || undefined,
      });
    } catch (e: any) { message.warning('Alumno guardado, pero el IBAN no se pudo registrar: ' + (e?.response?.data?.message || 'revísalo en Familias')); }
  };

  const handleSave = async (values: any) => {
    setSaving(true);
    try {
      if (editingStudentId) {
        // Modo edición: actualizar alumno + tutores
        await api.patch(`/students/${editingStudentId}/full`, {
          expectedUpdatedAt: editUpdatedAt ?? undefined,
          student: {
            firstName: values.firstName,
            lastName: values.lastName,
            birthDate: values.birthDate || null,
            gradeLabel: values.gradeLabel || null,
            schoolOrigin: values.schoolOrigin || null,
            address: values.address || null,
            postalCode: values.postalCode || null,
            city: values.city || null,
            notes: values.notes || null,
          },
          guardian1: values.g1FullName ? {
            fullName: values.g1FullName, relationship: values.g1Relationship,
            phone: values.g1Phone, phoneAlt: values.g1PhoneAlt,
            email: values.g1Email, nif: values.g1Nif,
          } : undefined,
          guardian2: showG2 && values.g2FullName ? {
            fullName: values.g2FullName, relationship: values.g2Relationship,
            phone: values.g2Phone, phoneAlt: values.g2PhoneAlt,
            email: values.g2Email, nif: values.g2Nif,
          } : undefined,
        });
        await saveIban(familyId, values);
        message.success('Alumno actualizado');
      } else {
        // Modo creación: inscripción completa
        const enrollments = (values.enrollments || []).map((e: any) => ({
          serviceId: e.serviceId,
          groupId: e.groupId || null,
          status: e.status || 'preinscrito',
          customFee: e.customFee ?? null,
        }));
        const res = await api.post('/students/full-enroll', {
          familyId: familyId || undefined,
          student: {
            firstName: values.firstName,
            lastName: values.lastName || null,
            birthDate: values.birthDate || null,
            gradeLabel: values.gradeLabel || null,
            schoolOrigin: values.schoolOrigin || null,
            address: values.address || null,
            postalCode: values.postalCode || null,
            city: values.city || null,
            notes: values.notes || null,
          },
          guardian1: values.g1FullName ? {
            fullName: values.g1FullName, relationship: values.g1Relationship || 'tutor',
            phone: values.g1Phone || null, phoneAlt: values.g1PhoneAlt || null,
            email: values.g1Email || null, nif: values.g1Nif || null,
          } : undefined,
          guardian2: showG2 && values.g2FullName ? {
            fullName: values.g2FullName, relationship: values.g2Relationship || 'tutor',
            phone: values.g2Phone || null, phoneAlt: values.g2PhoneAlt || null,
            email: values.g2Email || null, nif: values.g2Nif || null,
          } : undefined,
          enrollments,
          matriculaPaid: matriculaPaid ? {
            method: values.matriculaMethod,
            amount: values.matriculaAmount,
            date: values.matriculaDate || new Date().toISOString().slice(0, 10),
          } : undefined,
        });
        await saveIban(res?.data?.family?.id || null, values);
        try { localStorage.removeItem('inscripcion_draft'); } catch { /* */ }
        message.success('Inscripción completada');
      }
      onClose();
      onSaved();
    } catch (e: any) {
      // 409 VERSION_CONFLICT: the response interceptor in api.ts already shows the warning; skip generic error.
      if (e?.response?.status !== 409 || e?.response?.data?.code !== 'VERSION_CONFLICT') {
        message.error(e?.response?.data?.message || 'Error al guardar');
      }
    } finally {
      setSaving(false);
    }
  };

  const isEditMode = !!editingStudentId;
  const title = isEditMode ? 'Editar alumno' : 'Nueva inscripción';

  return (
    <Drawer
      title={title}
      open={open}
      onClose={onClose}
      width={screens.md ? 700 : '100%'}
      extra={isEditMode ? <PresenceBar present={present} /> : null}
      footer={
        <div style={{ textAlign: 'right' }}>
          <Button onClick={onClose} style={{ marginRight: 8 }}>Cancelar</Button>
          <Button type="primary" loading={saving} onClick={() => form.submit()}>
            Guardar
          </Button>
        </div>
      }
    >
      {/* Alert de pendientes en modo edición */}
      {isEditMode && pendingItems.length > 0 && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message={`Pendientes: ${pendingItems.join(', ')}`}
        />
      )}
      {/* Aviso de otro usuario editando simultáneamente */}
      {isEditMode && <EditingBadge present={present} targetKey="ficha" />}

      <Form form={form} layout="vertical" onFinish={handleSave}
        onValuesChange={(_, all) => { if (!editingStudentId) { try { localStorage.setItem('inscripcion_draft', JSON.stringify(all)); } catch { /* */ } } }}>

        {/* ① ALUMNO */}
        <Divider orientation="left">① Alumno</Divider>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="firstName" label="Nombre" rules={[{ required: true, message: 'El nombre es obligatorio' }]}>
              <Input disabled={isMwPanel} placeholder="Nombre" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="lastName" label="Apellidos">
              <Input disabled={isMwPanel} placeholder="Apellidos" />
            </Form.Item>
          </Col>
        </Row>
        {isMwPanel && (
          <Alert type="info" showIcon style={{ marginBottom: 12 }}
            message="Nombre y apellidos provienen de MW Panel y no son editables aquí." />
        )}
        <Row gutter={12}>
          <Col span={8}>
            <Form.Item name="birthDate" label="Fecha de nacimiento">
              <Input type="date" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="gradeLabel" label="Curso / nivel">
              <Input placeholder="Ej.: 3º Primaria" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="schoolOrigin" label="Centro escolar">
              <Input placeholder="Colegio de origen" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="address" label="Dirección postal">
              <Input placeholder="Calle, número, piso…" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="postalCode" label="Código postal">
              <Input placeholder="31001" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="city" label="Localidad">
              <Input placeholder="Pamplona" />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="notes" label="Notas internas">
          <Input.TextArea rows={2} />
        </Form.Item>

        {/* ② FAMILIA Y TUTORES */}
        <Divider orientation="left">② Familia y tutores</Divider>

        {!isEditMode && (
          <Form.Item label="¿Pertenece a una familia ya inscrita en el centro? (hermano/a)">
            <Select
              showSearch allowClear
              placeholder="Buscar familia existente… (déjalo vacío para crear una familia nueva)"
              optionFilterProp="label"
              value={familyId || undefined}
              onChange={(v) => setFamilyId(v || null)}
              options={families.map((f: any) => ({ value: f.id, label: f.displayName }))}
            />
          </Form.Item>
        )}

        {!isEditMode && familyId && (
          <Alert type="success" showIcon style={{ marginBottom: 12 }}
            message="El alumno se añadirá a la familia seleccionada."
            description="Se reutilizan sus tutores y domiciliación existentes. No hace falta rellenar los tutores; si añades alguno, se sumará a la familia." />
        )}

        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
          Tutor/a principal
        </Text>
        <Row gutter={12}>
          <Col span={16}>
            <Form.Item name="g1FullName" label="Nombre completo" rules={[{ required: !isEditMode && !familyId, message: 'Nombre del tutor obligatorio' }]}>
              <Input placeholder="Nombre y apellidos" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="g1Relationship" label="Relación">
              <Select options={RELATIONSHIPS} placeholder="Relación" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={12}>
          <Col span={8}>
            <Form.Item name="g1Phone" label="Teléfono" rules={[{ required: !isEditMode && !familyId, message: 'Teléfono obligatorio' }]}>
              <Input placeholder="6XX XXX XXX" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="g1PhoneAlt" label="Teléfono alternativo">
              <Input />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="g1Email" label="Email">
              <Input type="email" />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="g1Nif" label="NIF / DNI (opcional)">
          <Input style={{ width: 180 }} />
        </Form.Item>

        {!showG2 ? (
          <Button type="dashed" icon={<PlusOutlined />} onClick={() => setShowG2(true)} style={{ marginBottom: 12 }}>
            Añadir segundo tutor/a
          </Button>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Tutor/a secundario/a</Text>
              <Button size="small" icon={<DeleteOutlined />} onClick={() => setShowG2(false)} danger>Quitar</Button>
            </div>
            <Row gutter={12}>
              <Col span={16}>
                <Form.Item name="g2FullName" label="Nombre completo">
                  <Input placeholder="Nombre y apellidos" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="g2Relationship" label="Relación">
                  <Select options={RELATIONSHIPS} placeholder="Relación" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={12}>
              <Col span={8}>
                <Form.Item name="g2Phone" label="Teléfono"><Input /></Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="g2PhoneAlt" label="Teléfono alternativo"><Input /></Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="g2Email" label="Email"><Input type="email" /></Form.Item>
              </Col>
            </Row>
            <Form.Item name="g2Nif" label="NIF / DNI (opcional)">
              <Input style={{ width: 180 }} />
            </Form.Item>
          </>
        )}

        {/* DOMICILIACIÓN (SEPA) — opcional */}
        <Divider orientation="left">Domiciliación (SEPA) — opcional</Divider>
        <Alert type="info" showIcon style={{ marginBottom: 12 }}
          message="Cuenta bancaria de la familia para la remesa SEPA"
          description="Si la indicas aquí, queda registrada en la familia (IBAN cifrado). El mandato puedes detallarlo ahora o después en Familias → Domiciliación." />
        <Row gutter={12}>
          <Col xs={24} md={14}><Form.Item name="iban" label="IBAN"><Input placeholder="ES## #### #### #### #### ####" /></Form.Item></Col>
          <Col xs={24} md={10}><Form.Item name="ibanHolder" label="Titular de la cuenta"><Input placeholder="Nombre del titular" /></Form.Item></Col>
          <Col xs={24} md={14}><Form.Item name="mandateRef" label="Referencia del mandato (opcional)"><Input placeholder="Se genera una si lo dejas vacío" /></Form.Item></Col>
          <Col xs={24} md={10}><Form.Item name="mandateDate" label="Fecha del mandato (opcional)"><Input type="date" /></Form.Item></Col>
        </Row>

        {/* ③ INSCRIPCIÓN — solo en modo creación */}
        {!isEditMode && (
          <>
            <Divider orientation="left">③ Inscripción</Divider>
            <Form.List name="enrollments">
              {(fields, { add, remove }) => (
                <>
                  {fields.map((field) => {
                    const serviceId = form.getFieldValue(['enrollments', field.name, 'serviceId']);
                    const groupId   = form.getFieldValue(['enrollments', field.name, 'groupId']);
                    const slots     = groupId ? (scheduleMap[groupId] ?? null) : null;
                    const svcGroups = serviceId ? groupsForService(serviceId) : [];
                    return (
                      <div key={field.key} style={{ border: '1px solid #f0f0f0', borderRadius: 6, padding: 12, marginBottom: 12 }}>
                        <Row gutter={12} align="middle">
                          <Col span={20}>
                            <Form.Item
                              {...field}
                              name={[field.name, 'serviceId']}
                              label="Servicio"
                              rules={[{ required: true, message: 'Elige un servicio' }]}
                              style={{ marginBottom: 8 }}
                            >
                              <Select
                                placeholder="Servicio"
                                options={services.map(s => ({ value: s.id, label: s.name }))}
                                onChange={() => form.setFieldValue(['enrollments', field.name, 'groupId'], undefined)}
                              />
                            </Form.Item>
                          </Col>
                          <Col span={4} style={{ textAlign: 'right', paddingTop: 28 }}>
                            <Button size="small" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} />
                          </Col>
                        </Row>
                        <Row gutter={12}>
                          <Col span={14}>
                            <Form.Item
                              name={[field.name, 'groupId']}
                              label="Grupo"
                              style={{ marginBottom: 4 }}
                            >
                              <Select
                                allowClear
                                placeholder="Sin asignar"
                                options={svcGroups.map(g => ({ value: g.id, label: g.name }))}
                                onChange={(val) => val && loadSchedule(val)}
                                disabled={!serviceId}
                              />
                            </Form.Item>
                            {slots !== null && (
                              <Text type="secondary" style={{ fontSize: 11 }}>
                                {formatSchedule(slots)}
                              </Text>
                            )}
                          </Col>
                          <Col span={5}>
                            <Form.Item name={[field.name, 'status']} label="Estado" style={{ marginBottom: 4 }}>
                              <Select options={STATUSES} defaultValue="preinscrito" />
                            </Form.Item>
                          </Col>
                          <Col span={5}>
                            <Form.Item name={[field.name, 'customFee']} label="Tarifa override" style={{ marginBottom: 4 }}>
                              <InputNumber min={0} style={{ width: '100%' }} placeholder="Auto" addonAfter="€" />
                            </Form.Item>
                          </Col>
                        </Row>
                      </div>
                    );
                  })}
                  <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ status: 'preinscrito' })} block>
                    Añadir servicio
                  </Button>
                </>
              )}
            </Form.List>
          </>
        )}

        {/* Servicios en modo edición — edición inmediata (igual que Matrículas) */}
        {isEditMode && (
          <>
            <Divider orientation="left">③ Servicios inscritos</Divider>
            <Alert type="info" showIcon style={{ marginBottom: 12 }}
              message="Edita aquí los servicios del alumno"
              description="Cambia el servicio, el grupo o el estado de cada matrícula, añade un servicio nuevo o da de baja uno. Los cambios se guardan al instante (no hace falta pulsar Guardar). Al cambiar de servicio se quita el grupo anterior." />
            {enrollments.length === 0 && (
              <Alert type="warning" showIcon style={{ marginBottom: 12 }}
                message="Este alumno no tiene servicios este curso. Añade uno abajo." />
            )}
            {enrollments.map((en: any) => {
              const svcGroups = groupsForService(en.serviceId);
              return (
                <div key={en.id} style={{ border: '1px solid #f0f0f0', borderRadius: 6, padding: 12, marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Servicio</Text>
                    <Button size="small" danger icon={<DeleteOutlined />} onClick={() => removeEnrService(en.id)}>
                      Dar de baja
                    </Button>
                  </div>
                  <Select
                    style={{ width: '100%', marginBottom: 8 }}
                    value={en.serviceId}
                    onChange={(v) => changeEnrService(en.id, v)}
                    options={services.map(s => ({ value: s.id, label: s.name }))}
                  />
                  <Row gutter={12}>
                    <Col span={14}>
                      <Text type="secondary" style={{ fontSize: 12 }}>Grupo</Text>
                      <Select
                        allowClear style={{ width: '100%' }}
                        placeholder={svcGroups.length ? 'Sin grupo' : 'Sin grupos en este servicio'}
                        value={en.groupId || undefined}
                        onChange={(v) => changeEnrGroup(en.id, v || null)}
                        options={svcGroups.map(g => ({ value: g.id, label: g.name }))}
                      />
                    </Col>
                    <Col span={10}>
                      <Text type="secondary" style={{ fontSize: 12 }}>Estado</Text>
                      <Select
                        style={{ width: '100%' }}
                        value={en.status}
                        onChange={(v) => changeEnrStatus(en.id, v)}
                        options={[
                          { value: 'preinscrito', label: 'Preinscrito' },
                          { value: 'matriculado', label: 'Matriculado' },
                          { value: 'lista_espera', label: 'Lista de espera' },
                          { value: 'baja', label: 'Baja' },
                        ]}
                      />
                    </Col>
                  </Row>
                </div>
              );
            })}
            <Row gutter={8}>
              <Col flex="auto">
                <Select
                  style={{ width: '100%' }}
                  placeholder="Añadir un servicio nuevo…"
                  value={addSvc}
                  onChange={setAddSvc}
                  options={services.filter(s => !enrollments.some((en: any) => en.serviceId === s.id)).map(s => ({ value: s.id, label: s.name }))}
                />
              </Col>
              <Col>
                <Button type="dashed" icon={<PlusOutlined />} disabled={!addSvc} onClick={addEnrService}>Añadir</Button>
              </Col>
            </Row>
          </>
        )}
        {/* ④ PAGO MATRÍCULA — solo en modo creación */}
        {!isEditMode && (
          <>
            <Divider orientation="left">④ Pago de matrícula</Divider>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <Switch checked={matriculaPaid} onChange={setMatriculaPaid} />
              <Text>Cobrar matrícula ahora</Text>
            </div>
            {matriculaPaid && (
              <Row gutter={12}>
                <Col span={8}>
                  <Form.Item name="matriculaMethod" label="Método" rules={[{ required: true }]}>
                    <Select options={METHODS} placeholder="Método" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="matriculaAmount" label="Importe" rules={[{ required: true }]}>
                    <InputNumber min={0} style={{ width: '100%' }} addonAfter="€" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="matriculaDate" label="Fecha">
                    <Input type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
                  </Form.Item>
                </Col>
              </Row>
            )}
          </>
        )}

      </Form>
    </Drawer>
  );
}
