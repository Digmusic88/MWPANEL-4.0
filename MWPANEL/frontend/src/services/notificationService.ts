import { message } from 'antd'

// Queue for notifications to show when app is ready
let notificationQueue: Array<{ type: keyof typeof message; content: string }> = []
let isAppReady = false

export const notificationService = {
  // Mark app as ready to show notifications
  setAppReady: (ready: boolean) => {
    isAppReady = ready
    if (ready && notificationQueue.length > 0) {
      // Show queued notifications
      notificationQueue.forEach(({ type, content }) => {
        if (message[type]) {
          message[type](content)
        }
      })
      notificationQueue = []
    }
  },

  // Show notification or queue it if app is not ready
  show: (type: keyof typeof message, content: string) => {
    if (isAppReady) {
      if (message[type]) {
        message[type](content)
      }
    } else {
      // Queue notification for later
      notificationQueue.push({ type, content })
    }
  },

  error: (content: string) => notificationService.show('error', content),
  success: (content: string) => notificationService.show('success', content),
  warning: (content: string) => notificationService.show('warning', content),
  info: (content: string) => notificationService.show('info', content),
}