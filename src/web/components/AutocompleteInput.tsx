import React, { useState, useRef, useEffect } from 'react';
import { useInputHistory } from '../hooks/useInputHistory';

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyPress?: (e: React.KeyboardEvent) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  historyKey: string;
  label?: string;
  onSubmit?: (value: string) => void;
}

const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
  value,
  onChange,
  onKeyPress,
  placeholder,
  className = '',
  disabled = false,
  historyKey,
  label,
  onSubmit
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const {
    filteredHistory,
    showSuggestions,
    setShowSuggestions,
    addToHistory,
    filterHistory,
    clearHistory
  } = useInputHistory({ key: historyKey });

  // Filter history when input changes
  useEffect(() => {
    filterHistory(value);
  }, [value, filterHistory]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setSelectedIndex(-1);
    
    // Show suggestions if there's input or history
    if (newValue.trim() || filteredHistory.length > 0) {
      setShowSuggestions(true);
    }
  };

  // Handle input focus
  const handleFocus = () => {
    filterHistory(value);
    if (filteredHistory.length > 0) {
      setShowSuggestions(true);
    }
  };

  // Handle input blur (with delay to allow clicking on suggestions)
  const handleBlur = () => {
    setTimeout(() => {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }, 150);
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || filteredHistory.length === 0) {
      if (e.key === 'Enter' && onSubmit) {
        onSubmit(value);
        if (value.trim()) {
          addToHistory(value);
        }
      }
      onKeyPress?.(e);
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredHistory.length - 1 ? prev + 1 : 0
        );
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredHistory.length - 1
        );
        break;
      
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < filteredHistory.length) {
          const selectedValue = filteredHistory[selectedIndex];
          onChange(selectedValue);
          setShowSuggestions(false);
          setSelectedIndex(-1);
        } else {
          if (onSubmit) {
            onSubmit(value);
          }
          if (value.trim()) {
            addToHistory(value);
          }
        }
        break;
      
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
      
      default:
        onKeyPress?.(e);
        break;
    }
  };

  // Handle clear history
  const handleClearHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearHistory();
    setShowSuggestions(false);
  };

  return (
    <div className="relative">
      {label && (
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
          {label}
        </label>
      )}
      
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-stone-500 dark:focus:ring-stone-400 focus:border-transparent transition-colors duration-200 ${className}`}
        />
        
        {/* History icon */}
        {filteredHistory.length > 0 && (
          <button
            type="button"
            onClick={() => {
              filterHistory('');
              setShowSuggestions(!showSuggestions);
            }}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && filteredHistory.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          <div className="py-1">
            {filteredHistory.map((item, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleSuggestionClick(item)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 ${
                  index === selectedIndex 
                    ? 'bg-stone-100 dark:bg-stone-700 text-stone-900 dark:text-stone-100' 
                    : 'text-gray-900 dark:text-gray-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate font-mono">{item}</span>
                  <svg className="w-3 h-3 text-gray-400 ml-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </button>
            ))}
            
            {/* Clear history option */}
            <div className="border-t border-gray-200 dark:border-gray-600 mt-1 pt-1">
              <button
                type="button"
                onClick={handleClearHistory}
                className="w-full text-left px-3 py-2 text-xs text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200"
              >
                <div className="flex items-center">
                  <svg className="w-3 h-3 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Clear History ({filteredHistory.length} items)
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutocompleteInput;