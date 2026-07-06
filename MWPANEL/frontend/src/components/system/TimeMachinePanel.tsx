import React, { useState, useEffect } from 'react'
import { Card, Row, Col, Button, Table, Progress, Statistic, Alert, Space, Tag, Typography, Modal, notification, Tooltip } from 'antd'
import { 
  DatabaseOutlined, 
  CloudDownloadOutlined, 
  PlayCircleOutlined, 
  CheckCircleOutlined, 
  ExclamationCircleOutlined,
  SettingOutlined,
  HistoryOutlined,
  SafetyOutlined,
  ReloadOutlined,
  FileTextOutlined
} from '@ant-design/icons'
import apiClient from '@/services/apiClient'

const { Title, Text, Paragraph } = Typography

interface BackupItem {
  type: string
  timestamp: string
  size: string
  age: string
  path: string
  date: string
}

interface BackupStats {
  hourly: { count: number; retention: number; size: number }
  daily: { count: number; retention: number; size: number }
  weekly: { count: number; retention: number; size: number }
  monthly: { count: number; retention: number; size: number }
  total: { count: number; size: number }
}

interface BackupStatus {
  containerStatus: string
  databaseStatus: string
  diskSpace: {
    available: string
    used: string
  }
  cronJobs: {
    enabled: boolean
    count: number
  }
  backupStats: BackupStats
  latestBackup: {
    type: string
    timestamp: string
    age: string
    path: string
  } | null
  timestamp: string
}

interface BackupListResponse {
  success: boolean
  backups: BackupItem[]
  stats: {
    total: number
    byType: Array<{
      type: string
      count: number
      totalSize: number
      latest: string | null
      oldest: string | null
    }>
    totalSizeMB: number
  }
  timestamp: string
}

