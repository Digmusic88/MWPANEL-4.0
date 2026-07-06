import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import apiClient from '../services/apiClient';

// Types for different badge counts
interface BadgeCounts {
  messages: number;
  notifications: number;
  blogPosts: number;
  pendingAttendance: number;
  pendingMeetings: number;
  pendingTasks: number;
}

interface NotificationState {
  badges: BadgeCounts;
  lastFetch: Record<keyof BadgeCounts, Date | null>;
  loading: Record<keyof BadgeCounts, boolean>;
}

interface NotificationActions {
  // Individual badge updates
  setMessagesBadge: (count: number) => void;
  setNotificationsBadge: (count: number) => void;
  setBlogPostsBadge: (count: number) => void;
  setPendingAttendanceBadge: (count: number) => void;
  setPendingMeetingsBadge: (count: number) => void;
  setPendingTasksBadge: (count: number) => void;

  // Increment/Decrement helpers
  decrementMessagesBadge: (amount?: number) => void;
  incrementMessagesBadge: (amount?: number) => void;
  decrementNotificationsBadge: (amount?: number) => void;
  decrementBlogPostsBadge: (amount?: number) => void;

  // Fetch from server
  fetchMessagesBadge: () => Promise<void>;
  fetchNotificationsBadge: () => Promise<void>;
  fetchBlogPostsBadge: () => Promise<void>;
  fetchPendingAttendanceBadge: () => Promise<void>;
  fetchPendingMeetingsBadge: () => Promise<void>;
  fetchAllBadges: () => Promise<void>;

  // Reset
  resetAllBadges: () => void;
}

type NotificationStore = NotificationState & NotificationActions;

const initialBadges: BadgeCounts = {
  messages: 0,
  notifications: 0,
  blogPosts: 0,
  pendingAttendance: 0,
  pendingMeetings: 0,
  pendingTasks: 0,
};

const initialLastFetch: Record<keyof BadgeCounts, Date | null> = {
  messages: null,
  notifications: null,
  blogPosts: null,
  pendingAttendance: null,
  pendingMeetings: null,
  pendingTasks: null,
};

const initialLoading: Record<keyof BadgeCounts, boolean> = {
  messages: false,
  notifications: false,
  blogPosts: false,
  pendingAttendance: false,
  pendingMeetings: false,
  pendingTasks: false,
};

