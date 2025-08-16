// Shared styling constants for worktree components
export const WORKTREE_STYLES = {
  // Container styles
  container: 'max-w-7xl mx-auto p-6 space-y-8',
  
  // Card styles
  card: 'bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700',
  cardHover: 'hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200',
  cardPadding: 'p-6',
  
  // Button styles
  buttonPrimary: 'px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200',
  buttonSecondary: 'px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200',
  buttonDanger: 'px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-200',
  buttonSuccess: 'px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors duration-200',
  
  // Input styles
  input: 'block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200',
  
  // Text styles
  heading: 'text-3xl font-bold text-gray-900 dark:text-gray-100',
  subheading: 'text-xl font-semibold text-gray-900 dark:text-gray-100',
  body: 'text-gray-600 dark:text-gray-400',
  muted: 'text-gray-500 dark:text-gray-500',
  
  // Status colors
  statusActive: 'text-green-600 dark:text-green-400',
  statusInactive: 'text-gray-500 dark:text-gray-400',
  statusModified: 'text-yellow-600 dark:text-yellow-400',
  statusAhead: 'text-blue-600 dark:text-blue-400',
  statusBehind: 'text-orange-600 dark:text-orange-400',
  
  // Grid layouts
  statsGrid: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6',
  worktreeGrid: 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4',
  detailGrid: 'grid grid-cols-1 lg:grid-cols-2 gap-6',
  actionGrid: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3',
  
  // Loading and disabled states
  loading: 'opacity-75 pointer-events-none transition-opacity duration-200',
  disabled: 'opacity-50 cursor-not-allowed',
} as const;

// Status badge styles
export const getStatusBadgeStyle = (status: 'clean' | 'modified' | 'ahead' | 'behind' | 'inactive') => {
  const baseStyle = 'px-2 py-1 rounded-circle text-xs font-medium';
  
  switch (status) {
    case 'clean':
      return `${baseStyle} bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200`;
    case 'modified':
      return `${baseStyle} bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200`;
    case 'ahead':
      return `${baseStyle} bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200`;
    case 'behind':
      return `${baseStyle} bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200`;
    case 'inactive':
      return `${baseStyle} bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200`;
    default:
      return `${baseStyle} bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200`;
  }
};