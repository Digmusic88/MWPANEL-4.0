import api from './apiClient';

// Types for Coordination
export interface CoordinationSheet {
  id: string;
  title: string;
  description?: string;
  meeting_date: string;
  progress_percentage: number;
  is_editable: boolean;
  is_active: boolean;
  permission_level: 'open' | 'restricted' | 'readonly';
  allowed_editors?: string[];
  created_by: {
    id: string;
    email: string;
    profile?: {
      firstName?: string;
      lastName?: string;
    };
  };
  created_at: string;
  updated_at: string;
  total_items?: number;
  completed_items?: number;
  pending_items?: number;
  overdue_items?: number;
}

export interface CoordinationItem {
  id: string;
  item_title: string;
  item_description?: string;
  due_date?: string;
  is_completed: boolean;
  assignment_type: 'all' | 'individual' | 'department';
  priority: 'low' | 'medium' | 'high';
  order_index: number;
  tags?: string[];
  color?: string;
  sheet_id: string;
  created_by: {
    id: string;
    email: string;
    profile?: {
      firstName?: string;
      lastName?: string;
    };
  };
  completed_by?: {
    id: string;
    email: string;
    profile?: {
      firstName?: string;
      lastName?: string;
    };
  };
  completed_at?: string;
  assigned_users?: Array<{
    id: string;
    email: string;
    profile?: {
      firstName?: string;
      lastName?: string;
    };
  }>;
  assigned_departments?: string[];
  created_at: string;
  updated_at: string;
  is_overdue?: boolean;
  days_remaining?: number;
  priority_color?: string;
}

export interface CoordinationStats {
  total_sheets: number;
  active_sheets: number;
  total_items: number;
  completed_items: number;
  pending_items: number;
  overdue_items: number;
  overall_progress: number;
  items_by_priority: {
    low: number;
    medium: number;
    high: number;
  };
  items_by_assignment: {
    all: number;
    individual: number;
    department: number;
  };
}

export interface CreateCoordinationSheetData {
  title: string;
  description?: string;
  meeting_date: string;
  permission_level?: 'open' | 'restricted' | 'readonly';
  allowed_editors?: string[];
  is_editable?: boolean;
  is_active?: boolean;
}

export interface CreateCoordinationItemData {
  item_title: string;
  item_description?: string;
  due_date?: string;
  assignment_type?: 'all' | 'individual' | 'department';
  priority?: 'low' | 'medium' | 'high';
  order_index?: number;
  tags?: string[];
  color?: string;
  sheet_id: string;
  assigned_user_ids?: string[];
  assigned_departments?: string[];
}

export interface CoordinationSheetQuery {
  is_active?: boolean;
  permission_level?: 'open' | 'restricted' | 'readonly';
  from_date?: string;
  to_date?: string;
  created_by?: string;
  search?: string;
}

export interface CoordinationItemQuery {
  sheet_id?: string;
  is_completed?: boolean;
  assignment_type?: 'all' | 'individual' | 'department';
  priority?: 'low' | 'medium' | 'high';
  assigned_to?: string;
  due_from?: string;
  due_to?: string;
  search?: string;
  tag?: string;
  overdue_only?: boolean;
}

// Coordination Sheets API
export const coordinationSheetsApi = {
  // Get all sheets with optional filters
  getSheets: async (query: CoordinationSheetQuery = {}): Promise<CoordinationSheet[]> => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
    
    const response = await api.get(`/coordination/sheets?${params.toString()}`);
    return response.data;
  },

  // Get sheet by ID
  getSheet: async (id: string): Promise<CoordinationSheet> => {
    const response = await api.get(`/coordination/sheets/${id}`);
    return response.data;
  },

  // Create new sheet
  createSheet: async (data: CreateCoordinationSheetData): Promise<CoordinationSheet> => {
    const response = await api.post('/coordination/sheets', data);
    return response.data;
  },

  // Update sheet
  updateSheet: async (id: string, data: Partial<CreateCoordinationSheetData>): Promise<CoordinationSheet> => {
    const response = await api.put(`/coordination/sheets/${id}`, data);
    return response.data;
  },

  // Delete sheet
  deleteSheet: async (id: string): Promise<void> => {
    await api.delete(`/coordination/sheets/${id}`);
  },

  // Toggle active status
  toggleActive: async (id: string): Promise<CoordinationSheet> => {
    const response = await api.patch(`/coordination/sheets/${id}/toggle-active`);
    return response.data;
  },

  // Get coordination statistics
  getStats: async (): Promise<CoordinationStats> => {
    const response = await api.get('/coordination/sheets/stats');
    return response.data;
  },
};

// Coordination Items API
export const coordinationItemsApi = {
  // Get all items with optional filters
  getItems: async (query: CoordinationItemQuery = {}): Promise<CoordinationItem[]> => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
    
    const response = await api.get(`/coordination/items?${params.toString()}`);
    return response.data;
  },

  // Get item by ID
  getItem: async (id: string): Promise<CoordinationItem> => {
    const response = await api.get(`/coordination/items/${id}`);
    return response.data;
  },

  // Create new item
  createItem: async (data: CreateCoordinationItemData): Promise<CoordinationItem> => {
    const response = await api.post('/coordination/items', data);
    return response.data;
  },

  // Update item
  updateItem: async (id: string, data: Partial<CreateCoordinationItemData>): Promise<CoordinationItem> => {
    const response = await api.put(`/coordination/items/${id}`, data);
    return response.data;
  },

  // Delete item
  deleteItem: async (id: string): Promise<void> => {
    await api.delete(`/coordination/items/${id}`);
  },

  // Toggle item completion
  toggleCompletion: async (id: string): Promise<CoordinationItem> => {
    const response = await api.post(`/coordination/items/${id}/toggle`);
    return response.data;
  },

  // Complete item (alias for backwards compatibility)
  completeItem: async (id: string, note?: string): Promise<CoordinationItem> => {
    const response = await api.post(`/coordination/items/${id}/toggle`);
    return response.data;
  },

  // Uncomplete item (alias for backwards compatibility)
  uncompleteItem: async (id: string): Promise<CoordinationItem> => {
    const response = await api.post(`/coordination/items/${id}/toggle`);
    return response.data;
  },

  // Assign users to item
  assignUsers: async (id: string, userIds: string[], assignmentType?: 'all' | 'individual' | 'department'): Promise<CoordinationItem> => {
    const response = await api.post(`/coordination/items/${id}/assign`, {
      user_ids: userIds,
      assignment_type: assignmentType,
    });
    return response.data;
  },

  // Unassign users from item
  unassignUsers: async (id: string, userIds: string[]): Promise<CoordinationItem> => {
    const response = await api.post(`/coordination/items/${id}/unassign`, {
      user_ids: userIds,
    });
    return response.data;
  },

  // Reorder items
  reorderItems: async (itemIds: string[]): Promise<CoordinationItem[]> => {
    const response = await api.post('/coordination/items/reorder', { itemIds });
    return response.data;
  },
};