export const useNotificationStore = create<NotificationStore>()(
  subscribeWithSelector(
    devtools(
      immer((set, get) => ({
        badges: { ...initialBadges },
        lastFetch: { ...initialLastFetch },
        loading: { ...initialLoading },

        // Individual badge setters
        setMessagesBadge: (count) =>
          set((state) => {
            state.badges.messages = Math.max(0, count);
            state.lastFetch.messages = new Date();
          }),

        setNotificationsBadge: (count) =>
          set((state) => {
            state.badges.notifications = Math.max(0, count);
            state.lastFetch.notifications = new Date();
          }),

        setBlogPostsBadge: (count) =>
          set((state) => {
            state.badges.blogPosts = Math.max(0, count);
            state.lastFetch.blogPosts = new Date();
          }),

        setPendingAttendanceBadge: (count) =>
          set((state) => {
            state.badges.pendingAttendance = Math.max(0, count);
            state.lastFetch.pendingAttendance = new Date();
          }),

        setPendingMeetingsBadge: (count) =>
          set((state) => {
            state.badges.pendingMeetings = Math.max(0, count);
            state.lastFetch.pendingMeetings = new Date();
          }),

        setPendingTasksBadge: (count) =>
          set((state) => {
            state.badges.pendingTasks = Math.max(0, count);
            state.lastFetch.pendingTasks = new Date();
          }),

        // Increment/Decrement helpers
        decrementMessagesBadge: (amount = 1) =>
          set((state) => {
            state.badges.messages = Math.max(0, state.badges.messages - amount);
          }),

        incrementMessagesBadge: (amount = 1) =>
          set((state) => {
            state.badges.messages = state.badges.messages + amount;
          }),

        decrementNotificationsBadge: (amount = 1) =>
          set((state) => {
            state.badges.notifications = Math.max(0, state.badges.notifications - amount);
          }),

        decrementBlogPostsBadge: (amount = 1) =>
          set((state) => {
            state.badges.blogPosts = Math.max(0, state.badges.blogPosts - amount);
          }),

        // Fetch from server
        fetchMessagesBadge: async () => {
          set((state) => { state.loading.messages = true; });
          try {
            const response = await apiClient.get('/communications/messages/unread-count');
            const count = response.data?.count ?? 0;
            set((state) => {
              state.badges.messages = typeof count === 'number' ? count : 0;
              state.lastFetch.messages = new Date();
            });
          } catch (error) {
            console.error('Error fetching unread messages count:', error);
          } finally {
            set((state) => { state.loading.messages = false; });
          }
        },

        fetchNotificationsBadge: async () => {
          set((state) => { state.loading.notifications = true; });
          try {
            const response = await apiClient.get('/communications/notifications/unread-count');
            const count = response.data?.count ?? response.data ?? 0;
            set((state) => {
              state.badges.notifications = typeof count === 'number' ? count : 0;
              state.lastFetch.notifications = new Date();
            });
          } catch (error) {
            console.error('Error fetching unread notifications count:', error);
          } finally {
            set((state) => { state.loading.notifications = false; });
          }
        },

        fetchBlogPostsBadge: async () => {
          set((state) => { state.loading.blogPosts = true; });
          try {
            const response = await apiClient.get('/blog-posts/unread-count');
            const count = response.data?.count ?? response.data ?? 0;
            set((state) => {
              state.badges.blogPosts = typeof count === 'number' ? count : 0;
              state.lastFetch.blogPosts = new Date();
            });
          } catch (error) {
            // Blog posts endpoint may not exist, fail silently
            console.debug('Blog posts unread count not available:', error);
          } finally {
            set((state) => { state.loading.blogPosts = false; });
          }
        },

        fetchPendingAttendanceBadge: async () => {
          set((state) => { state.loading.pendingAttendance = true; });
          try {
            const response = await apiClient.get('/attendance/requests/pending/count');
            const count = response.data?.count ?? response.data ?? 0;
            set((state) => {
              state.badges.pendingAttendance = typeof count === 'number' ? count : 0;
              state.lastFetch.pendingAttendance = new Date();
            });
          } catch (error) {
            console.debug('Pending attendance count not available:', error);
          } finally {
            set((state) => { state.loading.pendingAttendance = false; });
          }
        },

        fetchPendingMeetingsBadge: async () => {
          set((state) => { state.loading.pendingMeetings = true; });
          try {
            const response = await apiClient.get('/family/meetings/teacher/pending-count');
            const count = response.data?.count ?? response.data ?? 0;
            set((state) => {
              state.badges.pendingMeetings = typeof count === 'number' ? count : 0;
              state.lastFetch.pendingMeetings = new Date();
            });
          } catch (error) {
            console.debug('Pending meetings count not available:', error);
          } finally {
            set((state) => { state.loading.pendingMeetings = false; });
          }
        },

        fetchAllBadges: async () => {
          const { fetchBlogPostsBadge } = get();
          // Obtener mensajes + notificaciones en una sola llamada (Redis, < 5ms)
          try {
            const response = await apiClient.get('/communications/badges');
            const { messages = 0, notifications = 0 } = response.data ?? {};
            set((state) => {
              state.badges.messages = typeof messages === 'number' ? messages : 0;
              state.badges.notifications = typeof notifications === 'number' ? notifications : 0;
              state.lastFetch.messages = new Date();
              state.lastFetch.notifications = new Date();
            });
          } catch {
            // Fallback a los endpoints individuales si /badges falla
            const { fetchMessagesBadge, fetchNotificationsBadge } = get();
            await Promise.all([fetchMessagesBadge(), fetchNotificationsBadge()]);
          }
          // Blog sigue siendo independiente
          await fetchBlogPostsBadge();
        },

        resetAllBadges: () =>
          set((state) => {
            state.badges = { ...initialBadges };
            state.lastFetch = { ...initialLastFetch };
          }),
      })),
      { name: 'notification-store' }
    )
  )
);

// Selectors
export const useMessagesBadge = () => useNotificationStore((state) => state.badges.messages);
export const useNotificationsBadge = () => useNotificationStore((state) => state.badges.notifications);
export const useBlogPostsBadge = () => useNotificationStore((state) => state.badges.blogPosts);
export const usePendingAttendanceBadge = () => useNotificationStore((state) => state.badges.pendingAttendance);
export const usePendingMeetingsBadge = () => useNotificationStore((state) => state.badges.pendingMeetings);

// Actions selectors (for components that need to update badges)
export const useNotificationActions = () => useNotificationStore((state) => ({
  setMessagesBadge: state.setMessagesBadge,
  decrementMessagesBadge: state.decrementMessagesBadge,
  incrementMessagesBadge: state.incrementMessagesBadge,
  setNotificationsBadge: state.setNotificationsBadge,
  decrementNotificationsBadge: state.decrementNotificationsBadge,
  setBlogPostsBadge: state.setBlogPostsBadge,
  decrementBlogPostsBadge: state.decrementBlogPostsBadge,
  setPendingAttendanceBadge: state.setPendingAttendanceBadge,
  setPendingMeetingsBadge: state.setPendingMeetingsBadge,
  fetchMessagesBadge: state.fetchMessagesBadge,
  fetchNotificationsBadge: state.fetchNotificationsBadge,
  fetchBlogPostsBadge: state.fetchBlogPostsBadge,
  fetchAllBadges: state.fetchAllBadges,
}));
