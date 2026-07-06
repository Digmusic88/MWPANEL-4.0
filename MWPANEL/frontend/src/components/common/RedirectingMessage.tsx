import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { LoadingOutlined, ArrowRightOutlined } from '@ant-design/icons'
import { Spin } from 'antd'

interface RedirectingMessageProps {
  userRole?: string
  targetPath?: string
  onRedirect?: () => void
  message?: string
}

const RedirectingMessage: React.FC<RedirectingMessageProps> = ({
  userRole = 'usuario',
  targetPath = 'panel de usuario',
  onRedirect,
  message
}) => {
  const [dots, setDots] = useState('')

  // Animate dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.')
    }, 500)

    return () => clearInterval(interval)
  }, [])

  // Auto redirect after a short delay
  useEffect(() => {
    if (onRedirect) {
      const timer = setTimeout(onRedirect, 1500)
      return () => clearTimeout(timer)
    }
  }, [onRedirect])

  const defaultMessage = `Accediendo al ${targetPath}`

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md mx-4"
      >
        {/* Loading icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="mb-6"
        >
          <Spin 
            indicator={<LoadingOutlined style={{ fontSize: 48, color: '#579172' }} spin />}
            size="large"
          />
        </motion.div>

        {/* Main message */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="text-2xl font-semibold text-gray-800 mb-4"
        >
          {message || defaultMessage}{dots}
        </motion.h2>

        {/* User info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="text-gray-600 mb-6"
        >
          <div className="flex items-center justify-center gap-2 text-sm">
            <span>Usuario:</span>
            <span className="font-medium text-purple-600 capitalize">{userRole}</span>
          </div>
        </motion.div>

        {/* Progress indicator */}
        <motion.div
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: '100%' }}
          transition={{ delay: 0.5, duration: 1 }}
          className="relative"
        >
          <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ delay: 0.6, duration: 1.2, ease: "easeInOut" }}
              className="bg-gradient-to-r from-purple-500 to-blue-500 h-full rounded-full"
            />
          </div>
        </motion.div>

        {/* Helper text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.4 }}
          className="text-xs text-gray-500 mt-4 flex items-center justify-center gap-1"
        >
          <span>Redirigiendo</span>
          <ArrowRightOutlined className="text-purple-500" />
          <span className="font-medium">{targetPath}</span>
        </motion.p>
      </motion.div>
    </div>
  )
}

export default RedirectingMessage