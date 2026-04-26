import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Item } from '../capsules/types';

export type OutputFormat = 'xml' | 'markdown';

interface DeployState {
  selectedCapsuleIds: string[];
  scratchItems: Item[];
  task: string;
  vars: Record<string, string>;
  globalVars: Record<string, string>;
  format: OutputFormat;
  includeImages: boolean;

  toggleCapsule: (id: string) => void;
  clearSelection: () => void;
  setTask: (task: string) => void;
  setVar: (name: string, value: string) => void;
  setGlobalVar: (name: string, value: string) => void;
  removeVar: (name: string) => void;
  setFormat: (f: OutputFormat) => void;
  setIncludeImages: (v: boolean) => void;
  addScratchItem: (item: Item) => void;
  removeScratchItem: (id: string) => void;
  clearScratch: () => void;
}

export const useDeployStore = create<DeployState>()(
  immer((set) => ({
    selectedCapsuleIds: [],
    scratchItems: [],
    task: '',
    vars: {},
    globalVars: {},
    format: 'xml',
    includeImages: false,

    toggleCapsule: (id) =>
      set((s) => {
        const idx = s.selectedCapsuleIds.indexOf(id);
        if (idx >= 0) s.selectedCapsuleIds.splice(idx, 1);
        else s.selectedCapsuleIds.push(id);
      }),

    clearSelection: () => set((s) => void (s.selectedCapsuleIds = [])),
    setTask: (task) => set((s) => void (s.task = task)),
    setVar: (name, value) => set((s) => void (s.vars[name] = value)),
    setGlobalVar: (name, value) => set((s) => void (s.globalVars[name] = value)),
    removeVar: (name) =>
      set((s) => {
        delete s.vars[name];
      }),
    setFormat: (f) => set((s) => void (s.format = f)),
    setIncludeImages: (v) => set((s) => void (s.includeImages = v)),

    addScratchItem: (item) => set((s) => void s.scratchItems.push(item)),
    removeScratchItem: (id) =>
      set((s) => void (s.scratchItems = s.scratchItems.filter((it) => it.id !== id))),
    clearScratch: () => set((s) => void (s.scratchItems = [])),
  })),
);
