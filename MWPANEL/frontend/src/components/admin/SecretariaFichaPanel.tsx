import React, { useEffect, useState } from 'react'
import { Row, Col, Tag, Spin, Alert, Button, Typography, Card } from 'antd'
import apiClient from '@services/apiClient'

const { Text } = Typography

interface EnrollmentRow {
  academicYear: string | null; service: string | null; group: string | null;
  status: string; apoyoLevel: string | null; customFee: number | null; enrolledAt: string | null;
}
interface Ficha {
  student: {
    firstName: string; lastName: string; birthDate: string | null;
    birthPlace: string | null; email: string | null; phone: string | null; interests: string | null;
    schoolOrigin: string | null; gradeLabel: string | null;
    address: string | null; postalCode: string | null; city: string | null;
    photoConsent: boolean; exitConsent: boolean; notes: string | null;
    isActive: boolean; importPending: boolean; importPendingFields: string | null;
  };
  medical: string | null;
  family: { displayName: string | null; siblings: string | null; notes: string | null };
  guardians: Array<{ fullName: string; relationship: string | null; nif: string | null; phone: string | null; phoneAlt: string | null; email: string | null; profession: string | null; isPrimaryContact: boolean }>;
  enrollments: { active: EnrollmentRow[]; history: EnrollmentRow[] };
}

const dash = (v: string | null | undefined) => (v && String(v).trim() ? v : '—')
const yesNo = (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Sí' : 'No'}</Tag>

const EnrollmentBlock: React.FC<{ e: EnrollmentRow }> = ({ e }) => (
  <div className="mb-2 p-2 border rounded">
    <Text strong>{dash(e.academicYear)}</Text> · {dash(e.service)} · {dash(e.group)}{' '}
    <Tag color="blue">{e.status}</Tag>
    {e.apoyoLevel ? <Tag>{e.apoyoLevel}</Tag> : null}
    {e.customFee != null ? <Text type="secondary"> · cuota {e.customFee}€</Text> : null}
  </div>
)

const SecretariaFichaPanel: React.FC<{ studentId: string }> = ({ studentId }) => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [ficha, setFicha] = useState<Ficha | null>(null)
  const [showHistory, setShowHistory] = useState(false)

  const load = async () => {
    setLoading(true); setError(false); setFicha(null)
    try {
      const res = await apiClient.get(`/students/${studentId}/secretaria-ficha`)
      // 204 → sin ficha (axios: status 204, data vacío)
      setFicha(res.status === 204 || !res.data ? null : res.data)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [studentId])

  if (loading) return <Spin />
  if (error) return <Alert type="error" showIcon message="No se pudo cargar la ficha" action={<Button size="small" onClick={load}>Reintentar</Button>} />
  if (!ficha) return <Text type="secondary">Sin ficha en Secretaría</Text>

  const st = ficha.student
  return (
    <div className="space-y-4">
      <Row gutter={[16, 16]}>
        <Col span={12}><Text type="secondary">Dirección</Text><div className="font-medium">{dash(st.address)}</div></Col>
        <Col span={6}><Text type="secondary">CP</Text><div className="font-medium">{dash(st.postalCode)}</div></Col>
        <Col span={6}><Text type="secondary">Ciudad</Text><div className="font-medium">{dash(st.city)}</div></Col>
        <Col span={12}><Text type="secondary">Lugar de nacimiento</Text><div className="font-medium">{dash(st.birthPlace)}</div></Col>
        <Col span={12}><Text type="secondary">Contacto alumno</Text><div className="font-medium">{[st.email, st.phone].filter(Boolean).join(' · ') || '—'}</div></Col>
        <Col span={12}><Text type="secondary">Origen escolar</Text><div className="font-medium">{dash(st.schoolOrigin)}</div></Col>
        <Col span={12}><Text type="secondary">Curso</Text><div className="font-medium">{dash(st.gradeLabel)}</div></Col>
        <Col span={12}><Text type="secondary">Hermanos/as</Text><div className="font-medium">{dash(ficha.family?.siblings)}</div></Col>
        {st.interests && <Col span={24}><Text type="secondary">Intereses / aficiones</Text><div className="font-medium" style={{ whiteSpace: 'pre-line' }}>{st.interests}</div></Col>}
        <Col span={24}><Text type="secondary">Notas</Text><div className="font-medium">{dash(st.notes)}</div></Col>
        <Col span={12}><Text type="secondary">Consentimiento foto</Text><div>{yesNo(st.photoConsent)}</div></Col>
        <Col span={12}><Text type="secondary">Consentimiento salida</Text><div>{yesNo(st.exitConsent)}</div></Col>
      </Row>

      {st.importPending && (
        <Alert type="warning" showIcon message={`Ficha incompleta: ${dash(st.importPendingFields)}`} />
      )}

      <Card size="small" title="Información médica" styles={{ header: { background: '#fff7e6' } }}>
        {ficha.medical ? <Text>{ficha.medical}</Text> : <Text type="secondary">Sin notas médicas</Text>}
      </Card>

      <div>
        <Text strong>Tutores</Text>
        {ficha.guardians.length === 0 ? <div><Text type="secondary">Sin tutores</Text></div> : ficha.guardians.map((g, i) => (
          <div key={i} className="mt-2 p-2 border rounded">
            <Text strong>{dash(g.fullName)}</Text> {g.isPrimaryContact && <Tag color="gold">Contacto principal</Tag>}
            <div><Text type="secondary">{dash(g.relationship)} · NIF {dash(g.nif)}{g.profession ? ` · ${g.profession}` : ''}</Text></div>
            <div><Text type="secondary">Tel {dash(g.phone)}{g.phoneAlt ? ` / ${g.phoneAlt}` : ''} · {dash(g.email)}</Text></div>
          </div>
        ))}
      </div>

      <div>
        <Text strong>Matrícula</Text>
        {ficha.enrollments.active.length === 0 ? <div><Text type="secondary">Sin matrícula activa</Text></div>
          : ficha.enrollments.active.map((e, i) => <EnrollmentBlock key={i} e={e} />)}
        {ficha.enrollments.history.length > 0 && (
          <>
            <Button type="link" size="small" onClick={() => setShowHistory(v => !v)}>
              {showHistory ? 'Ocultar' : `Ver matrículas anteriores (${ficha.enrollments.history.length})`}
            </Button>
            {showHistory && ficha.enrollments.history.map((e, i) => <EnrollmentBlock key={`h${i}`} e={e} />)}
          </>
        )}
      </div>

      <div className="pt-2 border-t">
        <Text type="secondary">Estos datos se gestionan en Secretaría. </Text>
        <a href="https://secretaria.mundoworld.school" target="_blank" rel="noopener noreferrer">Abrir en Secretaría</a>
      </div>
    </div>
  )
}

export default SecretariaFichaPanel
