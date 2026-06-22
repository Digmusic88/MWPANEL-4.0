import React, { useEffect, useState, useRef, useMemo, createContext, useContext } from 'react';
import {
  Layout, Menu, Button, Form, Input, Card, Typography, message, Alert, Table, Modal,
  Select, InputNumber, Tag, Space, Tooltip, Statistic, Row, Col, Popconfirm, Switch, Checkbox, Dropdown, Empty, Progress, Drawer, Calendar, Badge, Grid, Tabs,
} from 'antd';
import {
  DashboardOutlined, TeamOutlined, UserAddOutlined, EuroOutlined, LogoutOutlined,
  QuestionCircleOutlined, PlusOutlined, WarningOutlined, FilterOutlined, FormOutlined,
  AppstoreOutlined, HistoryOutlined, CalendarOutlined, MenuOutlined, SearchOutlined, LoginOutlined, SettingOutlined,
} from '@ant-design/icons';
import { api, setToken, clearToken, getToken, beginImpersonation, endImpersonation, isImpersonating } from './api';
import { InscripcionDrawer } from './components/InscripcionDrawer';
import { useLiveQuery } from './realtime/useLiveQuery';
import { useRoomPresence } from './realtime/useRoomPresence';
import { PresenceBar } from './components/PresenceBar';
import { EditingBadge } from './components/EditingBadge';

const { Header, Sider, Content } = Layout;
const { Title, Text, Paragraph } = Typography;

// Formato de fecha unificado en toda la plataforma: dd-mm-yyyy (acepta ISO yyyy-mm-dd, Date o string).
const fmtDate = (d?: any): string => {
  if (!d) return '—';
  const s = String(d).slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : s;
};

// ----------------------------- LOGIN -----------------------------
function Login({ onLogin }: { onLogin: (u: any) => void }) {
  const [loading, setLoading] = useState(false);
  const submit = async (v: any) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', v);
      setToken(data.access_token);
      onLogin(data.user);
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'No se pudo iniciar sesión');
    } finally { setLoading(false); }
  };
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#FAFAF8', backgroundImage: 'radial-gradient(circle at 1px 1px, #E2DDD8 1px, transparent 0)', backgroundSize: '28px 28px' }}>
      <Card style={{ width: 390, boxShadow: '0 8px 24px -4px rgba(30,30,48,0.10), 0 4px 12px -2px rgba(30,30,48,0.06)' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <img src="/logo.svg" alt="Mundo World" style={{ width: 56, height: 56, objectFit: 'contain', marginBottom: 12 }} />
          <Title level={3} style={{ marginBottom: 0 }}>Secretaría</Title>
          <Text type="secondary" style={{ letterSpacing: '0.03em' }}>Mundo World</Text>
        </div>
        <Alert type="info" showIcon style={{ marginBottom: 16 }}
          message="Entra con tu cuenta de MW Panel"
          description="Usa el mismo correo y contraseña que en la plataforma. Necesitas tener permiso de Secretaría." />
        <Form layout="vertical" onFinish={submit}>
          <Form.Item name="email" label="Correo" rules={[{ required: true }]}><Input autoComplete="username" /></Form.Item>
          <Form.Item name="password" label="Contraseña" rules={[{ required: true }]}><Input.Password autoComplete="current-password" /></Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>Entrar</Button>
        </Form>
      </Card>
    </div>
  );
}

// ----------------------------- AYUDA reutilizable -----------------------------
function Ayuda({ title, children }: { title: string; children: React.ReactNode }) {
  return <Alert type="info" showIcon icon={<QuestionCircleOutlined />} style={{ marginBottom: 16 }}
    message={title} description={children} closable />;
}

// ----------------------------- BÚSQUEDA GLOBAL -----------------------------
// Un único buscador (en la cabecera) cuyo texto filtra TODOS los listados/tablas
// de la plataforma a la vez. Las tablas y tableros leen esta query desde el contexto.
const SearchContext = createContext<string>('');
const useSearch = () => useContext(SearchContext);

// ----------------------------- BÚSQUEDA reutilizable -----------------------------
// Coincidencia de texto contra todos los valores (incluidos anidados) de una fila.
function matchesText(row: any, q: string): boolean {
  if (!q) return true;
  const clean = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const flat = (v: any): string => {
    if (v == null) return '';
    if (Array.isArray(v)) return v.map(flat).join(' ');
    if (typeof v === 'object') return Object.values(v).map(flat).join(' ');
    return String(v);
  };
  return clean(flat(row)).includes(clean(q));
}

// Tabla que se filtra con el buscador GLOBAL de la cabecera (sin buscador propio).
// El texto del buscador único filtra en cliente sobre las filas ya cargadas.
function SearchableTable({ dataSource, searchPlaceholder, scroll, ...rest }: any) {
  const q = useSearch();
  const data = q ? (dataSource || []).filter((r: any) => matchesText(r, q)) : dataSource;
  return <Table dataSource={data} scroll={scroll ?? { x: 'max-content' }} {...rest} />;
}

// ----------------------------- AVISO DE FALTAS SEGUIDAS -----------------------------
// Avisa de alumnos con 3+ faltas (ausencias) en sesiones consecutivas. Visible al profesor
// (sus grupos) y a administración (todo el centro). Se calcula en vivo desde la asistencia.
function AbsenceAlerts() {
  const [rows, setRows] = useState<any[]>([]);
  const [fichaId, setFichaId] = useState<string | undefined>();
  useEffect(() => { api.get('/attendance/alerts').then(r => setRows(r.data || [])).catch(() => {}); }, []);
  if (!rows.length) return null;
  return (
    <>
    <Alert type="warning" showIcon style={{ marginBottom: 16 }}
      message={`${rows.length} alumno/s con 3 o más faltas seguidas`}
      description={
        <div style={{ maxHeight: 180, overflowY: 'auto' }}>
          {rows.map((r: any) => (
            <div key={r.enrollmentId} style={{ fontSize: 13, marginBottom: 2 }}>
              <a onClick={() => setFichaId(r.studentId)} title="Ver ficha (datos y teléfonos para avisar a la familia)"><b>{r.studentName}</b></a>
              {' — '}<b style={{ color: '#cf1322' }}>{r.consecutiveAbsences}</b> faltas seguidas
              {' · '}{r.serviceName}{r.groupName ? ` · ${r.groupName}` : ' · sin grupo'}
              {r.teacherName ? ` · ${r.teacherName}` : ''}{' · última: '}{fmtDate(r.lastAbsence)}
              {' · '}<a onClick={() => setFichaId(r.studentId)}>ver ficha</a>
            </div>
          ))}
        </div>
      } />
    <FichaAlumno studentId={fichaId} open={!!fichaId} onClose={() => setFichaId(undefined)} />
    </>
  );
}

// Avisa de alumnos con 3+ "rojas" (no hizo la tarea) en sesiones consecutivas. Visible al
// profesor (sus grupos) y a administración. Análogo al aviso de faltas.
function TaskAlerts() {
  const [rows, setRows] = useState<any[]>([]);
  const [fichaId, setFichaId] = useState<string | undefined>();
  useEffect(() => { api.get('/tareas/alerts').then(r => setRows(r.data || [])).catch(() => {}); }, []);
  if (!rows.length) return null;
  return (
    <>
    <Alert type="warning" showIcon style={{ marginBottom: 16 }}
      message={`${rows.length} alumno/s con 3 o más tareas sin hacer seguidas`}
      description={
        <div style={{ maxHeight: 180, overflowY: 'auto' }}>
          {rows.map((r: any) => (
            <div key={r.enrollmentId} style={{ fontSize: 13, marginBottom: 2 }}>
              <a onClick={() => setFichaId(r.studentId)} title="Ver ficha (datos y teléfonos para avisar a la familia)"><b>{r.studentName}</b></a>
              {' — '}<b style={{ color: '#cf1322' }}>{r.consecutiveMissed}</b> tareas sin hacer seguidas
              {' · '}{r.serviceName}{r.groupName ? ` · ${r.groupName}` : ' · sin grupo'}
              {r.teacherName ? ` · ${r.teacherName}` : ''}{' · última: '}{fmtDate(r.lastMissed)}
              {' · '}<a onClick={() => setFichaId(r.studentId)}>ver ficha</a>
            </div>
          ))}
        </div>
      } />
    <FichaAlumno studentId={fichaId} open={!!fichaId} onClose={() => setFichaId(undefined)} />
    </>
  );
}

