import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// Global UI State
interface UIState {
  sidebarCollapsed: boolean;
  mobileMenuOpen: boolean;
  theme: 'light' | 'dark';
  notifications: {
    unreadCount: number;
    lastFetch: Date | null;
  };
  loading: {
    global: boolean;
    operations: Map<string, boolean>;
  };
}

// Global App State
interface AppState {
  currentAcademicYear: string | null;
  moduleSettings: Record<string, boolean>;
  userPreferences: Record<string, any>;
  cache: Map<string, { data: any; timestamp: number }>;
}

// Actions
interface GlobalActions {
  // UI Actions
  setSidebarCollapsed: (collapsed: boolean) => void;
  setMobileMenuOpen: (open: boolean) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  updateNotificationCount: (count: number) => void;
  
  // Loading Actions
  setGlobalLoading: (loading: boolean) => void;
  setOperationLoading: (operation: string, loading: boolean) => void;
  isOperationLoading: (operation: string) => boolean;
  
  // App Actions
  setCurrentAcademicYear: (year: string) => void;
  updateModuleSettings: (settings: Record<string, boolean>) => void;
  updateUserPreferences: (prefs: Record<string, any>) => void;
  
  // Cache Actions
  setCacheData: (key: string, data: any, ttl?: number) => void;
  getCacheData: (key: string) => any | null;
  clearCache: (key?: string) => void;
  
  // Utility Actions
  reset: () => void;
}

// Combined Store Type
type GlobalStore = UIState & AppState & GlobalActions;

// Initial States
const initialUIState: UIState = {
  sidebarCollapsed: false,
  mobileMenuOpen: false,
  theme: 'light',
  notifications: {
    unreadCount: 0,
    lastFetch: null,
  },
  loading: {
    global: false,
    operations: new Map(),
  },
};

const initialAppState: AppState = {
  currentAcademicYear: null,
  moduleSettings: {},
  userPreferences: {},
  cache: new Map(),
};

// Create the store
export const useGlobalStore = create<GlobalStore>()(
  subscribeWithSelector(
    devtools(
      persist(
        immer((set, get) => ({
          ...initialUIState,
          ...initialAppState,
          
          // UI Actions
          setSidebarCollapsed: (collapsed) =>
            set((state) => {
              state.sidebarCollapsed = collapsed;
            }),
            
          setMobileMenuOpen: (open) =>
            set((state) => {
              state.mobileMenuOpen = open;
            }),
            
          setTheme: (theme) =>
            set((state) => {
              state.theme = theme;
              // Apply theme to document
              document.documentElement.setAttribute('data-theme', theme);
            }),
            
          updateNotificationCount: (count) =>
            set((state) => {
              state.notifications.unreadCount = count;
              state.notifications.lastFetch = new Date();
            }),
          
          // Loading Actions
          setGlobalLoading: (loading) =>
            set((state) => {
              state.loading.global = loading;
            }),
            
          setOperationLoading: (operation, loading) =>
            set((state) => {
              if (loading) {
                state.loading.operations.set(operation, true);
              } else {
                state.loading.operations.delete(operation);
              }
            }),
            
          isOperationLoading: (operation) => {
            const state = get();
            return state.loading.operations.get(operation) || false;
          },
          
          // App Actions
          setCurrentAcademicYear: (year) =>
            set((state) => {
              state.currentAcademicYear = year;
            }),
            
          updateModuleSettings: (settings) =>
            set((state) => {
              state.moduleSettings = { ...state.moduleSettings, ...settings };
            }),
            
          updateUserPreferences: (prefs) =>
            set((state) => {
              state.userPreferences = { ...state.userPreferences, ...prefs };
            }),
          
          // Cache Actions
          setCacheData: (key, data, ttl = 5 * 60 * 1000) => {
            set((state) => {
              state.cache.set(key, {
                data,
                timestamp: Date.now() + ttl,
              });
            });
          },
          
          getCacheData: (key) => {
            const state = get();
            const cached = state.cache.get(key);
            
            if (!cached) return null;
            
            if (Date.now() > cached.timestamp) {
              // Cache expired
              set((state) => {
                state.cache.delete(key);
              });
              return null;
            }
            
            return cached.data;
          },
          
          clearCache: (key) =>
            set((state) => {
              if (key) {
                state.cache.delete(key);
              } else {
                state.cache.clear();
              }
            }),
          
          // Utility Actions
          reset: () =>
            set(() => ({
              ...initialUIState,
              ...initialAppState,
            })),
        })),
        {
          name: 'mw-panel-global-store',
          partialize: (state) => ({
            // Only persist these fields
            sidebarCollapsed: state.sidebarCollapsed,
            theme: state.theme,
            currentAcademicYear: state.currentAcademicYear,
            userPreferences: state.userPreferences,
          }),
        }
      )
    )
  )
);

// Selectors
export const useIsSidebarCollapsed = () => useGlobalStore((state) => state.sidebarCollapsed);
export const useTheme = () => useGlobalStore((state) => state.theme);
export const useNotificationCount = () => useGlobalStore((state) => state.notifications.unreadCount);
export const useIsGlobalLoading = () => useGlobalStore((state) => state.loading.global);
export const useCurrentAcademicYear = () => useGlobalStore((state) => state.currentAcademicYear);
export const useModuleSettings = () => useGlobalStore((state) => state.moduleSettings);

// Subscribe to changes
export const subscribeToNotificationCount = (callback: (count: number) => void) => {
  return useGlobalStore.subscribe(
    (state) => state.notifications.unreadCount,
    callback
  );
};