import { create } from 'zustand';
import type { IncidentFilters, Priority, Status } from '@/types';

interface UIState {
 // Incident board state
 boardView: 'board' | 'list';
 incidentFilters: IncidentFilters;
 selectedIncidentId: string | null;
 

 // Global search
 searchOpen: boolean;
 searchQuery: string;

 // Sidebar
 sidebarCollapsed: boolean;

 // Toast notifications
 toasts: Toast[];
}

interface Toast {
 id: string;
 message: string;
 type: 'success' | 'error' | 'info' | 'warning';
}

interface UIActions {
 setBoardView: (view: 'board' | 'list') => void;
 setIncidentFilters: (filters: Partial<IncidentFilters>) => void;
 clearFilters: () => void;
 setSelectedIncident: (id: string | null) => void;

 setSearchOpen: (open: boolean) => void;
 setSearchQuery: (query: string) => void;
 toggleSidebar: () => void;
 addToast: (message: string, type: Toast['type']) => void;
 removeToast: (id: string) => void;
}

export const useUIStore = create<UIState & UIActions>((set, get) => ({
 // Initial state
 boardView: 'board',
 incidentFilters: { page: 1, page_size: 50 },
 selectedIncidentId: null,

 searchOpen: false,
 searchQuery: '',
 sidebarCollapsed: false,
 toasts: [],

 // Actions
 setBoardView: (view) => set({ boardView: view }),
 
 setIncidentFilters: (filters) => set((state) => ({
 incidentFilters: { ...state.incidentFilters, ...filters, page: 1 },
 })),
 
 clearFilters: () => set({ incidentFilters: { page: 1, page_size: 50 } }),
 
 setSelectedIncident: (id) => set({ selectedIncidentId: id }),
 

 
 setSearchOpen: (open) => set({ searchOpen: open }),
 
 setSearchQuery: (query) => set({ searchQuery: query }),
 
 toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
 
 addToast: (message, type) => {
 const id = Date.now().toString();
 set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
 setTimeout(() => get().removeToast(id), 4000);
 },
 
 removeToast: (id) => set((state) => ({
 toasts: state.toasts.filter((t) => t.id !== id),
 })),
}));
