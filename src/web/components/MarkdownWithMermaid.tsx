import React from 'react';
import MDEditor from '@uiw/react-md-editor';
import MermaidRenderer from './MermaidRenderer';

interface MarkdownWithMermaidProps {
  source: string;
  className?: string;
}

const MarkdownWithMermaid: React.FC<MarkdownWithMermaidProps> = ({ source, className = '' }) => {
  // Parse the markdown content to extract Mermaid diagrams
  const parseContent = (content: string) => {
    const parts: Array<{ type: 'markdown' | 'mermaid' | 'html-mermaid'; content: string; id?: string }> = [];
    
    // First, handle HTML-embedded Mermaid diagrams
    const htmlMermaidRegex = /<!DOCTYPE html>[\s\S]*?<div class="mermaid">([\s\S]*?)<\/div>[\s\S]*?<\/html>/gi;
    let lastIndex = 0;
    let match;
    
    while ((match = htmlMermaidRegex.exec(content)) !== null) {
      // Add markdown content before this match
      if (match.index > lastIndex) {
        const beforeContent = content.slice(lastIndex, match.index).trim();
        if (beforeContent) {
          parts.push({ type: 'markdown', content: beforeContent });
        }
      }
      
      // Add the Mermaid diagram
      const mermaidContent = match[1].trim();
      if (mermaidContent) {
        parts.push({ 
          type: 'html-mermaid', 
          content: mermaidContent,
          id: `html-mermaid-${parts.length}`
        });
      }
      
      lastIndex = htmlMermaidRegex.lastIndex;
    }
    
    // Add remaining content
    if (lastIndex < content.length) {
      const remainingContent = content.slice(lastIndex).trim();
      if (remainingContent) {
        // Check for standard Mermaid code blocks in the remaining content
        const mermaidCodeBlockRegex = /```mermaid\n([\s\S]*?)\n```/gi;
        let remainingLastIndex = 0;
        let remainingMatch;
        
        while ((remainingMatch = mermaidCodeBlockRegex.exec(remainingContent)) !== null) {
          // Add markdown content before this match
          if (remainingMatch.index > remainingLastIndex) {
            const beforeContent = remainingContent.slice(remainingLastIndex, remainingMatch.index).trim();
            if (beforeContent) {
              parts.push({ type: 'markdown', content: beforeContent });
            }
          }
          
          // Add the Mermaid diagram
          const mermaidContent = remainingMatch[1].trim();
          if (mermaidContent) {
            parts.push({ 
              type: 'mermaid', 
              content: mermaidContent,
              id: `code-mermaid-${parts.length}`
            });
          }
          
          remainingLastIndex = mermaidCodeBlockRegex.lastIndex;
        }
        
        // Add final remaining content
        if (remainingLastIndex < remainingContent.length) {
          const finalContent = remainingContent.slice(remainingLastIndex).trim();
          if (finalContent) {
            parts.push({ type: 'markdown', content: finalContent });
          }
        } else if (parts.length === 0) {
          // No Mermaid found in remaining content, add it all as markdown
          parts.push({ type: 'markdown', content: remainingContent });
        }
      }
    }
    
    // If no parts were found, treat the entire content as markdown
    if (parts.length === 0) {
      parts.push({ type: 'markdown', content: content });
    }
    
    return parts;
  };

  const contentParts = parseContent(source);

  return (
    <div className={`markdown-with-mermaid ${className}`}>
      {contentParts.map((part, index) => {
        if (part.type === 'mermaid' || part.type === 'html-mermaid') {
          return (
            <div key={`${part.id || index}`} className="my-4">
              <MermaidRenderer 
                chart={part.content} 
                id={part.id || `mermaid-${index}`}
              />
            </div>
          );
        } else {
          return (
            <div key={`markdown-${index}`} className="prose prose-sm !max-w-none">
              <MDEditor.Markdown source={part.content} />
            </div>
          );
        }
      })}
    </div>
  );
};

export default MarkdownWithMermaid;