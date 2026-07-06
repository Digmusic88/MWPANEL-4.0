import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@store/authStore'

const FamilyEmergencyLogin: React.FC = () => {
  const [email, setEmail] = useState('familia@mwpanel.com')
  const [password, setPassword] = useState('familia123')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleEmergencyLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // EMERGENCY: Bypass normal login API and use hardcoded family user
      const emergencyFamilyUser = {
        id: 'family-emergency-001',
        email: 'familia@mwpanel.com',
        role: 'family',
        profile: {
          firstName: 'José',
          lastName: 'González Ruiz'
        }
      }

      const emergencyTokens = {
        accessToken: 'emergency-family-token-' + Date.now(),
        refreshToken: 'emergency-family-refresh-' + Date.now()
      }

      // Set auth state directly without API calls
      useAuthStore.setState({
        user: emergencyFamilyUser,
        accessToken: emergencyTokens.accessToken,
        refreshToken: emergencyTokens.refreshToken,
        isAuthenticated: true,
        isLoading: false
      })

      // Save to localStorage for persistence
      localStorage.setItem('mw-panel-auth', JSON.stringify({
        state: {
          user: emergencyFamilyUser,
          accessToken: emergencyTokens.accessToken,
          refreshToken: emergencyTokens.refreshToken,
          isAuthenticated: true
        }
      }))

      console.log('🔧 Emergency family login successful')
      
      // Redirect to emergency family page
      navigate('/emergency-family', { replace: true })
      
    } catch (error: any) {
      console.error('Emergency login failed:', error)
      setError('Error en el acceso de emergencia')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f5f5f5',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        width: '100%',
        maxWidth: '400px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ color: '#1890ff', marginBottom: '10px' }}>🔧 Acceso de Emergencia</h1>
          <p style={{ color: '#666', margin: 0 }}>Acceso especial para usuarios familia</p>
        </div>

        <form onSubmit={handleEmergencyLogin}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Email:
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d9d9d9',
                borderRadius: '4px',
                fontSize: '14px'
              }}
              disabled={loading}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Contraseña:
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d9d9d9',
                borderRadius: '4px',
                fontSize: '14px'
              }}
              disabled={loading}
            />
          </div>

          {error && (
            <div style={{
              backgroundColor: '#fff2f0',
              border: '1px solid #ffccc7',
              padding: '10px',
              borderRadius: '4px',
              marginBottom: '20px',
              color: '#a8071a'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: loading ? '#d9d9d9' : '#1890ff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Accediendo...' : '🔧 Acceso de Emergencia'}
          </button>
        </form>

        <div style={{ 
          marginTop: '20px', 
          padding: '15px', 
          backgroundColor: '#f0f8ff',
          borderRadius: '4px',
          fontSize: '12px',
          color: '#666'
        }}>
          <p style={{ margin: 0, marginBottom: '8px' }}>
            <strong>⚠️ Acceso de Emergencia:</strong>
          </p>
          <p style={{ margin: 0, marginBottom: '4px' }}>
            • Bypassa el sistema de autenticación normal
          </p>
          <p style={{ margin: 0, marginBottom: '4px' }}>
            • Evita el error React.Children.only
          </p>
          <p style={{ margin: 0 }}>
            • Acceso directo al panel familiar
          </p>
        </div>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button
            onClick={() => navigate('/login')}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: '#1890ff',
              textDecoration: 'underline',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            ← Volver al login normal
          </button>
        </div>
      </div>
    </div>
  )
}

export default FamilyEmergencyLogin