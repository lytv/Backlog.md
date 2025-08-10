import React, {useState, useEffect, memo, useCallback} from 'react';
import {useParams, useNavigate, useSearchParams} from 'react-router-dom';
import {apiClient} from '../lib/api';
import MDEditor from '@uiw/react-md-editor';
import {type Milestone} from '../../types';
import ErrorBoundary from '../components/ErrorBoundary';
import {SuccessToast} from './SuccessToast';
import { useTheme } from '../contexts/ThemeContext';
import { sanitizeUrlTitle } from '../utils/urlHelpers';

// Custom MDEditor wrapper for proper height handling
const MarkdownEditor = memo(function MarkdownEditor({
	value,
	onChange,
	isEditing
}: {
    value: string;
    onChange?: (val: string | undefined) => void;
    isEditing: boolean;
    isReadonly?: boolean;
}) {
    const { theme } = useTheme();
    if (!isEditing) {
        // Preview mode - just show the rendered markdown without editor UI
        return (
            <div
                className="prose prose-sm !max-w-none w-full p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
                data-color-mode={theme}>
                <MDEditor.Markdown source={value}/>
            </div>
        );
    }

    // Edit mode - show full editor that fills the available space
    return (
        <div className="h-full w-full flex flex-col">
            <div className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
                <MDEditor
                    value={value}
                    onChange={onChange}
                    preview="edit"
                    height="100%"
                    hideToolbar={false}
                    data-color-mode={theme}
                    textareaProps={{
                        placeholder: 'Write your milestone content here...',
                        style: {
                            fontSize: '14px',
                            resize: 'none'
                        }
                    }}
                />
            </div>
        </div>
    );
});

// Utility function to add milestone prefix for API calls
const addMilestonePrefix = (id: string): string => {
    return id.startsWith('milestone-') ? id : `milestone-${id}`;
};

interface MilestoneDetailProps {
    milestones: Milestone[];
    onRefreshData: () => Promise<void>;
}

