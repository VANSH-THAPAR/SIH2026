import { create } from 'zustand';
import type { Priority, Status, ActionStatus } from '../types';

interface IncidentUIState {
  viewMode: 'kanban' | 'list';
  selectedIncidentId: string | null;
  filterSearch: string;
  filterPriority: Priority | '';
  filterStatus: Status | '';
  filterSite: string;
  filterDepartment: string;
  filterSifOnly: boolean;
  setViewMode: (mode: 'kanban' | 'list') => void;
  setSelectedIncidentId: (id: string | null) => void;
  setFilterSearch: (s: string) => void;
  setFilterPriority: (p: Priority | '') => void;
  setFilterStatus: (s: Status | '') => void;
  setFilterSite: (s: string) => void;
  setFilterDepartment: (s: string) => void;
  setFilterSifOnly: (b: boolean) => void;
  resetFilters: () => void;
}

interface ActionUIState {
  actionViewMode: 'kanban' | 'list';
  selectedActionId: string | null;
  actionDrawerOpen: boolean;
  actionFilterStatus: ActionStatus | '';
  actionFilterPriority: Priority | '';
  setActionViewMode: (mode: 'kanban' | 'list') => void;
  setSelectedActionId: (id: string | null) => void;
  setActionDrawerOpen: (open: boolean) => void;
  setActionFilterStatus: (s: ActionStatus | '') => void;
  setActionFilterPriority: (p: Priority | '') => void;
}

interface GlobalUIState {
  sidebarCollapsed: boolean;
  globalSearchOpen: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  setGlobalSearchOpen: (v: boolean) => void;
}

type StoreState = IncidentUIState & ActionUIState & GlobalUIState;

export const useStore = create<StoreState>((set) => ({
  // Incident UI
  viewMode: 'kanban',
  selectedIncidentId: null,
  filterSearch: '',
  filterPriority: '',
  filterStatus: '',
  filterSite: '',
  filterDepartment: '',
  filterSifOnly: false,
  setViewMode: (mode) => set({ viewMode: mode }),
  setSelectedIncidentId: (id) => set({ selectedIncidentId: id }),
  setFilterSearch: (s) => set({ filterSearch: s }),
  setFilterPriority: (p) => set({ filterPriority: p }),
  setFilterStatus: (s) => set({ filterStatus: s }),
  setFilterSite: (s) => set({ filterSite: s }),
  setFilterDepartment: (s) => set({ filterDepartment: s }),
  setFilterSifOnly: (b) => set({ filterSifOnly: b }),
  resetFilters: () =>
    set({
      filterSearch: '',
      filterPriority: '',
      filterStatus: '',
      filterSite: '',
      filterDepartment: '',
      filterSifOnly: false,
    }),

  // Action UI
  actionViewMode: 'kanban',
  selectedActionId: null,
  actionDrawerOpen: false,
  actionFilterStatus: '',
  actionFilterPriority: '',
  setActionViewMode: (mode) => set({ actionViewMode: mode }),
  setSelectedActionId: (id) => set({ selectedActionId: id }),
  setActionDrawerOpen: (open) => set({ actionDrawerOpen: open }),
  setActionFilterStatus: (s) => set({ actionFilterStatus: s }),
  setActionFilterPriority: (p) => set({ actionFilterPriority: p }),

  // Global UI
  sidebarCollapsed: false,
  globalSearchOpen: false,
  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
  setGlobalSearchOpen: (v) => set({ globalSearchOpen: v }),
}));
