import { create } from 'zustand';

export interface ProjectData {
  id: string;
  name: string;
  bundleId: string;
  sourceType: 'url' | 'github' | 'zip';
  sourceRef: string;
  webDir: string;
  status: 'draft' | 'configured' | 'building' | 'live';
}

interface ProjectState {
  projects: ProjectData[];
  currentProject: ProjectData;
  activeStep: number;
  setProject: (project: Partial<ProjectData>) => void;
  setProjects: (projects: ProjectData[]) => void;
  selectProject: (project: ProjectData) => void;
  createNewProject: () => void;
  setActiveStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
}

const DEFAULT_BLANK_PROJECT: ProjectData = {
  id: '',
  name: '',
  bundleId: '',
  sourceType: 'github',
  sourceRef: '',
  webDir: 'dist',
  status: 'draft'
};

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  currentProject: DEFAULT_BLANK_PROJECT,
  activeStep: 1,
  setProject: (updates) =>
    set((state) => ({ currentProject: { ...state.currentProject, ...updates } })),
  setProjects: (projects) => set({ projects }),
  selectProject: (project) => set({ currentProject: project, activeStep: 1 }),
  createNewProject: () => set({ currentProject: { ...DEFAULT_BLANK_PROJECT }, activeStep: 1 }),
  setActiveStep: (step) => set({ activeStep: Math.max(1, Math.min(5, step)) }),
  nextStep: () => set((state) => ({ activeStep: Math.min(5, state.activeStep + 1) })),
  prevStep: () => set((state) => ({ activeStep: Math.max(1, state.activeStep - 1) }))
}));
