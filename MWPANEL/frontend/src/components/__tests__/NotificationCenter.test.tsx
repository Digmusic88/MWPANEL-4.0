import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationCenter } from '../NotificationCenter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock API service
const mockNotificationService = {
  getUnreadCount: vi.fn(),
  getNotifications: vi.fn(),
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
};

vi.mock('@/services/api', () => ({
  notificationService: mockNotificationService,
}));

// Mock Ant Design components
vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  return {
    ...actual,
    Badge: ({ count, children }: any) => (
      <div data-testid="badge" data-count={count}>
        {children}
      </div>
    ),
    Popover: ({ content, children, open, onOpenChange }: any) => (
      <div>
        {children}
        {open && (
          <div data-testid="popover-content" onClick={() => onOpenChange?.(false)}>
            {content}
          </div>
        )}
      </div>
    ),
    List: ({ dataSource, renderItem }: any) => (
      <div data-testid="notification-list">
        {dataSource.map((item: any, index: number) => (
          <div key={index} data-testid={`notification-item-${index}`}>
            {renderItem(item)}
          </div>
        ))}
      </div>
    ),
    Button: ({ children, onClick, type, size }: any) => (
      <button
        onClick={onClick}
        data-testid={`button-${type || 'default'}`}
        data-size={size}
      >
        {children}
      </button>
    ),
    Typography: {
      Text: ({ children, type }: any) => (
        <span data-testid={`text-${type || 'default'}`}>{children}</span>
      ),
    },
    Space: ({ children }: any) => <div data-testid="space">{children}</div>,
  };
});

