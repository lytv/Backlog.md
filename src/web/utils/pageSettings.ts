// Page-specific settings management with localStorage

export interface ProgressPageSettings {
  showMilestones: boolean;
  showSprints: boolean;
  focusedMilestone: string | null;
}

export interface KanbanBoardSettings {
  selectedSprint: string;
}

export interface PageSettings {
  progress: ProgressPageSettings;
  kanban: KanbanBoardSettings;
}

const STORAGE_KEY = 'backlog-page-settings';

// Default settings
const defaultSettings: PageSettings = {
  progress: {
    showMilestones: true,
    showSprints: true,
    focusedMilestone: null,
  },
  kanban: {
    selectedSprint: 'All Sprints',
  },
};

// Load settings from localStorage
export const loadPageSettings = (): PageSettings => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to handle missing keys
      return {
        progress: { ...defaultSettings.progress, ...parsed.progress },
        kanban: { ...defaultSettings.kanban, ...parsed.kanban },
      };
    }
  } catch (error) {
    console.error('Failed to load page settings:', error);
  }
  return defaultSettings;
};

// Save settings to localStorage
export const savePageSettings = (settings: PageSettings): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save page settings:', error);
  }
};

// Update specific page settings
export const updateProgressSettings = (updates: Partial<ProgressPageSettings>): void => {
  const currentSettings = loadPageSettings();
  const newSettings: PageSettings = {
    ...currentSettings,
    progress: { ...currentSettings.progress, ...updates },
  };
  savePageSettings(newSettings);
};

export const updateKanbanSettings = (updates: Partial<KanbanBoardSettings>): void => {
  const currentSettings = loadPageSettings();
  const newSettings: PageSettings = {
    ...currentSettings,
    kanban: { ...currentSettings.kanban, ...updates },
  };
  savePageSettings(newSettings);
};

// Get specific page settings
export const getProgressSettings = (): ProgressPageSettings => {
  return loadPageSettings().progress;
};

export const getKanbanSettings = (): KanbanBoardSettings => {
  return loadPageSettings().kanban;
};