const TimeMachinePanel: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<BackupStatus | null>(null)
  const [backups, setBackups] = useState<BackupListResponse | null>(null)
  const [createLoading, setCreateLoading] = useState(false)
  const [cronLogs, setCronLogs] = useState<string[]>([])
  const [showLogs, setShowLogs] = useState(false)

  const loadStatus = async () => {
    try {
      setLoading(true)
      const response = await apiClient.get('/settings/time-machine/status')
      console.log('🔍 Time Machine status response:', response.data)
      // Handle both response formats: direct data or wrapped in success/data
      const statusData = response.data?.data || response.data
      setStatus(statusData)
    } catch (error) {
      console.error('Error loading Time Machine status:', error)
      notification.error({
        message: 'Error',
        description: 'No se pudo cargar el estado del sistema Time Machine'
      })
    } finally {
      setLoading(false)
    }
  }

  const loadBackups = async () => {
    try {
      const response = await apiClient.get('/settings/time-machine/backups')
      console.log('🔍 Time Machine backups response:', response.data)
      // Handle both response formats: direct data or wrapped in success/data
      const backupsData = response.data?.data?.backups || response.data?.backups || response.data || []
      setBackups(backupsData)
    } catch (error) {
      console.error('Error loading backups:', error)
      notification.error({
        message: 'Error',
        description: 'No se pudieron cargar las copias de seguridad'
      })
    }
  }

  const loadCronLogs = async () => {
    try {
      // TODO: Implement cron-logs endpoint in backend
      // const response = await apiClient.get('/settings/time-machine/cron-logs')
      // setCronLogs(response.data.logs || [])
      setCronLogs(['Cron logs endpoint not implemented yet'])
    } catch (error) {
      console.error('Error loading cron logs:', error)
      setCronLogs(['Error loading cron logs'])
    }
  }

  const createManualBackup = async (type: 'hourly' | 'daily' | 'weekly' | 'monthly') => {
    try {
      setCreateLoading(true)
      const response = await apiClient.post(`/settings/time-machine/backup/${type}`)
      
      notification.success({
        message: 'Backup Creado',
        description: `Backup ${type} creado exitosamente: ${response.data.backup?.size || 'N/A'}`
      })

      // Reload data
      await loadStatus()
      await loadBackups()
    } catch (error) {
      console.error('Error creating backup:', error)
      notification.error({
        message: 'Error',
        description: `No se pudo crear el backup ${type}`
      })
    } finally {
      setCreateLoading(false)
    }
  }

  const verifyBackup = async (backupPath?: string) => {
    try {
      // TODO: Implement verify endpoint in backend
      // const response = await apiClient.post('/settings/time-machine/verify', 
      //   backupPath ? { backupPath } : {}
      // )
      
      notification.info({
        message: 'Función no disponible',
        description: 'La verificación de backups se implementará en una próxima versión'
      })
    } catch (error) {
      console.error('Error verifying backup:', error)
      notification.error({
        message: 'Error de Verificación',
        description: 'No se pudieron verificar los backups'
      })
    }
  }

  useEffect(() => {
    loadStatus()
    loadBackups()
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
      case 'available':
        return '#52c41a'
      case 'degraded':
        return '#faad14'
      default:
        return '#ff4d4f'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
      case 'available':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />
      case 'degraded':
        return <ExclamationCircleOutlined style={{ color: '#faad14' }} />
      default:
        return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 MB'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const backupColumns = [
    {
      title: 'Tipo',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const colors = {
          hourly: 'blue',
          daily: 'green', 
          weekly: 'orange',
          monthly: 'purple'
        }
        return <Tag color={colors[type as keyof typeof colors]}>{type.toUpperCase()}</Tag>
      }
    },
    {
      title: 'Timestamp',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (timestamp: string) => (
        <Text code>{timestamp}</Text>
      )
    },
    {
      title: 'Tamaño',
      dataIndex: 'size',
      key: 'size'
    },
    {
      title: 'Antigüedad',
      dataIndex: 'age',
      key: 'age'
    },
    {
      title: 'Fecha',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => new Date(date).toLocaleString('es-ES')
    }
  ]

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <Card loading>
          <Title level={2}>
            <DatabaseOutlined /> Time Machine - Sistema de Backups
          </Title>
        </Card>
      </div>
    )
  }

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>
        <DatabaseOutlined /> Time Machine - Sistema de Backups
      </Title>
      
      <Paragraph>
        Sistema avanzado de copias de seguridad automáticas con rotación estilo Time Machine.
        Mantiene 7 copias de cada tipo: hourly, daily, weekly, monthly.
      </Paragraph>

      {/* Status Overview */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Estado del Contenedor"
              value={status?.containerStatus || 'unknown'}
              prefix={getStatusIcon(status?.containerStatus || 'unknown')}
              valueStyle={{ color: getStatusColor(status?.containerStatus || 'unknown') }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Base de Datos"
              value={status?.databaseStatus || 'unknown'}
              prefix={getStatusIcon(status?.databaseStatus || 'unknown')}
              valueStyle={{ color: getStatusColor(status?.databaseStatus || 'unknown') }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Espacio Disponible"
              value={status?.diskSpace?.available || 'N/A'}
              prefix={<DatabaseOutlined />}
            />
            <Text type="secondary">Usado: {status?.diskSpace?.used || 'N/A'}</Text>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Trabajos Cron"
              value={status?.cronJobs?.count || 0}
              prefix={status?.cronJobs?.enabled ? 
                <CheckCircleOutlined style={{ color: '#52c41a' }} /> : 
                <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
              }
              suffix="activos"
            />
          </Card>
        </Col>
      </Row>

      {/* Latest Backup Info */}
      {status?.latestBackup && (
        <Alert
          message={`Último Backup: ${status.latestBackup?.type?.toUpperCase() || 'N/A'}`}
          description={`Creado ${status.latestBackup?.age || 'N/A'} - ${status.latestBackup?.timestamp ? new Date(status.latestBackup.timestamp).toLocaleString('es-ES') : 'N/A'}`}
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      {/* Backup Statistics */}
      <Card title="Estadísticas de Backups" style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]}>
          {Object.entries(status?.backupStats || {}).map(([key, value]) => {
            if (key === 'total') {
              return (
                <Col span={6} key={key}>
                  <Card size="small">
                    <Statistic
                      title="Total"
                      value={value.count}
                      suffix={`backups (${formatBytes(value.size * 1024 * 1024)})`}
                      prefix={<DatabaseOutlined />}
                    />
                  </Card>
                </Col>
              )
            }
            
            const backupType = value as { count: number; retention: number; size: number }
            const percentage = (backupType.count / backupType.retention) * 100
            
            return (
              <Col span={6} key={key}>
                <Card size="small">
                  <Statistic
                    title={key.toUpperCase()}
                    value={backupType.count}
                    suffix={`/ ${backupType.retention}`}
                  />
                  <Progress 
                    percent={percentage} 
                    size="small" 
                    status={percentage >= 90 ? 'active' : 'normal'}
                  />
                  <Text type="secondary">{formatBytes(backupType.size * 1024 * 1024)}</Text>
                </Card>
              </Col>
            )
          })}
        </Row>
      </Card>

      {/* Manual Backup Controls */}
      <Card title="Controles Manuales" style={{ marginBottom: 24 }}>
        <Space size="middle">
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            loading={createLoading}
            onClick={() => createManualBackup('hourly')}
          >
            Backup Manual (Hourly)
          </Button>
          <Button
            icon={<SafetyOutlined />}
            onClick={() => verifyBackup()}
          >
            Verificar Backups
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              loadStatus()
              loadBackups()
            }}
          >
            Actualizar
          </Button>
          <Button
            icon={<FileTextOutlined />}
            onClick={() => {
              loadCronLogs()
              setShowLogs(true)
            }}
          >
            Ver Logs Cron
          </Button>
        </Space>
      </Card>

      {/* Backups Table */}
      <Card title="Historial de Backups">
        <Table
          dataSource={backups?.backups || []}
          columns={backupColumns}
          rowKey="path"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `Total ${total} backups`
          }}
          scroll={{ x: 'max-content' }}
        />
      </Card>

      {/* Cron Logs Modal */}
      <Modal
        title="Logs del Sistema Cron"
        open={showLogs}
        onCancel={() => setShowLogs(false)}
        footer={[
          <Button key="close" onClick={() => setShowLogs(false)}>
            Cerrar
          </Button>
        ]}
        width={800}
      >
        <div style={{ 
          backgroundColor: '#000', 
          color: '#00ff00', 
          padding: 16, 
          borderRadius: 4,
          fontFamily: 'monospace',
          fontSize: '12px',
          maxHeight: 400,
          overflow: 'auto'
        }}>
          {cronLogs.map((log, index) => (
            <div key={index}>{log}</div>
          ))}
        </div>
      </Modal>
    </div>
  )
}

export default TimeMachinePanel