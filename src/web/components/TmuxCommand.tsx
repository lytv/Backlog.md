import React, { useState } from 'react';
import { apiClient } from '../lib/api';
import { useTheme } from '../contexts/ThemeContext';

interface TmuxCommandProps {
  className?: string;
}

const TmuxCommand: React.FC<TmuxCommandProps> = ({ className = '' }) => {
  const { theme } = useTheme();
  const [token, setToken] = useState('');
  const [command, setCommand] = useState('hello');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');

  const handleSendCommand = async () => {
    if (!token.trim()) {
      setMessage('Please enter a session token');
      setMessageType('error');
      return;
    }

    if (!command.trim()) {
      setMessage('Please enter a command');
      setMessageType('error');
      return;
    }

    setIsLoading(true);
    setMessage('');
    setMessageType('');

    try {
      const result = await apiClient.sendTmuxCommand(token.trim(), command.trim());
      setMessage(result.message);
      setMessageType('success');
      
      // Clear message after 3 seconds
      setTimeout(() => {
        setMessage('');
        setMessageType('');
      }, 3000);
      
    } catch (error) {
      console.error('Failed to send tmux command:', error);
      setMessage('Failed to send command to tmux session');
      setMessageType('error');
      
      // Clear error message after 5 seconds
      setTimeout(() => {
        setMessage('');
        setMessageType('');
      }, 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSendCommand();
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Session Token
          </label>
          <input
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="e.g., YNBXKLWA"
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-stone-500 dark:focus:ring-stone-400 focus:border-transparent transition-colors duration-200"
            disabled={isLoading}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Command
          </label>
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="e.g., hello, ls, pwd"
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-stone-500 dark:focus:ring-stone-400 focus:border-transparent transition-colors duration-200"
            disabled={isLoading}
          />
        </div>
      </div>
      
      <div className="flex justify-end">
        <button
          onClick={handleSendCommand}
          disabled={isLoading || !token.trim() || !command.trim()}
          className="inline-flex items-center px-4 py-2 bg-green-500 dark:bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-600 dark:hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-green-400 dark:focus:ring-green-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Sending...
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              Send Command
            </>
          )}
        </button>
      </div>
      
      {message && (
        <div className={`text-sm p-2 rounded-md transition-colors duration-200 ${
          messageType === 'success' 
            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800' 
            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
        }`}>
          {message}
        </div>
      )}
    </div>
  );
};

export default TmuxCommand;