export default function MilestoneDetail({milestones, onRefreshData}: MilestoneDetailProps) {
    const {id, title} = useParams<{ id: string; title: string }>();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [milestone, setMilestone] = useState<Milestone | null>(null);
    const [content, setContent] = useState<string>('');
    const [originalContent, setOriginalContent] = useState<string>('');
    const [milestoneTitle, setMilestoneTitle] = useState<string>('');
    const [originalMilestoneTitle, setOriginalMilestoneTitle] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [, setError] = useState<Error | null>(null);
    const [saveError, setSaveError] = useState<Error | null>(null);
    const [isNewMilestone, setIsNewMilestone] = useState(false);
    const [showSaveSuccess, setShowSaveSuccess] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (id === 'new') {
            // Handle new milestone creation
            setIsNewMilestone(true);
            setIsEditing(true);
            setIsLoading(false);
            setMilestoneTitle('');
            setOriginalMilestoneTitle('');
            setContent('');
            setOriginalContent('');
        } else if (id) {
            setIsNewMilestone(false);
            setIsEditing(false); // Ensure we start in preview mode for existing milestones
            loadMilestoneContent();
        }
    }, [id, milestones]);

    // Check for edit query parameter to start in edit mode
    useEffect(() => {
        if (searchParams.get('edit') === 'true') {
            setIsEditing(true);
            // Remove the edit parameter from URL
            setSearchParams(params => {
                params.delete('edit');
                return params;
            });
        }
    }, [searchParams, setSearchParams]);

    const loadMilestoneContent = useCallback(async () => {
        if (!id) return;

        try {
            setIsLoading(true);
            setError(null);
            // Find milestone from props
            const prefixedId = addMilestonePrefix(id);
            const ms = milestones.find(m => m.id === prefixedId);
            
            // Always try to fetch the milestone from API, whether we found it in milestones or not
            // This ensures deep linking works even before the parent component loads the milestones array
            try {
                const fullMilestone = await apiClient.fetchMilestone(prefixedId);
                setContent(fullMilestone.body || '');
                setOriginalContent(fullMilestone.body || '');
                setMilestoneTitle(fullMilestone.title || '');
                setOriginalMilestoneTitle(fullMilestone.title || '');
                // Update milestone state with full data
                setMilestone(fullMilestone);
            } catch (fetchError) {
                // If fetch fails and we don't have the milestone in props, show error
                if (!ms) {
                    setError(new Error(`Milestone with ID "${prefixedId}" not found`));
                    console.error('Failed to load milestone:', fetchError);
                } else {
                    // We have basic info from props even if fetch failed
                    setMilestone(ms);
                    setMilestoneTitle(ms.title || '');
                    setOriginalMilestoneTitle(ms.title || '');
                }
            }
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Failed to load milestone');
            setError(error);
            console.error('Failed to load milestone:', error);
        } finally {
            setIsLoading(false);
        }
    }, [id, milestones]);

    const handleSave = useCallback(async () => {
        if (!milestoneTitle.trim()) {
            setSaveError(new Error('Milestone title is required'));
            return;
        }

        try {
            setIsSaving(true);
            setSaveError(null);

            if (isNewMilestone) {
                // Create new milestone
                const result = await apiClient.createMilestone(milestoneTitle, content);
                // Refresh data and navigate to the new milestone
                await onRefreshData();
                // Show success toast
                setShowSaveSuccess(true);
                setTimeout(() => setShowSaveSuccess(false), 4000);
                // Exit edit mode and navigate to the new milestone
                setIsEditing(false);
                setIsNewMilestone(false);
                // Use the returned milestone ID for navigation
                const milestoneId = result.id.replace('milestone-', ''); // Remove prefix for URL
                navigate(`/milestones/${milestoneId}/${sanitizeUrlTitle(milestoneTitle)}`);
            } else {
                // Update existing milestone
                if (!id) return;
                await apiClient.updateMilestone(addMilestonePrefix(id), content);
                // Refresh data from parent
                await onRefreshData();
                // Show success toast
                setShowSaveSuccess(true);
                setTimeout(() => setShowSaveSuccess(false), 4000);
                // Exit edit mode and navigate to milestone detail page (this will load in preview mode)
                setIsEditing(false);
                navigate(`/milestones/${id}/${sanitizeUrlTitle(milestoneTitle)}`);
            }
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Failed to save milestone');
            setSaveError(error);
            console.error('Failed to save milestone:', error);
        } finally {
            setIsSaving(false);
        }
    }, [id, milestoneTitle, content, isNewMilestone, onRefreshData, navigate, loadMilestoneContent]);

    const handleEdit = () => {
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        if (isNewMilestone) {
            // Navigate back for new milestones
            navigate('/milestones');
        } else {
            // Revert changes for existing milestones
            setContent(originalContent);
            setMilestoneTitle(originalMilestoneTitle);
            setIsEditing(false);
        }
    };

    const handleDelete = useCallback(async () => {
        if (!id || isNewMilestone) return;

        try {
            setIsDeleting(true);
            setSaveError(null);
            
            await apiClient.deleteMilestone(addMilestonePrefix(id));
            
            // Refresh data and navigate back to milestones list
            await onRefreshData();
            navigate('/milestones');
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Failed to delete milestone');
            setSaveError(error);
            console.error('Failed to delete milestone:', error);
        } finally {
            setIsDeleting(false);
            setShowDeleteConfirm(false);
        }
    }, [id, isNewMilestone, onRefreshData, navigate]);

    const hasChanges = content !== originalContent || milestoneTitle !== originalMilestoneTitle;

    if (!id) {
        return (
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor"
                         viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No milestone selected</h3>
                    <p className="mt-1 text-sm text-gray-500">Select a milestone from the sidebar to view its
                        content.</p>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }

    return (
        <ErrorBoundary>
            <div className="h-full bg-white dark:bg-gray-900 flex flex-col transition-colors duration-200">
                {/* Header Section - Confluence/Linear Style */}
                <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 transition-colors duration-200">
                    <div className="max-w-4xl mx-auto px-8 py-6">
                        <div className="flex items-start justify-between mb-6">
                            <div className="flex-1">
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={milestoneTitle}
                                        onChange={(e) => setMilestoneTitle(e.target.value)}
                                        className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2 w-full bg-transparent border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors duration-200"
                                        placeholder="Milestone title"
                                    />
                                ) : (
                                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2 transition-colors duration-200">
                                        {milestoneTitle || milestone?.title || (title ? decodeURIComponent(title) : `Milestone ${id}`)}
                                    </h1>
                                )}
                                <div className="flex items-center space-x-6 text-sm text-gray-500 dark:text-gray-400 transition-colors duration-200">
                                    <div className="flex items-center space-x-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a.997.997 0 01-1.414 0l-7-7A1.997 1.997 0 013 12V7a4 4 0 014-4z"/>
                                        </svg>
                                        <span>ID: {milestone?.id || `milestone-${id}`}</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
                                        </svg>
                                        <span>Milestone</span>
                                    </div>
                                    {milestone?.createdDate && (
                                        <div className="flex items-center space-x-2">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor"
                                                 viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                            </svg>
                                            <span>Created: {milestone.createdDate}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center space-x-3 ml-6">
                                {!isEditing ? (
                                    <>
                                        <button
                                            onClick={handleEdit}
                                            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-colors duration-200"
                                        >
                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor"
                                                 viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                            </svg>
                                            Edit
                                        </button>
                                        {!isNewMilestone && (
                                            <button
                                                onClick={() => setShowDeleteConfirm(true)}
                                                className="inline-flex items-center px-4 py-2 border border-red-300 dark:border-red-600 rounded-lg text-sm font-medium text-red-700 dark:text-red-300 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-colors duration-200"
                                            >
                                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor"
                                                     viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                                </svg>
                                                Delete
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={handleCancelEdit}
                                            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-colors duration-200 cursor-pointer"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSave}
                                            disabled={!hasChanges || isSaving}
                                            className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-colors duration-200 ${
                                                hasChanges && !isSaving
                                                    ? 'bg-blue-600 dark:bg-blue-600 text-white hover:bg-blue-700 dark:hover:bg-blue-700 focus:ring-blue-500 dark:focus:ring-blue-400 cursor-pointer'
                                                    : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                                            }`}
                                        >
                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor"
                                                 viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                      d="M5 13l4 4L19 7"/>
                                            </svg>
                                            {isSaving ? 'Saving...' : 'Save'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Section */}
                <div className="flex-1 bg-gray-50 dark:bg-gray-800 transition-colors duration-200 flex flex-col">
                    <div className="flex-1 p-8 flex flex-col min-h-0">
                        <MarkdownEditor
                            value={content}
                            onChange={(val) => setContent(val || '')}
                            isEditing={isEditing}
                        />
                    </div>
                </div>

                {/* Save Error Alert */}
                {saveError && (
                    <div className="border-t border-red-200 bg-red-50 px-8 py-3">
                        <div className="flex items-center space-x-3">
                            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                            </svg>
                            <span className="text-sm text-red-700">Failed to save: {saveError.message}</span>
                            <button
                                onClick={() => setSaveError(null)}
                                className="ml-auto text-red-700 hover:text-red-900"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                          d="M6 18L18 6M6 6l12 12"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
                        <div className="flex items-center mb-4">
                            <svg className="w-6 h-6 text-red-600 dark:text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Delete Milestone</h3>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                            Are you sure you want to delete "{milestoneTitle || milestone?.title}"? This action cannot be undone.
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                disabled={isDeleting}
                                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400 transition-colors duration-200"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 dark:bg-red-600 border border-transparent rounded-lg hover:bg-red-700 dark:hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isDeleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Save Success Toast */}
            {showSaveSuccess && (
                <SuccessToast
                    message={`Milestone "${milestoneTitle}" saved successfully!`}
                    onDismiss={() => setShowSaveSuccess(false)}
                    icon={
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                    }
                />
            )}
        </ErrorBoundary>
    );
}