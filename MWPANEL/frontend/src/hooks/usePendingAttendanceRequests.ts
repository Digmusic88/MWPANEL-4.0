import { useState, useEffect } from 'react'
import apiClient from '@services/apiClient'
import { useAuthStore } from '@store/authStore'
import { UserRole } from '@/types/user'

interface UsePendingAttendanceRequestsResult {
  pendingCount: number
  loading: boolean
  error: string | null
  refreshCount: () => void
}

export const usePendingAttendanceRequests = (): UsePendingAttendanceRequestsResult => {
  const [pendingCount, setPendingCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuthStore()

  const fetchPendingCount = async () => {
    // Only fetch for teachers
    if (!user || user.role !== UserRole.TEACHER) {
      setPendingCount(0)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // First get teacher's classes
      const teachersResponse = await apiClient.get('/teachers')
      const teachers = (teachersResponse.data || []).filter((teacher: any) => teacher?.user?.id) // Filter invalid teachers
      const currentTeacher = teachers.find((teacher: any) => teacher.user.id === user?.id)

      if (!currentTeacher) {
        setPendingCount(0)
        return
      }

      // Get teacher's class groups
      const classGroupsResponse = await apiClient.get(`/class-groups?tutorId=${currentTeacher.id}`)
      const teacherClasses = classGroupsResponse.data

      if (!teacherClasses.length) {
        setPendingCount(0)
        return
      }

      let totalPendingRequests = 0

      // Get pending requests for each of teacher's classes
      for (const classGroup of teacherClasses) {
        try {
          const response = await apiClient.get(`/attendance/requests/group/${classGroup.id}/pending`)
          totalPendingRequests += response.data.length
        } catch (error) {
          console.error(`Error fetching requests for class ${classGroup.id}:`, error)
        }
      }

      // Ensure we always set a number, not an object
      setPendingCount(typeof totalPendingRequests === 'number' ? totalPendingRequests : 0)
    } catch (error: any) {
      console.error('Error fetching pending attendance requests count:', error)
      setError('Error al cargar solicitudes pendientes')
      setPendingCount(0)
    } finally {
      setLoading(false)
    }
  }

  const refreshCount = () => {
    fetchPendingCount()
  }

  useEffect(() => {
    fetchPendingCount()

    // Refresh count every 5 minutes to reduce API load
    const interval = setInterval(fetchPendingCount, 300000)

    return () => clearInterval(interval)
  }, [user])

  return {
    pendingCount,
    loading,
    error,
    refreshCount
  }
}