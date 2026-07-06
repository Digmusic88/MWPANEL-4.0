import React, { useState, useEffect } from 'react'
import { Form, Input, Button, Alert, message } from 'antd'
import {
  UserOutlined,
  LockOutlined,
  MailOutlined,
  BookOutlined,
  TeamOutlined,
  CalendarOutlined,
  SafetyOutlined,
  CheckCircleFilled,
} from '@ant-design/icons'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@store/authStore'
import { LoginRequest } from '@/types/user'
import apiClient, { resetLoggingOutFlag } from '@services/apiClient'
import ScrollableModal from '@/components/common/ScrollableModal'
import { hideSessionExpiredModal } from '@/components/common/SessionExpiredModal'

// ─────────────────────────────────────────────────────────────────
// Design tokens (match global CSS variables)
// ─────────────────────────────────────────────────────────────────
const C = {
  bg:          '#FAFAF8',
  surface:     '#FFFFFF',
  surfaceAlt:  '#F5F2ED',
  border:      '#E2DDD8',
  borderLight: '#EDE9E4',
  text:        '#1E1E30',
  textSec:     '#6B6B7B',
  textMuted:   '#9B9BAB',
  primary:     '#2C5F8A',
  primaryDark: '#1E4A72',
  primaryLight:'#EEF5FA',
  success:     '#579172',
  error:       '#C43030',
}

// ─────────────────────────────────────────────────────────────────
// Feature cards
// ─────────────────────────────────────────────────────────────────
const features = [
  { icon: <BookOutlined />,     title: 'Gestión Académica', desc: 'Evaluación por competencias', color: C.primary },
  { icon: <TeamOutlined />,     title: 'Comunicación',      desc: 'Familias y profesores',        color: '#4A7F5E' },
  { icon: <CalendarOutlined />, title: 'Calendario',        desc: 'Horarios y eventos',            color: '#6B52A3' },
  { icon: <SafetyOutlined />,   title: 'Seguridad',         desc: 'Datos siempre protegidos',      color: '#B45309' },
]

// ─────────────────────────────────────────────────────────────────
// Framer Motion variants
// ─────────────────────────────────────────────────────────────────
const easeOut = [0.25, 0.46, 0.45, 0.94] as [number, number, number, number]

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
}

const itemVariants = {
  hidden:   { opacity: 0, y: 12 },
  visible:  { opacity: 1, y: 0, transition: { duration: 0.38, ease: easeOut } },
}

