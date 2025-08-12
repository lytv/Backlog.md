import { useState, useEffect, useCallback } from 'react';

interface UseInputHistoryOptions {
  key: string;
  maxItems?: number;
}

export const useInputHistory = ({ key, maxItems = 20 }: UseInputHistoryOptions) => {
  const [history, setHistory] = useState<string[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`input-history-${key}`);
      if (stored) {
        const parsedHistory = JSON.parse(stored);
        if (Array.isArray(parsedHistory)) {
          setHistory(parsedHistory);
        }
      }
    } catch (error) {
      console.warn(`Failed to load history for ${key}:`, error);
    }
  }, [key]);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(`input-history-${key}`, JSON.stringify(history));
    } catch (error) {
      console.warn(`Failed to save history for ${key}:`, error);
    }
  }, [history, key]);

  // Add item to history
  const addToHistory = useCallback((item: string) => {
    if (!item.trim()) return;
    
    setHistory(prev => {
      // Remove existing item if it exists
      const filtered = prev.filter(h => h !== item.trim());
      // Add to beginning and limit size
      const newHistory = [item.trim(), ...filtered].slice(0, maxItems);
      return newHistory;
    });
  }, [maxItems]);

  // Filter history based on input
  const filterHistory = useCallback((input: string) => {
    if (!input.trim()) {
      setFilteredHistory(history.slice(0, 10)); // Show recent 10 items
      return;
    }

    const filtered = history.filter(item => 
      item.toLowerCase().includes(input.toLowerCase())
    ).slice(0, 10);
    
    setFilteredHistory(filtered);
  }, [history]);

  // Clear all history
  const clearHistory = useCallback(() => {
    setHistory([]);
    setFilteredHistory([]);
    try {
      localStorage.removeItem(`input-history-${key}`);
    } catch (error) {
      console.warn(`Failed to clear history for ${key}:`, error);
    }
  }, [key]);

  return {
    history,
    filteredHistory,
    showSuggestions,
    setShowSuggestions,
    addToHistory,
    filterHistory,
    clearHistory
  };
};