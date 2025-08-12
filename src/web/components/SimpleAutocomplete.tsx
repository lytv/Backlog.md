import React, { useState, useRef, useEffect } from 'react';

interface SimpleAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onKeyPress?: (e: React.KeyboardEvent) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  historyKey: string;
  label?: string;
}

const SimpleAutocomplete: React.FC<SimpleAutocompleteProps> = ({
  value,
  onChange,
  onKeyPress,
  placeholder,
  className = '',
  disabled = false,
  historyKey,
  label
}) => {
  const [history, setHistory] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredHistory, setFilteredHistory] = useState<string[]>([]);

  // Load history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`history-${historyKey}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setHistory(parsed);
        }
      }
    } catch (error) {
      console.warn('Failed to load history:', error);
    }
  }, [historyKey]);

  // Save to history when value changes and is submitted
  const addToHistory = (item: string) => {
    if (!item.trim()) return;
    
    const newHistory = [item, ...history.filter(h => h !== item)].slice(0, 10);
    setHistory(newHistory);
    
    try {
      localStorage.setItem(`history-${historyKey}`, JSON.stringify(newHistory));
    } catch (error) {
      console.warn('Failed to save history:', error);
    }
  };

  // Filter history based on input
  useEffect(() => {
    if (!value.trim()) {
      setFilteredHistory(history.slice(0, 5));
    } else {
      const filtered = history.filter(item => 
        item.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 5);
      setFilteredHistory(filtered);
    }
  }, [value, history]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && value.trim()) {
      addToHistory(value.trim());
      setShowSuggestions(false);
      // Prevent the parent onKeyPress from being called to avoid double execution
      e.preventDefault();
      return;
    }
    onKeyPress?.(e);
  };

  const handleFocus = () => {
    if (filteredHistory.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleBlur = () => {
    setTimeout(() => setShowSuggestions(false), 150);
  };

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    setShowSuggestions(false);
  };

  return (
    <div className="relative">
      {label && (
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
          {label}
        </label>
      )}
      
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyPress={handleKeyPress}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-stone-500 dark:focus:ring-stone-400 focus:border-transparent transition-colors duration-200 ${className}`}
      />

      {/* Simple dropdown */}
      {showSuggestions && filteredHistory.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-40 overflow-y-auto">
          {filteredHistory.map((item, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSuggestionClick(item)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SimpleAutocomplete;