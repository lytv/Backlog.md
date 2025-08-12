import React, { useState } from 'react';
import { apiClient } from '../lib/api';
import { useTheme } from '../contexts/ThemeContext';

interface TmuxTerminalProps {
  className?: string;
  activeTab: 'send' | 'results' | 'bash' | 'bashOutput';
}

const TmuxTerminal: React.FC<TmuxTerminalProps> = ({ className = '', activeTab }) => {
  const { theme } = useTheme();
  const [token, setToken] = useState('');
  const [command, setCommand] = useState('hello');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const [terminalOutput, setTerminalOutput] = useState('');
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [sessionInfo, setSessionInfo] = useState<string>('');
  
  // Bash command states
  const [bashCommand, setBashCommand] = useState('ls -la');
  const [bashOutput, setBashOutput] = useState('');
  const [bashExecutionTime, setBashExecutionTime] = useState<number>(0);
  const [bashWorkingDir, setBashWorkingDir] = useState<string>('');
  const [bashLastUpdated, setBashLastUpdated] = useState<string>('');
  const [isBashExecuting, setIsBashExecuting] = useState(false);

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

  const handleRefreshOutput = async () => {
    if (!token.trim()) {
      setMessage('Please enter a session token first');
      setMessageType('error');
      return;
    }

    setIsRefreshing(true);
    setMessage('');
    setMessageType('');

    try {
      const result = await apiClient.getTmuxOutput(token.trim());
      setTerminalOutput(result.output);
      setLastUpdated(new Date(result.timestamp).toLocaleString());
      setSessionInfo(result.sessionInfo);
      setMessage('Terminal output refreshed successfully');
      setMessageType('success');

      // Clear message after 2 seconds
      setTimeout(() => {
        setMessage('');
        setMessageType('');
      }, 2000);

    } catch (error) {
      console.error('Failed to refresh terminal output:', error);
      setMessage('Failed to refresh terminal output');
      setMessageType('error');
      
      // Clear error message after 5 seconds
      setTimeout(() => {
        setMessage('');
        setMessageType('');
      }, 5000);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleClearResults = () => {
    setTerminalOutput('');
    setLastUpdated('');
    setSessionInfo('');
    setMessage('Results cleared');
    setMessageType('success');
    
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 2000);
  };

  const handleExecuteBash = async () => {
    if (!bashCommand.trim()) {
      setMessage('Please enter a bash command');
      setMessageType('error');
      return;
    }

    setIsBashExecuting(true);
    setMessage('');
    setMessageType('');

    try {
      const result = await apiClient.executeBashCommand(bashCommand.trim());
      setBashOutput(result.output);
      setBashExecutionTime(result.executionTime);
      setBashWorkingDir(result.workingDirectory);
      setBashLastUpdated(new Date(result.timestamp).toLocaleString());
      
      if (result.success) {
        setMessage(`Command executed successfully in ${result.executionTime}ms`);
        setMessageType('success');
      } else {
        setMessage(`Command failed: ${result.error || 'Unknown error'}`);
        setMessageType('error');
      }

      // Clear message after 3 seconds
      setTimeout(() => {
        setMessage('');
        setMessageType('');
      }, 3000);

    } catch (error) {
      console.error('Failed to execute bash command:', error);
      setMessage('Failed to execute bash command');
      setMessageType('error');
      
      // Clear error message after 5 seconds
      setTimeout(() => {
        setMessage('');
        setMessageType('');
      }, 5000);
    } finally {
      setIsBashExecuting(false);
    }
  };

  const handleClearBashOutput = () => {
    setBashOutput('');
    setBashExecutionTime(0);
    setBashWorkingDir('');
    setBashLastUpdated('');
    setMessage('Bash output cleared');
    setMessageType('success');
    
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 2000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSendCommand();
    }
  };

  const handleBashKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isBashExecuting) {
      handleExecuteBash();
    }
  };

  if (activeTab === 'bash') {
    return (
      <div className={`space-y-2 ${className}`}>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Bash Command
          </label>
          <input
            type="text"
            value={bashCommand}
            onChange={(e) => setBashCommand(e.target.value)}
            onKeyPress={handleBashKeyPress}
            placeholder="e.g., ls -la, pwd, npm test"
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-stone-500 dark:focus:ring-stone-400 focus:border-transparent transition-colors duration-200"
            disabled={isBashExecuting}
          />
        </div>
        
        <div className="flex justify-end">
          <button
            onClick={handleExecuteBash}
            disabled={isBashExecuting || !bashCommand.trim()}
            className="inline-flex items-center px-4 py-2 bg-orange-500 dark:bg-orange-600 text-white text-sm font-medium rounded-md hover:bg-orange-600 dark:hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-orange-400 dark:focus:ring-orange-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isBashExecuting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Executing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Execute Bash
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
  }

  if (activeTab === 'bashOutput') {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Bash Output
          </label>
          <button
            type="button"
            onClick={handleClearBashOutput}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors duration-200"
          >
            Clear Output
          </button>
        </div>
        
        <div className="relative">
          <textarea
            readOnly
            rows={10}
            className="w-full px-3 py-2 text-sm font-mono bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 focus:border-transparent transition-colors duration-200 resize-none"
            placeholder="Bash command output will appear here...&#10;&#10;Example:&#10;$ ls -la&#10;total 64&#10;drwxr-xr-x  12 user  staff   384 Aug 11 10:30 .&#10;-rw-r--r--   1 user  staff  1234 Aug 11 10:29 package.json&#10;&#10;$ pwd&#10;/Users/mac/tools/Backlog.md"
            value={bashOutput}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>
            {bashLastUpdated ? `Last executed: ${bashLastUpdated}` : 'No commands executed yet'}
          </span>
          <span>
            {bashExecutionTime > 0 ? `Execution time: ${bashExecutionTime}ms` : ''}
          </span>
        </div>

        {bashWorkingDir && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Working directory: {bashWorkingDir}
          </div>
        )}

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
  }

  if (activeTab === 'send') {
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
  }

  // Results tab
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Terminal Output
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleClearResults}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors duration-200"
          >
            Clear Results
          </button>
          <button
            type="button"
            onClick={handleRefreshOutput}
            disabled={isRefreshing || !token.trim()}
            className="inline-flex items-center px-2 py-1 text-xs bg-blue-500 dark:bg-blue-600 text-white rounded hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRefreshing ? (
              <>
                <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Refreshing...
              </>
            ) : (
              <>
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </>
            )}
          </button>
        </div>
      </div>

      {/* Session Token Input for Results Tab */}
      {!token.trim() && (
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Session Token (required for refresh)
          </label>
          <input
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="e.g., YNBXKLWA"
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-stone-500 dark:focus:ring-stone-400 focus:border-transparent transition-colors duration-200"
          />
        </div>
      )}
      
      <div className="relative">
        <textarea
          readOnly
          rows={10}
          className="w-full px-3 py-2 text-sm font-mono bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent transition-colors duration-200 resize-none"
          placeholder={!token.trim() 
            ? "Please enter a session token and click Refresh to view terminal output..." 
            : "Click 'Refresh' button to load terminal output..."}
          value={terminalOutput}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>
          {lastUpdated ? `Last updated: ${lastUpdated}` : 'Not loaded yet'}
        </span>
        <span>
          {sessionInfo ? `Session: ${sessionInfo}` : 'No session info'}
        </span>
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

export default TmuxTerminal;