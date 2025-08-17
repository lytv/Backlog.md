import React, { useState, useRef, useEffect } from 'react';

interface TerminalCreateModalProps {
	isOpen: boolean;
	onClose: () => void;
	onCreateTerminal: (name: string, workingDir: string) => void;
	defaultWorkingDir?: string;
	defaultName?: string;
}

const TerminalCreateModal: React.FC<TerminalCreateModalProps> = ({
	isOpen,
	onClose,
	onCreateTerminal,
	defaultWorkingDir = process.cwd?.() || '/Users/mac/tools/Backlog.md',
	defaultName = ''
}) => {
	const [terminalName, setTerminalName] = useState(defaultName);
	const [workingDirectory, setWorkingDirectory] = useState(defaultWorkingDir);
	const modalRef = useRef<HTMLDivElement>(null);
	const nameInputRef = useRef<HTMLInputElement>(null);

	// Reset form when modal opens
	useEffect(() => {
		if (isOpen) {
			setTerminalName(defaultName);
			setWorkingDirectory(defaultWorkingDir);
			// Focus on name input when modal opens
			setTimeout(() => {
				nameInputRef.current?.focus();
			}, 100);
		}
	}, [isOpen, defaultName, defaultWorkingDir]);

	// Handle escape key
	useEffect(() => {
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === 'Escape' && isOpen) {
				onClose();
			}
		};

		document.addEventListener('keydown', handleEscape);
		return () => document.removeEventListener('keydown', handleEscape);
	}, [isOpen, onClose]);

	// Handle backdrop click
	const handleBackdropClick = (e: React.MouseEvent) => {
		if (e.target === modalRef.current) {
			onClose();
		}
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		
		const finalName = terminalName.trim() || `Terminal ${new Date().toLocaleTimeString()}`;
		const finalWorkingDir = workingDirectory.trim() || defaultWorkingDir;
		
		onCreateTerminal(finalName, finalWorkingDir);
		onClose();
	};

	const handleCancel = () => {
		onClose();
	};

	if (!isOpen) return null;

	return (
		<div 
			ref={modalRef}
			className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
			onClick={handleBackdropClick}
		>
			<div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
					<h2 className="text-xl font-semibold text-gray-900 dark:text-white">
						New Session
					</h2>
					<button
						onClick={onClose}
						className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
					>
						<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>

				{/* Form */}
				<form onSubmit={handleSubmit} className="p-6 space-y-4">
					{/* Terminal Name */}
					<div>
						<label htmlFor="terminalName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
							Terminal Name (Optional):
						</label>
						<input
							ref={nameInputRef}
							id="terminalName"
							type="text"
							value={terminalName}
							onChange={(e) => setTerminalName(e.target.value)}
							placeholder="My Session"
							className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
						/>
					</div>

					{/* Working Directory */}
					<div>
						<label htmlFor="workingDirectory" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
							Working Directory:
						</label>
						<div className="flex">
							<input
								id="workingDirectory"
								type="text"
								value={workingDirectory}
								onChange={(e) => setWorkingDirectory(e.target.value)}
								placeholder="/path/to/directory"
								className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-l-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
							/>
							<button
								type="button"
								className="px-3 py-2 bg-gray-100 dark:bg-gray-600 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r-md hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
								title="Browse directory"
							>
								<svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z" />
								</svg>
							</button>
						</div>
					</div>

					{/* Actions */}
					<div className="flex justify-end space-x-3 pt-4">
						<button
							type="button"
							onClick={handleCancel}
							className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
						>
							Cancel
						</button>
						<button
							type="submit"
							className="px-6 py-2 text-sm font-medium text-white bg-green-600 dark:bg-green-700 rounded-md hover:bg-green-700 dark:hover:bg-green-600 transition-colors"
						>
							Create
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

export default TerminalCreateModal;