// ----------------------------- DASHBOARD -----------------------------
function Dashboard({ user }: { user?: any }) {
  const roles: string[] = user?.secretariaRoles || [];
  const isOnlyTeacher = roles.includes('secretaria_teacher')
    && !roles.some(r => ['secretaria_admin', 'secretaria_staff', 'direccion'].includes(r));
  const [s, setS] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (isOnlyTeacher) return; // el profesor no accede a datos globales (RGPD)
    setLoading(true);
    api.get('/stats/overview').then(r => setS(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [isOnlyTeacher]);
  if (isOnlyTeacher) {
    return (
      <div>
        <Title level={3}>Inicio</Title>
        <Ayuda title="Bienvenido/a">
          Aquí ves el <b>calendario</b> del centro y los <b>próximos eventos</b>. Desde el menú accedes a tus tareas docentes:
          <b> Asistencia</b>, <b>Registro de tareas</b>, <b>Simulacros</b>, <b>Horarios</b>, <b>Pruebas de nivel</b> y los <b>Grupos de chat</b>.
        </Ayuda>
        <AbsenceAlerts />
        <TaskAlerts />
        <EventosPanel />
      </div>
    );
  }
  const eur = (n: any) => `${Number(n || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
  const fin = s?.finance || {};
  const totalFacturado = Number(fin.cobrado || 0) + Number(fin.pendiente || 0);
  const pctCobrado = totalFacturado > 0 ? Math.round((Number(fin.cobrado || 0) / totalFacturado) * 100) : 0;
  const docTotal = s?.documents?.total || 0;
  const pctDoc = docTotal > 0 ? Math.round(((s?.documents?.recibido || 0) / docTotal) * 100) : 0;
  const card = (title: string, value: any, opts: any = {}) => (
    <Col xs={12} sm={8} md={6} lg={4}><Card size="small"><Statistic title={title} value={value} {...opts} /></Card></Col>
  );
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
        <Title level={3} style={{ margin: 0 }}>Estadísticas {s?.yearLabel ? <Text type="secondary" style={{ fontSize: 14 }}>· curso {s.yearLabel}</Text> : null}</Title>
        <Button onClick={() => { setLoading(true); api.get('/stats/overview').then(r => setS(r.data)).finally(() => setLoading(false)); }} loading={loading}>Actualizar</Button>
      </div>
      <AbsenceAlerts />
      <TaskAlerts />
      <Ayuda title="Resumen del centro de un vistazo">
        Visión global para administración: alumnado, matrículas por servicio, ocupación de grupos, situación económica
        (cobrado, pendiente, morosidad) y estado de la documentación del curso activo.
      </Ayuda>
      {!s ? <Card loading /> : (<>
        {/* Indicadores principales */}
        <Row gutter={[12, 12]}>
          {card('Alumnos activos', s.students.total, { prefix: <TeamOutlined /> })}
          {card('Matriculados', s.enrollStatus.matriculado, { valueStyle: { color: '#2E7D52' } })}
          {card('Preinscritos', s.enrollStatus.preinscrito)}
          {card('Lista de espera', s.enrollStatus.lista_espera, { valueStyle: { color: '#B45309' } })}
          {card('Familias', s.families.total)}
          {card('Profesores', s.teachers.total)}
        </Row>

        {/* Económico */}
        <Title level={5} style={{ marginTop: 20 }}>Economía del curso</Title>
        <Row gutter={[12, 12]}>
          <Col xs={24} md={6}><Card size="small"><Statistic title="Cobrado" value={eur(fin.cobrado)} valueStyle={{ color: '#2E7D52' }} />
            <Progress percent={pctCobrado} size="small" strokeColor="#579172" /></Card></Col>
          <Col xs={12} md={6}><Card size="small"><Statistic title="Pendiente de cobro" value={eur(fin.pendiente)} valueStyle={{ color: '#cf1322' }} suffix={<span style={{ fontSize: 12, color: '#9B9BAB' }}> · {fin.pendienteCount} recibos</span>} /></Card></Col>
          <Col xs={12} md={6}><Card size="small"><Statistic title="Familias con deuda" value={s.morosidad.families} prefix={<WarningOutlined />} valueStyle={{ color: s.morosidad.families ? '#cf1322' : undefined }} /></Card></Col>
          <Col xs={12} md={6}><Card size="small"><Statistic title="Deuda total" value={eur(s.morosidad.amount)} valueStyle={{ color: '#cf1322' }} /></Card></Col>
        </Row>

        <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
          {/* Matrículas por servicio */}
          <Col xs={24} md={8}>
            <Card size="small" title="Matriculados por servicio">
              <Table rowKey="service" size="small" pagination={false} dataSource={s.byService}
                columns={[
                  { title: 'Servicio', dataIndex: 'service' },
                  { title: 'Matric.', dataIndex: 'matriculado', align: 'right' },
                  { title: 'Preins.', dataIndex: 'preinscrito', align: 'right' },
                  { title: 'Espera', dataIndex: 'espera', align: 'right' },
                ]} />
            </Card>
          </Col>
          {/* Ingresos por concepto */}
          <Col xs={24} md={8}>
            <Card size="small" title="Por concepto (cobrado / pendiente)">
              <Table rowKey="concept" size="small" pagination={false} dataSource={s.byConcept}
                columns={[
                  { title: 'Concepto', dataIndex: 'concept' },
                  { title: 'Cobrado', dataIndex: 'cobrado', align: 'right', render: (v: any) => eur(v) },
                  { title: 'Pendiente', dataIndex: 'pendiente', align: 'right', render: (v: any) => <span style={{ color: Number(v) ? '#cf1322' : undefined }}>{eur(v)}</span> },
                ]} />
            </Card>
          </Col>
          {/* Ocupación de grupos */}
          <Col xs={24} md={8}>
            <Card size="small" title="Ocupación de grupos">
              <Table rowKey="name" size="small" pagination={{ pageSize: 6 }} dataSource={s.occupancy}
                columns={[
                  { title: 'Grupo', dataIndex: 'name', render: (n: any, r: any) => <span>{n} <Text type="secondary" style={{ fontSize: 11 }}>{r.service}</Text></span> },
                  { title: 'Alumnos', dataIndex: 'count', align: 'right' },
                  { title: 'Aforo', dataIndex: 'capacity', align: 'right', render: (c: any) => c || '—' },
                  { title: '%', align: 'right', render: (_: any, r: any) => r.capacity ? `${Math.round((r.count / r.capacity) * 100)}%` : '—' },
                ]} />
            </Card>
          </Col>
        </Row>

        {/* Documentación + otros */}
        <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
          <Col xs={24} md={8}>
            <Card size="small" title="Documentación entregada">
              <Progress type="dashboard" percent={pctDoc} strokeColor="#579172" />
              <div><Text type="secondary">{s.documents.recibido} recibidos · {s.documents.pendiente} pendientes{s.documents.caducado ? ` · ${s.documents.caducado} caducados` : ''}</Text></div>
            </Card>
          </Col>
          <Col xs={24} md={16}>
            <Card size="small" title="Otros">
              <Row gutter={[12, 12]}>
                {card('Grupos', s.groups.total)}
                {card('Grupos con profe', s.groups.withTeacher)}
                {card('Recibos pagados', fin.pagadoCount)}
                {card('Recibos exentos', fin.exentoCount)}
                {card('Remesas SEPA', s.sepa.batches)}
                {card('Pruebas de nivel', s.levelTests.total)}
                {card('Bajas (curso)', s.enrollStatus.baja)}
                {card('Alumnos de escuela', s.students.escuela)}
              </Row>
            </Card>
          </Col>
        </Row>
      </>)}
    </div>
  );
}

// ----------------------------- EVENTOS / ANUNCIOS (calendario) -----------------------------
const EVENT_TYPES: Record<string, { label: string; color: string }> = {
  clase:          { label: 'Clase',          color: '#579172' },
  convocatoria:   { label: 'Convocatoria',   color: '#7C3AED' },
  prueba_nivel:   { label: 'Prueba de nivel', color: '#0D9488' },
  examen_oficial: { label: 'Examen oficial', color: '#C43030' },
  reunion:        { label: 'Reunión',        color: '#2563EB' },
  festivo:        { label: 'Festivo / sin clase', color: '#9333EA' },
  otro:           { label: 'Otro',           color: '#B45309' },
};
const etColor = (t: string) => (EVENT_TYPES[t] || EVENT_TYPES.otro).color;
const etLabel = (t: string) => (EVENT_TYPES[t] || EVENT_TYPES.otro).label;
const evDot = (c: string) => <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: c }} />;

function EventosPanel() {
  const today = new Date().toISOString().slice(0, 10);
  const [items, setItems] = useState<any[]>([]);
  const [sel, setSel] = useState(today);
  useEffect(() => {
    const to = new Date(Date.now() + 60 * 864e5).toISOString().slice(0, 10);
    api.get('/eventos/agenda', { params: { from: today, to } }).then(r => setItems(r.data)).catch(() => {});
  }, []);
  // Filtro de tipos por leyenda (clic para ocultar/mostrar); se guarda en el navegador.
  const [hidden, setHidden] = useState<Set<string>>(() => { try { return new Set(JSON.parse(localStorage.getItem('eventos_hidden_types') || '[]')); } catch { return new Set(); } });
  const toggleType = (k: string) => setHidden(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); localStorage.setItem('eventos_hidden_types', JSON.stringify([...n])); return n; });
  const shown = items.filter(e => !hidden.has(e.type));
  const byDate: Record<string, any[]> = {};
  shown.forEach(e => { (byDate[e.date] = byDate[e.date] || []).push(e); });
  const sortKey = (e: any) => `${e.date} ${e.time || '99:99'}`;
  const upcoming = shown.filter(e => e.date >= today).sort((a, b) => sortKey(a).localeCompare(sortKey(b))).slice(0, 12);
  const dayItems = (byDate[sel] || []).slice().sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  const row = (e: any, i: number) => {
    const color = e.type === 'clase' && e.color ? e.color : etColor(e.type);
    return (
      <div key={e.id || i} style={{ borderLeft: `3px solid ${color}`, paddingLeft: 8, marginBottom: 10 }}>
        <div style={{ fontSize: 12, color: '#9B9BAB' }}>{fmtDate(e.date)}{e.time ? ` · ${e.time}${e.endTime ? `–${e.endTime}` : ''}` : ''}</div>
        <div style={{ fontWeight: 600, fontSize: 13 }}><Tag color={etColor(e.type)} style={{ marginRight: 6 }}>{etLabel(e.type)}</Tag>{e.title}</div>
        {(e.location || (e.groupName && e.type !== 'clase')) && <div style={{ fontSize: 12, color: '#6B6B7B' }}>{[e.type !== 'clase' ? e.groupName : null, e.location].filter(Boolean).join(' · ')}</div>}
        {e.description && <div style={{ fontSize: 12, color: '#6B6B7B' }}>{e.description}</div>}
      </div>
    );
  };
  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} md={13}>
        <Card size="small" title={<span><CalendarOutlined /> Calendario</span>} styles={{ body: { padding: 8 } }}>
          <Calendar fullscreen={false} onSelect={(d: any) => setSel(d.format('YYYY-MM-DD'))}
            cellRender={(d: any, info: any) => {
              if (info.type !== 'date') return null;
              const evs = byDate[d.format('YYYY-MM-DD')]; if (!evs) return null;
              const types = Array.from(new Set(evs.map((x: any) => x.type)));
              return <div style={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>{types.slice(0, 4).map((tp: any, i: number) => <span key={i}>{evDot(etColor(tp))}</span>)}</div>;
            }} />
          <Space wrap size={10} style={{ marginTop: 6 }}>
            {Object.entries(EVENT_TYPES).map(([k, v]) => {
              const off = hidden.has(k);
              return <span key={k} onClick={() => toggleType(k)} title={off ? 'Mostrar' : 'Ocultar'}
                style={{ cursor: 'pointer', userSelect: 'none', fontSize: 11, color: off ? '#C4C4CC' : '#6B6B7B', display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: off ? 'line-through' : 'none' }}>
                {evDot(off ? '#DADADA' : v.color)} {v.label}</span>;
            })}
          </Space>
        </Card>
      </Col>
      <Col xs={24} md={11}>
        <Card size="small" title={`Día ${fmtDate(sel)}`} style={{ marginBottom: 12 }}>
          {dayItems.length === 0 ? <Text type="secondary">Sin eventos este día.</Text> : dayItems.map(row)}
        </Card>
        <Card size="small" title="Próximos eventos">
          {upcoming.length === 0 ? <Text type="secondary">No hay eventos próximos.</Text> : upcoming.map(row)}
        </Card>
      </Col>
    </Row>
  );
}
function Eventos() {
  const [rows, setRows] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();
  const load = async () => { const { data } = await api.get('/eventos'); setRows(data); };
  useLiveQuery(['eventos'], load);
  useEffect(() => { load(); api.get('/catalog/groups').then(r => setGroups(r.data)).catch(() => {}); }, []);
  const openNew = () => { setEditing(null); form.resetFields(); form.setFieldsValue({ eventType: 'reunion' }); setOpen(true); };
  const openEdit = (r: any) => { setEditing(r); form.setFieldsValue({ ...r, eventDate: r.eventDate ? String(r.eventDate).slice(0, 10) : undefined }); setOpen(true); };
  const save = async (v: any) => { try { if (editing) await api.patch(`/eventos/${editing.id}`, v); else await api.post('/eventos', v); message.success('Evento guardado'); setOpen(false); load(); } catch (e: any) { message.error(e?.response?.data?.message || 'Error'); } };
  const remove = async (id: string) => { try { await api.delete(`/eventos/${id}`); message.success('Evento eliminado'); load(); } catch { message.error('Error'); } };
  // Tipos creables manualmente (clase / convocatoria / prueba de nivel se generan solos desde su sección)
  const MANUAL_TYPES = ['reunion', 'examen_oficial', 'otro'];
  const typeOptions = MANUAL_TYPES.map(k => ({ value: k, label: <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{evDot(EVENT_TYPES[k].color)} {EVENT_TYPES[k].label}</span> }));
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ margin: 0 }}>Calendario y eventos</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openNew}>Nuevo evento</Button>
      </div>
      <Ayuda title="Calendario del centro (lo ven los profesores en su inicio)">
        Crea aquí <b>reuniones</b>, <b>exámenes oficiales</b>, <b>convocatorias</b>, <b>festivos</b> y demás fechas clave. Cada evento tiene un <b>tipo de color</b> y
        puede asociarse a un <b>grupo</b>. Aparecen en el <b>calendario</b> y en los <b>próximos eventos</b> del inicio de los docentes, junto con sus <b>clases</b> y <b>simulacros</b>.
      </Ayuda>
      <EventosPanel />
      <Card style={{ marginTop: 16 }} title="Todos los eventos">
        <Table rowKey="id" dataSource={rows} pagination={{ pageSize: 12 }} size="small"
          columns={[
            { title: 'Fecha', dataIndex: 'eventDate', render: (d, r: any) => `${fmtDate(d)}${r.eventTime ? ` ${r.eventTime}` : ''}` },
            { title: 'Tipo', dataIndex: 'eventType', render: (t: any) => <Tag color={etColor(t)}>{etLabel(t)}</Tag> },
            { title: 'Título', dataIndex: 'title' },
            { title: 'Grupo', dataIndex: 'groupName', render: (g: any) => g || '—' },
            { title: 'Descripción', dataIndex: 'description', render: (x) => x || '—' },
            { title: '', render: (_, r) => <Space><Button size="small" onClick={() => openEdit(r)}>Editar</Button><Popconfirm title="¿Eliminar evento?" onConfirm={() => remove(r.id)}><Button size="small" danger>Quitar</Button></Popconfirm></Space> },
          ]} />
      </Card>
      <Modal title={editing ? 'Editar evento' : 'Nuevo evento'} open={open} onCancel={() => setOpen(false)} onOk={() => form.submit()} okText="Guardar">
        <Form form={form} layout="vertical" onFinish={save}>
          <Form.Item name="title" label="Título" rules={[{ required: true }]}><Input placeholder="Ej.: Reunión de claustro" /></Form.Item>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="eventType" label="Tipo" rules={[{ required: true }]}><Select options={typeOptions} /></Form.Item></Col>
            <Col span={12}><Form.Item name="groupId" label="Grupo (opcional)"><Select allowClear showSearch optionFilterProp="label" placeholder="Sin grupo" options={groups.map(g => ({ value: g.id, label: g.name }))} /></Form.Item></Col>
          </Row>
          <Row gutter={12}>
            <Col span={10}><Form.Item name="eventDate" label="Fecha" rules={[{ required: true }]}><Input type="date" /></Form.Item></Col>
            <Col span={7}><Form.Item name="eventTime" label="Hora inicio"><Input type="time" /></Form.Item></Col>
            <Col span={7}><Form.Item name="endTime" label="Hora fin"><Input type="time" /></Form.Item></Col>
          </Row>
          <Form.Item name="location" label="Lugar (opcional)"><Input placeholder="Ej.: Aula 2 / Sala de profesores" /></Form.Item>
          <Form.Item name="description" label="Descripción / resumen"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// ----------------------------- REUNIONES DE PROFESORES (hojas de coordinación) -----------------------------
const PRIO_META: Record<string, { label: string; color: string }> = {
  high: { label: 'Alta', color: 'red' }, medium: { label: 'Media', color: 'gold' }, low: { label: 'Baja', color: 'default' },
};
function Reuniones({ user }: { user?: any }) {
  const roles: string[] = user?.secretariaRoles || [];
  const canManage = roles.some(r => ['secretaria_admin', 'secretaria_staff', 'direccion'].includes(r));
  const [sheets, setSheets] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [sel, setSel] = useState<string | undefined>();
  const [detail, setDetail] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();
  const [itemForm] = Form.useForm();
  const loadList = async () => { const { data } = await api.get('/meetings'); setSheets(data); if (!sel && data.length) setSel(data[0].id); };
  const loadDetail = async (id: string) => { const { data } = await api.get(`/meetings/${id}`); setDetail(data); };
  useLiveQuery(['meetings'], loadList);
  useEffect(() => { loadList(); api.get('/teachers').then(r => setTeachers(r.data)).catch(() => {}); }, []);
  useEffect(() => { if (sel) loadDetail(sel); }, [sel]);
  const openNew = () => { setEditing(null); form.resetFields(); form.setFieldsValue({ meetingDate: new Date().toISOString().slice(0, 10) }); setOpen(true); };
  const openEdit = (s: any) => { setEditing(s); form.setFieldsValue({ title: s.title, meetingDate: s.meetingDate, description: detail?.sheet?.description }); setOpen(true); };
  const saveSheet = async (v: any) => { try { if (editing) await api.patch(`/meetings/${editing.id}`, v); else { const r = await api.post('/meetings', v); setSel(r.data.id); } message.success('Reunión guardada'); setOpen(false); loadList(); if (editing) loadDetail(editing.id); } catch (e: any) { message.error(e?.response?.data?.message || 'Error'); } };
  const removeSheet = async (id: string) => { try { await api.delete(`/meetings/${id}`); message.success('Reunión eliminada'); setSel(undefined); setDetail(null); loadList(); } catch { message.error('Error'); } };
  const addItem = async (v: any) => { if (!sel) return; try { await api.post(`/meetings/${sel}/items`, v); itemForm.resetFields(); loadDetail(sel); loadList(); } catch { message.error('Error'); } };
  const toggleItem = async (it: any) => { try { await api.patch(`/meetings/items/${it.id}/toggle`, null, { params: { done: String(!it.isCompleted) } }); loadDetail(sel!); loadList(); } catch { message.error('Error'); } };
  const removeItem = async (id: string) => { try { await api.delete(`/meetings/items/${id}`); loadDetail(sel!); loadList(); } catch { message.error('Error'); } };
  const s = detail?.sheet;
  const items = detail?.items || [];
  const done = items.filter((i: any) => i.isCompleted).length;
  const progress = items.length ? Math.round(done / items.length * 100) : 0;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ margin: 0 }}>Reuniones de profesores</Title>
        {canManage && <Button type="primary" icon={<PlusOutlined />} onClick={openNew}>Nueva reunión</Button>}
      </div>
      <Ayuda title="Orden del día con seguimiento de acuerdos">
        Cada <b>reunión</b> tiene su <b>orden del día</b>: añade los puntos/acuerdos y <b>márcalos</b> conforme se completan; la barra muestra el <b>progreso</b>.
        {canManage ? ' Crea reuniones con «Nueva reunión».' : ' Puedes añadir puntos y marcarlos como completados.'}
      </Ayuda>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={9}>
          <Card size="small" title="Reuniones">
            {sheets.length === 0 ? <Text type="secondary">No hay reuniones todavía.</Text> :
              sheets.map(sh => (
                <div key={sh.id} onClick={() => setSel(sh.id)}
                  style={{ cursor: 'pointer', padding: '8px 10px', borderRadius: 8, marginBottom: 8, border: '1px solid #EDE9E4', background: sel === sh.id ? '#EEF5FA' : '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{sh.title}</span>
                    <Text type="secondary" style={{ fontSize: 12 }}>{fmtDate(sh.meetingDate)}</Text>
                  </div>
                  <Progress percent={sh.progress} size="small" strokeColor="#579172" />
                  <Text type="secondary" style={{ fontSize: 12 }}>{sh.doneItems}/{sh.totalItems} puntos</Text>
                </div>
              ))}
          </Card>
        </Col>
        <Col xs={24} md={15}>
          {!s ? <Card><Text type="secondary">Elige una reunión.</Text></Card> : (
            <Card size="small" title={<span>{s.title} <Text type="secondary" style={{ fontSize: 12 }}>· {fmtDate(s.meetingDate)}</Text></span>}
              extra={canManage && <Space><Button size="small" onClick={() => openEdit(s)}>Editar</Button><Popconfirm title="¿Eliminar reunión?" onConfirm={() => removeSheet(s.id)}><Button size="small" danger>Quitar</Button></Popconfirm></Space>}>
              {s.description && <div style={{ marginBottom: 10, color: '#6B6B7B', whiteSpace: 'pre-wrap' }}>{s.description}</div>}
              <Progress percent={progress} strokeColor="#579172" />
              <div style={{ margin: '10px 0' }}>
                {items.length === 0 ? <Text type="secondary">Aún no hay puntos en el orden del día.</Text> :
                  items.map((it: any) => (
                    <div key={it.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 0', borderBottom: '1px solid #F2EFEA' }}>
                      <Checkbox checked={it.isCompleted} onChange={() => toggleItem(it)} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, textDecoration: it.isCompleted ? 'line-through' : undefined, color: it.isCompleted ? '#9B9BAB' : undefined }}>
                          {it.itemTitle} <Tag color={PRIO_META[it.priority]?.color} style={{ marginLeft: 4 }}>{PRIO_META[it.priority]?.label}</Tag>
                        </div>
                        {it.itemDescription && <div style={{ fontSize: 12, color: '#6B6B7B', whiteSpace: 'pre-wrap' }}>{it.itemDescription}</div>}
                        <Space size={8} style={{ fontSize: 12, color: '#9B9BAB' }}>
                          {it.assigneeName && <span>👤 {it.assigneeName}</span>}
                          {it.dueDate && <span>📅 {fmtDate(it.dueDate)}</span>}
                        </Space>
                      </div>
                      <Popconfirm title="¿Quitar punto?" onConfirm={() => removeItem(it.id)}><Button size="small" type="text" danger>✕</Button></Popconfirm>
                    </div>
                  ))}
              </div>
              <Form form={itemForm} layout="vertical" onFinish={addItem} style={{ borderTop: '1px solid #EDE9E4', paddingTop: 10 }}>
                <Row gutter={8}>
                  <Col xs={24} md={10}><Form.Item name="itemTitle" rules={[{ required: true, message: 'Título del punto' }]} style={{ marginBottom: 8 }}><Input placeholder="Nuevo punto del orden del día" /></Form.Item></Col>
                  <Col xs={12} md={5}><Form.Item name="priority" initialValue="medium" style={{ marginBottom: 8 }}><Select options={Object.entries(PRIO_META).map(([k, v]) => ({ value: k, label: v.label }))} /></Form.Item></Col>
                  <Col xs={12} md={6}><Form.Item name="assigneeTeacherId" style={{ marginBottom: 8 }}><Select allowClear showSearch optionFilterProp="label" placeholder="Responsable" options={teachers.map(t => ({ value: t.id, label: t.fullName }))} /></Form.Item></Col>
                  <Col xs={24} md={3}><Button type="primary" htmlType="submit" block>Añadir</Button></Col>
                </Row>
                <Form.Item name="dueDate" style={{ marginBottom: 0 }}><Input type="date" style={{ maxWidth: 180 }} /></Form.Item>
              </Form>
            </Card>
          )}
        </Col>
      </Row>
      <Modal title={editing ? 'Editar reunión' : 'Nueva reunión'} open={open} onCancel={() => setOpen(false)} onOk={() => form.submit()} okText="Guardar">
        <Form form={form} layout="vertical" onFinish={saveSheet}>
          <Form.Item name="title" label="Título" rules={[{ required: true }]}><Input placeholder="Ej.: Reunión de claustro 18/06" /></Form.Item>
          <Form.Item name="meetingDate" label="Fecha" rules={[{ required: true }]}><Input type="date" /></Form.Item>
          <Form.Item name="description" label="Notas / contexto"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// ----------------------------- CUADERNO DOCENTE (planificación de clases) -----------------------------
// Caja de contenido de un apartado en un día: autoguarda al salir del campo.
function NotebookEntryBox({ groupId, sectionId, date, init }: any) {
  const [content, setContent] = useState(init?.content || '');
  const [done, setDone] = useState(!!init?.isDone);
  const [status, setStatus] = useState<'' | 'saving' | 'saved'>('');
  const timer = useRef<any>(null);
  const last = useRef<string>(init?.content || '');
  useEffect(() => { setContent(init?.content || ''); setDone(!!init?.isDone); last.current = init?.content || ''; }, [date, sectionId]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const doSave = (c: string, d: boolean) => {
    last.current = c; setStatus('saving');
    api.post('/notebook/entry', { groupId, sectionId, date, content: c, isDone: d })
      .then(() => { setStatus('saved'); setTimeout(() => setStatus(''), 1200); }).catch(() => setStatus(''));
  };
  // Autoguardado mientras se escribe (debounce), como en los mensajes de MW Panel
  const onChange = (c: string) => {
    setContent(c);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => doSave(c, done), 700);
  };
  const flush = () => { if (timer.current) clearTimeout(timer.current); if (content !== last.current) doSave(content, done); };
  return (
    <div>
      <Input.TextArea value={content} onChange={e => onChange(e.target.value)} onBlur={flush}
        autoSize={{ minRows: 2, maxRows: 8 }} placeholder="Planifica esta parte de la clase…" />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
        <Checkbox checked={done} onChange={e => { setDone(e.target.checked); doSave(content, e.target.checked); }}>Hecho</Checkbox>
        {status === 'saving' ? <Text type="secondary" style={{ fontSize: 11 }}>Guardando…</Text> : status === 'saved' ? <Text type="success" style={{ fontSize: 11 }}>✓ Guardado</Text> : null}
      </div>
    </div>
  );
}
function SectionsManager({ groupId, open, onClose, onChanged }: any) {
  const [secs, setSecs] = useState<any[]>([]);
  const [name, setName] = useState('');
  const load = () => { if (groupId) api.get('/notebook/sections', { params: { groupId } }).then(r => setSecs(r.data)); };
  useEffect(() => { if (open) load(); }, [open, groupId]);
  const add = async () => { if (!name.trim()) return; await api.post('/notebook/sections', { groupId, name: name.trim() }); setName(''); load(); onChanged && onChanged(); };
  const rename = async (id: string, n: string) => { await api.patch(`/notebook/sections/${id}`, { name: n }); onChanged && onChanged(); };
  const del = async (id: string) => { await api.delete(`/notebook/sections/${id}`); load(); onChanged && onChanged(); };
  return (
    <Modal title="Apartados de la clase" open={open} onCancel={onClose} footer={<Button onClick={onClose}>Cerrar</Button>}>
      <Text type="secondary">Estos son los apartados (partes del examen) que verás al planificar. Edítalos a tu gusto.</Text>
      <div style={{ marginTop: 12 }}>
        {secs.map(s => (
          <div key={s.id} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <Input defaultValue={s.name} onBlur={e => { if (e.target.value.trim() && e.target.value !== s.name) rename(s.id, e.target.value.trim()); }} />
            <Popconfirm title="¿Quitar apartado? (borra su contenido)" onConfirm={() => del(s.id)}><Button danger>✕</Button></Popconfirm>
          </div>
        ))}
      </div>
      <Space.Compact style={{ width: '100%', marginTop: 8 }}>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nuevo apartado (p.ej. Use of English)" onPressEnter={add} />
        <Button type="primary" onClick={add}>Añadir</Button>
      </Space.Compact>
    </Modal>
  );
}
// Color por apartado (un color por cada "espacio de trabajo" de la clase)
const SECTION_COLORS: Record<string, string> = {
  'vocabulary': '#B45309', 'grammar': '#0D9488', 'reading': '#2563EB', 'reading & writing': '#2563EB',
  'reading & use of english': '#4F46E5', 'writing': '#16A34A', 'listening': '#7C3AED', 'speaking': '#C43030', 'use of english': '#0891B2',
};
const SECTION_PALETTE = ['#B45309', '#0D9488', '#2563EB', '#16A34A', '#7C3AED', '#C43030', '#0891B2', '#9333EA', '#CA8A04', '#DB2777'];
const sectionColor = (name: string) => {
  const k = (name || '').toLowerCase().trim();
  if (SECTION_COLORS[k]) return SECTION_COLORS[k];
  let h = 0; for (let i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) >>> 0;
  return SECTION_PALETTE[h % SECTION_PALETTE.length];
};
const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const WEEK_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const plannedCount = (cls: any) => (cls.sections || []).filter((s: any) => (cls.entries[s.id]?.content || '').trim()).length;

function ClassPlanModal({ cls, open, onClose, onManage }: any) {
  const screens = Grid.useBreakpoint();
  if (!cls) return null;
  return (
    <Modal open={open} onCancel={onClose} footer={<Button onClick={onClose}>Cerrar</Button>} width={screens.md ? 680 : '95vw'}
      title={<span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: cls.color || '#579172', marginRight: 8 }} />{cls.groupName} · {fmtDate(cls.date)} · {cls.startTime}–{cls.endTime}{cls.room ? ` · ${cls.room}` : ''}{cls.sessionsTotal ? ` · Sesión ${cls.sessionIndex}/${cls.sessionsTotal}` : ''}</span>}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <Button size="small" icon={<FormOutlined />} onClick={() => onManage(cls.groupId)}>Apartados</Button>
      </div>
      {(cls.sections || []).length === 0 ? <Text type="secondary">Sin apartados. Pulsa «Apartados» para añadirlos.</Text> :
        cls.sections.map((sec: any) => (
          <div key={sec.id} style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 2, background: sectionColor(sec.name) }} />{sec.name}
            </div>
            <NotebookEntryBox groupId={cls.groupId} sectionId={sec.id} date={cls.date} init={cls.entries[sec.id]} />
          </div>
        ))}
    </Modal>
  );
}
function ClassBlock({ cls, onClick }: any) {
  const n = plannedCount(cls); const total = (cls.sections || []).length;
  return (
    <div onClick={onClick} style={{ cursor: 'pointer', borderLeft: `4px solid ${cls.color || '#579172'}`, background: (cls.color || '#579172') + '18', borderRadius: 6, padding: '6px 8px', marginBottom: 6 }}>
      <div style={{ fontSize: 12, color: '#1E1E30', fontWeight: 600 }}>{cls.startTime}–{cls.endTime}</div>
      <div style={{ fontSize: 13, fontWeight: 600 }}>{cls.groupName}</div>
      {cls.sessionsTotal ? <div style={{ fontSize: 11, color: '#2C5F8A', fontWeight: 600 }}>Sesión {cls.sessionIndex}/{cls.sessionsTotal}</div> : null}
      <div style={{ fontSize: 11, color: n ? '#2E7D52' : '#9B9BAB' }}>{n ? `${n}/${total} planificado` : 'sin planificar'}{cls.room ? ` · ${cls.room}` : ''}</div>
    </div>
  );
}
function Cuaderno({ user }: { user?: any }) {
  const today = isoDay(new Date());
  const [mode, setMode] = useState<string>(() => { const m = localStorage.getItem('cuaderno_mode'); return ['semana', 'dia', 'resumen'].includes(m || '') ? (m as string) : 'semana'; });
  const setModeP = (m: string) => { setMode(m); localStorage.setItem('cuaderno_mode', m); };
  const [anchor, setAnchor] = useState(today);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalCls, setModalCls] = useState<any>(null);
  const [secMgr, setSecMgr] = useState<string | null>(null);

  const [from, to] = useMemo(() => {
    const d = new Date(anchor + 'T00:00:00');
    if (mode === 'semana') {
      const dow = (d.getDay() + 6) % 7;
      const mon = new Date(d); mon.setDate(d.getDate() - dow);
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      return [isoDay(mon), isoDay(sun)];
    }
    return [anchor, anchor];
  }, [anchor, mode]);

  const load = () => { setLoading(true); api.get('/notebook/week', { params: { from, to } }).then(r => setItems(r.data)).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, [from, to]);
  const reload = () => load();
  const shift = (days: number) => { const d = new Date(anchor + 'T00:00:00'); d.setDate(d.getDate() + days); setAnchor(isoDay(d)); };
  const closeModal = () => { setModalCls(null); reload(); };

  const byDate: Record<string, any[]> = {};
  items.forEach(c => { (byDate[c.date] = byDate[c.date] || []).push(c); });
  const weekCols = useMemo(() => { const d = new Date(from + 'T00:00:00'); const arr: string[] = []; for (let i = 0; i < 7; i++) { const x = new Date(d); x.setDate(d.getDate() + i); arr.push(isoDay(x)); } return arr; }, [from]);
  const dayCls = byDate[anchor] || [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <Title level={3} style={{ margin: 0 }}>Cuaderno docente</Title>
        <Space>
          <Button type={mode === 'semana' ? 'primary' : 'default'} onClick={() => setModeP('semana')}>Semana</Button>
          <Button type={mode === 'dia' ? 'primary' : 'default'} onClick={() => setModeP('dia')}>Día</Button>
          <Button type={mode === 'resumen' ? 'primary' : 'default'} onClick={() => setModeP('resumen')}>Resumen</Button>
        </Space>
      </div>
      <Ayuda title="Planifica tus clases en calendario">
        Vista <b>Semana</b> o <b>Día</b>: pulsa en una <b>clase</b> y se abre una ventana para planificar sus <b>apartados</b> (Vocabulary, Listening, Reading,
        Use of English, Writing, Speaking…) precargados según el nivel y editables; se <b>guarda solo</b> al escribir. La vista <b>Resumen</b> muestra, sin huecos en
        blanco, todo lo planificado de ese día <b>diferenciado por colores</b> (uno por apartado) para tener el control de la jornada.
      </Ayuda>

      <Card>
        <Space style={{ marginBottom: 12 }} wrap>
          <Button onClick={() => shift(mode === 'semana' ? -7 : -1)}>←</Button>
          <Button onClick={() => setAnchor(today)}>{mode === 'semana' ? 'Esta semana' : 'Hoy'}</Button>
          <Button onClick={() => shift(mode === 'semana' ? 7 : 1)}>→</Button>
          {mode !== 'semana' && <Input type="date" value={anchor} onChange={e => setAnchor(e.target.value)} style={{ width: 160 }} />}
          <Text type="secondary">{mode === 'semana' ? `${fmtDate(from)} – ${fmtDate(to)}` : fmtDate(anchor)}</Text>
        </Space>

        {loading ? <Card loading /> : mode === 'semana' ? (
          <div style={{ overflowX: 'auto' }}>
            <div style={{ display: 'flex', gap: 8, minWidth: 7 * 148 }}>
              {weekCols.map(d => (
                <div key={d} style={{ flex: '1 0 140px', minWidth: 140 }}>
                  <div style={{ fontWeight: 600, fontSize: 12, textAlign: 'center', padding: '4px 0', borderBottom: '2px solid #EDE9E4', marginBottom: 6, background: d === today ? '#EEF5FA' : undefined, borderRadius: 4 }}>
                    {WEEK_NAMES[(new Date(d + 'T00:00:00').getDay() + 6) % 7]} <span style={{ color: '#9B9BAB' }}>{d.slice(8, 10)}/{d.slice(5, 7)}</span>
                  </div>
                  {(byDate[d] || []).length === 0 ? <div style={{ textAlign: 'center', color: '#d9d9d9', fontSize: 12, padding: 4 }}>—</div> :
                    (byDate[d] || []).map((c, i) => <ClassBlock key={i} cls={c} onClick={() => setModalCls(c)} />)}
                </div>
              ))}
            </div>
          </div>
        ) : mode === 'dia' ? (
          dayCls.length === 0 ? <Text type="secondary">No tienes clases ese día (o es festivo/fuera de trimestre).</Text> :
            <Row gutter={[12, 12]}>{dayCls.map((c, i) => (
              <Col xs={24} sm={12} md={8} lg={6} key={i}><ClassBlock cls={c} onClick={() => setModalCls(c)} /></Col>
            ))}</Row>
        ) : (
          dayCls.length === 0 ? <Text type="secondary">No hay clases ese día.</Text> :
            <Row gutter={[16, 16]}>{dayCls.map((c, i) => {
              const filled = (c.sections || []).filter((s: any) => (c.entries[s.id]?.content || '').trim());
              return (
                <Col xs={24} md={12} lg={8} key={i}>
                  <Card size="small" title={<span><span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: c.color || '#579172', marginRight: 6 }} />{c.startTime}–{c.endTime} · {c.groupName}</span>}
                    extra={<Button size="small" onClick={() => setModalCls(c)}>Editar</Button>}>
                    {filled.length === 0 ? <Text type="secondary">— sin planificar —</Text> :
                      filled.map((s: any) => (
                        <div key={s.id} style={{ borderLeft: `4px solid ${sectionColor(s.name)}`, paddingLeft: 8, marginBottom: 8 }}>
                          <div style={{ fontWeight: 600, fontSize: 12, color: sectionColor(s.name) }}>{s.name}{c.entries[s.id]?.isDone ? ' ✓' : ''}</div>
                          <div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{c.entries[s.id].content}</div>
                        </div>
                      ))}
                  </Card>
                </Col>
              );
            })}</Row>
        )}
      </Card>

      <ClassPlanModal cls={modalCls} open={!!modalCls} onClose={closeModal} onManage={setSecMgr} />
      <SectionsManager groupId={secMgr} open={!!secMgr} onClose={() => setSecMgr(null)} onChanged={reload} />
    </div>
  );
}

// ----------------------------- FICHA DE ALUMNO (completa y visual) -----------------------------
const edadDe = (birth?: string) => { if (!birth) return null; const d = new Date(birth); const n = new Date(); let a = n.getFullYear() - d.getFullYear(); if (n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())) a--; return a; };
const ENR_COLOR: any = { matriculado: 'green', preinscrito: 'gold', lista_espera: 'orange', pendiente: 'blue', baja: 'red' };
function FichaAlumno({ studentId, open, onClose }: { studentId?: string; open: boolean; onClose: () => void }) {
  const screens = Grid.useBreakpoint();
  const [data, setData] = useState<any>(null);
  const [mock, setMock] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!open || !studentId) return;
    setData(null); setMock(null); setLoading(true);
    api.get(`/students/${studentId}/ficha`).then(async r => {
      setData(r.data);
      if (r.data?.student?.mockUserId) { try { const m = await api.get(`/mocks/results/${r.data.student.mockUserId}`); setMock(m.data); } catch {} }
    }).finally(() => setLoading(false));
  }, [open, studentId]);
  const s = data?.student;
  const at = data?.attendance, tk = data?.tasks;
  const attPct = at?.total ? Math.round(((at.presente + at.retraso) / at.total) * 100) : null;
  const taskPct = tk?.total ? Math.round((tk.verde / tk.total) * 100) : null;
  const card = (title: any, children: any) => <Card size="small" title={title} style={{ marginBottom: 12 }}>{children}</Card>;
  return (
    <Drawer title="Ficha del alumno" placement="right" width={screens.md ? 560 : '100%'} open={open} onClose={onClose}>
      {loading || !data ? <Card loading /> : (<>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#579172', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontFamily: "'Lora',serif" }}>
            {(s.fullName || '?').slice(0, 1).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Lora',serif" }}>{s.fullName}</div>
            <Space size={4} wrap>
              {s.mwpanelStudentId ? <Tag color="purple">Escuela (MW Panel)</Tag> : <Tag>Academia</Tag>}
              {edadDe(s.birthDate) != null && <Tag>{edadDe(s.birthDate)} años</Tag>}
              {s.familyName && <Tag color="geekblue">Familia: {s.familyName}</Tag>}
            </Space>
          </div>
        </div>

        {card('Datos personales', <div style={{ fontSize: 13, lineHeight: 1.9 }}>
          <div><b>Fecha nac.:</b> {fmtDate(s.birthDate)}</div>
          <div><b>Colegio:</b> {s.school || '—'} · <b>Curso:</b> {s.grade || '—'}</div>
          <div><b>Dirección:</b> {[s.address, s.postalCode, s.city].filter(Boolean).join(', ') || '—'}</div>
          <div><b>Autorizaciones:</b> {s.photoConsent ? <Tag color="green">Imagen</Tag> : <Tag>Imagen ✗</Tag>}{s.exitConsent ? <Tag color="green">Salida</Tag> : <Tag>Salida ✗</Tag>}</div>
          {s.notes && <div><b>Notas:</b> {s.notes}</div>}
        </div>)}

        {card('Familia y tutores', data.guardians.length ? (
          <Table rowKey="fullName" size="small" pagination={false} dataSource={data.guardians}
            columns={[{ title: 'Tutor', dataIndex: 'fullName' }, { title: 'Teléfono', dataIndex: 'phone', render: (p: any, r: any) => [p, r.phoneAlt].filter(Boolean).join(' / ') || '—' }, { title: 'Correo', dataIndex: 'email', render: (e: any) => e || '—' }]} />
        ) : <Text type="secondary">Sin tutores registrados</Text>)}

        {card('Matrículas', data.enrollments.length ? (
          <Table rowKey="id" size="small" pagination={false} dataSource={data.enrollments}
            columns={[
              { title: 'Servicio', dataIndex: 'serviceName' },
              { title: 'Grupo', dataIndex: 'groupName', render: (g: any) => g || '—' },
              { title: 'Estado', dataIndex: 'status', render: (st: any) => <Tag color={ENR_COLOR[st]}>{st}</Tag> },
              { title: 'Tarifa/mes', dataIndex: 'monthlyFee', render: (f: any) => f != null ? `${Number(f).toFixed(0)}€` : '—' },
              { title: 'Pendiente', dataIndex: 'pendingAmount', render: (a: any) => Number(a) ? <span style={{ color: '#cf1322' }}>{Number(a).toFixed(2)}€</span> : '—' },
            ]} />
        ) : <Text type="secondary">Sin matrículas</Text>)}

        {card('Asistencia y tareas (resumen individual)', (
          <div style={{ fontSize: 13, lineHeight: 2 }}>
            <div>
              <b>Asistencia:</b>{' '}
              {at?.total ? (
                <Space size={12} wrap>
                  {ATT_ORDER.map((k: string) => <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><AttMark status={k} size={18} /> {at[k] || 0}</span>)}
                  <Tag color={(attPct as number) >= 90 ? 'green' : (attPct as number) >= 75 ? 'gold' : 'red'}>{attPct}% asistencia</Tag>
                </Space>
              ) : <Text type="secondary">sin registros</Text>}
            </div>
            <div>
              <b>Tareas:</b>{' '}
              {tk?.total ? (
                <Space size={12} wrap>
                  {['verde', 'naranja', 'roja'].map((l: string) => <span key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Cara level={l} size={18} /> {tk[l] || 0}</span>)}
                  <Tag color={(taskPct as number) >= 90 ? 'green' : (taskPct as number) >= 60 ? 'gold' : 'red'}>{taskPct}% bien</Tag>
                </Space>
              ) : <Text type="secondary">sin registros</Text>}
            </div>
          </div>
        ))}

        {card('Pruebas de nivel', data.levelTests.length ? data.levelTests.map((lt: any, i: number) => (
          <div key={i} style={{ borderLeft: '3px solid #579172', paddingLeft: 8, marginBottom: 6, fontSize: 13 }}>
            <b>{fmtDate(lt.testDate)}{lt.testTime ? ` · ${lt.testTime}` : ''}</b>
            {lt.resultLevel && <Tag color="purple" style={{ marginLeft: 6 }}>{lt.resultLevel}</Tag>}
            <div>Evaluador: {lt.evaluator || '—'}{lt.recommendedProgram ? ` · Recomendado: ${lt.recommendedProgram}` : ''}</div>
            {lt.notes && <div style={{ color: '#6B6B7B' }}>{lt.notes}</div>}
          </div>
        )) : <Text type="secondary">Sin pruebas de nivel</Text>)}

        {card(<span>Resultados de exámenes Mock {s.mockUserId ? '' : <Tag style={{ marginLeft: 6 }}>no enlazado</Tag>}</span>,
          !s.mockUserId ? <Text type="secondary">Este alumno no está enlazado con Cambridge Mocks (enlázalo en «Resultados Mock»).</Text> :
          !mock || mock.calls.length === 0 ? <Text type="secondary">Sin resultados publicados todavía.</Text> :
          mock.calls.map((c: any, i: number) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <Text strong>{c.examName}</Text> <Text type="secondary">· {fmtDate(c.examDate)}</Text>
              {c.overall != null && <Tag color="purple" style={{ marginLeft: 6 }}>Global: {c.overall}</Tag>}
              <Table rowKey="part" size="small" pagination={false} style={{ marginTop: 4 }} dataSource={c.parts}
                columns={[{ title: 'Parte', dataIndex: 'part' }, { title: 'Nota', dataIndex: 'score', render: (v: any) => v != null ? Number(v).toFixed(2) : '—' }]} />
            </div>
          )))}

        {card('Documentación', data.documents.length ? (
          <Space wrap>{data.documents.map((d: any, i: number) => <Tag key={i} color={d.status === 'recibido' ? 'green' : d.status === 'caducado' ? 'red' : 'default'}>{d.document}: {d.status}</Tag>)}</Space>
        ) : <Text type="secondary">Sin documentos registrados</Text>)}
      </>)}
    </Drawer>
  );
}

// ----------------------------- ALUMNOS + ALTA RÁPIDA -----------------------------
function Alumnos({ user }: { user?: any }) {
  const isAdmin = (user?.secretariaRoles || []).includes('secretaria_admin');
  const [rows, setRows] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const [addTo, setAddTo] = useState<any>(null); // alumno al que apuntar a otro servicio
  const [addService, setAddService] = useState<string | undefined>();
  const [addMatriculate, setAddMatriculate] = useState(false);
  const [fichaId, setFichaId] = useState<string | undefined>();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [onlyPending, setOnlyPending] = useState(false);
  const load = async () => {
    const params: any = {};
    if (onlyPending) params.pending = 'true';
    const { data } = await api.get('/students', { params });
    setRows(data);
  };
  useLiveQuery(['students', 'enrollments'], load);
  useEffect(() => { load(); api.get('/catalog/services').then(r => setServices(r.data)); }, [onlyPending]);
  const quick = async (v: any) => {
    try { await api.post('/students/quick-enroll', { studentName: v.studentName, phone: v.phone, serviceIds: v.serviceIds });
      message.success('Alumno dado de alta'); setOpen(false); form.resetFields(); load(); }
    catch (e: any) { message.error(e?.response?.data?.message || 'Error'); }
  };
  const doAddService = async () => {
    if (!addTo || !addService) return;
    try {
      const { data } = await api.post(`/students/${addTo.id}/enroll`, { serviceId: addService, matriculate: addMatriculate });
      if (data.ok === false) message.warning(data.error || 'No se pudo apuntar');
      else message.success(addMatriculate ? 'Alumno matriculado en el servicio' : 'Apuntado (preinscrito) al servicio');
      setAddTo(null); setAddService(undefined); setAddMatriculate(false); load();
    } catch { message.error('Error'); }
  };
  const svcName = (id: string) => services.find(s => s.id === id)?.name || '—';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ margin: 0 }}>Alumnos</Title>
        <Space>
          <Button
            icon={<FilterOutlined />}
            type={onlyPending ? 'primary' : 'default'}
            onClick={() => setOnlyPending(p => !p)}
          >
            {onlyPending ? 'Todos' : 'Solo pendientes'}
          </Button>
          <Button icon={<UserAddOutlined />} onClick={() => { form.resetFields(); setOpen(true); }}>
            Alta rápida
          </Button>
          <Button
            type="primary"
            icon={<FormOutlined />}
            onClick={() => { setEditingStudentId(null); setDrawerOpen(true); }}
          >
            Inscripción completa
          </Button>
        </Space>
      </div>
      <Ayuda title="Alta rápida de mostrador (en menos de 1 minuto)">
        Pulsa <b>Alta rápida</b> y escribe el <b>nombre del alumno</b>, un <b>teléfono</b> y <b>uno o varios servicios</b>
        (Inglés, Apoyo, Danza…). Un mismo alumno puede apuntarse a <b>varios servicios</b>: el sistema crea una <Tag>preinscripción</Tag> por cada uno.
        Después, desde la columna <b>Servicios</b>, puedes <b>apuntarlo a otro servicio</b> en cualquier momento, asignar grupo y cobrar.
      </Ayuda>
      <Card>
        <SearchableTable rowKey="id" dataSource={rows} pagination={{ pageSize: 12 }}
          columns={[
            { title: 'Nombre', render: (_, r) => `${r.firstName || ''} ${r.lastName || ''}`.trim() || '—' },
            { title: 'Origen', dataIndex: 'mwpanelStudentId', render: (v) => v ? <Tag color="purple">Escuela (MW Panel)</Tag> : <Tag>Academia</Tag> },
            { title: 'Servicios y grupos', dataIndex: 'enrollments', render: (e: any[]) => (e && e.length)
                ? <Space size={4} wrap>{e.map((en: any) => {
                    const col = en.status === 'matriculado' ? 'green' : en.status === 'preinscrito' ? 'gold' : en.status === 'lista_espera' ? 'orange' : en.status === 'pendiente' ? 'blue' : 'default';
                    return <Tag key={en.enrollmentId} color={col}>{en.serviceName}{en.groupName ? ` · ${en.groupName}` : ' · (sin grupo)'}</Tag>;
                  })}</Space>
                : <Tag>sin servicios</Tag> },
            { title: 'Pendientes', render: (_, r: any) => {
                const items: string[] = r.pendingItems || [];
                if (items.length === 0) return <Tag color="green">✓ Completo</Tag>;
                return (
                  <Tag color="orange" style={{ cursor: 'pointer' }} title={items.join(', ')}
                    onClick={() => { setEditingStudentId(r.id); setDrawerOpen(true); }}>
                    ⚠ {items.length} pendiente{items.length > 1 ? 's' : ''}
                  </Tag>
                );
              } },
            { title: '', render: (_, r) => (
                <Space size={4}>
                  <Button size="small" type="link" onClick={() => setFichaId(r.id)}>Ficha</Button>
                  <Button size="small" onClick={() => { setEditingStudentId(r.id); setDrawerOpen(true); }}>Editar</Button>
                  <Button size="small" icon={<PlusOutlined />} onClick={() => { setAddTo(r); setAddService(undefined); }}>Servicio</Button>
                  {isAdmin && (
                    <Popconfirm
                      title="¿Borrar alumno?"
                      description="Si no tiene matrículas se elimina definitivamente; si tiene historial, se desactiva (sale del listado)."
                      okText="Borrar" cancelText="Cancelar" okButtonProps={{ danger: true }}
                      onConfirm={async () => {
                        try {
                          const { data } = await api.delete(`/students/${r.id}`);
                          message.success(data.deleted === 'hard' ? 'Alumno eliminado' : 'Alumno desactivado (tenía historial)');
                          load();
                        } catch { message.error('No se pudo borrar el alumno'); }
                      }}>
                      <Button size="small" danger>Borrar</Button>
                    </Popconfirm>
                  )}
                </Space>
              ) },
          ]} />
      </Card>
      <Modal title="Alta rápida de alumno" open={open} onCancel={() => setOpen(false)} onOk={() => form.submit()} okText="Crear">
        <Alert type="info" showIcon style={{ marginBottom: 12 }} message="Nombre, teléfono y los servicios que quiera. El resto se completa después." />
        <Form form={form} layout="vertical" onFinish={quick}>
          <Form.Item name="studentName" label="Nombre del alumno" rules={[{ required: true }]}><Input placeholder="Nombre y apellidos" /></Form.Item>
          <Form.Item name="phone" label="Teléfono de contacto" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="serviceIds" label="Servicios de interés" rules={[{ required: true, message: 'Elige al menos un servicio' }]}>
            <Select mode="multiple" placeholder="Uno o varios servicios" options={services.map(s => ({ value: s.id, label: s.name }))} />
          </Form.Item>
        </Form>
      </Modal>
      <Modal title={`Apuntar a otro servicio — ${addTo ? `${addTo.firstName || ''} ${addTo.lastName || ''}`.trim() : ''}`}
        open={!!addTo} onCancel={() => { setAddTo(null); setAddMatriculate(false); }} onOk={doAddService}
        okText={addMatriculate ? 'Matricular' : 'Apuntar'} okButtonProps={{ disabled: !addService }}>
        <Alert type="info" showIcon style={{ marginBottom: 12 }}
          message={addMatriculate
            ? 'Se matricula directamente en ese servicio (genera recibos de matrícula/material si su programa los cobra).'
            : 'Se crea una preinscripción para ese servicio. Marca "Matricular directamente" para matricularlo ya.'} />
        {addTo?.enrollments?.length > 0 && (
          <Paragraph>Ya está en: {addTo.enrollments.map((en: any) => <Tag key={en.enrollmentId}>{en.serviceName}</Tag>)}</Paragraph>
        )}
        <Select style={{ width: '100%' }} placeholder="Elige el servicio" value={addService} onChange={setAddService}
          options={services.filter(s => !addTo?.enrollments?.some((en: any) => en.serviceId === s.id)).map(s => ({ value: s.id, label: s.name }))} />
        <div style={{ marginTop: 12 }}>
          <Checkbox checked={addMatriculate} onChange={e => setAddMatriculate(e.target.checked)}>Matricular directamente (en vez de solo preinscribir)</Checkbox>
        </div>
      </Modal>
      <InscripcionDrawer
        open={drawerOpen}
        editingStudentId={editingStudentId}
        onClose={() => { setDrawerOpen(false); setEditingStudentId(null); }}
        onSaved={() => load()}
      />
      <FichaAlumno studentId={fichaId} open={!!fichaId} onClose={() => setFichaId(undefined)} />
    </div>
  );
}

// ----------------------------- TARIFAS (flexibles) -----------------------------
function Tarifas() {
  const [rows, setRows] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [years, setYears] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();
  const load = async () => { const { data } = await api.get('/fee-schedules'); setRows(data); };
  useEffect(() => {
    load();
    api.get('/catalog/services').then(r => setServices(r.data));
    api.get('/catalog/programs').then(r => setPrograms(r.data));
    api.get('/catalog/groups').then(r => setGroups(r.data));
    api.get('/catalog/years').then(r => setYears(r.data));
  }, []);
  const openNew = () => { setEditing(null); form.resetFields();
    const activeYear = years.find(y => y.isActive)?.id;
    form.setFieldsValue({ academicYearId: activeYear, concept: 'mensualidad', siblingsDiscountEur: 0 });
    setOpen(true); };
  const openEdit = (r: any) => { setEditing(r); form.setFieldsValue(r); setOpen(true); };
  const save = async (v: any) => {
    try {
      if (editing) await api.patch(`/fee-schedules/${editing.id}`, v);
      else await api.post('/fee-schedules', v);
      message.success('Tarifa guardada'); setOpen(false); load();
    } catch (e: any) { message.error(e?.response?.data?.message || 'Error'); }
  };
  const remove = async (id: string) => { await api.delete(`/fee-schedules/${id}`); message.success('Tarifa desactivada'); load(); };
  const svcName = (id: string) => services.find(s => s.id === id)?.name || '—';
  const progName = (id: string) => programs.find(p => p.id === id)?.name;
  const grpName = (id: string) => groups.find(g => g.id === id)?.name;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ margin: 0 }}>Tarifas</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openNew}>Nueva tarifa</Button>
      </div>
      <Ayuda title="Las tarifas son totalmente flexibles">
        <Paragraph style={{ marginBottom: 6 }}>Puedes crear el precio que quieras y <b>acoplarlo a distintos niveles</b>:</Paragraph>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li><b>Por servicio</b> (toda la actividad de Inglés a un precio).</li>
          <li><b>Por programa</b> (p. ej. PET distinto de CAE).</li>
          <li><b>Por grupo concreto</b> — distintos grupos de Inglés pueden tener distinto precio.</li>
          <li>Pon una <b>etiqueta</b> para tarifas especiales (p. ej. "1 día/semana").</li>
        </ul>
        <Paragraph style={{ marginTop: 6, marginBottom: 0 }}>
          Y para un alumno concreto puedes ponerle un precio especial desde su matrícula (override manual).
          Cuando se cobra, se aplica la más específica: <b>alumno → grupo → programa → servicio</b>.
        </Paragraph>
      </Ayuda>
      <Card>
        <SearchableTable rowKey="id" dataSource={rows} pagination={{ pageSize: 12 }}
          columns={[
            { title: 'Servicio', dataIndex: 'serviceId', render: svcName },
            { title: 'Concepto', dataIndex: 'concept', render: (c) => <Tag>{c}</Tag> },
            { title: 'Acoplada a', render: (_, r) => r.groupId ? <Tag color="blue">Grupo: {grpName(r.groupId)}</Tag> : r.programId ? <Tag color="geekblue">Programa: {progName(r.programId)}</Tag> : <Tag>Servicio</Tag> },
            { title: 'Etiqueta', dataIndex: 'label', render: (l) => l || '—' },
            { title: 'Importe', dataIndex: 'amount', render: (a) => <b>{Number(a).toFixed(2)} €</b> },
            { title: 'Dto. hermanos', dataIndex: 'siblingsDiscountEur', render: (d) => d && Number(d) ? `${Number(d).toFixed(2)} €` : '—' },
            { title: '', render: (_, r) => <Space><Button size="small" onClick={() => openEdit(r)}>Editar</Button><Popconfirm title="¿Desactivar tarifa?" onConfirm={() => remove(r.id)}><Button size="small" danger>Quitar</Button></Popconfirm></Space> },
          ]} />
      </Card>
      <Modal title={editing ? 'Editar tarifa' : 'Nueva tarifa'} open={open} onCancel={() => setOpen(false)} onOk={() => form.submit()} okText="Guardar">
        <Form form={form} layout="vertical" onFinish={save}>
          <Form.Item name="academicYearId" label="Curso" rules={[{ required: true }]}>
            <Select options={years.map(y => ({ value: y.id, label: y.label }))} />
          </Form.Item>
          <Form.Item name="serviceId" label="Servicio" rules={[{ required: true }]}>
            <Select options={services.map(s => ({ value: s.id, label: s.name }))} onChange={() => form.setFieldsValue({ programId: undefined, groupId: undefined })} />
          </Form.Item>
          <Form.Item noStyle shouldUpdate>
            {() => {
              const sid = form.getFieldValue('serviceId');
              const progs = programs.filter(p => p.serviceId === sid);
              return (
                <>
                  <Form.Item name="programId" label="Programa (opcional)" tooltip="Déjalo vacío para aplicar a todo el servicio">
                    <Select allowClear options={progs.map(p => ({ value: p.id, label: p.name }))} placeholder="Todos los programas" />
                  </Form.Item>
                  <Form.Item name="groupId" label="Grupo concreto (opcional)" tooltip="La tarifa más específica. Úsalo si un grupo tiene precio propio.">
                    <Select allowClear options={groups.map(g => ({ value: g.id, label: g.name }))} placeholder="Sin grupo concreto" />
                  </Form.Item>
                </>
              );
            }}
          </Form.Item>
          <Form.Item name="concept" label="Concepto" rules={[{ required: true }]}>
            <Select options={['matricula','mensualidad','material','maillot','taper_dia','taper_mes','otro'].map(c => ({ value: c, label: c }))} />
          </Form.Item>
          <Form.Item name="amount" label="Importe (€)" rules={[{ required: true }]}><InputNumber min={0} step={0.5} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="label" label="Etiqueta (opcional)" tooltip='Para tarifas especiales, p. ej. "1 día/semana"'><Input placeholder="Ej.: 1 día/semana" /></Form.Item>
          <Form.Item name="siblingsDiscountEur" label="Descuento hermanos (€)" tooltip="Importe fijo en euros a descontar por hermano"><InputNumber min={0} step={0.5} style={{ width: '100%' }} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// ----------------------------- GRUPOS -----------------------------
function Grupos({ user }: { user?: any }) {
  const isAdmin = user?.secretariaRoles?.includes('secretaria_admin');
  const [rows, setRows] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [years, setYears] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();
  const load = async () => { const { data } = await api.get('/catalog/groups'); setRows(data); };
  useLiveQuery(['groups'], load);
  const remove = async (id: string) => {
    try {
      const { data } = await api.delete(`/catalog/groups/${id}`);
      if (data?.ok === false) message.warning(data.error || 'No se pudo borrar el grupo');
      else { message.success('Grupo eliminado'); load(); }
    } catch { message.error('Error al eliminar'); }
  };
  useEffect(() => {
    load();
    api.get('/catalog/services').then(r => setServices(r.data));
    api.get('/catalog/programs').then(r => setPrograms(r.data));
    api.get('/catalog/years').then(r => setYears(r.data));
    api.get('/teachers').then(r => setTeachers(r.data));
  }, []);
  const openNew = () => { setEditing(null); form.resetFields(); form.setFieldsValue({ academicYearId: years.find(y => y.isActive)?.id }); setOpen(true); };
  const openEdit = (r: any) => {
    setEditing(r);
    form.setFieldsValue({
      ...r,
      customFeeMonthly: r.feeMonthly?.isCustom ? r.feeMonthly.amount : undefined,
      customFeeMatricula: r.feeMatricula?.isCustom ? r.feeMatricula.amount : undefined,
    });
    setOpen(true);
  };
  const save = async (v: any) => {
    const payload = { ...v, customFeeMonthly: v.customFeeMonthly ?? null, customFeeMatricula: v.customFeeMatricula ?? null };
    try {
      if (editing) {
        await api.patch(`/catalog/groups/${editing.id}`, payload);
        message.success('Grupo actualizado');
      } else {
        await api.post('/catalog/groups', payload);
        message.success('Grupo creado');
      }
      setOpen(false); setEditing(null); load();
    } catch (e: any) { message.error(e?.response?.data?.message || 'Error'); }
  };
  const progName = (id: string) => programs.find(p => p.id === id)?.name || '—';
  const teacherName = (id: string) => teachers.find(t => t.id === id)?.fullName || '—';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ margin: 0 }}>Grupos</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openNew}>Nuevo grupo</Button>
      </div>
      <Ayuda title="Los grupos organizan a los alumnos por curso">
        Crea un grupo eligiendo su <b>programa</b> (p. ej. "PET (B1)" o "Ballet Iniciación"), ponle nombre, aula y aforo.
        Luego, en <b>Matrículas</b>, asignas alumnos a cada grupo. Recuerda que cada grupo puede tener <b>su propia tarifa</b> en la sección de Tarifas.
      </Ayuda>
      <Card>
        <SearchableTable rowKey="id" dataSource={rows} pagination={{ pageSize: 12 }}
          columns={[
            { title: 'Grupo', dataIndex: 'name' },
            { title: 'Programa', dataIndex: 'programId', render: progName },
            { title: 'Profesor', dataIndex: 'teacherId', render: (t) => t ? teacherName(t) : '—' },
            { title: 'Aula', dataIndex: 'room', render: (r) => r || '—' },
            { title: 'Aforo', dataIndex: 'capacity', render: (c) => c || '—' },
            {
              title: 'Tarifa/mes',
              render: (_: any, r: any) => {
                const f = r.feeMonthly;
                if (!f || f.amount == null) return <Text type="secondary">Sin tarifa</Text>;
                return f.isCustom
                  ? <><Text strong style={{ color: '#579172' }}>{f.amount}€</Text> <Tag color="green" style={{ fontSize: 11 }}>Personalizada</Tag></>
                  : <Text type="secondary">{f.amount}€ (heredada)</Text>;
              },
            },
            {
              title: 'Matrícula',
              render: (_: any, r: any) => {
                const f = r.feeMatricula;
                if (!f || f.amount == null) return <Text type="secondary">—</Text>;
                return f.isCustom
                  ? <><Text strong style={{ color: '#579172' }}>{f.amount}€</Text> <Tag color="green" style={{ fontSize: 11 }}>Personalizada</Tag></>
                  : <Text type="secondary">{f.amount}€ (heredada)</Text>;
              },
            },
            {
              title: '',
              render: (_: any, r: any) => (
                <Space>
                  <Button size="small" onClick={() => openEdit(r)}>Editar</Button>
                  {isAdmin && (
                    <Popconfirm
                      title="¿Borrar grupo?"
                      description="Si no tiene alumnos, se elimina junto con sus franjas de horario y apartados de cuaderno."
                      okText="Borrar" cancelText="Cancelar" okButtonProps={{ danger: true }}
                      onConfirm={() => remove(r.id)}>
                      <Button size="small" danger>Borrar</Button>
                    </Popconfirm>
                  )}
                </Space>
              ),
            },
          ]} />
      </Card>
      <Modal
        title={editing ? 'Editar grupo' : 'Nuevo grupo'}
        open={open}
        onCancel={() => { setOpen(false); setEditing(null); }}
        onOk={() => form.submit()}
        okText={editing ? 'Guardar' : 'Crear'}
      >
        <Form form={form} layout="vertical" onFinish={save}>
          <Form.Item name="academicYearId" label="Curso" rules={[{ required: true }]}>
            <Select options={years.map(y => ({ value: y.id, label: y.label }))} />
          </Form.Item>
          <Form.Item name="programId" label="Programa" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label"
              options={programs.map(p => ({ value: p.id, label: `${services.find(s => s.id === p.serviceId)?.name || ''} · ${p.name}` }))} />
          </Form.Item>
          <Form.Item name="name" label="Nombre del grupo" rules={[{ required: true }]}><Input placeholder="Ej.: PET Martes y Jueves" /></Form.Item>
          <Form.Item name="teacherId" label="Profesor"><Select allowClear showSearch optionFilterProp="label" placeholder="Sin asignar" options={teachers.map(t => ({ value: t.id, label: t.fullName }))} /></Form.Item>
          <Form.Item name="room" label="Aula"><Input /></Form.Item>
          <Form.Item name="capacity" label="Aforo"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
          <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 12, marginTop: 4 }}>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
              Tarifas del grupo (opcional) — si se dejan vacías, hereda la tarifa del programa o servicio
            </Text>
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item
                  name="customFeeMonthly"
                  label={
                    <span>
                      Mensualidad propia
                      {editing?.feeMonthly?.amount != null && (
                        <Text type="secondary" style={{ fontSize: 11, marginLeft: 6 }}>
                          heredada: {editing.feeMonthly.amount}€
                        </Text>
                      )}
                    </span>
                  }
                >
                  <InputNumber min={0} step={0.5} style={{ width: '100%' }} placeholder="€/mes" addonAfter="€" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="customFeeMatricula"
                  label={
                    <span>
                      Matrícula propia
                      {editing?.feeMatricula?.amount != null && (
                        <Text type="secondary" style={{ fontSize: 11, marginLeft: 6 }}>
                          heredada: {editing.feeMatricula.amount}€
                        </Text>
                      )}
                    </span>
                  }
                >
                  <InputNumber min={0} step={0.5} style={{ width: '100%' }} placeholder="€ único" addonAfter="€" />
                </Form.Item>
              </Col>
            </Row>
          </div>
        </Form>
      </Modal>
    </div>
  );
}

// ----------------------------- MATRÍCULAS -----------------------------
const STATUS_META: any = {
  preinscrito: { color: 'default', label: 'Preinscrito' },
  matriculado: { color: 'green', label: 'Matriculado' },
  pendiente: { color: 'gold', label: 'Pendiente' },
  lista_espera: { color: 'orange', label: 'Lista de espera' },
  baja: { color: 'red', label: 'Baja' },
};
function Bajas({ user }: { user?: any }) {
  const isAdmin = (user?.secretariaRoles || []).includes('secretaria_admin');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const load = async () => { setLoading(true); try { const { data } = await api.get('/students/inactive/list'); setRows(data); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const reactivate = async (id: string) => { try { await api.patch(`/students/${id}/reactivate`); message.success('Alumno reactivado'); load(); } catch { message.error('Error'); } };
  const forceDelete = async (id: string) => { try { const { data } = await api.delete(`/students/${id}/force`); if (data.ok === false) message.warning(data.error); else { message.success('Alumno eliminado definitivamente'); load(); } } catch { message.error('Error al eliminar'); } };
  const fmt = (d: any) => fmtDate(d);
  return (
    <div>
      <Title level={3}>Alumnos dados de baja</Title>
      <Ayuda title="Alumnos que han causado baja">
        Aquí ves los alumnos dados de baja: tanto los <b>eliminados del listado</b> como aquellos cuyas <b>matrículas están todas en baja</b>
        (no aparecen en <b>Alumnos</b>, que muestra solo los activos). Se conserva su historial. {isAdmin ? 'Puedes ' : 'Un administrador puede '}<b>reactivarlos</b>
        o, si es un duplicado, <b>eliminarlos definitivamente</b>.
      </Ayuda>
      <Card>
        <SearchableTable rowKey="id" dataSource={rows} loading={loading} pagination={{ pageSize: 20 }}
          columns={[
            { title: 'Alumno', render: (_, r) => `${r.firstName || ''} ${r.lastName || ''}`.trim() || '—' },
            { title: 'Origen', dataIndex: 'mwpanelStudentId', render: (v) => v ? <Tag color="purple">Escuela (MW Panel)</Tag> : <Tag>Academia</Tag> },
            { title: 'Servicios', dataIndex: 'services', render: (s: any[]) => (s && s.length) ? s.join(', ') : '—' },
            { title: 'Tipo', dataIndex: 'studentInactive', render: (inactive) => inactive
                ? <Tag color="red">Alumno eliminado</Tag>
                : <Tag color="orange">Matrículas de baja</Tag> },
            { title: 'Fecha de baja', render: (_, r) => fmt(r.deactivatedAt || r.lastWithdrawnAt) },
            ...(isAdmin ? [{ title: '', render: (_: any, r: any) => (
              <Space size={4}>
                <Popconfirm title="¿Reactivar alumno?" description="Vuelve al listado de Alumnos; sus matrículas en baja pasan a matriculado." okText="Reactivar" cancelText="Cancelar" onConfirm={() => reactivate(r.id)}>
                  <Button size="small">Reactivar</Button>
                </Popconfirm>
                <Popconfirm title="¿Eliminar definitivamente?" description="Borra al alumno y TODO su rastro (matrículas, recibos, documentos). Úsalo solo para duplicados. Irreversible." okText="Eliminar" cancelText="Cancelar" okButtonProps={{ danger: true }} onConfirm={() => forceDelete(r.id)}>
                  <Button size="small" danger>Eliminar definitivamente</Button>
                </Popconfirm>
              </Space>
            ) }] : []),
          ]} />
      </Card>
    </div>
  );
}

function Matriculas({ user }: { user?: any }) {
  const isAdmin = (user?.secretariaRoles || []).includes('secretaria_admin');
  const [rows, setRows] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [years, setYears] = useState<any[]>([]);
  const [filterService, setFilterService] = useState<string | undefined>();
  const [filterStatus, setFilterStatus] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [addTo, setAddTo] = useState<any>(null);                      // alumno al que añadir otro servicio
  const [addService, setAddService] = useState<string | undefined>();
  const [addMatriculate, setAddMatriculate] = useState(false);
  const load = async () => {
    setLoading(true);
    try {
      const params: any = {};
      const activeYear = years.find(y => y.isActive)?.id;
      if (activeYear) params.academicYearId = activeYear;
      if (filterService) params.serviceId = filterService;
      if (filterStatus) params.status = filterStatus;
      const { data } = await api.get('/enrollments', { params });
      setRows(data);
    } finally { setLoading(false); }
  };
  useLiveQuery(['enrollments', 'groups'], load);
  // Apuntar a un alumno EXISTENTE a otro servicio (igual que en Alumnos)
  const doAddService = async () => {
    if (!addTo || !addService) return;
    try {
      const { data } = await api.post(`/students/${addTo.studentId}/enroll`, { serviceId: addService, matriculate: addMatriculate });
      if (data?.ok === false) message.warning(data.error || 'No se pudo apuntar');
      else message.success(addMatriculate ? 'Alumno matriculado en el servicio' : 'Apuntado (preinscrito) al servicio');
      setAddTo(null); setAddService(undefined); setAddMatriculate(false); load();
    } catch { message.error('Error al añadir el servicio'); }
  };
  useEffect(() => {
    api.get('/catalog/services').then(r => setServices(r.data));
    api.get('/catalog/groups').then(r => setGroups(r.data));
    api.get('/catalog/years').then(r => setYears(r.data));
  }, []);
  useEffect(() => { if (years.length) load(); }, [years, filterService, filterStatus]);
  const changeStatus = async (id: string, status: string) => {
    try { await api.patch(`/enrollments/${id}`, { status }); message.success('Estado actualizado'); load(); }
    catch (e: any) { message.error('Error'); }
  };
  const changeGroup = async (id: string, groupId: string) => {
    try { await api.patch(`/enrollments/${id}`, { groupId }); message.success('Grupo asignado'); load(); }
    catch { message.error('Error'); }
  };
  const changeService = async (id: string, serviceId: string) => {
    try {
      const { data } = await api.patch(`/enrollments/${id}`, { serviceId });
      if (data?.ok === false) message.warning(data.error || 'No se pudo cambiar el servicio');
      else message.success('Servicio cambiado (se ha quitado el grupo anterior)');
      load();
    } catch { message.error('Error al cambiar el servicio'); }
  };
  const [feeRow, setFeeRow] = useState<any>(null);
  const [feeForm] = Form.useForm();
  const openFee = (r: any) => { setFeeRow(r); feeForm.setFieldsValue({ customFee: r.customFee ?? undefined, customFeeReason: r.customFeeReason || '' }); };
  const doFee = async (v: any) => {
    try {
      await api.patch(`/enrollments/${feeRow.id}/fee`, { customFee: v.customFee, customFeeReason: v.customFeeReason || null });
      message.success('Tarifa actualizada'); setFeeRow(null); load();
    } catch { message.error('Error al actualizar la tarifa'); }
  };
  // Aviso de reservas pendientes + baja en bloque
  const [pending, setPending] = useState<any[]>([]);
  const [minDays, setMinDays] = useState<number>(0);
  const [selected, setSelected] = useState<string[]>([]);
  const loadPending = async () => { try { const { data } = await api.get('/enrollments/pending-reservations'); setPending(data); } catch { setPending([]); } };
  useEffect(() => { loadPending(); }, []);
  const filteredPending = pending.filter((p: any) => (p.daysWaiting || 0) >= minDays);
  const bulkBaja = async () => {
    if (!selected.length) return;
    try { const { data } = await api.post('/enrollments/bulk-baja', { enrollmentIds: selected });
      message.success(`${data.count} preinscripción(es) dadas de baja`); setSelected([]); loadPending(); load(); }
    catch { message.error('Error al dar de baja'); }
  };
  return (
    <div>
      <Title level={3}>Matrículas</Title>
      <Ayuda title="Gestiona el servicio, el estado y el grupo de cada alumno">
        Cambia el <b>servicio</b> de cada matrícula desde su columna (al cambiarlo se quita el grupo anterior, que pertenecía al servicio previo),
        el <b>estado</b> (preinscrito → matriculado, en lista de espera o baja) y <b>asigna el grupo</b>.
        La columna <b>Tarifa/mes</b> muestra el precio que se le aplicará (según servicio, grupo o precio especial). Filtra por servicio arriba.
      </Ayuda>
      <Card>
        <Space style={{ marginBottom: 12 }} wrap>
          <Text>Servicio:</Text>
          <Select allowClear placeholder="Todos" style={{ width: 200 }} value={filterService} onChange={setFilterService}
            options={services.map(s => ({ value: s.id, label: s.name }))} />
          <Text>Estado:</Text>
          <Select allowClear placeholder="Todos" style={{ width: 170 }} value={filterStatus} onChange={setFilterStatus}
            options={Object.keys(STATUS_META).map(k => ({ value: k, label: STATUS_META[k].label }))} dropdownMatchSelectWidth={false} />
        </Space>
        <SearchableTable rowKey="id" dataSource={rows} loading={loading} pagination={{ pageSize: 15 }}
          columns={[
            { title: 'Alumno', dataIndex: 'studentName' },
            { title: 'Servicio', dataIndex: 'serviceId', render: (sv, r) => (
              <Select size="small" value={sv} style={{ width: 180 }} onChange={(v) => changeService(r.id, v)}
                options={services.map(s => ({ value: s.id, label: s.name }))}
                dropdownMatchSelectWidth={false} />
            ) },
            { title: 'Estado', dataIndex: 'status', render: (s, r) => (
              <Select size="small" value={s} style={{ width: 150 }} onChange={(v) => changeStatus(r.id, v)}
                options={Object.keys(STATUS_META).map(k => ({ value: k, label: STATUS_META[k].label }))}
                dropdownMatchSelectWidth={false} />
            ) },
            { title: 'Grupo', dataIndex: 'groupId', render: (g, r) => {
              const svcGroups = groups.filter((gr: any) => gr.serviceId === r.serviceId);
              return (
              <Select size="small" allowClear placeholder={svcGroups.length ? 'Sin grupo' : 'Sin grupos en este servicio'}
                value={g || undefined} style={{ width: 190 }}
                onChange={(v) => changeGroup(r.id, v)}
                options={svcGroups.map(gr => ({ value: gr.id, label: gr.name }))} dropdownMatchSelectWidth={false} />
            ); } },
            { title: 'Tarifa/mes', dataIndex: 'monthlyFee', render: (f, r) => (
                <Space size={4}>
                  {f != null
                    ? <span>{Number(f).toFixed(2)} €{r.customFee != null && <Tag color="purple" style={{ marginLeft: 4 }}>especial</Tag>}</span>
                    : <Tag>sin tarifa</Tag>}
                  <Button size="small" type="link" onClick={() => openFee(r)}>Editar</Button>
                </Space>
              ) },
            { title: 'Pago', render: (_, r) => {
                const pend = r.pendingCharges || 0, paid = r.paidCharges || 0;
                if (!pend && !paid) return <Text type="secondary">sin recibos</Text>;
                return <Space size={4}>
                  {paid > 0 && <Tag color="green" style={{ margin: 0 }}>{paid} pagado{paid > 1 ? 's' : ''}</Tag>}
                  {pend > 0 && <Tooltip title={`Pendiente: ${Number(r.pendingAmount || 0).toFixed(2)} €`}><Tag color="gold" style={{ margin: 0 }}>{pend} pend.</Tag></Tooltip>}
                </Space>;
              } },
            { title: '', key: 'add', render: (_, r) => (
                <Button size="small" icon={<PlusOutlined />} onClick={() => { setAddTo(r); setAddService(undefined); setAddMatriculate(false); }}>Servicio</Button>
              ) },
          ]} />
      </Card>
      <Modal title={`Tarifa personalizada — ${feeRow?.studentName || ''}`} open={!!feeRow}
        onCancel={() => setFeeRow(null)} onOk={() => feeForm.submit()} okText="Guardar tarifa">
        <Alert type="info" showIcon style={{ marginBottom: 12 }}
          message="Tarifa especial para esta matrícula"
          description="Sobrescribe la tarifa de servicio/grupo. Deja el importe vacío para volver a la tarifa estándar." />
        <Form form={feeForm} layout="vertical" onFinish={doFee}>
          <Form.Item name="customFee" label="Tarifa mensual (€)"><InputNumber min={0} style={{ width: '100%' }} placeholder="Vacío = tarifa estándar" /></Form.Item>
          <Form.Item name="customFeeReason" label="Motivo (opcional)"><Input placeholder="p. ej. beca, descuento hermanos…" /></Form.Item>
        </Form>
      </Modal>

      <Modal title={`Apuntar a otro servicio — ${addTo?.studentName || ''}`}
        open={!!addTo} onCancel={() => { setAddTo(null); setAddMatriculate(false); }} onOk={doAddService}
        okText={addMatriculate ? 'Matricular' : 'Apuntar'} okButtonProps={{ disabled: !addService }}>
        <Alert type="info" showIcon style={{ marginBottom: 12 }}
          message={addMatriculate
            ? 'Se matricula directamente en ese servicio (genera recibos de matrícula/material si su programa los cobra).'
            : 'Se crea una preinscripción para ese servicio. Marca "Matricular directamente" para matricularlo ya.'} />
        {(() => { const has = rows.filter((x: any) => x.studentId === addTo?.studentId);
          return has.length > 0 ? <Paragraph>Ya está en: {has.map((en: any) => <Tag key={en.id}>{en.serviceName}</Tag>)}</Paragraph> : null; })()}
        <Select style={{ width: '100%' }} placeholder="Elige el servicio" value={addService} onChange={setAddService}
          options={services.filter(s => !rows.some((x: any) => x.studentId === addTo?.studentId && x.serviceId === s.id)).map(s => ({ value: s.id, label: s.name }))} />
        <div style={{ marginTop: 12 }}>
          <Checkbox checked={addMatriculate} onChange={e => setAddMatriculate(e.target.checked)}>Matricular directamente (en vez de solo preinscribir)</Checkbox>
        </div>
      </Modal>

      {pending.length > 0 && (
        <Card style={{ marginTop: 16 }}
          title={<span><WarningOutlined style={{ color: '#faad14' }} /> Reservas de plaza pendientes ({pending.length})</span>}>
          <Alert type="warning" showIcon style={{ marginBottom: 12 }}
            message="Preinscritos cuya reserva (matrícula) aún no está pagada ni exenta"
            description="Revisa y reclama el pago de la reserva. Si procede liberar la plaza, selecciónalos y dales de baja en bloque (acción de administrador)." />
          <Space style={{ marginBottom: 12 }} wrap>
            <Text>Llevan esperando ≥</Text>
            <InputNumber min={0} value={minDays} onChange={(v) => setMinDays(Number(v) || 0)} style={{ width: 80 }} /> <Text>días</Text>
            {isAdmin && (
              <Popconfirm title={`¿Dar de baja ${selected.length} preinscripción(es)?`}
                description="Libera la plaza (estado → baja, con fecha). No borra al alumno ni su historial."
                okText="Dar de baja" cancelText="Cancelar" okButtonProps={{ danger: true }} onConfirm={bulkBaja}>
                <Button danger disabled={!selected.length}>Dar de baja seleccionados ({selected.length})</Button>
              </Popconfirm>
            )}
          </Space>
          <SearchableTable rowKey="id" dataSource={filteredPending} size="small" pagination={{ pageSize: 20 }}
            searchPlaceholder="Buscar alumno…"
            rowSelection={isAdmin ? { selectedRowKeys: selected, onChange: (keys: any[]) => setSelected(keys as string[]) } : undefined}
            columns={[
              { title: 'Alumno', dataIndex: 'studentName' },
              { title: 'Servicio', dataIndex: 'serviceName' },
              { title: 'Días esperando', dataIndex: 'daysWaiting', sorter: (a: any, b: any) => (a.daysWaiting || 0) - (b.daysWaiting || 0),
                render: (d: number) => <Tag color={d >= 30 ? 'red' : d >= 14 ? 'orange' : 'default'}>{d} días</Tag> },
              { title: 'Reserva', dataIndex: 'reservationBilled', render: (b: boolean) => b ? <Tag color="gold">facturada, sin pagar</Tag> : <Tag>sin generar</Tag> },
            ]} />
        </Card>
      )}
    </div>
  );
}

// ----------------------------- PROGRAMAS -----------------------------
const COURSE_MONTHS: [string, string][] = [
  ['09','Sep'],['10','Oct'],['11','Nov'],['12','Dic'],['01','Ene'],['02','Feb'],
  ['03','Mar'],['04','Abr'],['05','May'],['06','Jun'],['07','Jul'],['08','Ago'],
];
const FACTOR_OPTIONS = [
  { value: 0, label: 'No se cobra' }, { value: 0.25, label: '¼ mes' },
  { value: 0.5, label: 'Medio mes' }, { value: 0.75, label: '¾ mes' }, { value: 1, label: 'Mes completo' },
];
const defaultFactor = (mm: string) => (['07','08'].includes(mm) ? 0 : 1);
const factorOf = (mb: any, mm: string) => (mb && mb[mm] != null ? Number(mb[mm]) : defaultFactor(mm));
const FACTOR_SHORT: Record<string, string> = { '0': '✗', '0.25': '¼', '0.5': '½', '0.75': '¾', '1': '' };
function monthSummary(mb: any): React.ReactNode {
  // resume meses que NO son "completo": no se cobran o son parciales
  const ex = COURSE_MONTHS.filter(([mm]) => factorOf(mb, mm) !== 1)
    .map(([mm, lbl]) => `${lbl} ${FACTOR_SHORT[String(factorOf(mb, mm))] ?? factorOf(mb, mm)}`.trim());
  return ex.length ? ex.join(' · ') : 'Todos completos';
}

function Programas() {
  const [rows, setRows] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();
  const load = async () => { const { data } = await api.get('/catalog/programs'); setRows(data); };
  useEffect(() => { load(); api.get('/catalog/services').then(r => setServices(r.data)); }, []);
  const mbFields = (mb: any) => Object.fromEntries(COURSE_MONTHS.map(([mm]) => [`mb_${mm}`, factorOf(mb, mm)]));
  const openNew = () => { setEditing(null); form.resetFields();
    form.setFieldsValue({ billsMatricula: true, billsMaterial: false, ...mbFields(null) }); setOpen(true); };
  const openEdit = (r: any) => { setEditing(r); form.setFieldsValue({ ...r, ...mbFields(r.monthBilling) }); setOpen(true); };
  const save = async (v: any) => {
    // Reconstruye el mapa mes→factor a partir de los campos mb_*
    const monthBilling: Record<string, number> = {};
    for (const [mm] of COURSE_MONTHS) { monthBilling[mm] = Number(v[`mb_${mm}`] ?? defaultFactor(mm)); delete v[`mb_${mm}`]; }
    const payload = { ...v, monthBilling };
    try { if (editing) await api.patch(`/catalog/programs/${editing.id}`, payload); else await api.post('/catalog/programs', payload);
      message.success('Programa guardado'); setOpen(false); load(); }
    catch (e: any) { message.error(e?.response?.data?.message || 'Error'); }
  };
  const remove = async (id: string) => { try { await api.delete(`/catalog/programs/${id}`); message.success('Programa eliminado'); load(); } catch { message.error('No se pudo eliminar (¿tiene grupos?)'); } };
  const svcName = (id: string) => services.find(s => s.id === id)?.name || '—';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ margin: 0 }}>Programas</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openNew}>Nuevo programa</Button>
      </div>
      <Ayuda title="Los programas son los niveles/modalidades de cada servicio">
        Por ejemplo, dentro de <b>Inglés</b> están Starters, PET, FCE… y dentro de <b>Danza</b> los niveles de ballet.
        Aquí puedes <b>añadir, renombrar o quitar</b> programas. Luego creas <b>grupos</b> de cada programa y les pones su <b>tarifa</b>.
        <Paragraph style={{ marginTop: 6, marginBottom: 0 }}>
          En cada programa decides <b>qué conceptos cobra</b>: matrícula, material, julio y agosto. La mensualidad de
          <b> septiembre a junio</b> se cobra siempre. Así, los programas que no pagan agosto o material simplemente no mostrarán
          esas columnas en Pagos (saldrán como <Tag>no aplica</Tag>).
        </Paragraph>
      </Ayuda>
      <Card>
        <SearchableTable rowKey="id" dataSource={rows} pagination={{ pageSize: 15 }}
          columns={[
            { title: 'Servicio', dataIndex: 'serviceId', render: svcName },
            { title: 'Programa', dataIndex: 'name' },
            { title: 'Orden', dataIndex: 'levelOrder', render: (o) => o ?? '—' },
            { title: 'Conceptos que cobra', render: (_, r) => (
              <Space size={4} wrap>
                {r.billsMatricula && <Tag color="geekblue">Matrícula</Tag>}
                {r.billsMaterial && <Tag color="cyan">Material</Tag>}
                <Tooltip title="Meses que no se cobran completos (✗ no se cobra, ½ medio mes, etc.)">
                  <Tag color="default">Meses: {monthSummary(r.monthBilling)}</Tag>
                </Tooltip>
              </Space>
            ) },
            { title: '', render: (_, r) => <Space><Button size="small" onClick={() => openEdit(r)}>Editar</Button><Popconfirm title="¿Eliminar programa?" onConfirm={() => remove(r.id)}><Button size="small" danger>Quitar</Button></Popconfirm></Space> },
          ]} />
      </Card>
      <Modal title={editing ? 'Editar programa' : 'Nuevo programa'} open={open} onCancel={() => setOpen(false)} onOk={() => form.submit()} okText="Guardar">
        <Form form={form} layout="vertical" onFinish={save}>
          <Form.Item name="serviceId" label="Servicio" rules={[{ required: true }]}>
            <Select options={services.map(s => ({ value: s.id, label: s.name }))} />
          </Form.Item>
          <Form.Item name="name" label="Nombre del programa" rules={[{ required: true }]}><Input placeholder="Ej.: PET (B1)" /></Form.Item>
          <Form.Item name="levelOrder" label="Orden (para ordenar la lista)"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="capacity" label="Aforo por defecto (opcional)"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
          <Alert type="info" showIcon style={{ marginBottom: 12 }}
            message="¿Qué cobra este programa?"
            description="Marca matrícula/material si aplican, y define mes a mes cuánto se cobra: completo, medio mes, otra fracción o nada (p. ej. programas que no cobran septiembre, o junio a medio mes). Los importes base se ponen en Tarifas." />
          <Row gutter={12}>
            <Col span={12}><Form.Item name="billsMatricula" label="Cobra matrícula" valuePropName="checked"><Switch /></Form.Item></Col>
            <Col span={12}><Form.Item name="billsMaterial" label="Cobra material" valuePropName="checked"><Switch /></Form.Item></Col>
          </Row>
          <Text strong>Cobro mes a mes</Text>
          <Row gutter={[8, 0]} style={{ marginTop: 8 }}>
            {COURSE_MONTHS.map(([mm, lbl]) => (
              <Col span={8} key={mm}>
                <Form.Item name={`mb_${mm}`} label={lbl} style={{ marginBottom: 8 }}>
                  <Select size="small" options={FACTOR_OPTIONS} />
                </Form.Item>
              </Col>
            ))}
          </Row>
        </Form>
      </Modal>
    </div>
  );
}

// ----------------------------- PAGOS (matriz curso completo) -----------------------------
// ¿Aplica esta columna a este alumno según lo que cobra su programa?
function columnApplies(col: any, row: any): boolean {
  if (col.concept === 'matricula') return !!row.billsMatricula;
  if (col.concept === 'material') return !!row.billsMaterial;
  if (col.mm) return factorOf(row.monthBilling, col.mm) > 0; // mensualidad: factor > 0
  return true;
}
function Pagos() {
  const [services, setServices] = useState<any[]>([]);
  const [years, setYears] = useState<any[]>([]);
  const [filterService, setFilterService] = useState<string | undefined>();
  const [data, setData] = useState<any>({ columns: [], rows: [] });
  const [loading, setLoading] = useState(false);
  const [genOpen, setGenOpen] = useState(false);
  const [genMonth, setGenMonth] = useState<string | undefined>();
  const [genCourseOpen, setGenCourseOpen] = useState(false);
  const [payCell, setPayCell] = useState<any>(null);
  const [payForm] = Form.useForm();
  const activeYear = () => years.find(y => y.isActive);

  const load = async () => {
    const y = activeYear(); if (!y) return;
    setLoading(true);
    try {
      const { data } = await api.get('/payments/matrix', { params: { academicYearId: y.id, serviceId: filterService } });
      setData(data);
    } finally { setLoading(false); }
  };
  useLiveQuery(['payments', 'enrollments'], load);
  useEffect(() => { api.get('/catalog/services').then(r => setServices(r.data)); api.get('/catalog/years').then(r => setYears(r.data)); }, []);
  useEffect(() => { if (years.length) load(); }, [years, filterService]);

  // Sólo se pueden generar de a mes los meses de mensualidad
  const monthOptions = (data.columns || []).filter((c: any) => c.concept === 'mensualidad');

  const doGenerate = async () => {
    const y = activeYear(); if (!y || !genMonth) return;
    try { const { data } = await api.post('/payments/generate-charges', { academicYearId: y.id, period: genMonth, serviceId: filterService });
      message.success(`${data.generated} recibos generados`); setGenOpen(false); load(); }
    catch (e: any) { message.error('Error generando recibos'); }
  };
  const doGenerateCourse = async () => {
    const y = activeYear(); if (!y) return;
    try { const { data } = await api.post('/payments/generate-course-charges', { academicYearId: y.id, serviceId: filterService });
      message.success(`${data.generated} recibos generados para el curso completo`); setGenCourseOpen(false); load(); }
    catch { message.error('Error generando recibos del curso'); }
  };
  const doGenerateReservations = async () => {
    const y = activeYear(); if (!y) return;
    try { const { data } = await api.post('/payments/generate-reservations', { academicYearId: y.id, serviceId: filterService });
      message.success(`${data.generated} recibo(s) de reserva (matrícula) generados a preinscritos`); load(); }
    catch { message.error('Error generando reservas'); }
  };
  // Abre el cobro de una celda (exista o no recibo). c = recibo existente (o undefined).
  const openPay = (col: any, r: any, c?: any) => {
    const factor = col.mm ? factorOf(r.monthBilling, col.mm) : 1;
    const expected = c != null ? Number(c.amountDue)
      : (col.concept === 'mensualidad' && r.monthlyFee != null ? Number((Number(r.monthlyFee) * factor).toFixed(2)) : undefined);
    setPayCell({
      studentName: r.studentName, enrollmentId: r.enrollmentId,
      concept: col.concept, period: col.period, mm: col.mm,
      chargeId: c?.id, status: c?.status, label: col.label,
    });
    payForm.setFieldsValue({ method: 'efectivo', amount: expected, paidAt: new Date().toISOString().slice(0, 10) });
  };
  // Marcar pagado: crea el recibo al vuelo si no existe (no genera pendientes a todos).
  const doPay = async (v: any) => {
    try {
      await api.post('/payments/pay-cell', {
        enrollmentId: payCell.enrollmentId, concept: payCell.concept, period: payCell.period, mm: payCell.mm,
        method: v.method, amount: v.amount, paidAt: v.paidAt,
      });
      message.success('Cobro registrado'); setPayCell(null); load();
    } catch { message.error('Error al registrar el cobro'); }
  };
  const doExempt = async () => {
    try {
      await api.post('/payments/pay-cell', {
        enrollmentId: payCell.enrollmentId, concept: payCell.concept, period: payCell.period, mm: payCell.mm, exempt: true,
      });
      message.success('Marcado como exento'); setPayCell(null); load();
    } catch { message.error('Error'); }
  };
  // Corregir un recibo EXISTENTE: pendiente / anulado (deshace el cobro si lo hubiera).
  const doSetStatus = async (status: string) => {
    if (!payCell?.chargeId) { setPayCell(null); return; }
    try {
      const v = payForm.getFieldsValue();
      await api.post('/payments/set-charge-status', { chargeId: payCell.chargeId, status, method: v.method, amount: v.amount, paidAt: v.paidAt });
      message.success('Estado del recibo actualizado'); setPayCell(null); load();
    } catch { message.error('Error al cambiar el estado'); }
  };

  const renderCell = (col: any, r: any) => {
    if (!columnApplies(col, r)) return <Tooltip title="Este programa no cobra este concepto/mes"><span style={{ color: '#d9d9d9' }}>—</span></Tooltip>;
    const factor = col.mm ? factorOf(r.monthBilling, col.mm) : 1;
    const partial = col.mm && factor < 1 ? ` (${factor === 0.5 ? 'medio mes' : `×${factor}`})` : '';
    const c = r.cells[col.key];
    if (!c) {
      const expected = col.mm && r.monthlyFee != null ? ` · ${(Number(r.monthlyFee) * factor).toFixed(2)}€${partial}` : '';
      return <Tooltip title={`Sin recibo — clic para cobrar (se crea el recibo)${expected}`}>
        <Tag style={{ margin: 0, cursor: 'pointer', borderStyle: 'dashed', color: '#999', background: 'transparent' }}
          onClick={() => openPay(col, r, undefined)}>+</Tag></Tooltip>;
    }
    if (c.status === 'pagado') return <Tooltip title={`${c.paidAt ? `Pagado ${fmtDate(c.paidAt)}` : 'Pagado'} — clic para corregir`}>
      <Tag color="green" style={{ margin: 0, cursor: 'pointer' }} onClick={() => openPay(col, r, c)}>✓</Tag></Tooltip>;
    if (c.status === 'exento') return <Tooltip title="Exento — clic para corregir"><Tag style={{ margin: 0, cursor: 'pointer' }} onClick={() => openPay(col, r, c)}>x</Tag></Tooltip>;
    if (c.status === 'anulado') return <Tooltip title="Anulado — clic para corregir"><Tag color="default" style={{ margin: 0, cursor: 'pointer', color: '#999' }} onClick={() => openPay(col, r, c)}>∅</Tag></Tooltip>;
    return <Tooltip title={`Pendiente · ${Number(c.amountDue).toFixed(2)}€${partial} — clic para cobrar`}>
      <Tag color={factor < 1 ? 'orange' : 'gold'} style={{ margin: 0, cursor: 'pointer' }}
        onClick={() => openPay(col, r, c)}>€</Tag></Tooltip>;
  };

  const cols: any[] = [
    { title: 'Alumno', dataIndex: 'studentName', fixed: 'left', width: 170 },
    ...(data.columns || []).map((col: any) => ({
      title: col.label, key: col.key, align: 'center',
      width: (col.concept === 'matricula' || col.concept === 'material') ? 80 : 56,
      onHeaderCell: () => ({ style: (col.concept === 'matricula' || col.concept === 'material' || col.flag)
        ? { background: '#EEF5FA' } : {} }),
      render: (_: any, r: any) => renderCell(col, r),
    })),
    { title: 'Tarifa', dataIndex: 'monthlyFee', fixed: 'right', width: 70, align: 'center', render: (f: any) => f != null ? `${Number(f).toFixed(0)}€` : '—' },
  ];

  return (
    <div>
      <Title level={3}>Pagos</Title>
      <Ayuda title="La matriz de cobros del curso completo (como la hoja del Excel, pero consistente)">
        Cada fila es un alumno y cada columna un concepto: <b>Matrícula</b>, <b>Material</b>, las <b>mensualidades de septiembre a junio</b>,
        y <b>Julio/Agosto</b> en los programas que los cobran. Las columnas de matrícula/material/verano aparecen sombreadas.
        <Paragraph style={{ marginTop: 6, marginBottom: 0 }}>
          Haz <b>clic en cualquier celda</b> para registrar el cobro (fecha, método e importe) y marcarlo pagado.
          Si la celda <b><Tag style={{ margin: 0, borderStyle: 'dashed', color: '#999', background: 'transparent' }}>+</Tag></b> no tiene recibo, se <b>crea al vuelo</b> al cobrarlo — así puedes cobrar meses por adelantado sin generar pendientes a todos (evitando falsa morosidad).
          Verde <Tag color="green" style={{ margin: 0 }}>✓</Tag> = pagado, <Tag color="gold" style={{ margin: 0 }}>€</Tag> = pendiente, <Tag style={{ margin: 0 }}>x</Tag> = exento,
          <span style={{ color: '#bbb', margin: '0 4px' }}>—</span> = el programa no cobra ese concepto.
          Para crear pendientes en bloque (p. ej. para una remesa) siguen estando <b>Generar recibos del curso/mes</b>.
        </Paragraph>
      </Ayuda>
      <Card>
        <Space style={{ marginBottom: 12 }} wrap>
          <Text>Servicio:</Text>
          <Select allowClear placeholder="Todos" style={{ width: 180 }} value={filterService} onChange={setFilterService} options={services.map(s => ({ value: s.id, label: s.name }))} />
          <Button type="primary" onClick={() => setGenCourseOpen(true)}>Generar recibos del curso</Button>
          <Popconfirm title="Generar reservas a preinscritos" description="Crea el recibo de matrícula (reserva de plaza) a los preinscritos que aún no lo tengan. Al pagarlo, pasan a matriculado." onConfirm={doGenerateReservations}>
            <Button>Generar reservas (preinscritos)</Button>
          </Popconfirm>
          <Button onClick={() => { setGenMonth(undefined); setGenOpen(true); }}>Generar recibos del mes</Button>
          <Button onClick={load}>Actualizar</Button>
        </Space>
        <SearchableTable rowKey="enrollmentId" dataSource={data.rows} loading={loading} columns={cols} pagination={{ pageSize: 20 }} scroll={{ x: 'max-content' }} size="small" />
      </Card>

      <Modal title="Generar recibos del curso completo" open={genCourseOpen} onCancel={() => setGenCourseOpen(false)} onOk={doGenerateCourse} okText="Generar curso">
        <Alert type="info" showIcon
          message="Crea todos los recibos aplicables de los alumnos MATRICULADOS"
          description="Para cada alumno se generan: matrícula y material (si su programa los cobra), las mensualidades de septiembre a junio, y julio/agosto (si su programa los cobra). No duplica recibos ya existentes." />
      </Modal>

      <Modal title="Generar recibos del mes" open={genOpen} onCancel={() => setGenOpen(false)} onOk={doGenerate} okText="Generar">
        <Alert type="info" showIcon style={{ marginBottom: 12 }} message="Se crean los recibos de mensualidad de los alumnos MATRICULADOS (los que no existan aún). No duplica." />
        <Select style={{ width: '100%' }} placeholder="Elige el mes" value={genMonth} onChange={setGenMonth}
          options={monthOptions.map((m: any) => ({ value: m.key, label: `${m.label} ${m.key.slice(0, 4)}` }))} />
      </Modal>

      <Modal title={`Cobro — ${payCell?.studentName || ''}${payCell?.label ? ` · ${payCell.label}` : ''}`} open={!!payCell} onCancel={() => setPayCell(null)} onOk={() => payForm.submit()} okText="Marcar pagado"
        footer={[
          ...(payCell?.chargeId ? [
            <Button key="pendiente" onClick={() => doSetStatus('pendiente')}>Pendiente</Button>,
            <Button key="anular" danger onClick={() => doSetStatus('anulado')}>Anular</Button>,
          ] : []),
          <Button key="exempt" onClick={doExempt}>Exento</Button>,
          <Button key="cancel" onClick={() => setPayCell(null)}>Cancelar</Button>,
          <Button key="ok" type="primary" onClick={() => payForm.submit()}>Marcar pagado</Button>,
        ]}>
        {!payCell?.chargeId && (
          <Alert type="info" showIcon style={{ marginBottom: 12 }} message="Cobro directo (sin recibo previo)"
            description="No hay recibo para esta celda: se creará y se marcará como pagado en un paso. Útil para cobrar meses por adelantado sin generar pendientes a todos los alumnos." />
        )}
        {payCell?.status && payCell.status !== 'pendiente' && (
          <Alert type="info" showIcon style={{ marginBottom: 12 }} message={`Estado actual del recibo: ${payCell.status}`}
            description="Puedes corregirlo: marcar pagado, volver a pendiente, anular o marcar exento." />
        )}
        <Form form={payForm} layout="vertical" onFinish={doPay}>
          <Form.Item name="method" label="Método de pago" rules={[{ required: true }]}>
            <Select options={['efectivo','transferencia','domiciliacion','bizum','tpv'].map(m => ({ value: m, label: m }))} />
          </Form.Item>
          <Form.Item name="amount" label="Importe (€)" tooltip="Si lo dejas vacío, se usa la tarifa que corresponda al alumno.">
            <InputNumber min={0} step={0.5} style={{ width: '100%' }} placeholder="Automático según tarifa" />
          </Form.Item>
          <Form.Item name="paidAt" label="Fecha de pago"><Input type="date" /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// ----------------------------- MOROSIDAD -----------------------------
function Morosidad() {
  const [years, setYears] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const activeYear = () => years.find(y => y.isActive);
  const load = async () => {
    const y = activeYear(); if (!y) return;
    setLoading(true);
    try { const { data } = await api.get('/payments/overdue', { params: { academicYearId: y.id } }); setRows(data); }
    finally { setLoading(false); }
  };
  useEffect(() => { api.get('/catalog/years').then(r => setYears(r.data)); }, []);
  useEffect(() => { if (years.length) load(); }, [years]);
  const totalDeuda = rows.reduce((a, r) => a + Number(r.totalDue || 0), 0);
  return (
    <div>
      <Title level={3}>Morosidad</Title>
      <Ayuda title="Quién debe dinero y a quién reclamar">
        Lista de <b>familias con recibos pendientes</b> en el curso activo, ordenadas por importe adeudado. Verás el número de recibos sin pagar,
        el total que deben y los datos de contacto de los tutores (teléfono y correo) para reclamar el pago.
        Un recibo cuenta como pendiente hasta que se cobra o se marca como exento en <b>Pagos</b>.
      </Ayuda>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={12} md={8}><Card><Statistic title="Familias con deuda" value={rows.length} prefix={<WarningOutlined />} /></Card></Col>
        <Col xs={12} md={8}><Card><Statistic title="Deuda total" value={totalDeuda} precision={2} suffix="€" valueStyle={{ color: '#cf1322' }} /></Card></Col>
      </Row>
      <Card>
        <SearchableTable rowKey="familyId" dataSource={rows} loading={loading} pagination={{ pageSize: 15 }}
          columns={[
            { title: 'Familia', dataIndex: 'familyName' },
            { title: 'Tutores', dataIndex: 'guardians', render: (g) => g || '—' },
            { title: 'Teléfonos', dataIndex: 'phones', render: (p) => p || '—' },
            { title: 'Correos', dataIndex: 'emails', render: (e) => e || '—' },
            { title: 'Recibos pendientes', dataIndex: 'pendingCount', align: 'center', sorter: (a, b) => a.pendingCount - b.pendingCount },
            { title: 'Deuda', dataIndex: 'totalDue', align: 'right', defaultSortOrder: 'descend',
              sorter: (a, b) => Number(a.totalDue) - Number(b.totalDue),
              render: (d) => <b style={{ color: '#cf1322' }}>{Number(d).toFixed(2)} €</b> },
          ]} />
      </Card>
    </div>
  );
}

// ----------------------------- FAMILIAS -----------------------------
function Familias() {
  const screens = Grid.useBreakpoint();
  const [rows, setRows] = useState<any[]>([]);
  const [detail, setDetail] = useState<any>(null);   // familia abierta (con guardians + students)
  const [accounts, setAccounts] = useState<any[]>([]);
  const [bankForm] = Form.useForm();
  const [childForm] = Form.useForm();
  const [guardianForm] = Form.useForm();
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [linkStudentId, setLinkStudentId] = useState<string | undefined>();
  const loadList = () => api.get('/families').then(r => setRows(r.data));
  useEffect(() => { loadList(); api.get('/students').then(r => setAllStudents(r.data)).catch(() => {}); }, []);
  const { present: famPresent, startEditing: famStartEditing } = useRoomPresence(detail ? `family:${detail.id}` : null);
  useEffect(() => { if (detail) famStartEditing('ficha'); }, [detail?.id, famStartEditing]);
  const attachExisting = async () => {
    if (!linkStudentId) return;
    try { await api.post(`/families/${detail.id}/attach-student`, { studentId: linkStudentId }); message.success('Hermano/a vinculado a la familia'); setLinkStudentId(undefined); reloadDetail(); api.get('/students').then(r => setAllStudents(r.data)); }
    catch (e: any) { message.error(e?.response?.data?.message || 'Error'); }
  };
  const openFamily = async (f: any) => {
    bankForm.resetFields(); childForm.resetFields(); guardianForm.resetFields();
    const { data } = await api.get(`/families/${f.id}`); setDetail(data);
    const acc = await api.get(`/sepa/families/${f.id}/bank-accounts`); setAccounts(acc.data);
  };
  const reloadDetail = async () => { if (detail) { const { data } = await api.get(`/families/${detail.id}`); setDetail(data); } };
  const reloadAccounts = async () => { if (detail) { const { data } = await api.get(`/sepa/families/${detail.id}/bank-accounts`); setAccounts(data); } };
  const addChild = async (v: any) => {
    try { await api.post(`/families/${detail.id}/students`, v); message.success('Hermano/a añadido a la familia'); childForm.resetFields(); reloadDetail(); }
    catch (e: any) { message.error(e?.response?.data?.message || 'Error'); }
  };
  const addGuardian = async (v: any) => {
    try { await api.post(`/families/${detail.id}/guardians`, v); message.success('Tutor añadido'); guardianForm.resetFields(); reloadDetail(); }
    catch (e: any) { message.error(e?.response?.data?.message || 'Error'); }
  };
  const addAccount = async (v: any) => {
    try { await api.post(`/sepa/families/${detail.id}/bank-accounts`, v); message.success('Cuenta/mandato guardado'); bankForm.resetFields(); reloadAccounts(); }
    catch (e: any) { message.error(e?.response?.data?.message || 'Error'); }
  };
  const deactivate = async (id: string) => { await api.delete(`/sepa/bank-accounts/${id}`); message.success('Cuenta desactivada'); reloadAccounts(); };
  return (
    <div>
      <Title level={3}>Familias</Title>
      <Ayuda title="La familia es la unidad económica">
        Cada familia agrupa a sus <b>hijos/hermanos</b> (comparten IBAN y descuentos), sus <b>tutores</b> y su <b>domiciliación</b> (IBAN + mandato SEPA).
        Pulsa <b>Ver familia</b> para ver los alumnos de esa familia, <b>añadir un hermano</b>, gestionar tutores y registrar la cuenta bancaria. El IBAN se guarda cifrado.
      </Ayuda>
      <Card>
        <SearchableTable rowKey="id" dataSource={rows} pagination={{ pageSize: 12 }}
          columns={[
            { title: 'Familia', dataIndex: 'displayName' },
            { title: 'Notas', dataIndex: 'notes', render: (n) => n || '—' },
            { title: '', render: (_, r) => <Button size="small" icon={<TeamOutlined />} onClick={() => openFamily(r)}>Ver familia</Button> },
          ]} />
      </Card>

      <Modal
        title={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {`Familia — ${detail?.displayName || ''}`}
          <PresenceBar present={famPresent} />
        </span>}
        open={!!detail} onCancel={() => setDetail(null)}
        footer={<Button onClick={() => setDetail(null)}>Cerrar</Button>} width={screens.md ? 780 : '95vw'}>
        {/* Aviso de otro usuario editando simultáneamente */}
        <EditingBadge present={famPresent} targetKey="ficha" />
        {/* HIJOS */}
        <Title level={5} style={{ marginTop: 0 }}>Alumnos de la familia</Title>
        <Table rowKey="id" dataSource={detail?.students || []} size="small" pagination={false} style={{ marginBottom: 8 }}
          locale={{ emptyText: 'Sin alumnos en esta familia' }}
          columns={[
            { title: 'Alumno', render: (_, s: any) => `${s.firstName || ''} ${s.lastName || ''}`.trim() || '—' },
            { title: 'Servicios', dataIndex: 'services', render: (sv: any[]) => (sv && sv.length) ? sv.join(', ') : '—' },
            { title: 'Estado', dataIndex: 'isActive', render: (a) => a ? <Tag color="green">Activo</Tag> : <Tag color="red">Baja</Tag> },
          ]} />
        <Form form={childForm} layout="inline" onFinish={addChild} style={{ marginBottom: 12 }}>
          <Form.Item name="firstName" rules={[{ required: true, message: 'Nombre' }]}><Input placeholder="Nombre del hermano/a" /></Form.Item>
          <Form.Item name="lastName"><Input placeholder="Apellidos" /></Form.Item>
          <Form.Item name="birthDate"><Input type="date" /></Form.Item>
          <Form.Item><Button type="primary" icon={<PlusOutlined />} htmlType="submit">Añadir hermano/a nuevo</Button></Form.Item>
        </Form>
        <Space.Compact style={{ marginBottom: 20, width: '100%' }}>
          <Select showSearch allowClear placeholder="…o vincular un alumno ya inscrito en el centro como hermano/a"
            style={{ flex: 1 }} value={linkStudentId} onChange={setLinkStudentId}
            optionFilterProp="label"
            options={allStudents
              .filter((s: any) => !(detail?.students || []).some((c: any) => c.id === s.id))
              .map((s: any) => ({ value: s.id, label: `${s.firstName || ''} ${s.lastName || ''}`.trim() + (s.familyName ? ` — familia: ${s.familyName}` : '') }))} />
          <Button icon={<TeamOutlined />} onClick={attachExisting} disabled={!linkStudentId}>Vincular</Button>
        </Space.Compact>

        {/* TUTORES */}
        <Title level={5}>Tutores</Title>
        <Table rowKey="id" dataSource={detail?.guardians || []} size="small" pagination={false} style={{ marginBottom: 8 }}
          locale={{ emptyText: 'Sin tutores' }}
          columns={[
            { title: 'Tutor', dataIndex: 'fullName', render: (n, g: any) => <>{n} {g.isPrimaryContact && <Tag color="blue">principal</Tag>}</> },
            { title: 'Teléfono', dataIndex: 'phone', render: (p) => p || '—' },
            { title: 'Email', dataIndex: 'email', render: (e) => e || '—' },
          ]} />
        <Form form={guardianForm} layout="inline" onFinish={addGuardian} style={{ marginBottom: 20 }}>
          <Form.Item name="fullName" rules={[{ required: true, message: 'Nombre' }]}><Input placeholder="Nombre del tutor" /></Form.Item>
          <Form.Item name="phone"><Input placeholder="Teléfono" /></Form.Item>
          <Form.Item name="email"><Input placeholder="Email" /></Form.Item>
          <Form.Item><Button icon={<PlusOutlined />} htmlType="submit">Añadir tutor</Button></Form.Item>
        </Form>

        {/* DOMICILIACIÓN */}
        <Title level={5}>Domiciliación (IBAN / mandato SEPA)</Title>
        <Table rowKey="id" dataSource={accounts} size="small" pagination={false} style={{ marginBottom: 8 }}
          locale={{ emptyText: 'Sin cuentas registradas' }}
          columns={[
            { title: 'IBAN', dataIndex: 'ibanLast4', render: (l) => `····${l}` },
            { title: 'Titular', dataIndex: 'holderName', render: (h) => h || '—' },
            { title: 'Mandato', dataIndex: 'mandateRef', render: (m) => m || '—' },
            { title: 'Fecha', dataIndex: 'mandateDate', render: (d) => fmtDate(d) },
            { title: 'Activa', dataIndex: 'isActive', render: (a) => a ? <Tag color="green">Sí</Tag> : <Tag>No</Tag> },
            { title: '', render: (_, r) => r.isActive && <Popconfirm title="¿Desactivar cuenta?" onConfirm={() => deactivate(r.id)}><Button size="small" danger>Quitar</Button></Popconfirm> },
          ]} />
        <Form form={bankForm} layout="vertical" onFinish={addAccount}>
          <Row gutter={12}>
            <Col xs={24} md={14}><Form.Item name="iban" label="IBAN" rules={[{ required: true }]}><Input placeholder="ES## #### #### #### #### ####" /></Form.Item></Col>
            <Col xs={24} md={10}><Form.Item name="holderName" label="Titular de la cuenta"><Input placeholder="Nombre del titular" /></Form.Item></Col>
            <Col xs={24} md={14}><Form.Item name="mandateRef" label="Referencia del mandato (opcional)"><Input placeholder="Se genera una si lo dejas vacío" /></Form.Item></Col>
            <Col xs={24} md={10}><Form.Item name="mandateDate" label="Fecha del mandato (opcional)"><Input type="date" /></Form.Item></Col>
          </Row>
          <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>Añadir cuenta/mandato</Button>
        </Form>
      </Modal>
    </div>
  );
}

// ----------------------------- CONFIGURACIÓN -----------------------------
function Configuracion({ user }: { user?: any }) {
  const isAdmin = (user?.secretariaRoles || []).includes('secretaria_admin');
  const [years, setYears] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const load = async () => { const { data } = await api.get('/catalog/years'); setYears(data); };
  useEffect(() => { load(); }, []);
  const activate = async (id: string) => { try { await api.patch(`/catalog/years/${id}/activate`, {}); message.success('Curso activado'); load(); } catch { message.error('Error'); } };
  const toggleEnrollment = async (id: string, open: boolean) => { try { await api.patch(`/catalog/years/${id}/enrollment`, { open }); message.success(open ? 'Matrícula abierta' : 'Matrícula cerrada'); load(); } catch { message.error('Error'); } };
  const create = async (v: any) => {
    try { await api.post('/catalog/years', { label: v.label, startDate: v.startDate, endDate: v.endDate });
      message.success('Curso creado'); setOpen(false); form.resetFields(); load(); }
    catch (e: any) { message.error(e?.response?.data?.message || 'Error'); }
  };
  const cursoYCentro = (
    <div>
      <Ayuda title="Curso escolar y ajustes del centro">
        El <b>curso escolar activo</b> determina sobre qué año trabajas (matrículas, grupos, tarifas, pagos). Puedes <b>crear un curso nuevo</b>
        y <b>activarlo</b> cuando empiece, gestionar el <b>calendario escolar</b> (trimestres y días sin clase), preparar el curso siguiente
        y configurar los datos del <b>acreedor SEPA</b>.
      </Ayuda>
      <Card title="Cursos escolares" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>Nuevo curso</Button>}>
        <Table rowKey="id" dataSource={years} pagination={false}
          columns={[
            { title: 'Curso', dataIndex: 'label' },
            { title: 'Inicio', dataIndex: 'startDate', render: (d) => fmtDate(d) },
            { title: 'Fin', dataIndex: 'endDate', render: (d) => fmtDate(d) },
            { title: 'Activo', dataIndex: 'isActive', render: (a) => a ? <Tag color="green">Activo</Tag> : <Tag>—</Tag> },
            { title: 'Matrícula', dataIndex: 'isEnrollmentOpen', render: (open, r) => (
                <Tooltip title={open ? 'Periodo de matrícula/reserva abierto' : 'Periodo de matrícula cerrado'}>
                  <Switch size="small" checked={!!open} onChange={(v) => toggleEnrollment(r.id, v)} checkedChildren="Abierta" unCheckedChildren="Cerrada" />
                </Tooltip>
              ) },
            { title: '', render: (_, r) => !r.isActive && <Popconfirm title="¿Activar este curso como el actual?" onConfirm={() => activate(r.id)}><Button size="small">Activar</Button></Popconfirm> },
          ]} />
      </Card>
      <Modal title="Nuevo curso escolar" open={open} onCancel={() => setOpen(false)} onOk={() => form.submit()} okText="Crear">
        <Form form={form} layout="vertical" onFinish={create}>
          <Form.Item name="label" label="Nombre del curso" rules={[{ required: true }]}><Input placeholder="2026-2027" /></Form.Item>
          <Form.Item name="startDate" label="Fecha de inicio" rules={[{ required: true }]}><Input type="date" /></Form.Item>
          <Form.Item name="endDate" label="Fecha de fin" rules={[{ required: true }]}><Input type="date" /></Form.Item>
        </Form>
      </Modal>
      <SchoolCalendarCard />
      <RolloverCard />
      <CreditorSettings />
    </div>
  );

  // Pestañas de configuración. Los datos "de configurar una vez" viven aquí, no en el menú.
  // Grupos/Programas/Tarifas/Profesores: staff/dirección/admin. Curso/Importar/Equipo: solo admin.
  const tabs: any[] = [];
  if (isAdmin) tabs.push({ key: 'general', label: 'Curso y centro', children: cursoYCentro });
  tabs.push(
    { key: 'grupos', label: 'Grupos', children: <Grupos user={user} /> },
    { key: 'programas', label: 'Programas', children: <Programas /> },
    { key: 'tarifas', label: 'Tarifas', children: <Tarifas /> },
    { key: 'profesores', label: 'Profesores', children: <Profesores /> },
  );
  if (isAdmin) tabs.push(
    { key: 'importar', label: 'Importar Excel', children: <Importador /> },
    { key: 'equipo', label: 'Accesos / Equipo', children: <Equipo /> },
  );

  return (
    <div>
      <Title level={3} style={{ marginBottom: 8 }}>Configuración</Title>
      <Tabs defaultActiveKey={tabs[0]?.key} items={tabs} destroyInactiveTabPane />
    </div>
  );
}

// ----------------------------- CALENDARIO ESCOLAR (trimestres + días sin clase) -----------------------------
const NONCLASS_KINDS: Record<string, string> = { festivo: 'Festivo', puente: 'Puente', descanso: 'Descanso', vacaciones: 'Vacaciones' };
function SchoolCalendarCard() {
  const [years, setYears] = useState<any[]>([]);
  const [yearId, setYearId] = useState<string | undefined>();
  const [terms, setTerms] = useState<any[]>([]);
  const [days, setDays] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [termForm] = Form.useForm();
  const [dayForm] = Form.useForm();
  useEffect(() => { api.get('/catalog/years').then(r => { setYears(r.data); setYearId((r.data.find((y: any) => y.isActive) || r.data[0])?.id); }); }, []);
  const load = async () => {
    if (!yearId) return;
    const [t, d, s] = await Promise.all([
      api.get('/calendar-config/terms', { params: { academicYearId: yearId } }),
      api.get('/calendar-config/nonclass', { params: { academicYearId: yearId } }),
      api.get('/notebook/sessions', { params: { academicYearId: yearId } }).catch(() => ({ data: [] })),
    ]);
    setTerms(t.data); setDays(d.data); setSessions(s.data);
  };
  useEffect(() => { load(); }, [yearId]);
  const addTerm = async (v: any) => { try { await api.post('/calendar-config/terms', { ...v, academicYearId: yearId }); message.success('Trimestre añadido'); termForm.resetFields(); load(); } catch (e: any) { message.error(e?.response?.data?.message || 'Error'); } };
  const delTerm = async (id: string) => { try { await api.delete(`/calendar-config/terms/${id}`); load(); } catch { message.error('Error'); } };
  const addDay = async (v: any) => { try { await api.post('/calendar-config/nonclass', { ...v, academicYearId: yearId }); message.success('Día sin clase añadido'); dayForm.resetFields(); load(); } catch (e: any) { message.error(e?.response?.data?.message || 'Error'); } };
  const delDay = async (id: string) => { try { await api.delete(`/calendar-config/nonclass/${id}`); load(); } catch { message.error('Error'); } };
  return (
    <Card style={{ marginTop: 16 }} title="Calendario escolar (trimestres y días sin clase)"
      extra={<Select style={{ width: 180 }} value={yearId} onChange={setYearId} options={years.map(y => ({ value: y.id, label: y.label + (y.isActive ? ' (activo)' : '') }))} />}>
      <Alert type="info" showIcon style={{ marginBottom: 12 }}
        message="Define cuándo hay clase"
        description="Las clases del horario sólo aparecen en el calendario de los docentes dentro de los trimestres definidos y nunca en los días sin clase (festivos, puentes, descansos, vacaciones). Si no defines ningún trimestre, las clases se muestran todo el año." />
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Title level={5} style={{ marginTop: 0 }}>Trimestres / periodos lectivos</Title>
          <Table rowKey="id" size="small" pagination={false} dataSource={terms}
            locale={{ emptyText: 'Sin trimestres (se mostrarán clases todo el año)' }}
            columns={[
              { title: 'Nombre', dataIndex: 'name' },
              { title: 'Inicio', dataIndex: 'startDate', render: (d) => fmtDate(d) },
              { title: 'Fin', dataIndex: 'endDate', render: (d) => fmtDate(d) },
              { title: '', render: (_, r) => <Popconfirm title="¿Quitar trimestre?" onConfirm={() => delTerm(r.id)}><Button size="small" type="text" danger>✕</Button></Popconfirm> },
            ]} />
          <Form form={termForm} layout="inline" onFinish={addTerm} style={{ marginTop: 10, rowGap: 8 }}>
            <Form.Item name="name" rules={[{ required: true, message: 'Nombre' }]}><Input placeholder="1er trimestre" style={{ width: 130 }} /></Form.Item>
            <Form.Item name="startDate" rules={[{ required: true }]}><Input type="date" /></Form.Item>
            <Form.Item name="endDate" rules={[{ required: true }]}><Input type="date" /></Form.Item>
            <Form.Item><Button type="primary" htmlType="submit">Añadir</Button></Form.Item>
          </Form>
        </Col>
        <Col xs={24} md={12}>
          <Title level={5} style={{ marginTop: 0 }}>Días sin clase</Title>
          <Table rowKey="id" size="small" pagination={{ pageSize: 8 }} dataSource={days}
            locale={{ emptyText: 'Sin días marcados' }}
            columns={[
              { title: 'Fecha', dataIndex: 'date', render: (d, r: any) => r.endDate && r.endDate !== d ? `${fmtDate(d)} → ${fmtDate(r.endDate)}` : fmtDate(d) },
              { title: 'Motivo', dataIndex: 'label' },
              { title: 'Tipo', dataIndex: 'kind', render: (k) => <Tag>{NONCLASS_KINDS[k] || k}</Tag> },
              { title: '', render: (_, r) => <Popconfirm title="¿Quitar?" onConfirm={() => delDay(r.id)}><Button size="small" type="text" danger>✕</Button></Popconfirm> },
            ]} />
          <Form form={dayForm} layout="inline" onFinish={addDay} style={{ marginTop: 10, rowGap: 8 }}>
            <Form.Item name="label" rules={[{ required: true, message: 'Motivo' }]}><Input placeholder="Festivo local" style={{ width: 130 }} /></Form.Item>
            <Form.Item name="kind" initialValue="festivo"><Select style={{ width: 120 }} options={Object.entries(NONCLASS_KINDS).map(([v, l]) => ({ value: v, label: l }))} /></Form.Item>
            <Form.Item name="date" rules={[{ required: true }]}><Input type="date" /></Form.Item>
            <Form.Item name="endDate" tooltip="Opcional: para puentes/vacaciones"><Input type="date" /></Form.Item>
            <Form.Item><Button type="primary" htmlType="submit">Añadir</Button></Form.Item>
          </Form>
        </Col>
      </Row>
      <Title level={5} style={{ marginTop: 20 }}>Sesiones por grupo</Title>
      <Text type="secondary" style={{ fontSize: 12 }}>Total de clases de cada grupo en el curso según los trimestres y días sin clase. Se recalcula solo al añadir festivos o ajustar trimestres, para valorar cuántos días libres puedes permitirte.</Text>
      <Table rowKey="groupId" size="small" style={{ marginTop: 8 }} dataSource={sessions} pagination={{ pageSize: 12 }} scroll={{ x: 'max-content' }}
        locale={{ emptyText: 'Sin grupos con horario en este curso' }}
        columns={[
          { title: 'Grupo', dataIndex: 'groupName', render: (n, r: any) => <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: r.color || '#579172', marginRight: 6 }} />{n}</span> },
          { title: 'Sesiones totales', dataIndex: 'totalSessions', align: 'right', sorter: (a: any, b: any) => a.totalSessions - b.totalSessions },
          { title: 'Dadas', dataIndex: 'doneSessions', align: 'right', render: (v) => <Text type="secondary">{v}</Text> },
          { title: 'Restantes', dataIndex: 'remainingSessions', align: 'right', render: (v) => <Tag color={v > 0 ? 'green' : 'default'}>{v}</Tag> },
        ]} />
    </Card>
  );
}

// ----------------------------- DATOS DEL ACREEDOR (SEPA) -----------------------------
function CreditorSettings() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  useEffect(() => { api.get('/sepa/settings').then(r => form.setFieldsValue(r.data)); }, []);
  const save = async (v: any) => {
    setLoading(true);
    try { await api.put('/sepa/settings', v); message.success('Datos de domiciliación guardados'); }
    catch (e: any) { message.error(e?.response?.data?.message || 'Error'); }
    finally { setLoading(false); }
  };
  return (
    <Card title="Datos de domiciliación (acreedor)" style={{ marginTop: 16 }}>
      <Alert type="info" showIcon style={{ marginBottom: 12 }}
        message="Estos datos identifican al centro como acreedor en los ficheros SEPA"
        description="El IBAN de la cuenta donde se ingresan los recibos y el Identificador de Acreedor SEPA (formato ES##ZZZ+CIF) te los facilita tu banco. Son obligatorios para generar la remesa." />
      <Form form={form} layout="vertical" onFinish={save}>
        <Row gutter={12}>
          <Col xs={24} md={12}><Form.Item name="creditorName" label="Nombre del acreedor" rules={[{ required: true }]}><Input placeholder="Mundo World School S.L." /></Form.Item></Col>
          <Col xs={24} md={12}><Form.Item name="creditorId" label="Identificador de Acreedor SEPA" rules={[{ required: true }]}><Input placeholder="ES##ZZZ#########" /></Form.Item></Col>
          <Col xs={24} md={12}><Form.Item name="creditorIban" label="IBAN del acreedor" rules={[{ required: true }]}><Input placeholder="ES## #### #### #### #### ####" /></Form.Item></Col>
          <Col xs={24} md={12}><Form.Item name="creditorBic" label="BIC (opcional)"><Input placeholder="XXXXESMMXXX" /></Form.Item></Col>
        </Row>
        <Button type="primary" htmlType="submit" loading={loading}>Guardar</Button>
      </Form>
    </Card>
  );
}

// ----------------------------- REMESAS SEPA -----------------------------
const SEPA_STATUS: any = { borrador: { color: 'default', label: 'Borrador' }, generada: { color: 'blue', label: 'Generada' }, enviada: { color: 'gold', label: 'Enviada' }, procesada: { color: 'green', label: 'Procesada' } };
function Remesas() {
  const [rows, setRows] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [form] = Form.useForm();
  const load = async () => { setLoading(true); try { const { data } = await api.get('/sepa/batches'); setRows(data); } finally { setLoading(false); } };
  useEffect(() => { load(); api.get('/catalog/services').then(r => setServices(r.data)); }, []);
  const create = async (v: any) => {
    try {
      const { data } = await api.post('/sepa/batches', { chargeDate: v.chargeDate, conceptTemplate: v.conceptTemplate, serviceId: v.serviceId });
      if (data.ok === false) message.warning(data.error);
      else message.success(`Remesa creada: ${data.count} adeudos, ${Number(data.sum).toFixed(2)}€`);
      setOpen(false); form.resetFields(); load();
    } catch (e: any) { message.error(e?.response?.data?.message || 'Error'); }
  };
  const downloadXml = async (id: string) => {
    try {
      const res = await api.get(`/sepa/batches/${id}/xml`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/xml' }));
      const a = document.createElement('a'); a.href = url; a.download = `remesa-${id.slice(0, 8)}.xml`; a.click();
      window.URL.revokeObjectURL(url); load();
    } catch (e: any) {
      // El error viene como blob; intentamos leerlo
      try { const txt = JSON.parse(await e.response.data.text()); message.error(txt.message || 'Error generando el fichero'); }
      catch { message.error('Error generando el fichero (¿faltan datos del acreedor?)'); }
    }
  };
  const confirm = async (id: string) => { try { const { data } = await api.post(`/sepa/batches/${id}/confirm`, {}); message.success(`${data.paid} recibos marcados como cobrados`); load(); } catch { message.error('Error'); } };
  const remove = async (id: string) => { try { await api.delete(`/sepa/batches/${id}`); message.success('Remesa eliminada'); load(); } catch (e: any) { message.error(e?.response?.data?.message || 'Error'); } };
  const openDetail = async (id: string) => { const { data } = await api.get(`/sepa/batches/${id}`); setDetail(data); };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ margin: 0 }}>Remesas SEPA</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); form.setFieldsValue({ chargeDate: new Date().toISOString().slice(0, 10) }); setOpen(true); }}>Nueva remesa</Button>
      </div>
      <Ayuda title="Cobro por domiciliación bancaria (adeudo SEPA)">
        Una <b>remesa</b> agrupa los recibos <b>pendientes</b> de las familias que tienen <b>cuenta bancaria y mandato</b> registrados (en Familias → Domiciliación).
        Pulsa <b>Nueva remesa</b>, elige la fecha de cobro, y se crea con un adeudo por familia. Luego <b>descarga el fichero XML (pain.008)</b> y súbelo a la banca electrónica del centro.
        Cuando el banco confirme el cargo, pulsa <b>Confirmar cobro</b> para marcar esos recibos como pagados. Antes de nada, rellena los <b>datos del acreedor</b> en Configuración.
      </Ayuda>
      <Card>
        <SearchableTable rowKey="id" dataSource={rows} loading={loading} pagination={{ pageSize: 12 }}
          columns={[
            { title: 'Fecha cobro', dataIndex: 'chargeDate', render: (d) => fmtDate(d) },
            { title: 'Adeudos', dataIndex: 'itemCount' },
            { title: 'Total', dataIndex: 'totals', render: (t) => t ? <b>{Number(t.sum).toFixed(2)} €</b> : '—' },
            { title: 'Estado', dataIndex: 'status', render: (s) => <Tag color={SEPA_STATUS[s]?.color}>{SEPA_STATUS[s]?.label || s}</Tag> },
            { title: '', render: (_, r) => (
              <Space wrap>
                <Button size="small" onClick={() => openDetail(r.id)}>Ver</Button>
                <Button size="small" type="primary" onClick={() => downloadXml(r.id)}>Descargar XML</Button>
                {r.status !== 'procesada' && <Popconfirm title="¿Marcar todos los recibos como cobrados?" onConfirm={() => confirm(r.id)}><Button size="small">Confirmar cobro</Button></Popconfirm>}
                {r.status !== 'procesada' && <Popconfirm title="¿Eliminar la remesa y liberar sus recibos?" onConfirm={() => remove(r.id)}><Button size="small" danger>Quitar</Button></Popconfirm>}
              </Space>
            ) },
          ]} />
      </Card>

      <Modal title="Nueva remesa de domiciliación" open={open} onCancel={() => setOpen(false)} onOk={() => form.submit()} okText="Crear remesa">
        <Alert type="info" showIcon style={{ marginBottom: 12 }} message="Se incluirán los recibos pendientes de familias con cuenta+mandato (no incluidos en otra remesa)." />
        <Form form={form} layout="vertical" onFinish={create}>
          <Form.Item name="chargeDate" label="Fecha de cobro" rules={[{ required: true }]}><Input type="date" /></Form.Item>
          <Form.Item name="serviceId" label="Limitar a un servicio (opcional)">
            <Select allowClear placeholder="Todos los servicios" options={services.map(s => ({ value: s.id, label: s.name }))} />
          </Form.Item>
          <Form.Item name="conceptTemplate" label="Concepto en el recibo (opcional)"><Input placeholder="Ej.: Cuota academia junio" /></Form.Item>
        </Form>
      </Modal>

      <Modal title="Detalle de la remesa" open={!!detail} onCancel={() => setDetail(null)} footer={<Button onClick={() => setDetail(null)}>Cerrar</Button>} width={700}>
        {detail && (
          <Table rowKey="id" dataSource={detail.items} size="small" pagination={false}
            columns={[
              { title: 'Familia', dataIndex: 'familyName' },
              { title: 'Titular', dataIndex: 'holderName', render: (h) => h || '—' },
              { title: 'IBAN', dataIndex: 'ibanLast4', render: (l) => l ? `····${l}` : '—' },
              { title: 'Tipo', dataIndex: 'sequenceType' },
              { title: 'Importe', dataIndex: 'amount', align: 'right', render: (a) => `${Number(a).toFixed(2)} €` },
            ]} />
        )}
      </Modal>
    </div>
  );
}

// ----------------------------- DOCUMENTACIÓN -----------------------------
const DOC_STATUS_META: any = {
  pendiente: { color: 'gold', label: 'Pendiente', short: '•' },
  recibido: { color: 'green', label: 'Recibido', short: '✓' },
  caducado: { color: 'red', label: 'Caducado', short: '!' },
  no_aplica: { color: 'default', label: 'No aplica', short: '—' },
};
const SERVICE_CODES = ['INGLES', 'APOYO', 'DANZA', 'ESCUELA', 'TAPER'];
function docApplies(col: any, row: any): boolean {
  const req = Array.isArray(col.requiredFor) ? col.requiredFor : [];
  if (!req.length) return true; // documento general: aplica a todos
  const codes = Array.isArray(row.serviceCodes) ? row.serviceCodes : [];
  return req.some((c: string) => codes.includes(c));
}
function Documentacion() {
  const [tab, setTab] = useState<'checklist' | 'tipos'>('checklist');
  const [columns, setColumns] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [filterService, setFilterService] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const [editingType, setEditingType] = useState<any>(null);
  const [typeForm] = Form.useForm();

  const loadMatrix = async () => {
    setLoading(true);
    try { const { data } = await api.get('/documents/matrix', { params: { serviceId: filterService } }); setColumns(data.columns); setRows(data.rows); }
    finally { setLoading(false); }
  };
  useLiveQuery(['documents'], loadMatrix);
  const loadTypes = async () => { const { data } = await api.get('/documents/types'); setTypes(data); };
  useEffect(() => { api.get('/catalog/services').then(r => setServices(r.data)); loadTypes(); }, []);
  useEffect(() => { if (tab === 'checklist') loadMatrix(); }, [tab, filterService]);

  const cycle = async (col: any, row: any) => {
    const cur = row.cells[col.id]?.status || 'pendiente';
    const order = ['pendiente', 'recibido', 'caducado', 'no_aplica'];
    const next = order[(order.indexOf(cur) + 1) % order.length];
    try { await api.post('/documents/set-status', { studentId: row.studentId, documentTypeId: col.id, status: next }); loadMatrix(); }
    catch { message.error('Error'); }
  };

  const openNewType = () => { setEditingType(null); typeForm.resetFields(); typeForm.setFieldsValue({ code: 'otro', requiredFor: [] }); setTypeOpen(true); };
  const openEditType = (t: any) => { setEditingType(t); typeForm.setFieldsValue({ name: t.name, requiredFor: Array.isArray(t.requiredFor) ? t.requiredFor : [] }); setTypeOpen(true); };
  const saveType = async (v: any) => {
    try {
      if (editingType) await api.patch(`/documents/types/${editingType.id}`, { name: v.name, requiredFor: v.requiredFor || [] });
      else await api.post('/documents/types', { code: v.code, name: v.name, requiredFor: v.requiredFor || [] });
      message.success('Tipo de documento guardado'); setTypeOpen(false); loadTypes(); if (tab === 'checklist') loadMatrix();
    } catch (e: any) { message.error(e?.response?.data?.message || 'Error'); }
  };
  const removeType = async (id: string) => { try { await api.delete(`/documents/types/${id}`); message.success('Tipo eliminado'); loadTypes(); } catch (e: any) { message.error(e?.response?.data?.message || 'Error'); } };

  // Resumen de pendientes (documentos aplicables que no están recibidos ni no_aplica)
  const pendingCount = rows.reduce((acc, r) => acc + columns.filter(c => docApplies(c, r) && (r.cells[c.id]?.status || 'pendiente') !== 'recibido' && (r.cells[c.id]?.status || 'pendiente') !== 'no_aplica').length, 0);

  const matrixCols: any[] = [
    { title: 'Alumno', dataIndex: 'studentName', fixed: 'left', width: 180 },
    ...columns.map((col: any) => ({
      title: <Tooltip title={col.name}>{col.name.length > 14 ? col.name.slice(0, 13) + '…' : col.name}</Tooltip>,
      key: col.id, align: 'center', width: 90,
      render: (_: any, r: any) => {
        if (!docApplies(col, r)) return <Tooltip title="No requerido para sus servicios"><span style={{ color: '#d9d9d9' }}>—</span></Tooltip>;
        const st = r.cells[col.id]?.status || 'pendiente';
        const m = DOC_STATUS_META[st];
        return <Tooltip title={`${m.label} — clic para cambiar`}>
          <Tag color={m.color} style={{ cursor: 'pointer', margin: 0 }} onClick={() => cycle(col, r)}>{m.short}</Tag></Tooltip>;
      },
    })),
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ margin: 0 }}>Documentación</Title>
        <Space>
          <Button type={tab === 'checklist' ? 'primary' : 'default'} onClick={() => setTab('checklist')}>Checklist</Button>
          <Button type={tab === 'tipos' ? 'primary' : 'default'} onClick={() => setTab('tipos')}>Tipos de documento</Button>
        </Space>
      </div>
      <Ayuda title="Control de documentos entregados por cada alumno">
        En <b>Checklist</b> ves, por alumno, qué documentos tiene cada uno. <b>Clic en una celda</b> para ir cambiando el estado:
        <Tag color="gold" style={{ margin: '0 4px' }}>• Pendiente</Tag> → <Tag color="green" style={{ margin: '0 4px' }}>✓ Recibido</Tag> →
        <Tag color="red" style={{ margin: '0 4px' }}>! Caducado</Tag> → <Tag style={{ margin: '0 4px' }}>— No aplica</Tag>.
        Cada documento solo aparece para los alumnos cuyo <b>servicio</b> lo requiere (en <b>Tipos de documento</b> defines qué servicios lo necesitan).
      </Ayuda>

      {tab === 'checklist' && (
        <>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col xs={12} md={8}><Card><Statistic title="Alumnos" value={rows.length} prefix={<TeamOutlined />} /></Card></Col>
            <Col xs={12} md={8}><Card><Statistic title="Documentos pendientes" value={pendingCount} valueStyle={{ color: pendingCount ? '#cf1322' : undefined }} prefix={<WarningOutlined />} /></Card></Col>
          </Row>
          <Card>
            <Space style={{ marginBottom: 12 }} wrap>
              <Text>Servicio:</Text>
              <Select allowClear placeholder="Todos" style={{ width: 200 }} value={filterService} onChange={setFilterService} options={services.map(s => ({ value: s.id, label: s.name }))} />
              <Button onClick={loadMatrix}>Actualizar</Button>
            </Space>
            <SearchableTable rowKey="studentId" dataSource={rows} loading={loading} columns={matrixCols} pagination={{ pageSize: 20 }} scroll={{ x: 'max-content' }} size="small" />
          </Card>
        </>
      )}

      {tab === 'tipos' && (
        <Card extra={<Button type="primary" icon={<PlusOutlined />} onClick={openNewType}>Nuevo tipo</Button>}>
          <Table rowKey="id" dataSource={types} pagination={false}
            columns={[
              { title: 'Documento', dataIndex: 'name' },
              { title: 'Código', dataIndex: 'code', render: (c) => <Tag>{c}</Tag> },
              { title: 'Requerido para', dataIndex: 'requiredFor', render: (rf: any) => (Array.isArray(rf) && rf.length)
                  ? <Space size={4} wrap>{rf.map((c: string) => <Tag key={c} color="geekblue">{c}</Tag>)}</Space>
                  : <Tag color="default">Todos los servicios</Tag> },
              { title: '', render: (_, r) => <Space><Button size="small" onClick={() => openEditType(r)}>Editar</Button><Popconfirm title="¿Eliminar tipo?" onConfirm={() => removeType(r.id)}><Button size="small" danger>Quitar</Button></Popconfirm></Space> },
            ]} />
        </Card>
      )}

      <Modal title={editingType ? 'Editar tipo de documento' : 'Nuevo tipo de documento'} open={typeOpen} onCancel={() => setTypeOpen(false)} onOk={() => typeForm.submit()} okText="Guardar">
        <Form form={typeForm} layout="vertical" onFinish={saveType}>
          <Form.Item name="name" label="Nombre del documento" rules={[{ required: true }]}><Input placeholder="Ej.: Autorización de imagen" /></Form.Item>
          {!editingType && (
            <Form.Item name="code" label="Código" tooltip="Identificador interno. Usa 'otro' para documentos personalizados.">
              <Select options={['foto','tarjeta_sanitaria','inscripcion','aut_imagen','aut_salida','otro'].map(c => ({ value: c, label: c }))} />
            </Form.Item>
          )}
          <Form.Item name="requiredFor" label="Requerido para los servicios" tooltip="Déjalo vacío para que aplique a todos los alumnos">
            <Select mode="multiple" allowClear placeholder="Todos los servicios" options={SERVICE_CODES.map(c => ({ value: c, label: c }))} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// ----------------------------- HORARIOS -----------------------------
const WEEKDAYS: [number, string][] = [[1, 'Lunes'], [2, 'Martes'], [3, 'Miércoles'], [4, 'Jueves'], [5, 'Viernes'], [6, 'Sábado'], [7, 'Domingo']];
const HOUR_PX = 46;
const toMin = (t: string) => { const [h, m] = (t || '0:0').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
// Versión pastel de un color hex (mezcla con blanco) para las columnas de Organización
const pastel = (hex?: string, ratio = 0.8): string | null => {
  if (!hex) return null;
  const h = hex.replace('#', '');
  if (h.length < 6) return null;
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  if ([r, g, b].some(isNaN)) return null;
  const mix = (c: number) => Math.round(c + (255 - c) * ratio);
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
};
// Colores por nivel de inglés (Cambridge) — por defecto según el nombre del grupo/programa
function levelColor(name?: string): string | null {
  const n = (name || '').toLowerCase();
  if (!n) return null;
  if (n.includes('infant')) return '#F48FB1';                              // Infants: rosa clarito
  if (n.includes('starter') || n.includes('prestarter') || n.includes('pre starter')) return '#FB8C00'; // Starters/Prestarters: naranja
  if (n.includes('mover')) return '#8E24AA';                               // Movers: morado
  if (n.includes('flyer')) return '#9CCC65';                              // Flyers: verde clarito
  if (n.includes('key') || /\bket\b/.test(n)) return '#00897B';           // KEY: azul verdoso
  if (n.includes('pet') || n.includes('prelim')) return '#E53935';        // PET: rojo
  if (n.includes('fce') || n.includes('first')) return '#2E7D32';         // FCE/First: verde oscuro
  if (n.includes('cae') || n.includes('advanced')) return '#1E88E5';      // CAE/Advanced: azul
  return null;
}
// Color efectivo de un grupo: el suyo propio, o el del nivel por nombre/programa
const effGroupColor = (color?: string, name?: string, programName?: string): string | null =>
  color || levelColor(name) || levelColor(programName) || null;
const GROUP_COLORS = ['#F48FB1', '#FB8C00', '#8E24AA', '#9CCC65', '#00897B', '#E53935', '#2E7D32', '#1E88E5', '#560797', '#6B7280'];
function ColorSwatches({ value, onChange }: { value?: string; onChange?: (v: string) => void }) {
  return (
    <Space wrap>
      {GROUP_COLORS.map(c => (
        <span key={c} onClick={() => onChange?.(c)} title={c}
          style={{ width: 22, height: 22, borderRadius: '50%', background: c, cursor: 'pointer', display: 'inline-block', border: value === c ? '3px solid #1E1E30' : '2px solid #fff', boxShadow: '0 0 0 1px #ccc' }} />
      ))}
      <input type="color" value={value || '#579172'} onChange={e => onChange?.(e.target.value)} style={{ width: 28, height: 24, padding: 0, border: 'none', background: 'none', cursor: 'pointer' }} />
      {value ? <a onClick={() => onChange?.('')}>quitar</a> : null}
    </Space>
  );
}

function Horarios({ user }: { user?: any }) {
  const roles: string[] = user?.secretariaRoles || [];
  const canEdit = roles.includes('secretaria_admin') || roles.includes('secretaria_staff');
  const isOnlyTeacher = roles.includes('secretaria_teacher') && !roles.some(r => ['secretaria_admin', 'secretaria_staff', 'direccion'].includes(r));
  const [slots, setSlots] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [years, setYears] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [room, setRoom] = useState<string | undefined>();
  const [form] = Form.useForm();
  const [editing, setEditing] = useState<any>(null);
  const [editForm] = Form.useForm();
  const activeYear = () => years.find(y => y.isActive);
  const load = async () => {
    const y = activeYear(); if (!y) return;
    setLoading(true);
    try { const { data } = await api.get('/schedule', { params: { academicYearId: y.id } }); setSlots(data); }
    finally { setLoading(false); }
  };
  useLiveQuery(['schedule_slots', 'groups'], load);
  useEffect(() => {
    api.get('/catalog/groups').then(r => setGroups(r.data));
    api.get('/catalog/years').then(r => setYears(r.data));
    api.get('/teachers').then(r => setTeachers(r.data)).catch(() => {});
  }, []);
  useEffect(() => { if (years.length) load(); }, [years]);
  const openEdit = (e: any) => {
    setEditing(e);
    editForm.setFieldsValue({ groupName: e.groupName, teacherId: e.teacherId || undefined, room: e.room || undefined, weekday: e.weekday, startTime: e.startTime, endTime: e.endTime, color: e.color || effGroupColor(undefined, e.groupName, e.programName) || undefined });
  };
  const saveEdit = async (v: any) => {
    try {
      await api.patch(`/catalog/groups/${editing.groupId}`, { name: v.groupName, teacherId: v.teacherId || null, color: v.color || null });
      await api.patch(`/schedule/${editing.id}`, { room: v.room || '', weekday: v.weekday, startTime: v.startTime, endTime: v.endTime });
      message.success('Grupo y franja actualizados'); setEditing(null); load();
    } catch (e: any) { message.error(e?.response?.data?.message || 'Error'); }
  };
  const add = async (v: any) => {
    try { await api.post('/schedule', { groupId: v.groupId, weekday: v.weekday, startTime: v.startTime, endTime: v.endTime, room: v.room });
      message.success('Franja añadida'); setOpen(false); form.resetFields(); load(); }
    catch (e: any) { message.error(e?.response?.data?.message || 'Error'); }
  };
  const remove = async (id: string) => { await api.delete(`/schedule/${id}`); message.success('Franja eliminada'); load(); };

  const rooms = Array.from(new Set(slots.map(s => s.room || '—'))).sort();
  const view = room ? slots.filter(s => (s.room || '—') === room) : slots;

  // Solapamientos de AULA: misma aula, mismo día y horas que se cruzan
  const overlap = new Set<string>();
  for (let i = 0; i < slots.length; i++) for (let j = i + 1; j < slots.length; j++) {
    const a = slots[i], b = slots[j];
    if (a.room && a.room === b.room && a.weekday === b.weekday &&
        toMin(a.startTime) < toMin(b.endTime) && toMin(b.startTime) < toMin(a.endTime)) { overlap.add(a.id); overlap.add(b.id); }
  }
  const overlapCount = Array.from(overlap).length;

  const dayStart = view.length ? Math.floor(Math.min(...view.map(s => toMin(s.startTime))) / 60) * 60 : 9 * 60;
  const dayEnd = view.length ? Math.ceil(Math.max(...view.map(s => toMin(s.endTime))) / 60) * 60 : 21 * 60;
  const totalH = Math.max(HOUR_PX, ((dayEnd - dayStart) / 60) * HOUR_PX);
  const hours: number[] = []; for (let m = dayStart; m <= dayEnd; m += 60) hours.push(m);
  const used = new Set(view.map(s => s.weekday));
  const days = WEEKDAYS.filter(([wd]) => wd <= 5 || used.has(wd));

  const layoutDay = (wd: number) => {
    const evs = view.filter(s => s.weekday === wd).sort((a, b) => toMin(a.startTime) - toMin(b.startTime) || toMin(a.endTime) - toMin(b.endTime));
    const laneEnds: number[] = [];
    return evs.map(e => {
      let lane = laneEnds.findIndex(end => end <= toMin(e.startTime));
      if (lane === -1) { lane = laneEnds.length; laneEnds.push(0); }
      laneEnds[lane] = toMin(e.endTime);
      return { e, lane };
    }).map(p => ({ ...p, lanes: laneEnds.length }));
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ margin: 0 }}>Horarios</Title>
        {canEdit && <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setOpen(true); }}>Añadir franja</Button>}
      </div>
      <Ayuda title="Horario semanal (vista calendario)">
        {isOnlyTeacher
          ? <>Aquí ves <b>tu horario semanal</b> con las clases de tus grupos, colocadas por hora como en un calendario.</>
          : <>Horario semanal de la academia tipo calendario. Filtra por <b>aula</b> para comprobar que no haya <b>solapamientos</b> (dos clases a la vez en la misma aula, marcadas en rojo). Cada bloque es una clase, coloreada por servicio.</>}
      </Ayuda>
      <Space style={{ marginBottom: 12 }} wrap>
        <Text>Aula:</Text>
        <Select allowClear placeholder="Todas las aulas" style={{ width: 200 }} value={room} onChange={setRoom}
          options={rooms.map(r => ({ value: r, label: r === '—' ? '(sin aula)' : `Aula ${r}` }))} />
        {overlapCount > 0 && <Tag color="red"><WarningOutlined /> {overlapCount} clase(s) con solapamiento de aula</Tag>}
        {!loading && view.length === 0 && <Text type="secondary">No hay franjas horarias{isOnlyTeacher ? ' en tus grupos' : ''}.</Text>}
      </Space>

      <Card bodyStyle={{ padding: 8, overflowX: 'auto' }} loading={loading}>
        <div style={{ display: 'flex', minWidth: 720 }}>
          {/* Gutter de horas */}
          <div style={{ width: 50, flexShrink: 0, position: 'relative', marginTop: 24, height: totalH }}>
            {hours.map(h => (
              <div key={h} style={{ position: 'absolute', top: ((h - dayStart) / 60) * HOUR_PX - 7, right: 6, fontSize: 11, color: '#999' }}>{hhmm(h)}</div>
            ))}
          </div>
          {/* Columnas por día */}
          {days.map(([wd, label]) => {
            const placed = layoutDay(wd);
            return (
              <div key={wd} style={{ flex: 1, minWidth: 110, borderLeft: '3px solid #cfc7bb' }}>
                <div style={{ textAlign: 'center', fontWeight: 600, height: 24, fontSize: 13 }}>{label}</div>
                <div style={{ position: 'relative', height: totalH, background: '#fcfcfc' }}>
                  {hours.map(h => (
                    <div key={h} style={{ position: 'absolute', top: ((h - dayStart) / 60) * HOUR_PX, left: 0, right: 0, borderTop: '1px solid #f0f0f0' }} />
                  ))}
                  {placed.map(({ e, lane, lanes }) => {
                    const top = ((toMin(e.startTime) - dayStart) / 60) * HOUR_PX;
                    const height = Math.max(20, ((toMin(e.endTime) - toMin(e.startTime)) / 60) * HOUR_PX - 2);
                    const w = 100 / lanes;
                    const over = overlap.has(e.id);
                    const effColor = effGroupColor(e.color, e.groupName, e.programName);
                    const color = effColor || e.serviceColor || '#579172';
                    return (
                      <Tooltip key={e.id} title={`${e.groupName}${e.serviceName ? ` · ${e.serviceName}` : ''} · ${e.startTime}–${e.endTime}${e.room ? ` · Aula ${e.room}` : ''}${e.teacherName ? ` · ${e.teacherName}` : ''}${over ? ' · ⚠ solapa con otra clase en esta aula' : ''}${canEdit ? ' · clic para editar' : ''}`}>
                        <div onClick={() => canEdit && openEdit(e)} style={{
                          position: 'absolute', top, height, left: `calc(${lane * w}% + 1px)`, width: `calc(${w}% - 2px)`,
                          background: over ? '#fff1f0' : (pastel(effColor, 0.86) || '#fff'), borderLeft: `3px solid ${color}`,
                          border: over ? '1px solid #ff4d4f' : '1px solid #eee', borderLeftWidth: 3, borderRadius: 4,
                          padding: '1px 4px', overflow: 'hidden', fontSize: 11, lineHeight: 1.25, cursor: canEdit ? 'pointer' : 'default',
                        }}>
                          <div style={{ fontWeight: 600 }}>{e.startTime}–{e.endTime}</div>
                          <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.groupName}</div>
                          {e.room && <div style={{ color: '#999' }}>Aula {e.room}{over && <WarningOutlined style={{ color: '#ff4d4f', marginLeft: 3 }} />}</div>}
                          {canEdit && <Popconfirm title="¿Eliminar franja?" onConfirm={() => remove(e.id)}><a style={{ fontSize: 10 }} onClick={(ev) => ev.stopPropagation()}>quitar</a></Popconfirm>}
                        </div>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Modal title="Añadir franja horaria" open={open} onCancel={() => setOpen(false)} onOk={() => form.submit()} okText="Añadir">
        <Form form={form} layout="vertical" onFinish={add}>
          <Form.Item name="groupId" label="Grupo" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label" options={groups.map(g => ({ value: g.id, label: g.name }))} />
          </Form.Item>
          <Form.Item name="weekday" label="Día" rules={[{ required: true }]}>
            <Select options={WEEKDAYS.map(([v, l]) => ({ value: v, label: l }))} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="startTime" label="Hora inicio" rules={[{ required: true }]}><Input type="time" /></Form.Item></Col>
            <Col span={12}><Form.Item name="endTime" label="Hora fin" rules={[{ required: true }]}><Input type="time" /></Form.Item></Col>
          </Row>
          <Form.Item name="room" label="Aula"><Input /></Form.Item>
        </Form>
      </Modal>

      <Modal title={`Editar — ${editing?.groupName || ''}`} open={!!editing} onCancel={() => setEditing(null)} onOk={() => editForm.submit()} okText="Guardar">
        <Alert type="info" showIcon style={{ marginBottom: 12 }} message="Cambios del grupo (nombre, profesor, color) y de esta franja (aula, día, hora)." />
        <Form form={editForm} layout="vertical" onFinish={saveEdit}>
          <Form.Item name="groupName" label="Nombre del grupo" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="teacherId" label="Profesor">
            <Select allowClear showSearch optionFilterProp="label" placeholder="Sin profesor" options={teachers.map(t => ({ value: t.id, label: t.fullName }))} />
          </Form.Item>
          <Form.Item name="color" label="Color del grupo"><ColorSwatches /></Form.Item>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="room" label="Aula"><Input placeholder="Ej.: Aula 1" /></Form.Item></Col>
            <Col span={12}><Form.Item name="weekday" label="Día" rules={[{ required: true }]}><Select options={WEEKDAYS.map(([v, l]) => ({ value: v, label: l }))} /></Form.Item></Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="startTime" label="Hora inicio" rules={[{ required: true }]}><Input type="time" /></Form.Item></Col>
            <Col span={12}><Form.Item name="endTime" label="Hora fin" rules={[{ required: true }]}><Input type="time" /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}

// ----------------------------- PREPARAR CURSO SIGUIENTE (rollover) -----------------------------
function RolloverCard() {
  const [years, setYears] = useState<any[]>([]);
  const [source, setSource] = useState<string | undefined>();
  const [target, setTarget] = useState<string | undefined>();
  const [copyStructure, setCopyStructure] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const load = () => api.get('/catalog/years').then(r => setYears(r.data));
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!source) { setPreview(null); return; }
    api.get(`/catalog/years/${source}/migrate-preview`, { params: { targetYearId: target } })
      .then(r => setPreview(r.data)).catch(() => setPreview(null));
  }, [source, target]);
  const run = async () => {
    if (!source || !target) return;
    setLoading(true);
    try {
      const { data } = await api.post(`/catalog/years/${source}/rollover`, { targetYearId: target, copyStructure });
      if (data.ok === false) message.warning(data.error);
      else message.success(`Migración: ${data.enrollments} alumnos preinscritos, ${data.fees} tarifas copiadas${copyStructure ? `, ${data.groups} grupos, ${data.slots} franjas` : ''}`);
    } catch (e: any) { message.error(e?.response?.data?.message || 'Error'); }
    finally { setLoading(false); }
  };
  return (
    <Card title="Preparar curso siguiente" style={{ marginTop: 16 }}>
      <Alert type="info" showIcon style={{ marginBottom: 12 }}
        message="Migración al curso nuevo (estructura limpia)"
        description={<>
          Crea primero el curso destino (arriba). La migración deja el curso nuevo limpio: <b>copia las tarifas</b> del curso origen
          y pasa a <b>preinscrito</b> (sin grupo) a los alumnos <b>matriculados y activos</b> del origen.
          <b> No crea grupos</b> (se hacen a mano). Cuando cada alumno <b>pague la matrícula (reserva de plaza)</b>, pasará automáticamente a <b>matriculado</b>.
        </>} />
      <Space wrap align="center">
        <Select placeholder="Curso origen" style={{ width: 180 }} value={source} onChange={setSource} options={years.map(y => ({ value: y.id, label: y.label }))} />
        <Text>→</Text>
        <Select placeholder="Curso destino (nuevo)" style={{ width: 200 }} value={target} onChange={setTarget} options={years.map(y => ({ value: y.id, label: y.label }))} />
        <Checkbox checked={copyStructure} onChange={e => setCopyStructure(e.target.checked)}>copiar también grupos y horarios</Checkbox>
        <Popconfirm title="¿Migrar al curso destino?" description="Copia tarifas y deja a los alumnos matriculados del origen como preinscritos en el destino." onConfirm={run}>
          <Button type="primary" loading={loading} disabled={!source || !target}>Migrar al curso nuevo</Button>
        </Popconfirm>
      </Space>
      {preview && (
        <div style={{ marginTop: 10 }}>
          <Text type="secondary">
            Se migrarían <b>{preview.toMigrate}</b> alumno(s) como preinscritos
            {preview.alreadyInTarget > 0 && <> ({preview.alreadyInTarget} ya están en el destino, no se duplican)</>}.
          </Text>
        </div>
      )}
    </Card>
  );
}

// ----------------------------- PRUEBAS DE NIVEL -----------------------------
function PruebasNivel() {
  const [rows, setRows] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();
  const load = async () => { setLoading(true); try { const { data } = await api.get('/level-tests'); setRows(data); } finally { setLoading(false); } };
  useLiveQuery(['level_tests'], load);
  useEffect(() => { load(); api.get('/catalog/programs').then(r => setPrograms(r.data)); api.get('/teachers').then(r => setTeachers(r.data)).catch(() => {}); }, []);
  const openNew = () => { setEditing(null); form.resetFields(); form.setFieldsValue({ testDate: new Date().toISOString().slice(0, 10) }); setOpen(true); };
  const openEdit = (r: any) => {
    setEditing(r);
    form.setFieldsValue({
      ...r,
      testDate: r.testDate ? String(r.testDate).slice(0, 10) : undefined,
      testTime: r.testTime || undefined,
    });
    setOpen(true);
  };
  const save = async (v: any) => {
    try { if (editing) await api.patch(`/level-tests/${editing.id}`, v); else await api.post('/level-tests', v);
      message.success('Prueba guardada'); setOpen(false); load(); }
    catch (e: any) { message.error(e?.response?.data?.message || 'Error'); }
  };
  const remove = async (id: string) => { await api.delete(`/level-tests/${id}`); message.success('Prueba eliminada'); load(); };
  const engPrograms = programs.filter(p => p.name); // todos; el evaluador elige
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ margin: 0 }}>Pruebas de nivel</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openNew}>Nueva prueba</Button>
      </div>
      <Ayuda title="Registro de pruebas de nivel (sobre todo Inglés)">
        Apunta la <b>prueba de nivel</b> de cada candidato: su nombre y contacto, la fecha, quién evaluó, el <b>nivel obtenido</b> y el
        <b> programa recomendado</b>. Sirve para colocar al alumno en el grupo adecuado antes de matricularlo.
      </Ayuda>
      <Card>
        <SearchableTable rowKey="id" dataSource={rows} loading={loading} pagination={{ pageSize: 15 }}
          columns={[
            { title: 'Candidato', dataIndex: 'displayName', render: (n, r) => n || r.candidateName || '—' },
            { title: 'Contacto', dataIndex: 'candidateContact', render: (c) => c || '—' },
            { title: 'Fecha', dataIndex: 'testDate', render: (d) => fmtDate(d) },
            { title: 'Hora', dataIndex: 'testTime', render: (t: string) => t || '—' },
            { title: 'Evaluador', dataIndex: 'evaluatorName', render: (e) => e || '—' },
            { title: 'Nivel', dataIndex: 'resultLevel', render: (l) => l ? <Tag color="purple">{l}</Tag> : '—' },
            { title: 'Programa recomendado', dataIndex: 'recommendedProgramName', render: (p) => p || '—' },
            { title: '', render: (_, r) => <Space><Button size="small" onClick={() => openEdit(r)}>Editar</Button><Popconfirm title="¿Eliminar?" onConfirm={() => remove(r.id)}><Button size="small" danger>Quitar</Button></Popconfirm></Space> },
          ]} />
      </Card>
      <Modal title={editing ? 'Editar prueba de nivel' : 'Nueva prueba de nivel'} open={open} onCancel={() => setOpen(false)} onOk={() => form.submit()} okText="Guardar">
        <Form form={form} layout="vertical" onFinish={save}>
          <Form.Item name="candidateName" label="Nombre del candidato" rules={[{ required: true }]}><Input placeholder="Nombre y apellidos" /></Form.Item>
          <Form.Item name="candidateContact" label="Contacto (teléfono/email)"><Input /></Form.Item>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="testDate" label="Fecha de la prueba">
                <Input type="date" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="testTime" label="Hora">
                <Input type="time" placeholder="HH:MM" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="evaluatorTeacherId" label="Evaluador (profesor)">
                <Select allowClear showSearch optionFilterProp="label" placeholder="Profesor"
                  options={teachers.map(t => ({ value: t.id, label: t.fullName }))} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="resultLevel" label="Nivel obtenido" tooltip="Ej.: A2, B1, PET…"><Input placeholder="A2 / B1 / …" /></Form.Item></Col>
            <Col span={12}><Form.Item name="recommendedProgramId" label="Programa recomendado">
              <Select allowClear showSearch optionFilterProp="label" options={engPrograms.map(p => ({ value: p.id, label: p.name }))} />
            </Form.Item></Col>
          </Row>
          <Form.Item name="notes" label="Notas"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// ----------------------------- TÁPER -----------------------------
function Taper() {
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [dayRate, setDayRate] = useState(0);
  const [rows, setRows] = useState<any[]>([]);
  const [edits, setEdits] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const load = async () => {
    setLoading(true);
    try { const { data } = await api.get('/taper', { params: { period } }); setDayRate(data.dayRate); setRows(data.rows); setEdits({}); }
    finally { setLoading(false); }
  };
  useLiveQuery(['taper'], load);
  useEffect(() => { load(); }, [period]);
  const save = async (studentId: string) => {
    const days = edits[studentId];
    if (days == null) return;
    try { await api.post('/taper/save', { studentId, period, daysCount: days }); message.success('Guardado'); load(); }
    catch { message.error('Error'); }
  };
  const genCharge = async (studentId: string) => {
    try { const { data } = await api.post('/taper/generate-charge', { studentId, period });
      if (data.ok === false) message.warning(data.error); else message.success('Recibo generado'); load(); }
    catch (e: any) { message.error(e?.response?.data?.message || 'Error'); }
  };
  return (
    <div>
      <Title level={3}>Táper</Title>
      <Ayuda title="Control del servicio de táper (comedor) por mes">
        Elige el <b>mes</b>, anota los <b>días</b> que cada alumno ha usado el táper y pulsa <b>Guardar</b> (el importe se calcula con la tarifa por día).
        Luego <b>Generar recibo</b> crea el cobro de ese mes, que aparecerá en Pagos, Morosidad y se podrá domiciliar por SEPA.
        La <b>tarifa por día</b> se configura en Tarifas (servicio Táper, concepto <Tag>taper_dia</Tag>).
      </Ayuda>
      <Card>
        <Space style={{ marginBottom: 12 }} wrap>
          <Text>Mes:</Text>
          <Input type="month" value={period} onChange={e => setPeriod(e.target.value)} style={{ width: 160 }} />
          <Tag color="blue">Tarifa/día: {dayRate.toFixed(2)} €</Tag>
          <Button onClick={load}>Actualizar</Button>
        </Space>
        <SearchableTable rowKey="studentId" dataSource={rows} loading={loading} pagination={{ pageSize: 20 }} size="small"
          columns={[
            { title: 'Alumno', dataIndex: 'studentName' },
            { title: 'Días', width: 120, render: (_, r) => (
              <InputNumber min={0} max={31} defaultValue={r.daysCount ?? 0} disabled={!!r.chargeId}
                onChange={(v) => setEdits(e => ({ ...e, [r.studentId]: Number(v) }))} style={{ width: 80 }} />
            ) },
            { title: 'Importe', dataIndex: 'amount', render: (a) => a != null ? `${Number(a).toFixed(2)} €` : '—' },
            { title: 'Recibo', dataIndex: 'chargeStatus', render: (s) => s ? <Tag color={s === 'pagado' ? 'green' : 'gold'}>{s}</Tag> : <Tag>sin recibo</Tag> },
            { title: '', render: (_, r) => (
              <Space>
                <Button size="small" disabled={!!r.chargeId || edits[r.studentId] == null} onClick={() => save(r.studentId)}>Guardar</Button>
                <Button size="small" type="primary" disabled={!!r.chargeId || !r.amount} onClick={() => genCharge(r.studentId)}>Generar recibo</Button>
              </Space>
            ) },
          ]} />
      </Card>
    </div>
  );
}

// ----------------------------- INFORMES -----------------------------
function Informes() {
  const today = new Date();
  const [gFrom, setGFrom] = useState(new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10));
  const [gTo, setGTo] = useState(new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10));
  const downloadCsv = async (path: string, filename: string, type = 'text/csv') => {
    try {
      const res = await api.get(path, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type }));
      const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
      window.URL.revokeObjectURL(url);
    } catch { message.error('Error generando el informe'); }
  };
  const quickRange = (mode: string) => {
    const y = today.getFullYear(), m = today.getMonth();
    if (mode === 'mes') { setGFrom(new Date(y, m, 1).toISOString().slice(0, 10)); setGTo(new Date(y, m + 1, 0).toISOString().slice(0, 10)); }
    else if (mode === 'trim') { const q = Math.floor(m / 3) * 3; setGFrom(new Date(y, q, 1).toISOString().slice(0, 10)); setGTo(new Date(y, q + 3, 0).toISOString().slice(0, 10)); }
    else if (mode === 'curso') { const sy = m >= 8 ? y : y - 1; setGFrom(`${sy}-09-01`); setGTo(`${sy + 1}-08-31`); }
  };
  const reports = [
    { path: '/reports/charges.csv', file: 'recibos.csv', title: 'Recibos del curso', desc: 'Todos los cobros (concepto, periodo, importe, estado) por alumno.' },
    { path: '/reports/overdue.csv', file: 'morosidad.csv', title: 'Morosidad', desc: 'Familias con recibos pendientes, deuda y contacto de tutores.' },
    { path: '/reports/students.csv', file: 'alumnos.csv', title: 'Alumnos y servicios', desc: 'Listado de alumnos con los servicios en que están matriculados.' },
    { path: '/reports/documents.csv', file: 'documentacion.csv', title: 'Documentación', desc: 'Estado de cada documento por alumno.' },
  ];
  return (
    <div>
      <Title level={3}>Informes</Title>
      <Ayuda title="Exporta los datos a Excel">
        Descarga listados en <b>CSV</b> (se abren en Excel). El <b>Informe para la gestoría</b> es un <b>Excel (.xlsx)</b> con el registro de cobros del periodo y un resumen por mes, concepto, método y servicio.
      </Ayuda>
      <Card style={{ marginBottom: 16, borderColor: '#579172' }}>
        <Title level={5} style={{ marginTop: 0 }}>📒 Informe para la gestoría (cobros) — Excel</Title>
        <Paragraph type="secondary">Registro de ingresos del periodo: una fila por cobro (fecha, familia, alumno, servicio, concepto, método, importe) + hoja de resumen. Elige el periodo (por defecto, el mes en curso).</Paragraph>
        <Space wrap style={{ marginBottom: 10 }}>
          <Text>Desde:</Text><Input type="date" value={gFrom} onChange={e => setGFrom(e.target.value)} style={{ width: 150 }} />
          <Text>Hasta:</Text><Input type="date" value={gTo} onChange={e => setGTo(e.target.value)} style={{ width: 150 }} />
          <Button size="small" onClick={() => quickRange('mes')}>Este mes</Button>
          <Button size="small" onClick={() => quickRange('trim')}>Este trimestre</Button>
          <Button size="small" onClick={() => quickRange('curso')}>Curso</Button>
        </Space>
        <div>
          <Button type="primary" icon={<EuroOutlined />}
            onClick={() => downloadCsv(`/reports/gestoria.xlsx?from=${gFrom}&to=${gTo}`, `cobros-gestoria-${gFrom}_a_${gTo}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}>
            Descargar Excel para gestoría
          </Button>
        </div>
      </Card>
      <Row gutter={[16, 16]}>
        {reports.map(r => (
          <Col xs={24} md={12} key={r.path}>
            <Card>
              <Title level={5} style={{ marginTop: 0 }}>{r.title}</Title>
              <Paragraph type="secondary">{r.desc}</Paragraph>
              <Button type="primary" icon={<EuroOutlined />} onClick={() => downloadCsv(r.path, r.file)}>Descargar CSV</Button>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}

// ----------------------------- RIFAS -----------------------------
const RAFFLE_STATUS: any = { pendiente: { color: 'gold', label: 'Pendiente' }, entregado: { color: 'blue', label: 'Entregado' }, devuelto_parcial: { color: 'orange', label: 'Devuelto parcial' }, liquidado: { color: 'green', label: 'Liquidado' } };
function Rifas() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [sel, setSel] = useState<any>(null);
  const [books, setBooks] = useState<any[]>([]);
  const [families, setFamilies] = useState<any[]>([]);
  const [cOpen, setCOpen] = useState(false);
  const [bOpen, setBOpen] = useState(false);
  const [cForm] = Form.useForm();
  const [bForm] = Form.useForm();
  const loadC = async () => { const { data } = await api.get('/raffles/campaigns'); setCampaigns(data); };
  const loadB = async (id: string) => { const { data } = await api.get(`/raffles/campaigns/${id}/books`); setBooks(data); };
  useLiveQuery(['raffles'], loadC);
  useEffect(() => { loadC(); api.get('/families').then(r => setFamilies(r.data)); }, []);
  const openCampaign = async (c: any) => { setSel(c); loadB(c.id); };
  const createCampaign = async (v: any) => { try { await api.post('/raffles/campaigns', v); message.success('Campaña creada'); setCOpen(false); cForm.resetFields(); loadC(); } catch (e: any) { message.error(e?.response?.data?.message || 'Error'); } };
  const delCampaign = async (id: string) => { try { await api.delete(`/raffles/campaigns/${id}`); message.success('Campaña eliminada'); if (sel?.id === id) setSel(null); loadC(); } catch { message.error('Error'); } };
  const addBook = async (v: any) => { try { await api.post(`/raffles/campaigns/${sel.id}/books`, v); message.success('Talonario asignado'); setBOpen(false); bForm.resetFields(); loadB(sel.id); loadC(); } catch (e: any) { message.error(e?.response?.data?.message || 'Error'); } };
  const updBook = async (id: string, patch: any) => { try { await api.patch(`/raffles/books/${id}`, patch); loadB(sel.id); loadC(); } catch { message.error('Error'); } };
  const delBook = async (id: string) => { try { await api.delete(`/raffles/books/${id}`); loadB(sel.id); loadC(); } catch { message.error('Error'); } };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ margin: 0 }}>Rifas</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { cForm.resetFields(); setCOpen(true); }}>Nueva campaña</Button>
      </div>
      <Ayuda title="Campañas de rifas y talonarios por familia">
        Crea una <b>campaña</b> (con su precio por papeleta) y asigna <b>talonarios</b> a cada familia indicando el <b>rango de números</b>.
        El <b>importe esperado</b> se calcula con el precio × nº de papeletas; anota el <b>dinero entregado</b> y el <b>estado</b> (entregado, devuelto parcial, liquidado).
        Arriba ves el total esperado vs. recaudado de cada campaña.
      </Ayuda>
      <Row gutter={16}>
        <Col xs={24} md={9}>
          <Card title="Campañas" size="small">
            <SearchableTable rowKey="id" dataSource={campaigns} pagination={false} size="small"
              onRow={(r) => ({ onClick: () => openCampaign(r), style: { cursor: 'pointer', background: sel?.id === r.id ? '#EEF5FA' : undefined } })}
              columns={[
                { title: 'Campaña', dataIndex: 'name' },
                { title: 'Papeleta', dataIndex: 'ticketPrice', render: (p) => `${Number(p).toFixed(2)}€` },
                { title: 'Recaudado', render: (_, r) => <span>{Number(r.returned).toFixed(0)}/{Number(r.expected).toFixed(0)}€</span> },
                { title: '', render: (_, r) => <Popconfirm title="¿Eliminar campaña y sus talonarios?" onConfirm={(e) => { (e as any)?.stopPropagation?.(); delCampaign(r.id); }}><Button size="small" danger onClick={(e) => e.stopPropagation()}>Quitar</Button></Popconfirm> },
              ]} />
          </Card>
        </Col>
        <Col xs={24} md={15}>
          <Card title={sel ? `Talonarios — ${sel.name}` : 'Selecciona una campaña'} size="small"
            extra={sel && <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => { bForm.resetFields(); setBOpen(true); }}>Asignar talonario</Button>}>
            {sel ? (
              <Table rowKey="id" dataSource={books} pagination={false} size="small"
                columns={[
                  { title: 'Familia', dataIndex: 'familyName' },
                  { title: 'Números', render: (_, r) => r.rangeStart != null ? `${r.rangeStart}–${r.rangeEnd}` : '—' },
                  { title: 'Esperado', dataIndex: 'amountExpected', render: (a) => `${Number(a).toFixed(2)}€` },
                  { title: 'Entregado', dataIndex: 'amountReturned', render: (a, r) => (
                    <InputNumber size="small" min={0} defaultValue={Number(a)} style={{ width: 90 }} onBlur={(e) => { const v = Number((e.target as HTMLInputElement).value); if (v !== Number(a)) updBook(r.id, { amountReturned: v }); }} />
                  ) },
                  { title: 'Estado', dataIndex: 'status', render: (s, r) => (
                    <Select size="small" value={s} style={{ width: 140 }} onChange={(v) => updBook(r.id, { status: v })}
                      options={Object.keys(RAFFLE_STATUS).map(k => ({ value: k, label: RAFFLE_STATUS[k].label }))} dropdownMatchSelectWidth={false} />
                  ) },
                  { title: '', render: (_, r) => <Popconfirm title="¿Quitar talonario?" onConfirm={() => delBook(r.id)}><Button size="small" danger>Quitar</Button></Popconfirm> },
                ]} />
            ) : <Text type="secondary">Pulsa una campaña de la izquierda para ver y asignar sus talonarios.</Text>}
          </Card>
        </Col>
      </Row>

      <Modal title="Nueva campaña de rifas" open={cOpen} onCancel={() => setCOpen(false)} onOk={() => cForm.submit()} okText="Crear">
        <Form form={cForm} layout="vertical" onFinish={createCampaign}>
          <Form.Item name="name" label="Nombre de la campaña" rules={[{ required: true }]}><Input placeholder="Rifa Navidad 2025" /></Form.Item>
          <Form.Item name="ticketPrice" label="Precio por papeleta (€)"><InputNumber min={0} step={0.5} style={{ width: '100%' }} /></Form.Item>
        </Form>
      </Modal>

      <Modal title="Asignar talonario a una familia" open={bOpen} onCancel={() => setBOpen(false)} onOk={() => bForm.submit()} okText="Asignar">
        <Form form={bForm} layout="vertical" onFinish={addBook}>
          <Form.Item name="familyId" label="Familia" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label" options={families.map(f => ({ value: f.id, label: f.displayName }))} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="rangeStart" label="Nº inicial"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={12}><Form.Item name="rangeEnd" label="Nº final"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
          <Form.Item name="amountExpected" label="Importe esperado (€) — opcional" tooltip="Si lo dejas vacío se calcula con el precio × nº de papeletas"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="notes" label="Notas"><Input /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// ----------------------------- ACCESOS / EQUIPO -----------------------------
