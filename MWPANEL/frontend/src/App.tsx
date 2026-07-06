import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { App as AntdApp } from 'antd'
import { useAuthStore } from '@store/authStore'
import { AcademicYearProvider } from '@/contexts/AcademicYearContext'
import GlobalErrorBoundary from '@components/common/GlobalErrorBoundary'
import LoginPage from '@pages/auth/LoginPage'
import AdminEmergencyLogin from '@pages/AdminEmergencyLogin'
import DashboardLayout from '@components/layout/DashboardLayout'
import AdminDashboard from '@pages/admin/AdminDashboard'
import TeacherDashboard from '@pages/teacher/TeacherDashboard'
import StudentDashboard from '@pages/student/StudentDashboard'
import FamilyDashboard from '@pages/family/FamilyDashboard'
import EmergencyFamilyLogin from '@pages/family/EmergencyFamilyLogin'
import FamilyEmergencyLogin from '@pages/auth/FamilyEmergencyLogin'
import LoadingPage from '@components/common/LoadingPage'
import RedirectingMessage from '@components/common/RedirectingMessage'
import PageTransition from '@components/animations/PageTransition'
import { UserRole } from '@/types/user'
// Blog pages - public access
import BlogListPage from '@pages/blog/BlogListPage'
import BlogDetailPage from '@pages/blog/BlogDetailPage'
import MediaGalleryPage from '@pages/blog/MediaGalleryPage'
import InstagramBlogPage from '@pages/blog/InstagramBlogPage'
// Admin pages for blog
import BlogPermissionsAdmin from '@pages/admin/BlogPermissionsAdmin'
// DiagnosticOverlay removed to prevent {type, count} errors

const AppContent = () => {
  const { user, isLoading, isAuthenticated, checkAuth } = useAuthStore()

  // Initialize authentication on app start
  useEffect(() => {
    checkAuth().catch(error => {
      console.error('Auth initialization failed:', error)
    })
  }, [])

  // Show loading while checking authentication
  if (isLoading) {
    return <LoadingPage />
  }

  // Redirect to dashboard based on user role
  const getDashboardPath = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return '/admin'
      case UserRole.TEACHER:
        return '/teacher'
      case UserRole.STUDENT:
        return '/student'
      case UserRole.FAMILY:
        return '/family'  // DEBUG: Restored normal family route for testing
      default:
        return '/login'
    }
  }


  return (
    <>
      <PageTransition>
        <Routes>
          {/* Public routes */}
          <Route 
            path="/login" 
            element={
              isAuthenticated && user?.role ? 
                <Navigate to={getDashboardPath(user.role)} replace /> : 
                <LoginPage />
            } 
          />

          {/* Admin emergency login */}
          <Route 
            path="/admin-emergency" 
            element={
              isAuthenticated && user?.role === UserRole.ADMIN ? 
                <Navigate to="/admin/settings" replace /> : 
                <AdminEmergencyLogin />
            } 
          />

          {/* Blog routes - public access */}
          <Route path="/blog" element={<InstagramBlogPage />} />
          <Route path="/blog/classic" element={<BlogListPage />} />
          <Route path="/blog/post/:slug" element={<BlogDetailPage />} />
          <Route path="/blog/category/:categorySlug" element={<BlogListPage />} />
          <Route path="/blog/galeria" element={<MediaGalleryPage />} />
          <Route path="/galeria-multimedia" element={<MediaGalleryPage />} />

          {/* Blog Admin routes */}
          {isAuthenticated && user?.role === UserRole.ADMIN && (
            <Route path="/admin/blog-permissions" element={<BlogPermissionsAdmin />} />
          )}

          {/* Admin routes */}
          {isAuthenticated && user?.role === UserRole.ADMIN && (
            <Route path="/admin/*" element={
              <AcademicYearProvider>
                <DashboardLayout>
                  <AdminDashboard />
                </DashboardLayout>
              </AcademicYearProvider>
            } />
          )}

          {/* Teacher routes */}
          {isAuthenticated && user?.role === UserRole.TEACHER && (
            <Route path="/teacher/*" element={
              <AcademicYearProvider>
                <DashboardLayout>
                  <TeacherDashboard />
                </DashboardLayout>
              </AcademicYearProvider>
            } />
          )}

          {/* Student routes */}
          {isAuthenticated && user?.role === UserRole.STUDENT && (
            <Route path="/student/*" element={
              <AcademicYearProvider>
                <DashboardLayout>
                  <StudentDashboard />
                </DashboardLayout>
              </AcademicYearProvider>
            } />
          )}

          {/* Family routes - FIXED: Restored normal layout with corrected authStore */}
          {isAuthenticated && user?.role === UserRole.FAMILY && (
            <Route path="/family/*" element={
              <AcademicYearProvider>
                <DashboardLayout>
                  <FamilyDashboard />
                </DashboardLayout>
              </AcademicYearProvider>
            } />
          )}
          
          {/* Family emergency access route */}
          <Route path="/emergency-family" element={<EmergencyFamilyLogin />} />
          
          {/* Family emergency login - bypasses normal authentication */}
          <Route path="/family-emergency-login" element={<FamilyEmergencyLogin />} />

          {/* Root redirect */}
          <Route path="/" element={
            isAuthenticated && user?.role ? 
              <Navigate to={getDashboardPath(user.role)} replace /> : 
              <Navigate to="/login" replace />
          } />

          {/* Fallback - Elegant redirecting message */}
          <Route path="*" element={
            isAuthenticated ? (
              <RedirectingMessage
                userRole={user?.role || 'usuario'}
                targetPath={(() => {
                  const role = user?.role || UserRole.STUDENT;
                  switch (role) {
                    case UserRole.ADMIN:
                      return 'panel de administración';
                    case UserRole.TEACHER:
                      return 'panel de profesor';
                    case UserRole.STUDENT:
                      return 'panel de estudiante';
                    case UserRole.FAMILY:
                      return 'panel de familia';
                    default:
                      return 'panel de usuario';
                  }
                })()}
                message="Redirigiendo al panel"
                onRedirect={() => {
                  const safeRole = user?.role || UserRole.STUDENT;
                  const dashboardPath = getDashboardPath(safeRole);
                  window.location.href = dashboardPath;
                }}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          } />
        </Routes>
      </PageTransition>
    </>
  )
}

function App() {
  return (
    <GlobalErrorBoundary>
      <AntdApp>
        <AppContent />
      </AntdApp>
    </GlobalErrorBoundary>
  )
}

export default App