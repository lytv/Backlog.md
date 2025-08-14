import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface MermaidRendererProps {
    chart: string;
    id?: string;
}

declare global {
    interface Window {
        mermaid: {
            initialize: (config: any) => void;
            render: (id: string, definition: string) => Promise<{ svg: string }>;
            mermaidAPI: {
                render: (id: string, definition: string) => Promise<string>;
            };
        };
    }
}

const MermaidRenderer: React.FC<MermaidRendererProps> = ({ chart, id = 'mermaid-chart' }) => {
    const [svg, setSvg] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null);
    const uniqueId = useRef(`${id}-${Math.random().toString(36).substr(2, 9)}`);
    const { theme } = useTheme();

    useEffect(() => {
        const loadMermaid = async () => {
            try {
                setIsLoading(true);
                setError('');

                // Load Mermaid if not already loaded
                if (!window.mermaid) {
                    const script = document.createElement('script');
                    script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js';
                    script.async = true;

                    await new Promise((resolve, reject) => {
                        script.onload = resolve;
                        script.onerror = reject;
                        document.head.appendChild(script);
                    });
                }

                // Initialize Mermaid with configuration
                window.mermaid.initialize({
                    startOnLoad: false,
                    theme: theme === 'dark' ? 'dark' : 'default',
                    securityLevel: 'loose',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif',
                    fontSize: 14,
                    flowchart: {
                        useMaxWidth: true,
                        htmlLabels: true,
                        curve: 'basis'
                    },
                    sequence: {
                        useMaxWidth: true,
                        wrap: true
                    },
                    gantt: {
                        useMaxWidth: true,
                        numberSectionStyles: 4
                    },
                    er: {
                        useMaxWidth: true
                    },
                    journey: {
                        useMaxWidth: true
                    }
                });

                // Clean the chart definition
                const cleanChart = chart.trim();

                // Render the chart
                const { svg: renderedSvg } = await window.mermaid.render(uniqueId.current, cleanChart);
                setSvg(renderedSvg);

            } catch (err) {
                console.error('Mermaid rendering error:', err);
                setError(`Failed to render diagram: ${err instanceof Error ? err.message : 'Unknown error'}`);
            } finally {
                setIsLoading(false);
            }
        };

        if (chart) {
            loadMermaid();
        }
    }, [chart, theme]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-800 rounded border">
                <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    <span className="text-sm">Loading diagram...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                <div className="flex items-center space-x-2 text-red-700 dark:text-red-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <span className="text-sm font-medium">Diagram Error</span>
                </div>
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
                <details className="mt-2">
                    <summary className="text-xs text-red-500 dark:text-red-400 cursor-pointer">Show chart definition</summary>
                    <pre className="mt-1 text-xs bg-red-100 dark:bg-red-900/30 p-2 rounded overflow-x-auto">
                        <code>{chart}</code>
                    </pre>
                </details>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className="mermaid-container flex justify-center p-4 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: svg }}
        />
    );
};

export default MermaidRenderer;