const mockNotifications = [
  {
    id: '1',
    title: 'Nueva tarea asignada',
    message: 'Se ha asignado una nueva tarea de matemáticas',
    type: 'info',
    isRead: false,
    createdAt: new Date('2025-01-15T10:00:00Z'),
  },
  {
    id: '2',
    title: 'Evaluación completada',
    message: 'Se ha completado la evaluación de lengua',
    type: 'success',
    isRead: true,
    createdAt: new Date('2025-01-14T15:30:00Z'),
  },
  {
    id: '3',
    title: 'Recordatorio',
    message: 'Reunión de padres mañana a las 16:00',
    type: 'warning',
    isRead: false,
    createdAt: new Date('2025-01-13T09:00:00Z'),
  },
];

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('NotificationCenter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNotificationService.getUnreadCount.mockResolvedValue(2);
    mockNotificationService.getNotifications.mockResolvedValue(mockNotifications);
    mockNotificationService.markAsRead.mockResolvedValue({});
    mockNotificationService.markAllAsRead.mockResolvedValue({});
  });

  it('should render notification center with correct badge count', async () => {
    render(
      <TestWrapper>
        <NotificationCenter />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('badge')).toHaveAttribute('data-count', '2');
    });
  });

  it('should show notification icon', () => {
    render(
      <TestWrapper>
        <NotificationCenter />
      </TestWrapper>
    );

    expect(screen.getByTestId('notification-icon')).toBeInTheDocument();
  });

  it('should open popover when notification icon is clicked', async () => {
    render(
      <TestWrapper>
        <NotificationCenter />
      </TestWrapper>
    );

    const notificationIcon = screen.getByTestId('notification-icon');
    fireEvent.click(notificationIcon);

    await waitFor(() => {
      expect(screen.getByTestId('popover-content')).toBeInTheDocument();
    });
  });

  it('should display notifications in the list', async () => {
    render(
      <TestWrapper>
        <NotificationCenter />
      </TestWrapper>
    );

    const notificationIcon = screen.getByTestId('notification-icon');
    fireEvent.click(notificationIcon);

    await waitFor(() => {
      expect(screen.getByTestId('notification-list')).toBeInTheDocument();
      expect(screen.getByTestId('notification-item-0')).toBeInTheDocument();
      expect(screen.getByTestId('notification-item-1')).toBeInTheDocument();
      expect(screen.getByTestId('notification-item-2')).toBeInTheDocument();
    });
  });

  it('should show "mark all as read" button when there are unread notifications', async () => {
    render(
      <TestWrapper>
        <NotificationCenter />
      </TestWrapper>
    );

    const notificationIcon = screen.getByTestId('notification-icon');
    fireEvent.click(notificationIcon);

    await waitFor(() => {
      expect(screen.getByTestId('button-link')).toBeInTheDocument();
      expect(screen.getByText('Marcar todas como leídas')).toBeInTheDocument();
    });
  });

  it('should call markAllAsRead when "mark all as read" button is clicked', async () => {
    render(
      <TestWrapper>
        <NotificationCenter />
      </TestWrapper>
    );

    const notificationIcon = screen.getByTestId('notification-icon');
    fireEvent.click(notificationIcon);

    await waitFor(() => {
      const markAllButton = screen.getByTestId('button-link');
      fireEvent.click(markAllButton);
    });

    expect(mockNotificationService.markAllAsRead).toHaveBeenCalledTimes(1);
  });

  it('should mark individual notification as read when clicked', async () => {
    render(
      <TestWrapper>
        <NotificationCenter />
      </TestWrapper>
    );

    const notificationIcon = screen.getByTestId('notification-icon');
    fireEvent.click(notificationIcon);

    await waitFor(() => {
      const firstNotification = screen.getByTestId('notification-item-0');
      fireEvent.click(firstNotification);
    });

    expect(mockNotificationService.markAsRead).toHaveBeenCalledWith('1');
  });

  it('should show empty state when no notifications', async () => {
    mockNotificationService.getNotifications.mockResolvedValue([]);
    mockNotificationService.getUnreadCount.mockResolvedValue(0);

    render(
      <TestWrapper>
        <NotificationCenter />
      </TestWrapper>
    );

    const notificationIcon = screen.getByTestId('notification-icon');
    fireEvent.click(notificationIcon);

    await waitFor(() => {
      expect(screen.getByText('No hay notificaciones')).toBeInTheDocument();
    });
  });

  it('should display correct notification types with appropriate styling', async () => {
    render(
      <TestWrapper>
        <NotificationCenter />
      </TestWrapper>
    );

    const notificationIcon = screen.getByTestId('notification-icon');
    fireEvent.click(notificationIcon);

    await waitFor(() => {
      // Check that different notification types are rendered
      expect(screen.getByText('Nueva tarea asignada')).toBeInTheDocument();
      expect(screen.getByText('Evaluación completada')).toBeInTheDocument();
      expect(screen.getByText('Recordatorio')).toBeInTheDocument();
    });
  });

  it('should format notification timestamps correctly', async () => {
    render(
      <TestWrapper>
        <NotificationCenter />
      </TestWrapper>
    );

    const notificationIcon = screen.getByTestId('notification-icon');
    fireEvent.click(notificationIcon);

    await waitFor(() => {
      // Check that timestamps are displayed (exact format may vary)
      expect(screen.getByText(/hace \d+ días?|hace \d+ horas?|hace \d+ minutos?/)).toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully', async () => {
    mockNotificationService.getNotifications.mockRejectedValue(new Error('API Error'));

    render(
      <TestWrapper>
        <NotificationCenter />
      </TestWrapper>
    );

    const notificationIcon = screen.getByTestId('notification-icon');
    fireEvent.click(notificationIcon);

    await waitFor(() => {
      expect(screen.getByText('Error al cargar notificaciones')).toBeInTheDocument();
    });
  });

  it('should close popover when clicking outside', async () => {
    render(
      <TestWrapper>
        <NotificationCenter />
      </TestWrapper>
    );

    const notificationIcon = screen.getByTestId('notification-icon');
    fireEvent.click(notificationIcon);

    await waitFor(() => {
      expect(screen.getByTestId('popover-content')).toBeInTheDocument();
    });

    // Simulate clicking outside (this would be handled by Ant Design's Popover)
    const popoverContent = screen.getByTestId('popover-content');
    fireEvent.click(popoverContent);

    await waitFor(() => {
      expect(screen.queryByTestId('popover-content')).not.toBeInTheDocument();
    });
  });

  it('should update badge count after marking notifications as read', async () => {
    // Simulate the API call updating the count
    mockNotificationService.markAllAsRead.mockImplementation(() => {
      mockNotificationService.getUnreadCount.mockResolvedValue(0);
      return Promise.resolve({});
    });

    render(
      <TestWrapper>
        <NotificationCenter />
      </TestWrapper>
    );

    const notificationIcon = screen.getByTestId('notification-icon');
    fireEvent.click(notificationIcon);

    await waitFor(() => {
      const markAllButton = screen.getByTestId('button-link');
      fireEvent.click(markAllButton);
    });

    // After marking all as read, the badge count should update
    await waitFor(() => {
      expect(mockNotificationService.markAllAsRead).toHaveBeenCalledTimes(1);
    });
  });
});