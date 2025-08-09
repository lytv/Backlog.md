import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../lib/api';

interface FileItem {
	name: string;
	path: string;
	type: 'file' | 'directory';
	isDirectory: boolean;
}

interface FileExplorerProps {
	isCollapsed: boolean;
}

const FileExplorer: React.FC<FileExplorerProps> = ({ isCollapsed }) => {
	const [rootFiles, setRootFiles] = useState<FileItem[]>([]);
	const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
	const [dirContents, setDirContents] = useState<Map<string, FileItem[]>>(new Map());
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Icons
	const FolderIcon = () => (
		<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z" />
		</svg>
	);

	const FolderOpenIcon = () => (
		<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
		</svg>
	);

	const FileIcon = () => (
		<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
		</svg>
	);

	const ChevronRight = () => (
		<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
		</svg>
	);

	const ChevronDown = () => (
		<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
		</svg>
	);

	const loadFiles = useCallback(async (path: string = '') => {
		setLoading(true);
		setError(null);
		
		try {
			const data = await apiClient.fetchFiles(path);
			
			if (path === '') {
				// Root directory
				setRootFiles(data.items);
			} else {
				// Store directory contents
				setDirContents(prev => new Map(prev).set(path, data.items));
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to load files');
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadFiles();
	}, [loadFiles]);

	const toggleDirectory = useCallback(async (path: string) => {
		const isExpanded = expandedDirs.has(path);
		
		if (isExpanded) {
			// Collapse
			setExpandedDirs(prev => {
				const newSet = new Set(prev);
				newSet.delete(path);
				return newSet;
			});
		} else {
			// Expand
			setExpandedDirs(prev => new Set([...prev, path]));
			// Load directory contents if not already loaded
			if (!dirContents.has(path)) {
				await loadFiles(path);
			}
		}
	}, [expandedDirs, loadFiles, dirContents]);

	const getFileIcon = (item: FileItem) => {
		if (item.isDirectory) {
			return expandedDirs.has(item.path) ? <FolderOpenIcon /> : <FolderIcon />;
		}
		return <FileIcon />;
	};

	const getIndentation = (path: string) => {
		const level = path === '' ? 0 : path.split('/').length;
		return level * 16; // 16px per level
	};

	// Render file tree recursively
	const renderFileTree = (items: FileItem[], level: number = 0): React.ReactNode => {
		return items.map((item) => (
			<div key={item.path}>
				<div
					className="flex items-center text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors duration-200"
					style={{ paddingLeft: `${8 + level * 16}px` }}
				>
					{item.isDirectory && (
						<button
							onClick={() => toggleDirectory(item.path)}
							className="flex items-center justify-center w-4 h-4 mr-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
						>
							{expandedDirs.has(item.path) ? <ChevronDown /> : <ChevronRight />}
						</button>
					)}
					{!item.isDirectory && <div className="w-5" />}
					
					<div className="flex items-center space-x-2 py-1 flex-1 min-w-0">
						<span className="text-gray-400 dark:text-gray-500 flex-shrink-0">
							{getFileIcon(item)}
						</span>
						<span className="truncate" title={item.name}>
							{item.name}
						</span>
					</div>
				</div>
				
				{/* Render children if directory is expanded */}
				{item.isDirectory && expandedDirs.has(item.path) && dirContents.has(item.path) && (
					<div>
						{renderFileTree(dirContents.get(item.path)!, level + 1)}
					</div>
				)}
			</div>
		));
	};

	if (isCollapsed) {
		return (
			<div className="px-2 py-2">
				<div 
					className="flex items-center justify-center p-3 rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 transition-colors duration-200"
					title="File Explorer"
				>
					<FolderIcon />
				</div>
			</div>
		);
	}

	return (
		<div className="px-4">
			{loading && rootFiles.length === 0 && (
				<div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
					Loading...
				</div>
			)}

			{error && (
				<div className="px-3 py-2 text-sm text-red-600 dark:text-red-400">
					{error}
				</div>
			)}

			<div className="space-y-1 max-h-64 overflow-y-auto">
				{renderFileTree(rootFiles)}
			</div>
		</div>
	);
};

export default FileExplorer;