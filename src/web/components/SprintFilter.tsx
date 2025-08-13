import React, { useEffect, useState } from 'react';
import { apiClient } from '../lib/api';

interface SprintFilterProps {
  selectedSprint: string;
  onSprintChange: (sprint: string) => void;
}

const SprintFilter: React.FC<SprintFilterProps> = ({ selectedSprint, onSprintChange }) => {
  const [sprints, setSprints] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSprints();
  }, []);

  const loadSprints = async () => {
    try {
      setLoading(true);
      const sprintsData = await apiClient.fetchSprints();
      // Extract unique sprint titles from sprint data
      const sprintTitles = sprintsData.map(sprint => sprint.title).filter(Boolean);
      setSprints(sprintTitles);
    } catch (error) {
      console.error('Failed to load sprints:', error);
      setSprints([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center">
        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2"></div>
        <span className="text-sm text-gray-500 dark:text-gray-400">Loading sprints...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="sprint-filter" className="text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors duration-200">
        Sprint:
      </label>
      <select
        id="sprint-filter"
        value={selectedSprint}
        onChange={(e) => onSprintChange(e.target.value)}
        className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors duration-200"
      >
        <option value="">All Sprints</option>
        {sprints.map(sprint => (
          <option key={sprint} value={sprint}>
            {sprint}
          </option>
        ))}
      </select>
      {selectedSprint && (
        <button
          onClick={() => onSprintChange('')}
          className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors duration-200"
          title="Clear filter"
        >
          ✕
        </button>
      )}
    </div>
  );
};

export default SprintFilter;