// ─────────────────────────────────────────────────────────────────
// LoginPage
// ─────────────────────────────────────────────────────────────────
const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState<string | null>(null)
  const [form] = Form.useForm()
  const { login } = useAuthStore()

  const [loginSuccess, setLoginSuccess] = useState(false)
  const [userName, setUserName]         = useState('')

  const [forgotOpen, setForgotOpen]         = useState(false)
  const [forgotForm] = Form.useForm()
  const [forgotLoading, setForgotLoading]   = useState(false)

  // Clean up residual session state on mount
  useEffect(() => {
    resetLoggingOutFlag()
    hideSessionExpiredModal()
    const el = document.getElementById('session-expired-modal-container')
    if (el) { el.style.display = 'none'; el.style.pointerEvents = 'none' }
  }, [])

  const onFinish = async (values: LoginRequest) => {
    try {
      setLoading(true)
      setError(null)
      await login(values)
      const { user } = useAuthStore.getState()
      setUserName(user?.firstName || user?.name?.split(' ')[0] || 'Usuario')
      setLoginSuccess(true)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Credenciales incorrectas. Por favor inténtalo de nuevo.')
      setLoginSuccess(false)
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (values: { email: string }) => {
    try {
      setForgotLoading(true)
      await apiClient.post('/auth/forgot-password', { email: values.email })
      message.success({ content: 'Si el correo existe en el sistema, recibirás una nueva contraseña.', duration: 6 })
      setForgotOpen(false)
      forgotForm.resetFields()
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Error al enviar el correo de recuperación')
    } finally {
      setForgotLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: C.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 24px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle dot-grid background */}
      <div
        aria-hidden
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: `radial-gradient(circle at 1px 1px, ${C.border} 1px, transparent 0)`,
          backgroundSize: '28px 28px',
          opacity: 0.45,
        }}
      />

      {/* Top-right radial glow */}
      <div
        aria-hidden
        style={{
          position: 'absolute', top: -150, right: -150,
          width: 500, height: 500, borderRadius: '50%',
          background: `radial-gradient(circle, rgba(44, 95, 138, 0.07) 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      {/* Bottom-left radial glow */}
      <div
        aria-hidden
        style={{
          position: 'absolute', bottom: -100, left: -100,
          width: 400, height: 400, borderRadius: '50%',
          background: `radial-gradient(circle, rgba(44, 95, 138, 0.05) 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      {/* ── Main container ── */}
      <motion.div
        style={{ width: '100%', maxWidth: 400, position: 'relative', zIndex: 1 }}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Logo & brand */}
        <motion.div variants={itemVariants} style={{ textAlign: 'center', marginBottom: 32 }}>
          <motion.img
            src="/logo.svg"
            alt="Mundo World School"
            style={{ width: 58, height: 58, objectFit: 'contain', marginBottom: 16 }}
            whileHover={{ scale: 1.04 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          />

          <h1
            style={{
              fontFamily: "'Lora', Georgia, serif",
              fontSize: 22,
              fontWeight: 600,
              color: C.text,
              marginBottom: 6,
              letterSpacing: '-0.015em',
              lineHeight: 1.3,
            }}
          >
            Mundo World School
          </h1>
          <p style={{ fontSize: 12.5, color: C.textMuted, letterSpacing: '0.025em' }}>
            Plataforma de Gestión Educativa
          </p>
        </motion.div>

        {/* ── Login card ── */}
        <motion.div
          variants={itemVariants}
          style={{
            backgroundColor: C.surface,
            borderRadius: 10,
            border: `1px solid ${C.borderLight}`,
            boxShadow: '0 2px 12px rgba(30, 30, 48, 0.06), 0 1px 4px rgba(30, 30, 48, 0.04)',
            overflow: 'hidden',
          }}
        >
          <AnimatePresence mode="wait">

            {/* ── Success state ── */}
            {loginSuccess ? (
              <motion.div
                key="success"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ padding: '32px 28px', textAlign: 'center' }}
              >
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 220, damping: 16, delay: 0.05 }}
                  style={{ marginBottom: 18 }}
                >
                  <div
                    style={{
                      width: 56, height: 56, borderRadius: '50%',
                      background: `linear-gradient(135deg, ${C.success} 0%, #3F6E58 100%)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      margin: '0 auto',
                      boxShadow: '0 4px 16px rgba(46, 125, 82, 0.28)',
                    }}
                  >
                    <CheckCircleFilled style={{ fontSize: 26, color: '#fff' }} />
                  </div>
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  style={{
                    fontFamily: "'Lora', Georgia, serif",
                    fontSize: 20, fontWeight: 600,
                    color: C.text, marginBottom: 6,
                  }}
                >
                  ¡Bienvenido, {userName}!
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  style={{ fontSize: 13, color: C.textSec }}
                >
                  Accediendo a tu panel...
                </motion.p>

                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: 56 }}
                  transition={{ delay: 0.45, duration: 0.55, ease: 'easeInOut' }}
                  style={{
                    height: 2, background: C.success,
                    borderRadius: 999, margin: '18px auto 0',
                  }}
                />
              </motion.div>

            ) : (
              /* ── Login form ── */
              <motion.div
                key="form"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.99 }}
                style={{ padding: '28px 28px 24px' }}
              >
                {/* Card header */}
                <div style={{ marginBottom: 22 }}>
                  <h2
                    style={{
                      fontSize: 15, fontWeight: 600,
                      color: C.text, marginBottom: 4,
                      letterSpacing: '-0.01em',
                    }}
                  >
                    Iniciar sesión
                  </h2>
                  <p style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.5 }}>
                    Accede con las credenciales proporcionadas por tu institución
                  </p>
                </div>

                {/* Error alert */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      key="error"
                      initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <Alert
                        message={error}
                        type="error"
                        showIcon
                        closable
                        onClose={() => setError(null)}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                <Form
                  name="login"
                  form={form}
                  onFinish={onFinish}
                  autoComplete="off"
                  layout="vertical"
                >
                  <Form.Item
                    name="email"
                    label="Correo electrónico"
                    rules={[
                      { required: true, message: 'Introduce tu correo electrónico' },
                      { type: 'email', message: 'Introduce un correo válido' },
                    ]}
                  >
                    <Input
                      prefix={<UserOutlined style={{ color: C.textMuted, fontSize: 13 }} />}
                      placeholder="nombre@escuela.es"
                      autoComplete="email"
                      size="large"
                    />
                  </Form.Item>

                  <Form.Item
                    name="password"
                    label="Contraseña"
                    rules={[
                      { required: true, message: 'Introduce tu contraseña' },
                      { min: 6, message: 'Mínimo 6 caracteres' },
                    ]}
                    style={{ marginBottom: 10 }}
                  >
                    <Input.Password
                      prefix={<LockOutlined style={{ color: C.textMuted, fontSize: 13 }} />}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      size="large"
                    />
                  </Form.Item>

                  {/* Forgot password */}
                  <div style={{ textAlign: 'right', marginBottom: 20 }}>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={() => setForgotOpen(true)}
                      onKeyDown={e => e.key === 'Enter' && setForgotOpen(true)}
                      style={{
                        fontSize: 12, color: C.primary,
                        cursor: 'pointer', fontWeight: 500,
                        textDecoration: 'none',
                        transition: 'color 0.14s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.color = C.primaryDark)}
                      onMouseLeave={e => (e.currentTarget.style.color = C.primary)}
                    >
                      ¿Olvidaste tu contraseña?
                    </span>
                  </div>

                  {/* Submit */}
                  <Form.Item style={{ marginBottom: 0 }}>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={loading}
                      size="large"
                      style={{
                        width: '100%',
                        height: 42,
                        fontSize: 13.5,
                        fontWeight: 600,
                        background: C.text,
                        borderColor: C.text,
                        borderRadius: 6,
                        letterSpacing: '0.01em',
                      }}
                    >
                      {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
                    </Button>
                  </Form.Item>
                </Form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── Feature cards ── */}
        <motion.div
          variants={itemVariants}
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 10,
            marginTop: 16,
          }}
        >
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 + i * 0.06, duration: 0.3, ease: easeOut }}
              whileHover={{ backgroundColor: C.surface, borderColor: C.border }}
              style={{
                backgroundColor: 'rgba(255,255,255,0.75)',
                backdropFilter: 'blur(6px)',
                borderRadius: 8,
                padding: '11px 12px',
                border: `1px solid ${C.borderLight}`,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                cursor: 'default',
                transition: 'background-color 0.14s, border-color 0.14s',
              }}
            >
              <div
                style={{
                  width: 30, height: 30, flexShrink: 0,
                  borderRadius: 6, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  background: `${f.color}12`,
                  color: f.color, fontSize: 13,
                }}
              >
                {f.icon}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: 11.5, fontWeight: 600,
                  color: C.text, lineHeight: 1.3,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {f.title}
                </div>
                <div style={{
                  fontSize: 10.5, color: C.textMuted,
                  marginTop: 1, lineHeight: 1.3,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {f.desc}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Footer ── */}
        <motion.div
          variants={itemVariants}
          style={{ textAlign: 'center', marginTop: 20 }}
        >
          <img
            src="/logo-MWSchool.png"
            alt="Mundoworld School"
            style={{ height: 38, display: 'block', margin: '0 auto 8px', opacity: 0.5 }}
          />
          <p style={{ fontSize: 11, color: C.textMuted }}>
            © 2026 Mundo World School · Todos los derechos reservados
          </p>
        </motion.div>
      </motion.div>

      {/* ── Forgot password modal ── */}
      <ScrollableModal
        title={
          <span style={{ fontSize: 15, fontWeight: 600, color: C.text }}>
            Recuperar contraseña
          </span>
        }
        open={forgotOpen}
        onCancel={() => { setForgotOpen(false); forgotForm.resetFields() }}
        footer={null}
        centered
      >
        <div style={{ paddingTop: 4 }}>
          <p style={{ fontSize: 13, color: C.textSec, marginBottom: 20, lineHeight: 1.6 }}>
            Introduce tu correo electrónico y te enviaremos una contraseña temporal para acceder.
          </p>
          <Form form={forgotForm} onFinish={handleForgotPassword} layout="vertical">
            <Form.Item
              name="email"
              label="Correo electrónico"
              rules={[
                { required: true, message: 'Introduce tu correo' },
                { type: 'email', message: 'Correo no válido' },
              ]}
            >
              <Input
                prefix={<MailOutlined style={{ color: C.textMuted, fontSize: 13 }} />}
                placeholder="nombre@escuela.es"
                size="large"
              />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={forgotLoading}
                size="large"
                style={{
                  width: '100%', height: 40,
                  background: C.text, borderColor: C.text,
                  fontWeight: 600, borderRadius: 6,
                }}
              >
                {forgotLoading ? 'Enviando...' : 'Enviar nueva contraseña'}
              </Button>
            </Form.Item>
          </Form>
        </div>
      </ScrollableModal>
    </div>
  )
}

export default LoginPage
