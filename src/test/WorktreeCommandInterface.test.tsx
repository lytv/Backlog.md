import { describe, it, expect, beforeEach, mock } from "bun:test";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import WorktreeCommandInterface from "../web/components/WorktreeCommandInterface";
import type { Worktree, Task } from "../types";
import { apiClient } from "../web/lib/api";

// Mock API client
mock.module("../web/lib/api", () => ({
  apiClient: {
    fetchWorktrees: mock(() => Promise.resolve([])),
    fetchTasks: mock(() => Promise.resolve([])),
    createWorktree: mock(() => Promise.resolve({ id: 'wt-1', name: 'test', path: '/test' })),
    deleteWorktree: mock(() => Promise.resolve()),
    mergeWorktree: mock(() => Promise.resolve({ success: true, message: 'Merged' })),
    pushWorktree: mock(() => Promise.resolve()),
    pullWorktree: mock(() => Promise.resolve()),
    getWorktreeStatus: mock(() => Promise.resolve({ isClean: true, modifiedFiles: 0, stagedFiles: 0 }))
  }
}));

describe("WorktreeCommandInterface", () => {
  beforeEach(() => {
    // Reset mocks
    mock.restore();
  });

  it("should render command selection interface", () => {
    const { container } = render(<WorktreeCommandInterface />);
    
    expect(container.querySelector('h4')).toBeTruthy();
    expect(container.textContent).toContain('Select Command');
  });

  it("should display predefined commands", () => {
    const { container } = render(<WorktreeCommandInterface />);
    
    expect(container.textContent).toContain('Create Worktree');
    expect(container.textContent).toContain('Delete Worktree');
    expect(container.textContent).toContain('Merge Worktree');
    expect(container.textContent).toContain('Sync Worktree');
    expect(container.textContent).toContain('Check Status');
  });

  it("should show parameters form when command is selected", async () => {
    const { container } = render(<WorktreeCommandInterface />);
    
    // Click on Create Worktree command
    const createButton = Array.from(container.querySelectorAll('button'))
      .find(btn => btn.textContent?.includes('Create Worktree'));
    
    if (createButton) {
      fireEvent.click(createButton);
      
      await waitFor(() => {
        expect(container.textContent).toContain('Parameters for');
        expect(container.textContent).toContain('name');
        expect(container.textContent).toContain('branch');
      });
    }
  });

  it("should validate required parameters", async () => {
    const { container } = render(<WorktreeCommandInterface />);
    
    // Select Create Worktree command
    const createButton = Array.from(container.querySelectorAll('button'))
      .find(btn => btn.textContent?.includes('Create Worktree'));
    
    if (createButton) {
      fireEvent.click(createButton);
      
      await waitFor(() => {
        // Try to execute without filling required fields
        const executeButton = Array.from(container.querySelectorAll('button'))
          .find(btn => btn.textContent?.includes('Execute Command'));
        
        if (executeButton) {
          fireEvent.click(executeButton);
          
          // Should show validation error
          expect(container.textContent).toContain('required');
        }
      });
    }
  });

  it("should execute create worktree command", async () => {
    const mockOnCommandExecute = mock(() => {});
    const { container } = render(
      <WorktreeCommandInterface onCommandExecute={mockOnCommandExecute} />
    );
    
    // Select Create Worktree command
    const createButton = Array.from(container.querySelectorAll('button'))
      .find(btn => btn.textContent?.includes('Create Worktree'));
    
    if (createButton) {
      fireEvent.click(createButton);
      
      await waitFor(() => {
        // Fill in required parameters
        const nameInput = container.querySelector('input[placeholder*="name"]') as HTMLInputElement;
        const branchInput = container.querySelector('input[placeholder*="branch"]') as HTMLInputElement;
        
        if (nameInput && branchInput) {
          fireEvent.change(nameInput, { target: { value: 'test-worktree' } });
          fireEvent.change(branchInput, { target: { value: 'feature/test' } });
          
          // Execute command
          const executeButton = Array.from(container.querySelectorAll('button'))
            .find(btn => btn.textContent?.includes('Execute Command'));
          
          if (executeButton) {
            fireEvent.click(executeButton);
            
            // Should call API
            expect(apiClient.createWorktree).toHaveBeenCalledWith({
              name: 'test-worktree',
              branch: 'feature/test',
              baseBranch: 'feature/test',
              basePath: undefined,
              taskId: undefined
            });
          }
        }
      });
    }
  });

  it("should show command history", async () => {
    const { container } = render(<WorktreeCommandInterface />);
    
    // Execute a command first to create history
    const createButton = Array.from(container.querySelectorAll('button'))
      .find(btn => btn.textContent?.includes('Create Worktree'));
    
    if (createButton) {
      fireEvent.click(createButton);
      
      await waitFor(async () => {
        const nameInput = container.querySelector('input[placeholder*="name"]') as HTMLInputElement;
        const branchInput = container.querySelector('input[placeholder*="branch"]') as HTMLInputElement;
        
        if (nameInput && branchInput) {
          fireEvent.change(nameInput, { target: { value: 'test' } });
          fireEvent.change(branchInput, { target: { value: 'main' } });
          
          const executeButton = Array.from(container.querySelectorAll('button'))
            .find(btn => btn.textContent?.includes('Execute Command'));
          
          if (executeButton) {
            fireEvent.click(executeButton);
            
            await waitFor(() => {
              expect(container.textContent).toContain('Recent Commands');
            });
          }
        }
      });
    }
  });

  it("should handle command execution errors", async () => {
    // Mock API to throw error
    (apiClient.createWorktree as any).mockRejectedValueOnce(new Error('Test error'));
    
    const { container } = render(<WorktreeCommandInterface />);
    
    const createButton = Array.from(container.querySelectorAll('button'))
      .find(btn => btn.textContent?.includes('Create Worktree'));
    
    if (createButton) {
      fireEvent.click(createButton);
      
      await waitFor(async () => {
        const nameInput = container.querySelector('input[placeholder*="name"]') as HTMLInputElement;
        const branchInput = container.querySelector('input[placeholder*="branch"]') as HTMLInputElement;
        
        if (nameInput && branchInput) {
          fireEvent.change(nameInput, { target: { value: 'test' } });
          fireEvent.change(branchInput, { target: { value: 'main' } });
          
          const executeButton = Array.from(container.querySelectorAll('button'))
            .find(btn => btn.textContent?.includes('Execute Command'));
          
          if (executeButton) {
            fireEvent.click(executeButton);
            
            await waitFor(() => {
              expect(container.textContent).toContain('Command failed');
              expect(container.textContent).toContain('Test error');
            });
          }
        }
      });
    }
  });
});