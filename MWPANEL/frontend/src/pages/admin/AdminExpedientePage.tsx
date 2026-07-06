import React, { useEffect, useState } from 'react'
import { Typography, Spin, message } from 'antd'
import { FileTextOutlined } from '@ant-design/icons'
import apiClient from '@services/apiClient'
import AdminPerformanceSection from '@/components/academic-records/AdminPerformanceSection'

const { Title, Paragraph } = Typography

interface StudentLite {
  id: string
  user?: { profile?: { firstName?: string; lastName?: string } }
}

/**
 * Sección dedicada del Expediente académico (SP-3).
 * Selector de alumno → expediente completo (calificaciones por trimestre,
 * conversión LOMLOE, asistencia y descarga de boletín) vía ExpedienteViewer.
 */
const AdminExpedientePage: React.FC = () => {
  const [students, setStudents] = useState<StudentLite[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await apiClient.get('/students')
        if (!cancelled) setStudents(res.data || [])
      } catch {
        if (!cancelled) message.error('No se pudieron cargar los alumnos')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>
        <FileTextOutlined /> Expediente académico
      </Title>
      <Paragraph type="secondary">
        Consulta el expediente académico de cualquier alumno: calificaciones por trimestre,
        conversión al sistema LOMLOE, asistencia y descarga del boletín.
      </Paragraph>
      {loading ? <Spin /> : <AdminPerformanceSection students={students} />}
    </div>
  )
}

export default AdminExpedientePage
