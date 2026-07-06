import React, { useEffect } from 'react'
import { App } from 'antd'
import { notificationService } from '../services/notificationService'

interface NotificationProviderProps {
  children: React.ReactNode
}

const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { message } = App.useApp()

  useEffect(() => {
    notificationService.setHandlers({
      error: message.error,
      success: message.success,
      warning: message.warning,
      info: message.info,
    })
  }, [message])

  return <>{children}</>
}

export default NotificationProvider