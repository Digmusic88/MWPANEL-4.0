import React, { useEffect } from 'react'
import { useAuthStore } from '@store/authStore'
import { useNavigate } from 'react-router-dom'

const EmergencyFamilyLogin: React.FC = () => {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuthStore()

  useEffect(() => {
    // Check if user is already authenticated from localStorage
    const authData = localStorage.getItem('mw-panel-auth')
    if (authData) {
      try {
        const { state } = JSON.parse(authData)
        if (state.user && state.isAuthenticated && state.user.role === 'family') {
          // Manually set the auth state to bypass checkAuth
          useAuthStore.setState({
            user: state.user,
            accessToken: state.accessToken,
            refreshToken: state.refreshToken,
            isAuthenticated: true,
            isLoading: false
          })
          
          // Redirect to family dashboard
          navigate('/family', { replace: true })
          return
        }
      } catch (error) {
        console.error('Failed to parse auth data:', error)
      }
    }
    
    // If not authenticated, redirect to login
    if (!isAuthenticated) {
      navigate('/login', { replace: true })
    }
  }, [navigate, isAuthenticated])

  if (user?.role === 'family' && isAuthenticated) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center',
        backgroundColor: '#f0f8ff',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <h1>🔧 Acceso de Emergencia - Familia</h1>
        <p>Redirigiendo al panel familiar...</p>
        <div style={{ 
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#e6f3ff',
          borderRadius: '8px',
          border: '1px solid #b3d9ff'
        }}>
          <p><strong>Usuario:</strong> {user.profile?.firstName} {user.profile?.lastName}</p>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Rol:</strong> {user.role}</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ 
      padding: '20px', 
      textAlign: 'center',
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <p>Verificando autenticación...</p>
    </div>
  )
}

export default EmergencyFamilyLogin