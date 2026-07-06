/**
 * @archivo: ImpersonationBanner.tsx
 * @módulo: Common Components
 * @función: Banner que aparece cuando un admin está viendo el panel de otro usuario
 * @crítico: SÍ - Permite volver al panel de administración sin cerrar sesión
 */

import React from 'react'
import { Button, Space, Typography } from 'antd'
import { ArrowLeftOutlined, UserSwitchOutlined, CloseOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/store/authStore'
import { useNavigate } from 'react-router-dom'

const { Text } = Typography

const ImpersonationBanner: React.FC = () => {
  const { isImpersonating, savedAdminSession, user, returnToAdmin } = useAuthStore()
  const navigate = useNavigate()

  // No mostrar el banner si no hay impersonación activa
  if (!isImpersonating || !savedAdminSession) {
    return null
  }

  const handleReturnToAdmin = () => {
    // Restaurar la sesión del admin
    returnToAdmin()

    // Redirigir al dashboard de admin
    setTimeout(() => {
      navigate('/admin')
      // Forzar recarga para asegurar que se cargan los datos correctos
      window.location.href = '/admin'
    }, 100)
  }

  const adminName = savedAdminSession.user?.profile?.firstName
    ? `${savedAdminSession.user.profile.firstName} ${savedAdminSession.user.profile.lastName || ''}`
    : savedAdminSession.user?.email || 'Administrador'

  const currentUserName = user?.profile?.firstName
    ? `${user.profile.firstName} ${user.profile.lastName || ''}`
    : user?.email || 'Usuario'

  const roleLabels: Record<string, string> = {
    student: 'Estudiante',
    teacher: 'Profesor',
    family: 'Familia',
    admin: 'Administrador',
  }

  const currentRole = roleLabels[user?.role || ''] || user?.role || 'Usuario'

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1100,
        background: 'linear-gradient(90deg, #722ed1 0%, #9254de 50%, #b37feb 100%)',
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(114, 46, 209, 0.3)',
      }}
    >
      <Space size="middle">
        <UserSwitchOutlined style={{ color: 'white', fontSize: '18px' }} />
        <Text style={{ color: 'white', fontWeight: 500 }}>
          Viendo como: <strong>{currentUserName}</strong> ({currentRole})
        </Text>
      </Space>

      <Space size="small">
        <Button
          type="primary"
          icon={<ArrowLeftOutlined />}
          onClick={handleReturnToAdmin}
          style={{
            background: 'white',
            color: '#722ed1',
            border: 'none',
            fontWeight: 600,
          }}
        >
          Volver a Administración
        </Button>
      </Space>
    </div>
  )
}

export default ImpersonationBanner
