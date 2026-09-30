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



interface GlobalUIState {
 sidebarCollapsed: boolean;
 globalSearchOpen: boolean;
 setSidebarCollapsed: (v: boolean) => void;
 setGlobalSearchOpen: (v: boolean) => void;
}

type StoreState = IncidentUIState & GlobalUIState;

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



 // Global UI
 sidebarCollapsed: false,
 globalSearchOpen: false,
 setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
 setGlobalSearchOpen: (v) => set({ globalSearchOpen: v }),
}));