const ROLE_LABEL: any = { secretaria_admin: 'Administrador', secretaria_staff: 'Personal', secretaria_teacher: 'Profesor', direccion: 'Dirección' };
// Genera una contraseña alfanumérica (sin símbolos, para evitar problemas de login/JSON).
function genPass(len = 10) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let s = ''; for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}
function Equipo() {
  const [team, setTeam] = useState<any[]>([]);
  const [grantOpen, setGrantOpen] = useState(false);
  const [acctOpen, setAcctOpen] = useState(false);
  const [searchRes, setSearchRes] = useState<any[]>([]);
  const [grantUser, setGrantUser] = useState<any>(null);
  const [grantRole, setGrantRole] = useState('secretaria_staff');
  const [teachersNA, setTeachersNA] = useState<any[]>([]);
  const [created, setCreated] = useState<any>(null);
  const [form] = Form.useForm();
  const [editing, setEditing] = useState<any>(null);
  const [editForm] = Form.useForm();
  const load = async () => { const { data } = await api.get('/access/team'); setTeam(data); };
  useEffect(() => { load(); }, []);
  const doSearch = async (q: string) => { if (!q || q.length < 2) { setSearchRes([]); return; } const { data } = await api.get('/access/search', { params: { q } }); setSearchRes(data); };
  const grant = async () => {
    if (!grantUser) return;
    try { await api.post('/access/grant', { userId: grantUser.id, role: grantRole }); message.success('Acceso concedido'); setGrantOpen(false); setGrantUser(null); setSearchRes([]); load(); }
    catch (e: any) { message.error(e?.response?.data?.message || 'Error'); }
  };
  const revoke = async (id: string) => { try { await api.delete(`/access/role/${id}`); message.success('Rol retirado'); load(); } catch { message.error('Error'); } };
  const internalAccess = async (row: any) => {
    try {
      const { data } = await api.post(`/auth/impersonate/${row.userId}`);
      beginImpersonation(data.access_token);
      window.location.reload(); // re-monta la app con la sesión del profesor; el banner permite volver
    } catch (e: any) { message.error(e?.response?.data?.message || 'No se pudo iniciar el acceso interno'); }
  };
  const openEdit = (row: any) => { setEditing(row); editForm.setFieldsValue({ firstName: row.firstName, lastName: row.lastName, email: row.email, teacherFullName: row.linkedTeacher || '' }); };
  const saveEdit = async (v: any) => {
    try {
      await api.post('/access/update-member', { userId: editing.userId, firstName: v.firstName || '', lastName: v.lastName || '', email: v.email, teacherFullName: v.teacherFullName || '', password: v.password || '' });
      const newPass = v.password;
      const em = v.email;
      setEditing(null); load();
      if (newPass) Modal.success({ title: 'Contraseña establecida', content: <div>Entrega esta contraseña a <b>{em}</b>:<br /><b style={{ fontSize: 16 }}>{newPass}</b><br /><Text type="secondary">Podrá entrar en secretaria.mundoworld.school con ella.</Text></div> });
      else message.success('Datos actualizados');
    } catch (e: any) { message.error(e?.response?.data?.message || 'Error al actualizar'); }
  };
  const openAcct = async () => { setCreated(null); form.resetFields(); form.setFieldsValue({ role: 'secretaria_teacher' }); const { data } = await api.get('/access/teachers-without-account'); setTeachersNA(data); setAcctOpen(true); };
  const createAcct = async (v: any) => {
    try { const { data } = await api.post('/access/create-account', v); setCreated(data); load(); }
    catch (e: any) { message.error(e?.response?.data?.message || 'Error'); }
  };
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ margin: 0 }}>Accesos / Equipo</Title>
        <Space>
          <Button onClick={() => { setGrantUser(null); setSearchRes([]); setGrantOpen(true); }}>Conceder acceso</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openAcct}>Crear cuenta de profesor</Button>
        </Space>
      </div>
      <Ayuda title="Quién puede entrar en Secretaría y con qué rol">
        Aquí gestionas el <b>equipo</b>. Puedes <b>conceder acceso</b> a una cuenta de la plataforma ya existente (por correo), o
        <b> crear una cuenta</b> nueva para un profesor (se genera su contraseña para entregársela). Roles: <b>Administrador</b> (todo),
        <b> Personal</b> (gestión diaria), <b>Profesor</b> (su panel, asistencia y chat), <b>Dirección</b>. Con esto los profesores pueden
        entrar a Secretaría, pasar lista y participar en los chats.
      </Ayuda>
      <Card>
        <Table rowKey="userId" dataSource={team} pagination={false}
          columns={[
            { title: 'Correo', dataIndex: 'email' },
            { title: 'Nombre', dataIndex: 'name', render: (n) => n?.trim() || '—' },
            { title: 'Profesor', dataIndex: 'linkedTeacher', render: (t) => t || '—' },
            { title: 'Roles', dataIndex: 'roles', render: (roles: any[]) => <Space wrap>{roles.map((r) => (
              <Tag key={r.id} color="geekblue" closable onClose={(e) => { e.preventDefault(); revoke(r.id); }}>{ROLE_LABEL[r.role] || r.role}</Tag>
            ))}</Space> },
            { title: '', key: 'edit', render: (_: any, row: any) => (
              <Space>
                <Button size="small" icon={<FormOutlined />} onClick={() => openEdit(row)}>Editar</Button>
                {(row.roles || []).some((r: any) => r.role === 'secretaria_teacher') && (
                  <Tooltip title="Entra en la plataforma con la visualización de este profesor; podrás volver a administración desde el aviso superior.">
                    <Button size="small" icon={<LoginOutlined />} onClick={() => internalAccess(row)}>Acceso interno</Button>
                  </Tooltip>
                )}
              </Space>
            ) },
          ]} />
      </Card>

      <Modal title="Editar miembro del equipo" open={!!editing} onCancel={() => setEditing(null)} onOk={() => editForm.submit()} okText="Guardar">
        <Alert type="info" showIcon style={{ marginBottom: 12 }}
          message="Nombre, apellidos y correo de acceso"
          description="El nombre se comparte con el perfil de la plataforma (MW Panel). El correo es el de inicio de sesión; debe ser único." />
        <Form form={editForm} layout="vertical" onFinish={saveEdit}>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="firstName" label="Nombre"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="lastName" label="Apellidos"><Input /></Form.Item></Col>
          </Row>
          <Form.Item name="email" label="Correo (acceso)" rules={[{ required: true, message: 'El correo es obligatorio' }, { type: 'email', message: 'Correo no válido' }]}>
            <Input placeholder="persona@correo.com" />
          </Form.Item>
          {(editing?.teacherId || (editing?.roles || []).some((r: any) => r.role === 'secretaria_teacher')) && (
            <Form.Item name="teacherFullName" label="Nombre como profesor/a"
              tooltip="Nombre que se usa en horarios, asistencia y grupos. Si no tiene ficha de profesor, se crea y se vincula a esta cuenta.">
              <Input placeholder="Nombre y apellidos del profesor/a" />
            </Form.Item>
          )}
          <Form.Item name="password" label="Contraseña (dejar vacío = no cambiar)"
            tooltip="Establece o restablece la contraseña de acceso para entregársela a la persona. Solo letras y números."
            extra={<a onClick={() => editForm.setFieldsValue({ password: genPass() })}>Generar contraseña</a>}
            rules={[{ validator: (_: any, val: string) => (!val || /^[A-Za-z0-9]{6,}$/.test(val)) ? Promise.resolve() : Promise.reject(new Error('Mín. 6 caracteres alfanuméricos (sin símbolos)')) }]}>
            <Input placeholder="Nueva contraseña" autoComplete="new-password" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="Conceder acceso a una cuenta existente" open={grantOpen} onCancel={() => setGrantOpen(false)} onOk={grant} okText="Conceder" okButtonProps={{ disabled: !grantUser }}>
        <Alert type="info" showIcon style={{ marginBottom: 12 }} message="Busca por correo una cuenta ya existente en la plataforma y asígnale un rol de Secretaría." />
        <Input.Search placeholder="Buscar correo…" onChange={e => doSearch(e.target.value)} onSearch={doSearch} style={{ marginBottom: 8 }} allowClear />
        {searchRes.length > 0 && (
          <div style={{ maxHeight: 160, overflowY: 'auto', border: '1px solid #EDE9E4', borderRadius: 6, marginBottom: 12 }}>
            {searchRes.map(u => (
              <div key={u.id} onClick={() => setGrantUser(u)} style={{ padding: '6px 10px', cursor: 'pointer', background: grantUser?.id === u.id ? '#EEF5FA' : undefined }}>
                {u.email} <Text type="secondary" style={{ fontSize: 12 }}>({u.platformRole})</Text>
              </div>
            ))}
          </div>
        )}
        {grantUser && <div style={{ marginBottom: 12 }}>Seleccionado: <Tag color="green">{grantUser.email}</Tag></div>}
        <Text>Rol:</Text>
        <Select style={{ width: '100%', marginTop: 4 }} value={grantRole} onChange={setGrantRole}
          options={Object.keys(ROLE_LABEL).map(r => ({ value: r, label: ROLE_LABEL[r] }))} />
      </Modal>

      <Modal title="Crear cuenta de profesor" open={acctOpen} onCancel={() => setAcctOpen(false)} onOk={() => form.submit()} okText="Crear cuenta" okButtonProps={{ disabled: !!created }}>
        {created ? (
          <Alert type="success" showIcon message="Cuenta creada"
            description={<div>Entrega estas credenciales a la persona:<br />Correo: <b>{created.email}</b><br />Contraseña: <b style={{ fontSize: 16 }}>{created.password}</b><br /><Text type="secondary">Podrá entrar en secretaria.mundoworld.school con ellas.</Text></div>} />
        ) : (
          <Form form={form} layout="vertical" onFinish={createAcct}>
            <Alert type="info" showIcon style={{ marginBottom: 12 }} message="Se crea una cuenta de plataforma para entrar a Secretaría. Si no indicas contraseña, se genera una automáticamente." />
            <Form.Item name="teacherId" label="Vincular a un profesor (opcional)" tooltip="Asocia la cuenta a un profesor ya creado, para su panel">
              <Select allowClear showSearch optionFilterProp="label" placeholder="Sin vincular"
                options={teachersNA.map(t => ({ value: t.id, label: t.fullName }))}
                onChange={(_, opt: any) => { /* nada */ }} />
            </Form.Item>
            <Form.Item name="email" label="Correo" rules={[{ required: true }]}><Input placeholder="profesor@correo.com" /></Form.Item>
            <Form.Item name="role" label="Rol" rules={[{ required: true }]}>
              <Select options={Object.keys(ROLE_LABEL).map(r => ({ value: r, label: ROLE_LABEL[r] }))} />
            </Form.Item>
            <Form.Item name="password" label="Contraseña (opcional)"
              tooltip="Si la dejas vacía, se genera una automáticamente. Solo letras y números."
              extra={<a onClick={() => form.setFieldsValue({ password: genPass() })}>Generar contraseña</a>}
              rules={[{ validator: (_: any, val: string) => (!val || /^[A-Za-z0-9]{6,}$/.test(val)) ? Promise.resolve() : Promise.reject(new Error('Mín. 6 caracteres alfanuméricos (sin símbolos)')) }]}>
              <Input placeholder="Vacío = automática" autoComplete="new-password" />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
}

// ----------------------------- CHAT (grupos) -----------------------------
function Chat({ me }: { me: any }) {
  const [groups, setGroups] = useState<any[]>([]);
  const [sel, setSel] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const bottomRef = useRef<HTMLDivElement>(null);
  const selRef = useRef<any>(null);
  const loadGroups = async () => { const { data } = await api.get('/chat/groups'); setGroups(data); };
  useEffect(() => { loadGroups(); api.get('/chat/users').then(r => setUsers(r.data)); }, []);
  const loadMessages = async (gid: string) => { const { data } = await api.get(`/chat/groups/${gid}/messages`); setMessages(data); setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50); };
  const openGroup = (g: any) => { setSel(g); selRef.current = g; setText(localStorage.getItem('chat_draft_' + g.id) || ''); loadMessages(g.id); };
  // Borrador automático del mensaje en curso (sobrevive a cambios de grupo / navegación)
  useEffect(() => { if (sel) localStorage.setItem('chat_draft_' + sel.id, text); }, [text, sel]);
  // polling cada 4s del grupo abierto
  useEffect(() => {
    const t = setInterval(() => { if (selRef.current) loadMessages(selRef.current.id); }, 4000);
    return () => clearInterval(t);
  }, []);
  const send = async () => {
    if (!text.trim() || !sel) return;
    const body = text; setText('');
    try { await api.post(`/chat/groups/${sel.id}/messages`, { body }); loadMessages(sel.id); loadGroups(); }
    catch { message.error('No se pudo enviar'); }
  };
  const create = async (v: any) => {
    try { const { data } = await api.post('/chat/groups', { name: v.name, memberUserIds: v.memberUserIds || [] });
      message.success('Grupo creado'); setOpen(false); form.resetFields(); await loadGroups();
      openGroup({ id: data.id, name: v.name });
    } catch (e: any) { message.error(e?.response?.data?.message || 'Error'); }
  };
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ margin: 0 }}>Grupos de chat</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setOpen(true); }}>Nuevo grupo</Button>
      </div>
      <Ayuda title="Mensajería interna por grupos">
        Crea <b>grupos de chat</b> con el personal y los docentes que tengan acceso a Secretaría, y escribíos mensajes. Los mensajes se
        actualizan solos cada pocos segundos. Para que alguien participe debe tener <b>acceso a Secretaría</b> (rol asignado).
      </Ayuda>
      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Card title="Mis grupos" size="small" styles={{ body: { padding: 0 } }}>
            <div style={{ maxHeight: 460, overflowY: 'auto' }}>
              {groups.length === 0 ? <div style={{ padding: 16 }}><Text type="secondary">Aún no tienes grupos. Crea uno.</Text></div> :
                groups.map(g => (
                  <div key={g.id} onClick={() => openGroup(g)} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #EDE9E4', background: sel?.id === g.id ? '#EEF5FA' : undefined }}>
                    <div style={{ fontWeight: 600 }}>{g.name} <Text type="secondary" style={{ fontWeight: 400, fontSize: 12 }}>· {g.memberCount}</Text></div>
                    <Text type="secondary" style={{ fontSize: 12 }} ellipsis>{g.lastMessage || 'Sin mensajes'}</Text>
                  </div>
                ))}
            </div>
          </Card>
        </Col>
        <Col xs={24} md={16}>
          <Card title={sel ? sel.name : 'Selecciona un grupo'} size="small" styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column', height: 460 } }}>
            {sel ? <>
              <div style={{ flex: 1, overflowY: 'auto', padding: 14, background: '#FAFAF8' }}>
                {messages.length === 0 ? <Text type="secondary">No hay mensajes todavía. ¡Escribe el primero!</Text> :
                  messages.map(m => (
                    <div key={m.id} style={{ display: 'flex', justifyContent: m.mine ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
                      <div style={{ maxWidth: '75%', background: m.mine ? '#DCEFE4' : '#FFFFFF', border: '1px solid #E2DDD8', borderRadius: 8, padding: '6px 10px' }}>
                        {!m.mine && <div style={{ fontSize: 11, color: '#6B6B7B', marginBottom: 2 }}>{m.senderEmail}</div>}
                        <div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{m.body}</div>
                        <div style={{ fontSize: 10, color: '#9B9BAB', textAlign: 'right', marginTop: 2 }}>{new Date(m.createdAt).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    </div>
                  ))}
                <div ref={bottomRef} />
              </div>
              <div style={{ display: 'flex', gap: 8, padding: 10, borderTop: '1px solid #EDE9E4' }}>
                <Input.TextArea value={text} onChange={e => setText(e.target.value)} placeholder="Escribe un mensaje…" autoSize={{ minRows: 1, maxRows: 3 }}
                  onPressEnter={(e) => { if (!e.shiftKey) { e.preventDefault(); send(); } }} />
                <Button type="primary" onClick={send}>Enviar</Button>
              </div>
            </> : <div style={{ padding: 16 }}><Text type="secondary">Elige un grupo de la izquierda o crea uno nuevo.</Text></div>}
          </Card>
        </Col>
      </Row>
      <Modal title="Nuevo grupo de chat" open={open} onCancel={() => setOpen(false)} onOk={() => form.submit()} okText="Crear">
        <Form form={form} layout="vertical" onFinish={create}>
          <Form.Item name="name" label="Nombre del grupo" rules={[{ required: true }]}><Input placeholder="Ej.: Profesores Inglés" /></Form.Item>
          <Form.Item name="memberUserIds" label="Participantes" tooltip="Personas con acceso a Secretaría (tú te incluyes automáticamente)">
            <Select mode="multiple" optionFilterProp="label" placeholder="Elige participantes"
              options={users.filter(u => u.id !== me?.id).map(u => ({ value: u.id, label: `${u.email} (${u.roles})` }))} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// ----------------------------- RESULTADOS MOCK (Cambridge) -----------------------------
function MockResultados() {
  const [students, setStudents] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [sel, setSel] = useState<any>(null);
  const [results, setResults] = useState<any>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [secStudents, setSecStudents] = useState<any[]>([]);
  const [linkTarget, setLinkTarget] = useState<string | undefined>();
  const load = async () => { setLoading(true); try { const { data } = await api.get('/mocks/students', { params: { q: q || undefined } }); setStudents(data); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const openResults = async (s: any) => { setSel(s); const { data } = await api.get(`/mocks/results/${s.id}`); setResults(data); };
  const autoLink = async () => {
    try {
      const { data } = await api.post('/mocks/auto-link');
      message.success(data.linked ? `${data.linked} alumno(s) emparejado(s) por nombre` : 'No hay nuevas coincidencias por nombre');
      load();
    } catch { message.error('Error al emparejar'); }
  };
  const openLink = async (s: any) => { setSel(s); setLinkTarget(undefined); const { data } = await api.get('/students'); setSecStudents(data); setLinkOpen(true); };
  const doLink = async () => { if (!linkTarget) return; try { await api.post('/mocks/link', { studentId: linkTarget, mockUserId: sel.id }); message.success('Enlazado'); setLinkOpen(false); load(); } catch { message.error('Error'); } };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ margin: 0 }}>Resultados Mock</Title>
        <Popconfirm title="Emparejar automáticamente" description="Enlaza por coincidencia exacta de nombre todos los alumnos aún sin enlazar con su usuario de Cambridge Mocks." okText="Emparejar" cancelText="Cancelar" onConfirm={autoLink}>
          <Button type="primary">Emparejar automáticamente</Button>
        </Popconfirm>
      </div>
      <Ayuda title="Resultados de los exámenes Mock (Cambridge) dentro de Secretaría">
        Aquí ves los <b>alumnos de Cambridge Mocks</b> y sus <b>resultados</b> por convocatoria y parte (Reading, Writing, Listening…), sin salir de Secretaría.
        Puedes <b>enlazar</b> cada alumno del Mock con su ficha de Secretaría (manual o automático por nombre); así el profesor accede a las notas desde aquí.
        La base de datos del Mock se lee en <b>solo lectura</b> (no se modifica).
      </Ayuda>
      <Row gutter={16}>
        <Col xs={24} md={10}>
          <Card title="Alumnos del Mock" size="small">
            <Space style={{ marginBottom: 8 }}>
              <Input.Search placeholder="Buscar por nombre" value={q} onChange={e => setQ(e.target.value)} onSearch={load} style={{ width: 220 }} allowClear />
            </Space>
            <Table rowKey="id" dataSource={students} loading={loading} pagination={{ pageSize: 12 }} size="small"
              onRow={(r) => ({ onClick: () => openResults(r), style: { cursor: 'pointer', background: sel?.id === r.id ? '#EEF5FA' : undefined } })}
              columns={[
                { title: 'Alumno', dataIndex: 'fullName' },
                { title: 'Resultados', dataIndex: 'results' },
                { title: 'Enlazado', dataIndex: 'linkedTo', render: (l) => l ? <Tag color="green">{l}</Tag> : <Tag>—</Tag> },
                { title: '', render: (_, r) => <Button size="small" onClick={(e) => { e.stopPropagation(); openLink(r); }}>Enlazar</Button> },
              ]} />
          </Card>
        </Col>
        <Col xs={24} md={14}>
          <Card title={sel ? `Resultados — ${results?.fullName || sel.fullName}` : 'Selecciona un alumno'} size="small">
            {sel && results ? (
              results.calls.length === 0 ? <Text type="secondary">Sin resultados registrados.</Text> :
              results.calls.map((c: any, i: number) => (
                <div key={i} style={{ marginBottom: 14 }}>
                  <Text strong>{c.examName}</Text> <Text type="secondary">· {fmtDate(c.examDate)}</Text>
                  {c.overall != null && <Tag color="purple" style={{ marginLeft: 8 }}>Global: {c.overall}</Tag>}
                  <Table rowKey="part" size="small" pagination={false} style={{ marginTop: 6 }} dataSource={c.parts}
                    columns={[
                      { title: 'Parte', dataIndex: 'part' },
                      { title: 'Nota', dataIndex: 'score', render: (s) => s != null ? Number(s).toFixed(2) : '—' },
                      { title: 'Estado', dataIndex: 'status', render: (s) => <Tag>{s}</Tag> },
                    ]} />
                </div>
              ))
            ) : <Text type="secondary">Pulsa un alumno para ver sus notas.</Text>}
          </Card>
        </Col>
      </Row>
      <Modal title={`Enlazar "${sel?.fullName || ''}" con un alumno de Secretaría`} open={linkOpen} onCancel={() => setLinkOpen(false)} onOk={doLink} okText="Enlazar" okButtonProps={{ disabled: !linkTarget }}>
        <Alert type="info" showIcon style={{ marginBottom: 12 }} message="Si aún no hay alumnos en Secretaría, impórtalos o créalos primero." />
        <Select showSearch optionFilterProp="label" style={{ width: '100%' }} placeholder="Elige el alumno de Secretaría" value={linkTarget} onChange={setLinkTarget}
          options={secStudents.map((s: any) => ({ value: s.id, label: `${s.firstName || ''} ${s.lastName || ''}`.trim() || '(sin nombre)' }))} />
      </Modal>
    </div>
  );
}

// ----------------------------- ASISTENCIA -----------------------------
const ATT_STATUS: any = {
  presente: { color: 'green', label: 'Presente' },
  ausente: { color: 'red', label: 'Ausente' },
  justificada: { color: 'blue', label: 'Justificada' },
  retraso: { color: 'orange', label: 'Retraso' },
};
const ATT_ORDER = ['presente', 'ausente', 'justificada', 'retraso'];
const ATT_LETTER: any = { presente: 'P', ausente: 'A', justificada: 'J', retraso: 'R' };
const ATT_HEX: any = { presente: '#2E7D52', ausente: '#cf1322', justificada: '#1677ff', retraso: '#d46b08' };
// Marcador compacto de asistencia (círculo con letra), análogo a la carita de Tareas.
function AttMark({ status, size = 22 }: { status: string; size?: number }) {
  return (
    <span title={ATT_STATUS[status]?.label} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size, height: size,
      borderRadius: '50%', background: ATT_HEX[status] || '#999', color: '#fff', fontSize: Math.round(size * 0.5), fontWeight: 700,
    }}>{ATT_LETTER[status] || '?'}</span>
  );
}
function Asistencia({ user }: { user?: any }) {
  const roles: string[] = user?.secretariaRoles || [];
  const canGlobal = roles.some(r => ['secretaria_admin', 'secretaria_staff', 'direccion'].includes(r));
  const [groups, setGroups] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [groupId, setGroupId] = useState<string | undefined>();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [grid, setGrid] = useState<any>({ students: [], dates: [], records: {} });
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dmShort = (d: string) => d.slice(8, 10) + '/' + d.slice(5, 7);
  // estadísticas
  const [tab, setTab] = useState<'lista' | 'stats'>('lista');
  const today = new Date();
  const [sFrom, setSFrom] = useState(new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10));
  const [sTo, setSTo] = useState(today.toISOString().slice(0, 10));
  const [sService, setSService] = useState<string | undefined>();
  const [sGroup, setSGroup] = useState<string | undefined>();
  const [stat, setStat] = useState<any>(null);
  const [sLoading, setSLoading] = useState(false);
  useEffect(() => { api.get('/catalog/groups').then(r => setGroups(r.data)); api.get('/catalog/services').then(r => setServices(r.data)).catch(() => {}); }, []);
  const loadStats = async () => {
    setSLoading(true);
    try { const { data } = await api.get('/attendance/stats', { params: { from: sFrom, to: sTo, serviceId: sService || undefined, groupId: sGroup || undefined } }); setStat(data); }
    catch { message.error('Error al cargar estadísticas'); } finally { setSLoading(false); }
  };
  useEffect(() => { if (tab === 'stats') loadStats(); }, [tab, sFrom, sTo, sService, sGroup]);
  const quick = (mode: string) => {
    const y = today.getFullYear(), m = today.getMonth();
    if (mode === 'mes') { setSFrom(new Date(y, m, 1).toISOString().slice(0, 10)); setSTo(new Date(y, m + 1, 0).toISOString().slice(0, 10)); }
    else if (mode === 'trim') { const q = Math.floor(m / 3) * 3; setSFrom(new Date(y, q, 1).toISOString().slice(0, 10)); setSTo(new Date(y, q + 3, 0).toISOString().slice(0, 10)); }
    else if (mode === 'curso') { const sy = m >= 8 ? y : y - 1; setSFrom(`${sy}-09-01`); setSTo(`${sy + 1}-08-31`); }
  };
  const pct = (r: any) => r.total > 0 ? Math.round(((r.presente + r.retraso) / r.total) * 100) : null;
  const load = async () => {
    if (!groupId) return;
    setLoading(true);
    try {
      const { data } = await api.get('/attendance/grid', { params: { groupId, date } });
      setGrid(data);
      const e: any = {};
      data.students.forEach((r: any) => { e[r.enrollmentId] = (data.records[r.enrollmentId] || {})[date] || 'presente'; });
      setEdits(e);
      setTimeout(() => { if (scrollRef.current) scrollRef.current.scrollLeft = scrollRef.current.scrollWidth; }, 60);
    } finally { setLoading(false); }
  };
  useLiveQuery(['attendance'], load);
  useEffect(() => { if (groupId && tab === 'lista') load(); }, [groupId, date, tab]);
  const cycle = (id: string) => setEdits(e => { const cur = e[id] || 'presente'; const next = ATT_ORDER[(ATT_ORDER.indexOf(cur) + 1) % ATT_ORDER.length]; return { ...e, [id]: next }; });
  const markAll = (status: string) => { const e: any = {}; grid.students.forEach((r: any) => { e[r.enrollmentId] = status; }); setEdits(e); };
  const save = async () => {
    const records = grid.students.map((r: any) => ({ enrollmentId: r.enrollmentId, status: edits[r.enrollmentId] || 'presente' }));
    try { const { data } = await api.post('/attendance/save', { date, records }); message.success(`Asistencia guardada (${data.saved})`); load(); }
    catch { message.error('Error al guardar'); }
  };
  const deleteDay = async () => {
    try { const { data } = await api.delete('/attendance/day', { params: { groupId, date } });
      message.success(data.deleted ? `Día borrado (${data.deleted} registro/s)` : 'No había registros ese día'); load(); }
    catch { message.error('No se pudo borrar el día'); }
  };
  const counts = grid.students.reduce((a: any, r: any) => { const s = edits[r.enrollmentId] || 'presente'; a[s] = (a[s] || 0) + 1; return a; }, {});
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <Title level={3} style={{ margin: 0 }}>Asistencia</Title>
        <Space>
          <Button type={tab === 'lista' ? 'primary' : 'default'} onClick={() => setTab('lista')}>Pasar lista</Button>
          <Button type={tab === 'stats' ? 'primary' : 'default'} onClick={() => setTab('stats')}>Estadísticas</Button>
        </Space>
      </div>
      <AbsenceAlerts />
      {tab === 'stats' ? (
        <>
          <Ayuda title="Estadísticas de asistencia por periodo">
            Filtra por <b>periodo</b> (mes, trimestre, curso o fechas). Sin filtros ves el <b>global por servicios</b>{canGlobal ? '' : ' (de tus grupos)'};
            elige un <b>servicio</b> para ver <b>por grupos</b>, o un <b>grupo</b> para ver <b>alumno por alumno</b>. El % es de asistencia (presente + retraso).
          </Ayuda>
          <Card>
            <Space style={{ marginBottom: 12 }} wrap>
              <Text>Desde:</Text><Input type="date" value={sFrom} onChange={e => setSFrom(e.target.value)} style={{ width: 150 }} />
              <Text>Hasta:</Text><Input type="date" value={sTo} onChange={e => setSTo(e.target.value)} style={{ width: 150 }} />
              <Button size="small" onClick={() => quick('mes')}>Mes</Button>
              <Button size="small" onClick={() => quick('trim')}>Trimestre</Button>
              <Button size="small" onClick={() => quick('curso')}>Curso</Button>
            </Space>
            <Space style={{ marginBottom: 12 }} wrap>
              {canGlobal && <><Text>Servicio:</Text>
                <Select allowClear placeholder="Todos (global)" style={{ width: 180 }} value={sService} onChange={(v) => { setSService(v); setSGroup(undefined); }}
                  options={services.map(s => ({ value: s.id, label: s.name }))} /></>}
              <Text>Grupo:</Text>
              <Select allowClear showSearch optionFilterProp="label" placeholder="Todos" style={{ width: 200 }} value={sGroup} onChange={setSGroup}
                options={groups.filter(g => !sService || g.serviceId === sService || true).map(g => ({ value: g.id, label: g.name }))} />
            </Space>
            {stat && (
              <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
                <Col xs={12} md={5}><Card size="small"><Statistic title="% Asistencia" value={pct(stat.totals) ?? '—'} suffix={pct(stat.totals) != null ? '%' : ''} valueStyle={{ color: '#2E7D52' }} /></Card></Col>
                {Object.keys(ATT_STATUS).map(k => <Col xs={12} md={4} key={k}><Card size="small"><Statistic title={ATT_STATUS[k].label} value={stat.totals[k] || 0} valueStyle={{ color: ATT_STATUS[k].color === 'green' ? '#2E7D52' : ATT_STATUS[k].color === 'red' ? '#cf1322' : undefined }} /></Card></Col>)}
              </Row>
            )}
            <SearchableTable rowKey="name" dataSource={stat?.rows || []} loading={sLoading} pagination={{ pageSize: 30 }} size="small"
              locale={{ emptyText: 'Sin registros de asistencia en el periodo' }}
              columns={[
                { title: stat?.level === 'student' ? 'Alumno' : stat?.level === 'group' ? 'Grupo' : 'Servicio', dataIndex: 'name' },
                { title: 'Presente', dataIndex: 'presente', align: 'center' },
                { title: 'Ausente', dataIndex: 'ausente', align: 'center', render: (v: number) => <span style={{ color: v ? '#cf1322' : undefined }}>{v}</span> },
                { title: 'Justific.', dataIndex: 'justificada', align: 'center' },
                { title: 'Retraso', dataIndex: 'retraso', align: 'center' },
                { title: 'Total', dataIndex: 'total', align: 'center' },
                { title: '% asist.', align: 'center', render: (_: any, r: any) => { const p = pct(r); return p == null ? '—' : <Tag color={p >= 90 ? 'green' : p >= 75 ? 'gold' : 'red'}>{p}%</Tag>; } },
              ]} />
          </Card>
        </>
      ) : (<>
      <Ayuda title="Pasa lista por grupo y día">
        Elige un <b>grupo</b> y el <b>día</b> (columna de la derecha, resaltada): todos salen como <b style={{ color: '#2E7D52' }}>Presente</b> por defecto.
        Haz <b>clic</b> en la marca para cambiar el estado (P→A→J→R) y pulsa <b>Guardar</b>. A la izquierda ves el <b>historial</b> de días anteriores (desliza para ver más).
        Leyenda: <b style={{ color: '#2E7D52' }}>P</b> presente, <b style={{ color: '#cf1322' }}>A</b> ausente, <b style={{ color: '#1677ff' }}>J</b> justificada, <b style={{ color: '#d46b08' }}>R</b> retraso.
      </Ayuda>
      <Card>
        <Space style={{ marginBottom: 12 }} wrap>
          <Text>Grupo:</Text>
          <Select showSearch optionFilterProp="label" placeholder="Elige grupo" style={{ width: 220 }} value={groupId} onChange={setGroupId}
            options={groups.map(g => ({ value: g.id, label: g.name }))} />
          <Text>Fecha:</Text>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: 160 }} />
          {groupId && <>
            <Button size="small" onClick={() => markAll('presente')}>Todos presente</Button>
            <Button size="small" onClick={() => markAll('ausente')}>Todos ausente</Button>
            <Button type="primary" onClick={save}>Guardar</Button>
            <Popconfirm title="¿Borrar la asistencia de este grupo y fecha?" description="Elimina los registros de ese día (útil si se pasó lista por error)." okText="Borrar" cancelText="Cancelar" okButtonProps={{ danger: true }} onConfirm={deleteDay}>
              <Button size="small" danger>Borrar día</Button>
            </Popconfirm>
          </>}
        </Space>
        {groupId && grid.students.length > 0 && (
          <Space style={{ marginBottom: 8 }} wrap>
            <Text type="secondary" style={{ fontSize: 12 }}>Día {dmShort(date)}:</Text>
            {ATT_ORDER.map(k => <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><AttMark status={k} size={18} /> {counts[k] || 0}</span>)}
          </Space>
        )}
        {!groupId ? <Text type="secondary">Elige un grupo</Text> :
          grid.students.length === 0 ? <Text type="secondary">No hay alumnos matriculados en este grupo</Text> : (
            <div ref={scrollRef} style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr>
                    <th style={{ position: 'sticky', left: 0, zIndex: 2, background: '#F5F2ED', border: '1px solid #E2DDD8', padding: '6px 10px', textAlign: 'left', minWidth: 150 }}>Alumno</th>
                    {grid.dates.map((d: string) => (
                      <th key={d} style={{ border: '1px solid #E2DDD8', background: d === date ? '#EEF5FA' : '#F5F2ED', padding: '4px 6px', minWidth: 42, fontWeight: d === date ? 700 : 500, color: d === date ? '#2C5F8A' : '#6B6B7B' }}>{dmShort(d)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {grid.students.map((r: any) => (
                    <tr key={r.enrollmentId}>
                      <td style={{ position: 'sticky', left: 0, zIndex: 1, background: '#fff', border: '1px solid #EDE9E4', padding: '4px 10px', whiteSpace: 'nowrap' }}>{r.studentName}</td>
                      {grid.dates.map((d: string) => {
                        const isSel = d === date;
                        if (isSel) {
                          const st = edits[r.enrollmentId] || 'presente';
                          return <td key={d} style={{ border: '1px solid #EDE9E4', background: '#EEF5FA', textAlign: 'center', padding: 2 }}>
                            <Tooltip title={`${ATT_STATUS[st].label} · clic para cambiar`}><span style={{ cursor: 'pointer', display: 'inline-block' }} onClick={() => cycle(r.enrollmentId)}><AttMark status={st} size={26} /></span></Tooltip>
                          </td>;
                        }
                        const stored = (grid.records[r.enrollmentId] || {})[d];
                        return <td key={d} style={{ border: '1px solid #EDE9E4', textAlign: 'center', padding: 2 }}>
                          {stored ? <AttMark status={stored} size={22} /> : <span style={{ color: '#d9d9d9' }}>·</span>}
                        </td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </Card>
      </>)}
    </div>
  );
}

// ----------------------------- PROFESORES + PANEL DOCENTE -----------------------------
function Profesores() {
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();
  const [sel, setSel] = useState<any>(null);
  const [panel, setPanel] = useState<any>({ groups: [], students: [] });
  const [mwOpen, setMwOpen] = useState(false);
  const [mwList, setMwList] = useState<any[]>([]);
  const [grantAccess, setGrantAccess] = useState(true);
  const load = async () => { const { data } = await api.get('/teachers'); setRows(data); };
  useEffect(() => { load(); }, []);
  const openMw = async () => { const { data } = await api.get('/teachers/mwpanel'); setMwList(data); setMwOpen(true); };
  const importMw = async (mwpanelTeacherId: string) => {
    try { const { data } = await api.post('/teachers/import-mwpanel', { mwpanelTeacherId, grantAccess });
      message.success(data.accessGranted ? 'Importado y con acceso a Secretaría' : 'Profesor importado'); openMw(); load(); }
    catch { message.error('Error'); }
  };
  const openNew = () => { setEditing(null); form.resetFields(); setOpen(true); };
  const openEdit = (r: any) => { setEditing(r); form.setFieldsValue(r); setOpen(true); };
  const save = async (v: any) => {
    try { if (editing) await api.patch(`/teachers/${editing.id}`, v); else await api.post('/teachers', v);
      message.success('Profesor guardado'); setOpen(false); load(); }
    catch (e: any) { message.error(e?.response?.data?.message || 'Error'); }
  };
  const remove = async (id: string) => { try { await api.delete(`/teachers/${id}`); message.success('Profesor eliminado'); if (sel?.id === id) setSel(null); load(); } catch { message.error('Error'); } };
  const openPanel = async (t: any) => { setSel(t); const { data } = await api.get(`/teachers/${t.id}/panel`); setPanel(data); };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ margin: 0 }}>Profesores</Title>
        <Space>
          <Button onClick={openMw}>Importar de MW Panel</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openNew}>Nuevo profesor</Button>
        </Space>
      </div>
      <Ayuda title="Profesores y su alumnado">
        Da de alta a los <b>profesores</b> (o <b>impórtalos desde MW Panel</b> con un clic) y asígnalos a sus <b>grupos</b> (en la sección Grupos).
        Al pulsar un profesor verás su <b>panel</b>: los grupos que imparte y todos los <b>alumnos matriculados</b> en ellos.
      </Ayuda>
      <Row gutter={16}>
        <Col xs={24} md={9}>
          <Card title="Listado" size="small">
            <SearchableTable rowKey="id" dataSource={rows} pagination={false} size="small"
              onRow={(r) => ({ onClick: () => openPanel(r), style: { cursor: 'pointer', background: sel?.id === r.id ? '#EEF5FA' : undefined } })}
              columns={[
                { title: 'Profesor', dataIndex: 'fullName' },
                { title: 'Grupos', dataIndex: 'groupCount' },
                { title: '', render: (_, r) => <Space><Button size="small" onClick={(e) => { e.stopPropagation(); openEdit(r); }}>Editar</Button><Popconfirm title="¿Eliminar profesor?" onConfirm={() => remove(r.id)}><Button size="small" danger onClick={(e) => e.stopPropagation()}>Quitar</Button></Popconfirm></Space> },
              ]} />
          </Card>
        </Col>
        <Col xs={24} md={15}>
          <Card title={sel ? `Panel de ${sel.fullName}` : 'Selecciona un profesor'} size="small">
            {sel ? (
              panel.groups.length === 0 ? <Text type="secondary">Este profesor no tiene grupos asignados todavía (asígnalos en Grupos).</Text> :
              panel.groups.map((g: any) => (
                <div key={g.id} style={{ marginBottom: 16 }}>
                  <Text strong>{g.name}</Text> <Text type="secondary">· {g.serviceName || ''} {g.programName ? `· ${g.programName}` : ''} {g.room ? `· Aula ${g.room}` : ''} · {g.studentCount} alumnos</Text>
                  <Table rowKey="enrollmentId" size="small" pagination={false} style={{ marginTop: 6 }}
                    dataSource={panel.students.filter((s: any) => s.groupId === g.id)}
                    columns={[
                      { title: 'Alumno', dataIndex: 'studentName' },
                      { title: 'Nacimiento', dataIndex: 'birthDate', render: (d) => fmtDate(d) },
                    ]} />
                </div>
              ))
            ) : <Text type="secondary">Pulsa un profesor de la izquierda para ver sus grupos y alumnos.</Text>}
            {sel && panel.levelTests?.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <Text strong>Pruebas de nivel evaluadas</Text>
                <Table rowKey="id" size="small" pagination={false} style={{ marginTop: 6 }} dataSource={panel.levelTests}
                  columns={[
                    { title: 'Alumno', dataIndex: 'studentName' },
                    { title: 'Fecha', dataIndex: 'testDate', render: (d: any, r: any) => `${fmtDate(d)}${r.testTime ? ` ${r.testTime}` : ''}` },
                    { title: 'Nivel', dataIndex: 'resultLevel', render: (l: any) => l ? <Tag color="purple">{l}</Tag> : '—' },
                    { title: 'Recomendado', dataIndex: 'recommendedProgramName', render: (p: any) => p || '—' },
                  ]} />
              </div>
            )}
          </Card>
        </Col>
      </Row>
      <Modal title={editing ? 'Editar profesor' : 'Nuevo profesor'} open={open} onCancel={() => setOpen(false)} onOk={() => form.submit()} okText="Guardar">
        <Form form={form} layout="vertical" onFinish={save}>
          <Form.Item name="fullName" label="Nombre y apellidos" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="email" label="Correo"><Input /></Form.Item>
          <Form.Item name="phone" label="Teléfono"><Input /></Form.Item>
          <Form.Item name="notes" label="Notas"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      <Modal title="Importar docentes de MW Panel" open={mwOpen} onCancel={() => setMwOpen(false)} footer={<Button onClick={() => setMwOpen(false)}>Cerrar</Button>} width={640}>
        <Alert type="info" showIcon style={{ marginBottom: 12 }}
          message="Estos son los profesores que ya tienes en MW Panel"
          description={<>Impórtalos para usarlos en Secretaría (asignar grupos, panel, asistencia). <label style={{ marginLeft: 4 }}><input type="checkbox" checked={grantAccess} onChange={e => setGrantAccess(e.target.checked)} /> dar acceso a Secretaría (rol Profesor) al importar</label></>} />
        <SearchableTable rowKey="mwpanelTeacherId" dataSource={mwList} size="small" pagination={{ pageSize: 8 }}
          columns={[
            { title: 'Profesor', dataIndex: 'fullName' },
            { title: 'Correo', dataIndex: 'email', render: (e) => e || '—' },
            { title: '', render: (_, r) => r.imported
                ? <Tag color="green">Ya importado</Tag>
                : <Button size="small" type="primary" onClick={() => importMw(r.mwpanelTeacherId)}>Importar</Button> },
          ]} />
      </Modal>
    </div>
  );
}

// ----------------------------- IMPORTADOR EXCEL -----------------------------
function Importador() {
  const normName = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [checkedAuto, setCheckedAuto] = useState<Set<string>>(new Set());
  const [manualMap, setManualMap] = useState<Record<string, string>>({});

  const doPreview = async () => {
    if (!file) { message.warning('Selecciona primero el fichero Excel'); return; }
    const fd = new FormData(); fd.append('file', file);
    setLoading(true);
    try {
      const { data } = await api.post('/import/preview', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setPreview(data);
      const initial = new Set<string>();
      (data.fuzzyMatched || []).forEach((m: any) => initial.add(`${m.svc}|${m.paymentName}`));
      setCheckedAuto(initial);
      setManualMap({});
    } catch (e: any) { message.error(e?.response?.data?.message || 'Error'); }
    finally { setLoading(false); }
  };

  const handleCommit = async () => {
    if (!file) return;
    const mappings: Record<string, Record<string, string>> = {};
    for (const m of (preview?.fuzzyMatched || [])) {
      const key = `${m.svc}|${m.paymentName}`;
      mappings[m.svc] ??= {};
      if (checkedAuto.has(key)) {
        mappings[m.svc][normName(m.paymentName)] = m.rosterName;
      } else {
        mappings[m.svc][normName(m.paymentName)] = '';
      }
    }
    for (const [key, rosterName] of Object.entries(manualMap)) {
      if (!rosterName || rosterName === '__skip__') continue;
      const idx = key.indexOf('|');
      const svc = key.slice(0, idx);
      const paymentName = key.slice(idx + 1);
      mappings[svc] ??= {};
      mappings[svc][normName(paymentName)] = rosterName;
    }
    const fd = new FormData();
    fd.append('file', file);
    const hasAnyMapping = Object.values(mappings).some(m => Object.keys(m).length > 0);
    if (hasAnyMapping) fd.append('mappings', JSON.stringify(mappings));
    setLoading(true);
    try {
      const { data } = await api.post('/import/commit', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setResult(data);
    } catch (e: any) { message.error(e?.response?.data?.message || 'Error'); }
    finally { setLoading(false); }
  };

  const blocked = preview && preview.yaHayMatriculas > 0;
  return (
    <div>
      <Title level={3}>Importar del Excel</Title>
      <Ayuda title="Vuelca el Excel «Datos y Pagos 25-26» a Secretaría">
        Sube el fichero y pulsa <b>Vista previa</b>: te muestro qué se importaría (alumnos, bajas, recibos) y los <b>avisos</b>, <b>sin escribir nada</b>.
        Si todo cuadra, pulsa <b>Importar de verdad</b>. Importa <b>listados + pagos del curso 2025-2026</b> de Inglés, Apoyo, Danza y Escuela.
        <Paragraph style={{ marginTop: 6, marginBottom: 0 }}>
          Notas: los alumnos del final de cada hoja (a partir del marcador de bajas) entran como <Tag>baja</Tag>. No se crean grupos
          (la etiqueta de grupo del Excel se guarda en las notas de la matrícula). Los importes de los recibos salen de las <b>tarifas configuradas</b>:
          conviene poner las tarifas reales antes para que sean correctos.
        </Paragraph>
      </Ayuda>
      <Card>
        <Space direction="vertical" style={{ width: '100%' }}>
          <input type="file" accept=".xlsx" onChange={e => { setFile(e.target.files?.[0] || null); setPreview(null); setResult(null); setCheckedAuto(new Set()); setManualMap({}); }} />
          <Space wrap>
            <Button type="primary" loading={loading} onClick={doPreview} disabled={!file}>Vista previa (dry-run)</Button>
            <Popconfirm title="¿Importar de verdad a la base de datos?" disabled={!preview || blocked} onConfirm={handleCommit}>
              <Button danger disabled={!preview || blocked}>Importar de verdad</Button>
            </Popconfirm>
          </Space>
        </Space>
      </Card>

      {preview && (
        <Card title="Vista previa" style={{ marginTop: 16 }}>
          <Row gutter={16} style={{ marginBottom: 12 }}>
            <Col xs={8}><Statistic title="Alumnos" value={preview.totales.alumnos} /></Col>
            <Col xs={8}><Statistic title="Matriculados" value={preview.totales.matriculados} valueStyle={{ color: '#3f8600' }} /></Col>
            <Col xs={8}><Statistic title="Bajas" value={preview.totales.bajas} valueStyle={{ color: '#cf1322' }} /></Col>
          </Row>
          <Table rowKey="servicio" dataSource={preview.porServicio} pagination={false} size="small" style={{ marginBottom: 12 }}
            columns={[
              { title: 'Servicio', dataIndex: 'servicio' },
              { title: 'Total', dataIndex: 'total' },
              { title: 'Matriculados', dataIndex: 'matriculados' },
              { title: 'Bajas', dataIndex: 'bajas' },
              { title: 'Recibos pagados', dataIndex: 'recibosPagados' },
              { title: 'Recibos exentos', dataIndex: 'recibosExentos' },
            ]} />
          {preview.warnings?.length > 0 && (
            <Alert type="warning" showIcon style={{ marginBottom: 12 }} message="Avisos"
              description={<ul style={{ margin: 0, paddingLeft: 18 }}>{preview.warnings.map((w: string, i: number) => <li key={i}>{w}</li>)}</ul>} />
          )}
          {(preview.fuzzyMatched?.length > 0) && (
            <Card
              size="small"
              title={`Emparejados automáticamente — ${preview.fuzzyMatched.length} nombre(s)`}
              style={{ marginBottom: 12 }}
              extra={<Text type="secondary" style={{ fontSize: 12 }}>Desmarca los que no sean correctos</Text>}
            >
              <Table
                rowKey={(r: any) => `${r.svc}|${r.paymentName}`}
                dataSource={preview.fuzzyMatched}
                pagination={false}
                size="small"
                columns={[
                  { title: 'Servicio', dataIndex: 'svc', width: 80 },
                  { title: 'Nombre en Excel (pagos)', dataIndex: 'paymentName' },
                  { title: '→', width: 28, align: 'center' as const, render: () => '→' },
                  { title: 'Nombre en listado', dataIndex: 'rosterName' },
                  {
                    title: 'Sim.', dataIndex: 'similarity', width: 70, align: 'center' as const,
                    render: (s: number) => <Tag color={s >= 0.9 ? 'green' : 'orange'}>{Math.round(s * 100)}%</Tag>,
                  },
                  {
                    title: 'Usar', width: 56, align: 'center' as const,
                    render: (_: any, r: any) => {
                      const k = `${r.svc}|${r.paymentName}`;
                      return (
                        <Checkbox
                          checked={checkedAuto.has(k)}
                          onChange={e => setCheckedAuto(prev => {
                            const next = new Set(prev);
                            e.target.checked ? next.add(k) : next.delete(k);
                            return next;
                          })}
                        />
                      );
                    },
                  },
                ]}
              />
            </Card>
          )}
          {(preview.needsReview?.length > 0) && (
            <Card
              size="small"
              title={`Requieren revisión manual — ${preview.needsReview.length} nombre(s)`}
              style={{ marginBottom: 12 }}
              extra={<Text type="secondary" style={{ fontSize: 12 }}>Los no asignados se omitirán</Text>}
            >
              <Table
                rowKey={(r: any) => `${r.svc}|${r.paymentName}`}
                dataSource={preview.needsReview}
                pagination={false}
                size="small"
                columns={[
                  { title: 'Servicio', dataIndex: 'svc', width: 80 },
                  { title: 'Nombre en Excel (pagos)', dataIndex: 'paymentName' },
                  {
                    title: 'Asignar a…',
                    render: (_: any, r: any) => {
                      if (!r.candidates?.length)
                        return <Text type="secondary" style={{ fontSize: 12 }}>Sin candidatos — se omitirá</Text>;
                      const k = `${r.svc}|${r.paymentName}`;
                      return (
                        <Select
                          style={{ width: '100%', minWidth: 220 }}
                          placeholder="Seleccionar alumno…"
                          allowClear
                          value={manualMap[k] && manualMap[k] !== '__skip__' ? manualMap[k] : undefined}
                          onChange={val =>
                            setManualMap(prev => ({ ...prev, [k]: val ?? '__skip__' }))
                          }
                          options={[
                            ...r.candidates.map((c: any) => ({
                              value: c.name,
                              label: `${c.name} — ${Math.round(c.similarity * 100)}%`,
                            })),
                            { value: '__skip__', label: 'No importar este pago' },
                          ]}
                        />
                      );
                    },
                  },
                ]}
              />
            </Card>
          )}
          <Text type="secondary">Muestra de los primeros alumnos:</Text>
          <Table rowKey={(_, i) => String(i)} dataSource={preview.muestra} pagination={false} size="small"
            columns={[
              { title: 'Servicio', dataIndex: 'servicio' }, { title: 'Nombre', dataIndex: 'nombre' },
              { title: 'Baja', dataIndex: 'baja', render: (b) => b ? <Tag color="red">baja</Tag> : <Tag color="green">alta</Tag> },
              { title: 'Grupo', dataIndex: 'grupo', render: (g) => g || '—' },
              { title: 'Nacimiento', dataIndex: 'nacimiento', render: (d) => d || '—' },
              { title: 'Recibos', dataIndex: 'recibos' },
            ]} />
        </Card>
      )}

      {result && (
        <>
          <Alert type="success" showIcon style={{ marginTop: 16 }} message="Importación completada"
            description={`Creados: ${result.families} familias, ${result.students} alumnos, ${result.guardians} tutores, ${result.enrollments} matrículas, ${result.charges} recibos (${result.payments} pagos).`} />
          {result.warnings?.length > 0 && (
            <Alert type="warning" showIcon style={{ marginTop: 8 }} message="Avisos del commit"
              description={<ul style={{ margin: 0, paddingLeft: 18 }}>{result.warnings.map((w: string, i: number) => <li key={i}>{w}</li>)}</ul>} />
          )}
        </>
      )}
    </div>
  );
}

// ----------------------------- HORARIO POR AULAS (estilo Excel, arrastrable) -----------------------------
const HA_DAYS = [1, 2, 3, 4, 5];
const HA_DAYNAMES = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const HA_DEF_TIMES = ['16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30'];

function HorarioAulas() {
  const [rooms, setRooms] = useState<string[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [drag, setDrag] = useState<any>(null);
  const [overKey, setOverKey] = useState<string | null>(null);
  const [newRoom, setNewRoom] = useState('');
  const [assignCell, setAssignCell] = useState<any>(null); // {weekday, room, time}
  const [assignForm] = Form.useForm();
  const [teacherFor, setTeacherFor] = useState<any>(null); // block
  const [teacherSel, setTeacherSel] = useState<string | undefined>();

  const load = async () => {
    setLoading(true);
    try { const { data } = await api.get('/schedule/grid'); setRooms(data.rooms || []); setBlocks(data.blocks || []); } finally { setLoading(false); }
  };
  useLiveQuery(['schedule_slots', 'groups'], load);
  useEffect(() => { load(); api.get('/catalog/groups').then(r => setGroups(r.data)); api.get('/teachers').then(r => setTeachers(r.data)); }, []);

  const times = Array.from(new Set([...HA_DEF_TIMES, ...blocks.map(b => b.start)])).filter(Boolean).sort();

  // Plan de ocupación: cada bloque abarca (rowSpan) todas las franjas de su duración.
  const colKeys: { d: number; r: string; key: string }[] = [];
  HA_DAYS.forEach(d => rooms.forEach(r => colKeys.push({ d, r, key: `${d}-${r}` })));
  const plan: Record<string, any[]> = {};
  for (const { d, r, key } of colKeys) {
    const arr: any[] = times.map(() => ({ type: 'empty' }));
    const colBlocks = blocks.filter(b => b.weekday === d && (b.room || '') === r)
      .sort((a, b) => toMin(a.start) - toMin(b.start) || (toMin(b.end) - toMin(b.start)) - (toMin(a.end) - toMin(a.start)));
    for (const b of colBlocks) {
      const si = times.indexOf(b.start);
      if (si < 0) continue;
      let span = 0; for (let i = si; i < times.length; i++) { if (toMin(times[i]) < toMin(b.end)) span++; else break; }
      span = Math.max(1, span);
      if (arr[si].type === 'skip') {
        let j = si - 1; while (j >= 0 && arr[j].type === 'skip') j--;
        if (j >= 0 && arr[j].type === 'block') arr[j].blocks.push(b);
        continue;
      }
      if (arr[si].type === 'block') { arr[si].blocks.push(b); arr[si].span = Math.max(arr[si].span, span); }
      else arr[si] = { type: 'block', blocks: [b], span };
      for (let i = si + 1; i < si + arr[si].span && i < times.length; i++) { if (arr[i].type === 'empty') arr[i] = { type: 'skip' }; }
    }
    plan[key] = arr;
  }

  const dropOn = async (wd: number, room: string, t: string) => {
    const b = drag; setDrag(null); setOverKey(null);
    if (!b) return;
    const dur = Math.max(30, toMin(b.end) - toMin(b.start));
    try { await api.patch(`/schedule/${b.id}`, { weekday: wd, room, startTime: t, endTime: hhmm(toMin(t) + dur) }); load(); }
    catch { message.error('No se pudo mover'); }
  };
  const addRoom = async () => { if (!newRoom.trim()) return; try { await api.post('/schedule/rooms', { name: newRoom.trim() }); setNewRoom(''); load(); } catch { message.error('Error'); } };
  const delRoom = async (name: string) => { try { await api.delete(`/schedule/rooms/${encodeURIComponent(name)}`); message.success('Aula eliminada'); load(); } catch { message.error('Error'); } };
  const delBlock = async (id: string) => { try { await api.delete(`/schedule/${id}`); load(); } catch { message.error('Error'); } };
  const openAssign = (wd: number, room: string, t: string) => { setAssignCell({ weekday: wd, room, time: t }); assignForm.resetFields(); assignForm.setFieldsValue({ durationMin: 60 }); };
  const doAssign = async (v: any) => {
    try {
      await api.post('/schedule', { groupId: v.groupId, weekday: assignCell.weekday, room: assignCell.room, startTime: assignCell.time, endTime: hhmm(toMin(assignCell.time) + (v.durationMin || 60)) });
      setAssignCell(null); load();
    } catch { message.error('Error'); }
  };
  const openTeacher = (b: any) => { setTeacherFor(b); setTeacherSel(b.teacherId || undefined); };
  const saveTeacher = async () => { try { await api.patch(`/catalog/groups/${teacherFor.groupId}`, { teacherId: teacherSel || null }); message.success('Profesor actualizado'); setTeacherFor(null); load(); } catch { message.error('Error'); } };

  return (
    <Card size="small" styles={{ body: { padding: 12 } }} style={{ marginBottom: 16 }}
      title={<span><DashboardOutlined /> Horario por aulas</span>}
      extra={<Space>
        <Input size="small" placeholder="Nueva aula" value={newRoom} onChange={e => setNewRoom(e.target.value)} onPressEnter={addRoom} style={{ width: 120 }} />
        <Button size="small" onClick={addRoom}>+ Aula</Button>
        <Button size="small" onClick={load} loading={loading}>Actualizar</Button>
      </Space>}>
      <div style={{ fontSize: 12, color: '#6B6B7B', marginBottom: 8 }}>
        Arrastra las clases entre <b>aulas</b>, <b>días</b> y <b>horas</b>; el cambio actualiza el grupo (día, hora, aula).
        Pulsa una celda vacía para <b>colocar un grupo</b>. Menú <b>⋯</b> de cada clase para cambiar profesor o quitarla.
        Aulas: {rooms.map(r => <Popconfirm key={r} title={`¿Eliminar el aula ${r}?`} onConfirm={() => delRoom(r)}><Tag style={{ cursor: 'pointer' }}>{r} ✕</Tag></Popconfirm>)}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr>
              <th rowSpan={2} style={{ position: 'sticky', left: 0, background: '#F5F2ED', border: '1px solid #E2DDD8', padding: 4, minWidth: 46 }}>Hora</th>
              {HA_DAYS.map(d => <th key={d} colSpan={rooms.length || 1} style={{ border: '1px solid #E2DDD8', borderLeft: '3px solid #8a8174', background: '#EEF5FA', padding: 4, fontFamily: "'Lora',serif" }}>{HA_DAYNAMES[d]}</th>)}
            </tr>
            <tr>
              {HA_DAYS.map(d => rooms.map((r, ri) => <th key={d + r} style={{ border: '1px solid #E2DDD8', borderLeft: ri === 0 ? '3px solid #8a8174' : '1px solid #E2DDD8', background: '#F5F2ED', padding: '2px 4px', fontWeight: 500, minWidth: 96 }}>{r}</th>))}
            </tr>
          </thead>
          <tbody>
            {times.map((t, ri) => (
              <tr key={t}>
                <td style={{ position: 'sticky', left: 0, background: '#fff', border: '1px solid #EDE9E4', padding: 4, fontWeight: 600, color: '#6B6B7B', textAlign: 'right' }}>{t}</td>
                {colKeys.map(({ d, r, key }) => {
                  const cp = plan[key][ri];
                  if (cp.type === 'skip') return null; // cubierta por el rowSpan del bloque de arriba
                  const k = `${d}-${r}-${t}`;
                  if (cp.type === 'block') {
                    return (
                      <td key={k} rowSpan={cp.span} onDragOver={e => { e.preventDefault(); setOverKey(k); }} onDrop={() => dropOn(d, r, t)}
                        style={{ border: '1px solid #EDE9E4', verticalAlign: 'top', padding: 2, minWidth: 96, background: overKey === k ? '#EEF5FA' : '#fff', borderLeft: r === rooms[0] ? '3px solid #8a8174' : undefined }}>
                        {cp.blocks.map((b: any) => (
                          <div key={b.id} draggable onDragStart={(e) => { e.stopPropagation(); setDrag(b); }} onDragEnd={() => { setDrag(null); setOverKey(null); }}
                            style={{ minHeight: cp.blocks.length === 1 ? cp.span * 38 - 6 : 36, borderLeft: `3px solid ${effGroupColor(b.color, b.groupName, b.programName) || b.serviceColor || '#579172'}`, background: pastel(effGroupColor(b.color, b.groupName, b.programName), 0.86) || '#F5F2ED', borderRadius: 4, padding: '2px 4px', marginBottom: 2, cursor: 'grab' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center' }}>
                              <b style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.groupName}</b>
                              <Dropdown trigger={['click']} menu={{ items: [{ key: 'p', label: 'Cambiar profesor' }, { key: 'd', label: 'Quitar del horario' }], onClick: ({ key }: any) => key === 'p' ? openTeacher(b) : delBlock(b.id) }}>
                                <a onClick={e => { e.stopPropagation(); e.preventDefault(); }} style={{ color: '#9B9BAB', flexShrink: 0 }}>⋯</a>
                              </Dropdown>
                            </div>
                            <div style={{ color: '#6B6B7B' }}>{b.start}–{b.end}</div>
                            {b.teacherName && <div style={{ color: '#6B6B7B' }}>👤 {b.teacherName}</div>}
                          </div>
                        ))}
                      </td>
                    );
                  }
                  return (
                    <td key={k} onDragOver={e => { e.preventDefault(); setOverKey(k); }} onDrop={() => dropOn(d, r, t)}
                      onClick={() => openAssign(d, r, t)}
                      style={{ border: '1px solid #EDE9E4', verticalAlign: 'top', padding: 2, minWidth: 96, height: 38, background: overKey === k ? '#EEF5FA' : '#fcfcfb', cursor: 'pointer', borderLeft: r === rooms[0] ? '3px solid #8a8174' : undefined }} />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {rooms.length === 0 && <Text type="secondary">Añade aulas para empezar.</Text>}
      </div>

      <Modal title="Colocar grupo en el horario" open={!!assignCell} onCancel={() => setAssignCell(null)} onOk={() => assignForm.submit()} okText="Colocar">
        {assignCell && <Alert type="info" showIcon style={{ marginBottom: 12 }} message={`${HA_DAYNAMES[assignCell.weekday]} · ${assignCell.time} · ${assignCell.room}`} />}
        <Form form={assignForm} layout="vertical" onFinish={doAssign}>
          <Form.Item name="groupId" label="Grupo" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label" options={groups.map(g => ({ value: g.id, label: g.name }))} />
          </Form.Item>
          <Form.Item name="durationMin" label="Duración (minutos)"><InputNumber min={15} step={15} style={{ width: '100%' }} /></Form.Item>
        </Form>
      </Modal>

      <Modal title="Cambiar profesor del grupo" open={!!teacherFor} onCancel={() => setTeacherFor(null)} onOk={saveTeacher} okText="Guardar">
        {teacherFor && <Alert type="info" showIcon style={{ marginBottom: 12 }} message={`Grupo: ${teacherFor.groupName}`} description="El cambio afecta al grupo en toda la plataforma." />}
        <Select allowClear showSearch optionFilterProp="label" style={{ width: '100%' }} placeholder="Sin profesor" value={teacherSel} onChange={setTeacherSel}
          options={teachers.map(t => ({ value: t.id, label: t.fullName }))} />
      </Modal>
    </Card>
  );
}

// ----------------------------- ORGANIZACIÓN (tablero principal) -----------------------------
// Colores por estado de matrícula (como las celdas de colores del Excel)
const ORG_STATUS: any = {
  matriculado: { bg: '#dcefe4', border: '#7fc4a0', label: 'Matriculado', tick: true },
  preinscrito: { bg: '#fff7cc', border: '#e8d36b', label: 'Preinscrito' },
  lista_espera: { bg: '#ffe3c2', border: '#f0b878', label: 'Lista de espera' },
  pendiente: { bg: '#e6f0fa', border: '#9cc0e0', label: 'Pendiente' },
};
const orgStat = (s: string) => ORG_STATUS[s] || { bg: '#F5F2ED', border: '#E2DDD8', label: s };
const DOW_SHORT = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const fmtSlots = (slots: any[]) => (slots && slots.length)
  ? slots.map((s: any) => `${DOW_SHORT[s.weekday]} ${s.start}–${s.end}${s.room ? ` (${s.room})` : ''}`).join(' · ')
  : 'Sin horario';

function Organizacion() {
  const q = useSearch();
  const [services, setServices] = useState<any[]>([]);
  const [serviceId, setServiceId] = useState<string | undefined>();
  const [data, setData] = useState<any>({ groups: [], students: [] });
  const [loading, setLoading] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [dragCol, setDragCol] = useState<string | null>(null);

  const load = async () => {
    if (!serviceId) return;
    setLoading(true);
    try { const { data } = await api.get('/enrollments/board', { params: { serviceId } }); setData(data); }
    finally { setLoading(false); }
  };
  useLiveQuery(['enrollments', 'groups', 'students'], load);
  useEffect(() => { api.get('/catalog/services').then(r => { setServices(r.data); const ing = r.data.find((s: any) => s.code === 'INGLES'); setServiceId(ing?.id || r.data[0]?.id); }); }, []);
  useEffect(() => { if (serviceId) load(); }, [serviceId]);

  const move = async (enrollmentId: string, targetGroupId: string | null) => {
    const st = data.students.find((s: any) => s.enrollmentId === enrollmentId);
    if (!st || (st.groupId || null) === (targetGroupId || null)) return;
    setData((d: any) => ({ ...d, students: d.students.map((s: any) => s.enrollmentId === enrollmentId ? { ...s, groupId: targetGroupId } : s) }));
    try { await api.patch(`/enrollments/${enrollmentId}`, { groupId: targetGroupId }); message.success('Alumno movido'); }
    catch { message.error('No se pudo mover'); load(); }
  };

  // Reordenar columnas de grupos (arrastrando la cabecera de la columna)
  const reorderTo = async (targetGroupId: string | null) => {
    if (!dragCol || dragCol === targetGroupId) return;
    const ids = data.groups.map((g: any) => g.id);
    const from = ids.indexOf(dragCol);
    if (from < 0) return;
    ids.splice(from, 1);
    const to = targetGroupId ? ids.indexOf(targetGroupId) : 0;
    ids.splice(to < 0 ? ids.length : to, 0, dragCol);
    const map: any = Object.fromEntries(data.groups.map((g: any) => [g.id, g]));
    setData((d: any) => ({ ...d, groups: ids.map((id: string) => map[id]) }));
    try { await api.post('/catalog/groups/reorder', { ids }); } catch { message.error('No se pudo reordenar'); load(); }
  };

  const setStatus = async (enrollmentId: string, status: string) => {
    try { await api.patch(`/enrollments/${enrollmentId}`, { status }); load(); } catch { message.error('Error'); }
  };
  const setComment = async (s: any) => {
    const c = window.prompt('Comentario sobre ' + s.studentName + ' (visible al pasar el ratón):', s.comment || '');
    if (c === null) return;
    try { await api.patch(`/enrollments/${s.enrollmentId}`, { notes: c }); load(); } catch { message.error('Error'); }
  };

  const columns = [{ id: null, name: 'Sin grupo / Bolsa', schedule: [], _unassigned: true }, ...data.groups];
  const studentsOf = (gid: string | null) => data.students.filter((s: any) => (s.groupId || null) === (gid || null) && matchesText(s, q));

  // --- Vista Grupos (tablero kanban) ---
  // Render de una columna del tablero (se usa tanto para la Bolsa como para cada grupo)
  const renderColumn = (g: any) => {
        const list = studentsOf(g.id);
        const nonWait = list.filter((s: any) => s.status !== 'lista_espera');
        const wait = list.filter((s: any) => s.status === 'lista_espera');
        const waiting = wait.length;
        const occupied = nonWait.length; // las plazas en lista de espera NO ocupan plaza
        const over = g.capacity && occupied > g.capacity;
        const isOver = overCol === String(g.id);
        const colBg = g._unassigned ? '#ece1fb' : (pastel(effGroupColor(g.color, g.name, g.programName), 0.85) || '#fff');
        const cardMenu = (s: any, g: any) => ({
          items: [
            { key: 'comment', label: s.comment ? 'Editar comentario' : 'Añadir comentario' },
            { type: 'divider' as const },
            { key: 'st_matriculado', label: '✓ Matricular' },
            { key: 'st_preinscrito', label: 'Marcar preinscrito' },
            { key: 'st_lista_espera', label: 'A lista de espera' },
            { type: 'divider' as const },
            ...columns.filter((c: any) => (c.id || null) !== (g.id || null)).map((c: any) => ({ key: 'mv_' + (c.id || 'null'), label: c._unassigned ? 'Quitar de grupo' : `Mover a ${c.name}` })),
          ],
          onClick: ({ key }: any) => {
            if (key === 'comment') setComment(s);
            else if (key.startsWith('st_')) setStatus(s.enrollmentId, key.slice(3));
            else if (key.startsWith('mv_')) move(s.enrollmentId, key === 'mv_null' ? null : key.slice(3));
          },
        });
        return (
          <div key={String(g.id)}
            onDragOver={(e) => { e.preventDefault(); setOverCol(String(g.id)); }}
            onDragLeave={() => setOverCol(null)}
            onDrop={() => { if (dragCol) reorderTo(g.id); else if (dragId) move(dragId, g.id); setDragId(null); setDragCol(null); setOverCol(null); }}
            style={{
              minWidth: 158, maxWidth: 158, flexShrink: 0,
              background: colBg,
              border: isOver ? '2px dashed #579172' : '1px solid #E2DDD8',
              borderTop: !g._unassigned && effGroupColor(g.color, g.name, g.programName) ? `3px solid ${effGroupColor(g.color, g.name, g.programName)}` : undefined,
              borderRadius: 10, padding: 8, alignSelf: 'stretch', opacity: dragCol === g.id ? 0.5 : 1,
              // La columna "Sin grupo / Bolsa" se renderiza FUERA del scroll horizontal (caja propia a la izquierda),
              // así es imposible que se solape con las columnas de grupos. Tiene su propio scroll vertical.
              ...(g._unassigned ? { overflowY: 'auto' as const, boxShadow: '6px 0 12px -2px rgba(0,0,0,0.18)' } : {}),
            }}>
            <div style={{
                // Cabecera fija arriba (sticky-top) y opaca: el nombre del grupo sigue visible al hacer scroll vertical
                position: 'sticky', top: 0, zIndex: 2, background: colBg,
                marginTop: -8, marginLeft: -8, marginRight: -8, padding: '8px 8px 6px', marginBottom: 8,
                borderRadius: '9px 9px 0 0', boxShadow: '0 4px 6px -4px rgba(0,0,0,0.28)',
              }}
              draggable={!g._unassigned}
              onDragStart={!g._unassigned ? ((e) => { e.stopPropagation(); setDragCol(g.id); }) : undefined}
              onDragEnd={() => { setDragCol(null); setOverCol(null); }}>
              <div style={{ fontWeight: 700, fontFamily: "'Lora', serif", fontSize: 13.5, lineHeight: 1.2, cursor: g._unassigned ? 'default' : 'move' }}>
                {!g._unassigned && <span style={{ color: '#9B9BAB', marginRight: 4 }} title="Arrastra para reordenar">⠿</span>}
                {g.name}{' '}
                {g._unassigned
                  ? <Tag style={{ marginLeft: 4 }}>{list.length}</Tag>
                  : <><Tag style={{ marginLeft: 4 }} color={over ? 'red' : undefined}>{occupied}{g.capacity ? `/${g.capacity}` : ''}</Tag>{waiting > 0 ? <Tag color="orange" title="En lista de espera (no ocupan plaza)">+{waiting} espera</Tag> : null}</>}
              </div>
              {!g._unassigned && (
                <div style={{ fontSize: 11, color: '#6B6B7B' }}>
                  {g.programName ? <div>{g.programName}</div> : null}
                  <div>{fmtSlots(g.schedule)}</div>
                  {g.teacherName && <div>👤 {g.teacherName}</div>}
                </div>
              )}
              {g._unassigned && <div style={{ fontSize: 11, color: '#722ed1' }}>Preinscritos (amarillo) y alumnos sin grupo. Arrástralos a un grupo.</div>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minHeight: 40 }}>
              {(() => {
                const renderCard = (s: any) => {
                  const stat = orgStat(s.status);
                  return (
                    <div key={s.enrollmentId} draggable
                      onDragStart={() => setDragId(s.enrollmentId)}
                      onDragEnd={() => { setDragId(null); setOverCol(null); }}
                      title={stat.label}
                      style={{
                        background: dragId === s.enrollmentId ? '#EEF5FA' : stat.bg, border: `1px solid ${stat.border}`,
                        borderRadius: 6, padding: '4px 6px', fontSize: 12, cursor: 'grab',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4,
                      }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        {stat.tick ? <span style={{ color: '#2E7D52', fontWeight: 700, marginRight: 4 }}>✓</span> : null}
                        {s.comment ? <Tooltip title={s.comment}><span style={{ cursor: 'help', marginRight: 4 }}>💬</span></Tooltip> : null}
                        {s.studentName}
                      </span>
                      <Dropdown menu={cardMenu(s, g)} trigger={['click']}>
                        <a style={{ color: '#6B6B7B', fontSize: 16, lineHeight: 1, flexShrink: 0 }} onClick={(e) => e.preventDefault()}>⋯</a>
                      </Dropdown>
                    </div>
                  );
                };
                return (
                  <>
                    {nonWait.map(renderCard)}
                    {wait.length > 0 && (
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#b45309', borderTop: '1px dashed #f0c078', marginTop: 2, paddingTop: 4 }}>
                        Lista de espera ({wait.length})
                      </div>
                    )}
                    {wait.map(renderCard)}
                    {list.length === 0 && <Text type="secondary" style={{ fontSize: 12 }}>—</Text>}
                  </>
                );
              })()}
            </div>
          </div>
        );
  };

  const kanban = (
    // La Bolsa va en su PROPIA caja a la izquierda (fuera del scroll horizontal): imposible que las
    // columnas de grupos se solapen con ella. Los grupos hacen scroll en la caja derecha.
    <div style={{ display: 'flex', gap: 8, alignItems: 'stretch', maxHeight: '72vh' }}>
      {renderColumn(columns[0])}
      <div style={{ overflow: 'auto', flex: 1, minWidth: 0 }}>
        {data.groups.length === 0 && !loading
          ? <Empty description="No hay grupos en este servicio. Créalos en Grupos." />
          : <div style={{ display: 'flex', gap: 8, alignItems: 'stretch', width: 'max-content', paddingBottom: 8 }}>
              {data.groups.map(renderColumn)}
            </div>}
      </div>
    </div>
  );

  return (
    <div>
      <Title level={3} style={{ marginTop: 0 }}>Organización del centro</Title>
      {/* Horario por aulas (estilo Excel) en la parte superior */}
      <HorarioAulas />
      <Title level={4} style={{ marginTop: 8 }}>Grupos y alumnos</Title>
      <Ayuda title="Tablero de grupos (arrastra alumnos)">
        Elige un <b>servicio</b>. La primera columna <b>«Sin grupo / Bolsa»</b> contiene los <b>preinscritos</b> y los alumnos sin grupo, listos para colocar.
        <b>Arrastra un alumno</b> a un grupo (o usa el menú <b>⋯</b>) y se refleja en <b>Matrículas, Asistencia, panel del profesor y pagos</b>.
        Colores por estado: <Tag color="green">✓ Matriculado</Tag> <Tag color="gold">Preinscrito</Tag> <Tag color="orange">Lista de espera</Tag> <Tag color="blue">Pendiente</Tag>.
        Desde <b>⋯</b> puedes <b>matricular</b>, cambiar estado o <b>añadir un comentario</b> (aparece un 💬; pasa el ratón para leerlo).
        Para <b>reordenar las columnas</b>, arrastra la cabecera del grupo (icono ⠿) y suéltala sobre la posición deseada.
      </Ayuda>
      <Space wrap style={{ marginBottom: 12 }}>
        <Text>Servicio:</Text>
        <Select value={serviceId} onChange={setServiceId} style={{ width: 220 }} options={services.map((s: any) => ({ value: s.id, label: s.name }))} />
        <Button onClick={load} loading={loading}>Actualizar</Button>
      </Space>
      {kanban}
    </div>
  );
}

// ----------------------------- APOYO (franjas + lista de espera) -----------------------------
const APOYO_DEFAULT_TIMES = ['16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00'];
const APOYO_DAYS = [1, 2, 3, 4, 5];
function ApoyoBoard() {
  const q = useSearch();
  const [data, setData] = useState<any>({ assignments: [], pool: [], waitlist: [], slots: [] });
  const [newTime, setNewTime] = useState('');
  const [drag, setDrag] = useState<any>(null);
  const [overKey, setOverKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const load = async () => { setLoading(true); try { const { data } = await api.get('/apoyo/board'); setData(data); } finally { setLoading(false); } };
  useLiveQuery(['apoyo', 'enrollments'], load);
  useEffect(() => { load(); }, []);

  const times: string[] = (data.slots && data.slots.length) ? data.slots : APOYO_DEFAULT_TIMES;
  const addSlot = async () => {
    if (!/^\d{1,2}:\d{2}$/.test(newTime)) { message.warning('Formato HH:MM'); return; }
    try { await api.post('/apoyo/slots', { slotTime: newTime }); setNewTime(''); load(); } catch { message.error('Error'); }
  };
  const deleteSlot = async (t: string) => {
    try { const { data } = await api.delete(`/apoyo/slots/${encodeURIComponent(t)}`); message.success(data.assignmentsRemoved ? `Franja eliminada (${data.assignmentsRemoved} alumno/s quitado/s)` : 'Franja eliminada'); load(); }
    catch { message.error('No se pudo eliminar'); }
  };
  const cell = (day: number, t: string) => data.assignments.filter((a: any) => a.weekday === day && a.slotTime === t && matchesText(a, q));
  const pool = data.pool.filter((s: any) => matchesText(s, q));
  const waitlist = data.waitlist.filter((s: any) => matchesText(s, q));

  const dropOnCell = async (day: number, t: string) => {
    const d = drag; setDrag(null); setOverKey(null);
    if (!d) return;
    try {
      if (d.assignmentId) {
        await api.patch(`/apoyo/assignment/${d.assignmentId}`, { weekday: day, slotTime: t });
      } else {
        if (d.fromWaitlist) await api.patch(`/enrollments/${d.enrollmentId}`, { status: 'matriculado' });
        await api.post('/apoyo/assign', { enrollmentId: d.enrollmentId, weekday: day, slotTime: t });
      }
      load();
    } catch { message.error('No se pudo asignar'); }
  };
  const dropOnPool = async () => {
    const d = drag; setDrag(null); setOverKey(null);
    if (!d) return;
    try {
      if (d.assignmentId) await api.delete(`/apoyo/assignment/${d.assignmentId}`);
      else if (d.fromWaitlist) await api.patch(`/enrollments/${d.enrollmentId}`, { status: 'matriculado' });
      load();
    } catch { message.error('Error'); }
  };
  const setRoom = async (a: any) => {
    const room = window.prompt('Sala para ' + a.studentName, a.room || '');
    if (room === null) return;
    try { await api.patch(`/apoyo/assignment/${a.id}/room`, { room }); load(); } catch { message.error('Error'); }
  };
  const toWaitlist = async (enrollmentId: string) => { try { await api.patch(`/enrollments/${enrollmentId}`, { status: 'lista_espera' }); load(); } catch { message.error('Error'); } };

  const card = (label: string, dragData: any, opts: { room?: string; onRoom?: () => void; menu?: any } = {}) => (
    <div draggable onDragStart={() => setDrag(dragData)} onDragEnd={() => { setDrag(null); setOverKey(null); }}
      style={{ background: '#F5F2ED', border: '1px solid #E2DDD8', borderRadius: 6, padding: '4px 6px', fontSize: 12, marginBottom: 4, cursor: 'grab', display: 'flex', justifyContent: 'space-between', gap: 4, alignItems: 'center' }}>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}{opts.room ? <Tag style={{ marginLeft: 4 }}>{opts.room}</Tag> : null}</span>
      {opts.menu && <Dropdown menu={opts.menu} trigger={['click']}><a style={{ color: '#9B9BAB', flexShrink: 0 }} onClick={e => e.preventDefault()}>⋯</a></Dropdown>}
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <Title level={3} style={{ margin: 0 }}>Apoyo — franjas</Title>
        <Space>
          <Input placeholder="HH:MM" value={newTime} onChange={e => setNewTime(e.target.value)} style={{ width: 100 }} onPressEnter={addSlot} />
          <Button onClick={addSlot}>+ Franja</Button>
          <Button onClick={load} loading={loading}>Actualizar</Button>
        </Space>
      </div>
      <Ayuda title="Organiza el apoyo por día, hora y sala (como vuestra hoja)">
        Arrastra a los alumnos de <b>«Sin asignar»</b> o de <b>«Lista de espera»</b> a la celda del <b>día y la hora</b> que les toque.
        Puedes moverlos entre celdas, cambiar su <b>sala</b> (menú ⋯) o devolverlos a «Sin asignar» arrastrándolos de vuelta.
        Añade franjas horarias con <b>+ Franja</b>. Un alumno puede estar en <b>varias franjas</b>.
      </Ayuda>
      <Row gutter={12}>
        <Col xs={24} md={5}>
          <div onDragOver={e => { e.preventDefault(); setOverKey('pool'); }} onDrop={dropOnPool}
            style={{ border: overKey === 'pool' ? '2px dashed #579172' : '1px solid #E2DDD8', borderRadius: 10, padding: 10, marginBottom: 12, background: '#fff' }}>
            <div style={{ fontWeight: 700, fontFamily: "'Lora',serif", marginBottom: 6 }}>Sin asignar <Tag>{pool.length}</Tag></div>
            {pool.map((s: any) => card(s.studentName, { enrollmentId: s.enrollmentId }, { menu: { items: [{ key: 'w', label: 'A lista de espera' }], onClick: () => toWaitlist(s.enrollmentId) } }))}
            {pool.length === 0 && <Text type="secondary" style={{ fontSize: 12 }}>—</Text>}
          </div>
          <div style={{ border: '1px solid #f0d0a0', borderRadius: 10, padding: 10, background: '#fff7ed' }}>
            <div style={{ fontWeight: 700, fontFamily: "'Lora',serif", marginBottom: 6, color: '#b45309' }}>Lista de espera <Tag>{waitlist.length}</Tag></div>
            {waitlist.map((s: any) => card(s.studentName, { enrollmentId: s.enrollmentId, fromWaitlist: true }))}
            {waitlist.length === 0 && <Text type="secondary" style={{ fontSize: 12 }}>—</Text>}
          </div>
        </Col>
        <Col xs={24} md={19}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 640 }}>
              <thead>
                <tr>
                  <th style={{ width: 56 }}></th>
                  {APOYO_DAYS.map(d => <th key={d} style={{ padding: 6, fontSize: 13, fontFamily: "'Lora',serif", borderBottom: '2px solid #E2DDD8' }}>{['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'][d]}</th>)}
                </tr>
              </thead>
              <tbody>
                {times.map(t => (
                  <tr key={t}>
                    <td style={{ fontSize: 12, fontWeight: 600, color: '#6B6B7B', textAlign: 'right', paddingRight: 6, verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                      {t}
                      <Popconfirm title={`¿Eliminar la franja ${t}? Se quitará de todos los días.`} okText="Eliminar" cancelText="No" onConfirm={() => deleteSlot(t)}>
                        <a style={{ color: '#cf1322', marginLeft: 4, fontSize: 11 }} title="Eliminar franja">✕</a>
                      </Popconfirm>
                    </td>
                    {APOYO_DAYS.map(d => {
                      const k = `${d}-${t}`;
                      return (
                        <td key={k} onDragOver={e => { e.preventDefault(); setOverKey(k); }} onDrop={() => dropOnCell(d, t)}
                          style={{ border: '1px solid #EDE9E4', background: overKey === k ? '#EEF5FA' : '#fff', verticalAlign: 'top', padding: 4, minWidth: 110, height: 56 }}>
                          {cell(d, t).map((a: any) => card(a.studentName, { enrollmentId: a.enrollmentId, assignmentId: a.id }, {
                            room: a.room,
                            menu: { items: [{ key: 'r', label: 'Cambiar sala' }, { key: 'd', label: 'Quitar de la franja' }], onClick: ({ key }: any) => key === 'r' ? setRoom(a) : api.delete(`/apoyo/assignment/${a.id}`).then(load) },
                          }))}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Col>
      </Row>
    </div>
  );
}

// ----------------------------- REGISTRO DE TAREAS (caritas) -----------------------------
const TASK_LEVELS = ['verde', 'naranja', 'roja'];
const TASK_META: any = {
  verde: { color: '#2E7D52', label: 'Bien (alegre)' },
  naranja: { color: '#B45309', label: 'Regular (normal)' },
  roja: { color: '#C43030', label: 'Mal (triste)' },
};
// Carita SVG (no emoji): círculo de color + ojos + boca (sonrisa / recta / triste)
function Cara({ level, size = 30 }: { level: string; size?: number }) {
  const color = TASK_META[level]?.color || TASK_META.verde.color;
  const mouth = level === 'verde' ? 'M9 16 Q14 22 19 16' : level === 'naranja' ? 'M9.5 17 H18.5' : 'M9 19 Q14 13.5 19 19';
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" style={{ display: 'block' }}>
      <circle cx="14" cy="14" r="13" fill={color} />
      <circle cx="10" cy="11" r="1.9" fill="#fff" />
      <circle cx="18" cy="11" r="1.9" fill="#fff" />
      <path d={mouth} stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" />
    </svg>
  );
}
function Tareas() {
  const [groups, setGroups] = useState<any[]>([]);
  const [groupId, setGroupId] = useState<string | undefined>();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [grid, setGrid] = useState<any>({ students: [], dates: [], records: {} });
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'hoja' | 'stats'>('hoja');
  const scrollRef = useRef<HTMLDivElement>(null);
  // estadísticas
  const [from, setFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [summary, setSummary] = useState<any[]>([]);

  useEffect(() => { api.get('/catalog/groups').then(r => setGroups(r.data)); }, []);
  const load = async () => {
    if (!groupId) return;
    setLoading(true);
    try {
      const { data } = await api.get('/tareas/grid', { params: { groupId, date } });
      setGrid(data);
      const e: any = {}; data.students.forEach((r: any) => { e[r.enrollmentId] = (data.records[r.enrollmentId] || {})[date] || 'verde'; });
      setEdits(e);
      setTimeout(() => { if (scrollRef.current) scrollRef.current.scrollLeft = scrollRef.current.scrollWidth; }, 60);
    } finally { setLoading(false); }
  };
  useLiveQuery(['tareas'], load);
  useEffect(() => { if (groupId && tab === 'hoja') load(); }, [groupId, date, tab]);
  const cycle = (id: string) => setEdits(e => { const cur = e[id] || 'verde'; const next = TASK_LEVELS[(TASK_LEVELS.indexOf(cur) + 1) % 3]; return { ...e, [id]: next }; });
  const markAll = (lvl: string) => { const e: any = {}; grid.students.forEach((r: any) => e[r.enrollmentId] = lvl); setEdits(e); };
  const save = async () => {
    const records = grid.students.map((r: any) => ({ enrollmentId: r.enrollmentId, level: edits[r.enrollmentId] || 'verde' }));
    try { const { data } = await api.post('/tareas/save', { date, records }); message.success(`Guardado (${data.saved})`); load(); }
    catch { message.error('Error al guardar'); }
  };
  const deleteDay = async () => {
    try { const { data } = await api.delete('/tareas/day', { params: { groupId, date } });
      message.success(data.deleted ? `Día borrado (${data.deleted} registro/s)` : 'No había registros ese día'); load(); }
    catch { message.error('No se pudo borrar el día'); }
  };
  const loadStats = async () => {
    if (!groupId) return;
    try { const { data } = await api.get('/tareas/summary', { params: { groupId, from, to } }); setSummary(data); }
    catch { message.error('Error'); }
  };
  useEffect(() => { if (groupId && tab === 'stats') loadStats(); }, [groupId, from, to, tab]);
  const counts = grid.students.reduce((a: any, r: any) => { const l = edits[r.enrollmentId] || 'verde'; a[l] = (a[l] || 0) + 1; return a; }, {});
  const dmShort = (d: string) => d.slice(8, 10) + '/' + d.slice(5, 7);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <Title level={3} style={{ margin: 0 }}>Registro de tareas</Title>
        <Space>
          <Button type={tab === 'hoja' ? 'primary' : 'default'} onClick={() => setTab('hoja')}>Hoja del día</Button>
          <Button type={tab === 'stats' ? 'primary' : 'default'} onClick={() => setTab('stats')}>Estadísticas</Button>
        </Space>
      </div>
      <Ayuda title="Anota las tareas con una carita, rápido">
        Elige un <b>grupo</b> y el <b>día</b> (columna de la derecha, resaltada): todos salen con la carita <b style={{ color: TASK_META.verde.color }}>verde</b>;
        haz <b>clic</b> para cambiarla y pulsa <b>Guardar</b>. A la izquierda ves el <b>historial</b> de días anteriores (desliza para ver más).
      </Ayuda>
      <TaskAlerts />

      {tab === 'hoja' ? (
        <Card>
          <Space style={{ marginBottom: 12 }} wrap>
            <Text>Grupo:</Text>
            <Select showSearch optionFilterProp="label" placeholder="Elige grupo" style={{ width: 220 }} value={groupId} onChange={setGroupId}
              options={groups.map(g => ({ value: g.id, label: g.name }))} />
            <Text>Fecha:</Text>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: 160 }} />
            {groupId && <>
              <Button size="small" onClick={() => markAll('verde')}>Todas verdes</Button>
              <Button type="primary" onClick={save}>Guardar</Button>
              <Popconfirm title="¿Borrar el registro de tareas de este grupo y fecha?" description="Elimina las caritas de ese día (útil si se registró por error)." okText="Borrar" cancelText="Cancelar" okButtonProps={{ danger: true }} onConfirm={deleteDay}>
                <Button size="small" danger>Borrar día</Button>
              </Popconfirm>
            </>}
          </Space>
          {groupId && grid.students.length > 0 && (
            <Space style={{ marginBottom: 8 }} wrap>
              <Text type="secondary" style={{ fontSize: 12 }}>Día {dmShort(date)}:</Text>
              {TASK_LEVELS.map(l => <span key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Cara level={l} size={18} /> {counts[l] || 0}</span>)}
            </Space>
          )}
          {!groupId ? <Text type="secondary">Elige un grupo</Text> :
            grid.students.length === 0 ? <Text type="secondary">No hay alumnos matriculados en este grupo</Text> : (
              <div ref={scrollRef} style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={{ position: 'sticky', left: 0, zIndex: 2, background: '#F5F2ED', border: '1px solid #E2DDD8', padding: '6px 10px', textAlign: 'left', minWidth: 150 }}>Alumno</th>
                      {grid.dates.map((d: string) => (
                        <th key={d} style={{ border: '1px solid #E2DDD8', background: d === date ? '#EEF5FA' : '#F5F2ED', padding: '4px 6px', minWidth: 46, fontWeight: d === date ? 700 : 500, color: d === date ? '#2C5F8A' : '#6B6B7B' }}>{dmShort(d)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {grid.students.map((r: any) => (
                      <tr key={r.enrollmentId}>
                        <td style={{ position: 'sticky', left: 0, zIndex: 1, background: '#fff', border: '1px solid #EDE9E4', padding: '4px 10px', whiteSpace: 'nowrap' }}>{r.studentName}</td>
                        {grid.dates.map((d: string) => {
                          const isSel = d === date;
                          if (isSel) {
                            const lvl = edits[r.enrollmentId] || 'verde';
                            return <td key={d} style={{ border: '1px solid #EDE9E4', background: '#EEF5FA', textAlign: 'center', padding: 2 }}>
                              <Tooltip title={`${TASK_META[lvl].label} · clic para cambiar`}><span style={{ cursor: 'pointer', display: 'inline-block' }} onClick={() => cycle(r.enrollmentId)}><Cara level={lvl} size={26} /></span></Tooltip>
                            </td>;
                          }
                          const stored = (grid.records[r.enrollmentId] || {})[d];
                          return <td key={d} style={{ border: '1px solid #EDE9E4', textAlign: 'center', padding: 2 }}>
                            {stored ? <Tooltip title={TASK_META[stored]?.label}><span style={{ display: 'inline-block' }}><Cara level={stored} size={22} /></span></Tooltip> : <span style={{ color: '#d9d9d9' }}>·</span>}
                          </td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </Card>
      ) : (
        <Card>
          <Space style={{ marginBottom: 12 }} wrap>
            <Text>Grupo:</Text>
            <Select showSearch optionFilterProp="label" placeholder="Elige grupo" style={{ width: 220 }} value={groupId} onChange={setGroupId}
              options={groups.map(g => ({ value: g.id, label: g.name }))} />
            <Text>Desde:</Text><Input type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ width: 150 }} />
            <Text>Hasta:</Text><Input type="date" value={to} onChange={e => setTo(e.target.value)} style={{ width: 150 }} />
          </Space>
          <Table rowKey="studentName" dataSource={summary} pagination={{ pageSize: 30 }} size="small"
            locale={{ emptyText: groupId ? 'Sin registros en el periodo' : 'Elige un grupo' }}
            columns={[
              { title: 'Alumno', dataIndex: 'studentName' },
              { title: <Cara level="verde" size={20} />, dataIndex: 'verde', align: 'center' },
              { title: <Cara level="naranja" size={20} />, dataIndex: 'naranja', align: 'center' },
              { title: <Cara level="roja" size={20} />, dataIndex: 'roja', align: 'center' },
              { title: 'Total', dataIndex: 'total', align: 'center' },
              { title: '% bien', align: 'center', render: (_, r: any) => r.total > 0 ? `${Math.round((r.verde / r.total) * 100)}%` : '—' },
            ]} />
        </Card>
      )}
    </div>
  );
}

// ----------------------------- EXÁMENES (convocatorias + confirmación de asistencia) -----------------------------
const EXAM_STATUS: any = {
  sin_confirmar: { bg: '#F5F2ED', border: '#E2DDD8', label: 'Sin confirmar', order: 0 },
  asiste: { bg: '#dcefe4', border: '#7fc4a0', label: 'Asiste', order: 1 },
  no_asiste: { bg: '#ffd9d6', border: '#e09a96', label: 'No asiste', order: 2 },
};
const EXAM_CYCLE = ['sin_confirmar', 'asiste', 'no_asiste'];
function Examenes({ user }: { user?: any }) {
  const roles: string[] = user?.secretariaRoles || [];
  const canManage = roles.some(r => ['secretaria_admin', 'secretaria_staff', 'direccion'].includes(r));
  const [list, setList] = useState<any[]>([]);
  const [sel, setSel] = useState<any>(null);
  const [cands, setCands] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const [addOpen, setAddOpen] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [addStudent, setAddStudent] = useState<string | undefined>();
  const loadList = async () => { const { data } = await api.get('/examenes'); setList(data); };
  useLiveQuery(['examenes'], loadList);
  useEffect(() => { loadList(); }, []);
  const openConv = async (s: any) => { setSel(s); const { data } = await api.get(`/examenes/${s.id}/candidates`); setCands(data); };
  const reloadCands = async () => { if (sel) { const { data } = await api.get(`/examenes/${sel.id}/candidates`); setCands(data); } loadList(); };
  const create = async (v: any) => {
    try { const { data } = await api.post('/examenes', v); message.success(`Convocatoria creada (${data.candidates} candidatos del nivel)`); setOpen(false); form.resetFields(); await loadList(); openConv({ id: data.id, name: v.name, level: v.level }); }
    catch (e: any) { message.error(e?.response?.data?.message || 'Error'); }
  };
  const del = async (id: string) => { try { await api.delete(`/examenes/${id}`); message.success('Convocatoria eliminada'); if (sel?.id === id) setSel(null); loadList(); } catch { message.error('Error'); } };
  const reloadFromLevel = async () => { try { const { data } = await api.post(`/examenes/${sel.id}/reload`, {}); message.success(`${data.added} alumno(s) añadido(s)`); reloadCands(); } catch { message.error('Error'); } };
  const cycle = async (c: any) => {
    const next = EXAM_CYCLE[(EXAM_CYCLE.indexOf(c.status) + 1) % 3];
    setCands(cs => cs.map(x => x.id === c.id ? { ...x, status: next } : x));
    try { await api.patch(`/examenes/candidate/${c.id}`, { status: next }); loadList(); } catch { message.error('No se pudo marcar'); reloadCands(); }
  };
  const openAdd = async () => { setAddStudent(undefined); if (!students.length) { const { data } = await api.get('/students'); setStudents(data); } setAddOpen(true); };
  const doAdd = async () => { if (!addStudent) return; try { await api.post(`/examenes/${sel.id}/candidates`, { studentId: addStudent }); message.success('Alumno añadido'); setAddOpen(false); reloadCands(); } catch { message.error('Error'); } };
  const delCand = async (id: string) => { try { await api.delete(`/examenes/candidate/${id}`); reloadCands(); } catch { message.error('Error'); } };

  const byGroup: any = {};
  cands.forEach(c => { const k = c.groupName || '— Añadidos / otros —'; (byGroup[k] = byGroup[k] || []).push(c); });
  const asisten = cands.filter(c => c.status === 'asiste').length;
  const sinConf = cands.filter(c => c.status === 'sin_confirmar').length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <Title level={3} style={{ margin: 0 }}>Simulacros (convocatorias)</Title>
        {canManage && <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setOpen(true); }}>Nueva convocatoria</Button>}
      </div>
      <Ayuda title="Confirmación de asistencia a simulacros (plazas)">
        La administración crea la <b>convocatoria</b> (KEY, PET, FCE o CAE) y se cargan automáticamente los alumnos de los grupos de ese nivel.
        Los profesores (o la administración) marcan con un clic si cada alumno <Tag color="green">Asiste</Tag> o <Tag color="red">No asiste</Tag> (los padres lo han confirmado).
        Arriba ves de un vistazo cuántas <b>plazas</b> hacen falta. Excepcionalmente puedes <b>añadir alumnos</b> de otros niveles a mano.
      </Ayuda>
      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Card title="Convocatorias" size="small">
            <Table rowKey="id" dataSource={list} pagination={false} size="small"
              onRow={(r) => ({ onClick: () => openConv(r), style: { cursor: 'pointer', background: sel?.id === r.id ? '#EEF5FA' : undefined } })}
              columns={[
                { title: 'Convocatoria', render: (_, r) => <span><Tag color="geekblue">{r.level}</Tag>{r.name}<div style={{ fontSize: 11, color: '#9B9BAB' }}>{r.examDate ? fmtDate(r.examDate) : 'sin fecha'}</div></span> },
                { title: 'Asisten', render: (_, r) => <Tag color="green">{r.asisten}/{r.total}</Tag> },
                ...(canManage ? [{ title: '', render: (_: any, r: any) => <Popconfirm title="¿Eliminar convocatoria?" onConfirm={(e) => { (e as any)?.stopPropagation?.(); del(r.id); }}><Button size="small" danger onClick={e => e.stopPropagation()}>Quitar</Button></Popconfirm> }] : []),
              ]} />
          </Card>
        </Col>
        <Col xs={24} md={16}>
          <Card size="small" title={sel ? `${sel.level ? `[${sel.level}] ` : ''}${sel.name}` : 'Selecciona una convocatoria'}
            extra={sel && canManage && <Space><Button size="small" onClick={reloadFromLevel}>Recargar alumnos del nivel</Button><Button size="small" icon={<PlusOutlined />} onClick={openAdd}>Añadir alumno</Button></Space>}>
            {!sel ? <Text type="secondary">Pulsa una convocatoria para ver y confirmar sus candidatos.</Text> : (<>
              <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
                <Col xs={8}><Card size="small"><Statistic title="Plazas (asisten)" value={asisten} valueStyle={{ color: '#2E7D52' }} /></Card></Col>
                <Col xs={8}><Card size="small"><Statistic title="Inscritos" value={cands.length} /></Card></Col>
                <Col xs={8}><Card size="small"><Statistic title="Sin confirmar" value={sinConf} valueStyle={{ color: sinConf ? '#B45309' : undefined }} /></Card></Col>
              </Row>
              <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, alignItems: 'flex-start' }}>
                {Object.keys(byGroup).sort().map(gn => (
                  <div key={gn} style={{ minWidth: 200, maxWidth: 200, flexShrink: 0, border: '1px solid #E2DDD8', borderRadius: 10, padding: 10, background: '#fff' }}>
                    <div style={{ fontWeight: 700, fontFamily: "'Lora',serif", fontSize: 14, marginBottom: 6 }}>{gn} <Tag>{byGroup[gn].length}</Tag></div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {byGroup[gn].map((c: any) => {
                        const m = EXAM_STATUS[c.status];
                        return (
                          <div key={c.id} onClick={() => cycle(c)} title={`${m.label} · clic para cambiar`}
                            style={{ background: m.bg, border: `1px solid ${m.border}`, borderRadius: 6, padding: '5px 8px', fontSize: 13, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', gap: 6, alignItems: 'center' }}>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {c.status === 'asiste' ? '✓ ' : c.status === 'no_asiste' ? '✗ ' : ''}{c.studentName}{c.addedManually ? ' ✱' : ''}
                            </span>
                            {canManage && <Popconfirm title="¿Quitar de la convocatoria?" onConfirm={(e) => { (e as any)?.stopPropagation?.(); delCand(c.id); }}><a style={{ color: '#9B9BAB', flexShrink: 0 }} onClick={e => { e.stopPropagation(); e.preventDefault(); }}>×</a></Popconfirm>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {cands.length === 0 && <Text type="secondary">No hay candidatos. Usa «Recargar alumnos del nivel» o añade a mano.</Text>}
              </div>
            </>)}
          </Card>
        </Col>
      </Row>

      <Modal title="Nueva convocatoria de simulacro" open={open} onCancel={() => setOpen(false)} onOk={() => form.submit()} okText="Crear">
        <Alert type="info" showIcon style={{ marginBottom: 12 }} message="Al crearla se cargan automáticamente los alumnos de los grupos de ese nivel." />
        <Form form={form} layout="vertical" onFinish={create}>
          <Form.Item name="level" label="Nivel del examen" rules={[{ required: true }]}>
            <Select options={['KEY', 'PET', 'FCE', 'CAE'].map(l => ({ value: l, label: l }))} />
          </Form.Item>
          <Form.Item name="name" label="Nombre de la convocatoria" rules={[{ required: true }]}><Input placeholder="Ej.: PET junio 2026" /></Form.Item>
          <Form.Item name="examDate" label="Fecha del examen"><Input type="date" /></Form.Item>
        </Form>
      </Modal>

      <Modal title="Añadir alumno a la convocatoria" open={addOpen} onCancel={() => setAddOpen(false)} onOk={doAdd} okText="Añadir" okButtonProps={{ disabled: !addStudent }}>
        <Alert type="info" showIcon style={{ marginBottom: 12 }} message="Para casos excepcionales: añade cualquier alumno aunque no sea de ese nivel/grupo." />
        <Select showSearch optionFilterProp="label" style={{ width: '100%' }} placeholder="Busca el alumno" value={addStudent} onChange={setAddStudent}
          options={students.map((s: any) => ({ value: s.id, label: `${s.firstName || ''} ${s.lastName || ''}`.trim() || '(sin nombre)' }))} />
      </Modal>
    </div>
  );
}

// ----------------------------- HISTORIAL (panel lateral) -----------------------------
const HIST_ACTION: any = {
  INSERT: { color: 'green', label: 'Creado' },
  UPDATE: { color: 'blue', label: 'Modificado' },
  DELETE: { color: 'red', label: 'Eliminado' },
};
const HIST_STATUS_COLOR: any = { matriculado: 'green', preinscrito: 'gold', lista_espera: 'orange', pendiente: 'blue', baja: 'red' };
function HistoryDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const load = async () => { setLoading(true); try { const { data } = await api.get('/history'); setRows(data); } catch { message.error('No se pudo cargar el historial'); } finally { setLoading(false); } };
  useEffect(() => { if (open) load(); }, [open]);
  const revert = async (id: string) => {
    try { await api.post(`/history/${id}/revert`); message.success('Cambio revertido'); load(); }
    catch (e: any) { message.error(e?.response?.data?.message || 'No se pudo revertir'); }
  };
  const val = (v: string) => HIST_STATUS_COLOR[v] ? <Tag color={HIST_STATUS_COLOR[v]} style={{ margin: 0 }}>{v}</Tag> : <b>{v}</b>;
  return (
    <Drawer title={<span><HistoryOutlined /> Historial de cambios</span>} placement="right" width={440} open={open} onClose={onClose}
      extra={<Button size="small" onClick={load} loading={loading}>Actualizar</Button>}>
      <Alert type="info" showIcon style={{ marginBottom: 12 }}
        message="Todo cambio queda registrado"
        description="Pulsa «Revertir» para deshacer un cambio (con confirmación). La reversión también se registra, así que puedes revertirla (rehacer) sin perder nada." />
      {rows.length === 0 && !loading && <Empty description="Sin cambios registrados" />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map((r) => {
          const a = HIST_ACTION[r.action] || { color: 'default', label: r.action };
          return (
            <div key={r.id} style={{ border: '1px solid #EDE9E4', borderLeft: `3px solid var(--mw-border)`, borderRadius: 8, padding: '8px 10px', background: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                <span><Tag color={a.color} style={{ margin: 0 }}>{a.label}</Tag> <b style={{ fontSize: 12 }}>{r.tableLabel}</b></span>
                <Popconfirm title="¿Revertir este cambio?" okText="Revertir" cancelText="No" onConfirm={() => revert(r.id)}>
                  <Button size="small">Revertir</Button>
                </Popconfirm>
              </div>
              <div style={{ fontSize: 13, marginTop: 2 }}>{r.entity}</div>
              {r.changes?.length > 0 && (
                <div style={{ fontSize: 12, color: '#6B6B7B', marginTop: 4 }}>
                  {r.changes.map((c: any, i: number) => (
                    <div key={i}>{c.field}: <span style={{ textDecoration: 'line-through', opacity: 0.7 }}>{val(c.from)}</span> → {val(c.to)}</div>
                  ))}
                </div>
              )}
              <div style={{ fontSize: 11, color: '#9B9BAB', marginTop: 4 }}>{new Date(r.at).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          );
        })}
      </div>
    </Drawer>
  );
}

// ----------------------------- APP -----------------------------
export default function App() {
  const [user, setUser] = useState<any>(null);
  const [view, setView] = useState('organizacion');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [search, setSearch] = useState('');   // buscador único global (cabecera)
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.lg;
  const { present: globalPresent } = useRoomPresence('global');
  useEffect(() => {
    if (getToken()) api.get('/auth/me').then(r => setUser(r.data)).catch(() => clearToken()).finally(() => setReady(true));
    else setReady(true);
  }, []);
  if (!ready) return null;
  if (!user) return <Login onLogin={setUser} />;
  const logout = () => { clearToken(); setUser(null); };

  // Control de acceso por rol: el menú y las vistas se filtran según el rol.
  const roles: string[] = user.secretariaRoles || [];
  const isAdmin = roles.includes('secretaria_admin');
  const TEACHER_VIEWS = ['dashboard', 'chat', 'asistencia', 'tareas', 'examenes', 'horarios', 'nivel', 'reuniones', 'cuaderno']; // docente
  // Etiquetas/iconos de cada vista. Los datos "de configurar una vez" (grupos, programas,
  // tarifas, profesores, importar, equipo, curso) NO están en el menú: viven en pestañas
  // dentro de "Configuración".
  const LABELS: Record<string, { icon: any; label: string }> = {
    dashboard: { icon: <DashboardOutlined />, label: 'Estadísticas' },
    organizacion: { icon: <AppstoreOutlined />, label: 'Organización' },
    eventos: { icon: <CalendarOutlined />, label: 'Calendario y eventos' },
    alumnos: { icon: <TeamOutlined />, label: 'Alumnos' },
    matriculas: { icon: <UserAddOutlined />, label: 'Matrículas' },
    familias: { icon: <TeamOutlined />, label: 'Familias' },
    bajas: { icon: <WarningOutlined />, label: 'Bajas' },
    nivel: { icon: <UserAddOutlined />, label: 'Pruebas de nivel' },
    documentacion: { icon: <QuestionCircleOutlined />, label: 'Documentación' },
    pagos: { icon: <EuroOutlined />, label: 'Pagos' },
    morosidad: { icon: <WarningOutlined />, label: 'Morosidad' },
    remesas: { icon: <EuroOutlined />, label: 'Remesas SEPA' },
    rifas: { icon: <EuroOutlined />, label: 'Rifas' },
    taper: { icon: <EuroOutlined />, label: 'Táper' },
    informes: { icon: <DashboardOutlined />, label: 'Informes' },
    asistencia: { icon: <TeamOutlined />, label: 'Asistencia' },
    tareas: { icon: <FormOutlined />, label: 'Registro de tareas' },
    cuaderno: { icon: <FormOutlined />, label: 'Cuaderno docente' },
    horarios: { icon: <DashboardOutlined />, label: 'Horarios' },
    apoyo: { icon: <AppstoreOutlined />, label: 'Apoyo (franjas)' },
    examenes: { icon: <FormOutlined />, label: 'Simulacros' },
    mock: { icon: <DashboardOutlined />, label: 'Resultados Mock' },
    reuniones: { icon: <FormOutlined />, label: 'Reuniones' },
    chat: { icon: <TeamOutlined />, label: 'Grupos de chat' },
    config: { icon: <SettingOutlined />, label: 'Configuración' },
  };
  const GROUPS = [
    { key: 'g_resumen', icon: <DashboardOutlined />, label: 'Resumen', children: ['dashboard', 'organizacion', 'apoyo', 'eventos'] },
    { key: 'g_alumnado', icon: <TeamOutlined />, label: 'Alumnado', children: ['alumnos', 'matriculas', 'familias', 'bajas', 'nivel', 'documentacion'] },
    { key: 'g_economico', icon: <EuroOutlined />, label: 'Económico', children: ['pagos', 'morosidad', 'remesas', 'rifas', 'taper', 'informes'] },
    { key: 'g_docencia', icon: <FormOutlined />, label: 'Docencia', children: ['asistencia', 'tareas', 'cuaderno', 'horarios', 'examenes', 'mock', 'reuniones', 'chat'] },
  ];
  const ALL_KEYS = [...GROUPS.flatMap(g => g.children), 'config'];
  // ¿Es solo profesor (sin rol de gestión)? → menú docente reducido
  const isOnlyTeacher = roles.includes('secretaria_teacher')
    && !roles.some(r => ['secretaria_admin', 'secretaria_staff', 'direccion'].includes(r));
  // Configuración: admin/staff/dirección (las pestañas internas sensibles se limitan a admin). Profesor: no.
  const allowedKeys = new Set<string>(
    isOnlyTeacher ? TEACHER_VIEWS : ALL_KEYS
  );
  const safeView = allowedKeys.has(view) ? view : 'dashboard';
  const groupItems = GROUPS.map(g => {
    const children = g.children.filter(k => allowedKeys.has(k)).map(k => ({ key: k, icon: LABELS[k].icon, label: LABELS[k].label }));
    return children.length ? { key: g.key, icon: g.icon, label: g.label, children } : null;
  }).filter(Boolean) as any[];
  const items = [...groupItems];
  if (allowedKeys.has('config')) items.push({ key: 'config', icon: LABELS.config.icon, label: LABELS.config.label });
  const openGroup = GROUPS.find(g => g.children.includes(safeView))?.key;
  const brand = (
    <div style={{ padding: '16px 16px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
      <img src="/logo.svg" alt="" style={{ width: 30, height: 30, objectFit: 'contain' }} />
      <span style={{ fontWeight: 700, fontSize: 17, fontFamily: "'Lora', Georgia, serif", color: '#1E1E30' }}>Secretaría</span>
    </div>
  );
  const navMenu = <Menu mode="inline" selectedKeys={[safeView]} defaultOpenKeys={openGroup ? [openGroup] : []} items={items} onClick={(e) => { setView(e.key); setNavOpen(false); }} />;
  return (
   <SearchContext.Provider value={search}>
    <Layout style={{ minHeight: '100vh' }}>
      {!isMobile && (
        <Sider theme="light" style={{ borderRight: '1px solid #eee' }}>
          {brand}
          {navMenu}
        </Sider>
      )}
      <Drawer open={isMobile && navOpen} onClose={() => setNavOpen(false)} placement="left" width={260} styles={{ body: { padding: 0 } }} title="Menú">
        {navMenu}
      </Drawer>
      <Layout>
        <Header style={{ background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', padding: '0 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
            {isMobile && <Button icon={<MenuOutlined />} onClick={() => setNavOpen(true)} />}
            {isMobile && <span style={{ fontWeight: 700, fontSize: 16, fontFamily: "'Lora', Georgia, serif", color: '#1E1E30' }}>Secretaría</span>}
            <Input
              allowClear
              prefix={<SearchOutlined style={{ color: '#9B9BAB' }} />}
              placeholder="Buscar en todos los listados (alumno, familia, tutor…)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ maxWidth: 380, width: '100%' }}
            />
          </div>
          <Space>
            {!isOnlyTeacher && <Tooltip title="Historial de cambios"><Button icon={<HistoryOutlined />} onClick={() => setHistoryOpen(true)} /></Tooltip>}
            {screens.md && <Text type="secondary">{user.email}</Text>}
            <PresenceBar present={globalPresent} />
            <Button icon={<LogoutOutlined />} onClick={logout}>{screens.sm ? 'Salir' : ''}</Button>
          </Space>
        </Header>
        {isImpersonating() && (
          <div style={{ background: '#612500', color: '#fff', padding: '6px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <span>🔒 <b>Acceso interno</b>: estás viendo la plataforma como <b>{user.name || user.email}</b>{(user.secretariaRoles || []).includes('secretaria_teacher') ? ' (profesor/a)' : ''}.</span>
            <Button size="small" onClick={() => { endImpersonation(); window.location.reload(); }}>Volver a administración</Button>
          </div>
        )}
        <Content style={{ padding: isMobile ? '12px 8px' : 20, background: '#FAFAF8' }}>
          {safeView === 'organizacion' && <Organizacion />}
          {safeView === 'dashboard' && <Dashboard user={user} />}
          {safeView === 'alumnos' && <Alumnos user={user} />}
          {safeView === 'bajas' && <Bajas user={user} />}
          {safeView === 'matriculas' && <Matriculas user={user} />}
          {safeView === 'pagos' && <Pagos />}
          {safeView === 'morosidad' && <Morosidad />}
          {safeView === 'remesas' && <Remesas />}
          {safeView === 'documentacion' && <Documentacion />}
          {safeView === 'grupos' && <Grupos user={user} />}
          {safeView === 'apoyo' && <ApoyoBoard />}
          {safeView === 'profesores' && <Profesores />}
          {safeView === 'asistencia' && <Asistencia user={user} />}
          {safeView === 'tareas' && <Tareas />}
          {safeView === 'examenes' && <Examenes user={user} />}
          {safeView === 'mock' && <MockResultados />}
          {safeView === 'chat' && <Chat me={user} />}
          {safeView === 'horarios' && <Horarios user={user} />}
          {safeView === 'nivel' && <PruebasNivel />}
          {safeView === 'taper' && <Taper />}
          {safeView === 'rifas' && <Rifas />}
          {safeView === 'informes' && <Informes />}
          {safeView === 'programas' && <Programas />}
          {safeView === 'familias' && <Familias />}
          {safeView === 'tarifas' && <Tarifas />}
          {safeView === 'importar' && <Importador />}
          {safeView === 'eventos' && <Eventos />}
          {safeView === 'reuniones' && <Reuniones user={user} />}
          {safeView === 'cuaderno' && <Cuaderno user={user} />}
          {safeView === 'equipo' && <Equipo />}
          {safeView === 'config' && <Configuracion user={user} />}
        </Content>
      </Layout>
      <HistoryDrawer open={historyOpen} onClose={() => setHistoryOpen(false)} />
    </Layout>
   </SearchContext.Provider>
  );
}
