import { describe, expect, it } from "bun:test";
import { generateKanbanBoardWithMetadata } from "../board.ts";
import type { Task } from "../types/index.ts";

describe("Sprint Filter", () => {
	const mockTasks: Task[] = [
		{
			id: "task-001",
			title: "Task 1",
			status: "To Do",
			assignee: [],
			createdDate: "2025-01-01",
			labels: [],
			dependencies: [],
			body: "Task 1 description",
			sprint_source: "S01_M01_Sprint_One",
		},
		{
			id: "task-002", 
			title: "Task 2",
			status: "In Progress",
			assignee: [],
			createdDate: "2025-01-02",
			labels: [],
			dependencies: [],
			body: "Task 2 description",
			sprint_source: "S01_M02_Sprint_Two",
		},
		{
			id: "task-003",
			title: "Task 3", 
			status: "Done",
			assignee: [],
			createdDate: "2025-01-03",
			labels: [],
			dependencies: [],
			body: "Task 3 description",
			sprint_source: "S01_M01_Sprint_One",
		},
		{
			id: "task-004",
			title: "Task 4",
			status: "To Do", 
			assignee: [],
			createdDate: "2025-01-04",
			labels: [],
			dependencies: [],
			body: "Task 4 description",
			// No sprint_source
		},
	];

	const statuses = ["To Do", "In Progress", "Done"];

	it("should filter tasks by sprint_source", () => {
		const board = generateKanbanBoardWithMetadata(mockTasks, statuses, "Test Project", {
			sprintFilter: "S01_M01_Sprint_One",
		});

		// Should only include task-001 and task-003
		expect(board).toContain("TASK-001");
		expect(board).toContain("TASK-003");
		expect(board).not.toContain("TASK-002");
		expect(board).not.toContain("TASK-004");
	});

	it("should show all tasks when no sprint filter is applied", () => {
		const board = generateKanbanBoardWithMetadata(mockTasks, statuses, "Test Project");

		expect(board).toContain("TASK-001");
		expect(board).toContain("TASK-002");
		expect(board).toContain("TASK-003");
		expect(board).toContain("TASK-004");
	});

	it("should show no tasks message when sprint filter matches no tasks", () => {
		const board = generateKanbanBoardWithMetadata(mockTasks, statuses, "Test Project", {
			sprintFilter: "NonExistentSprint",
		});

		expect(board).toContain("No tasks found");
	});

	it("should handle tasks without sprint_source when filtering", () => {
		const board = generateKanbanBoardWithMetadata(mockTasks, statuses, "Test Project", {
			sprintFilter: "S01_M02_Sprint_Two",
		});

		// Should only include task-002
		expect(board).toContain("TASK-002");
		expect(board).not.toContain("TASK-001");
		expect(board).not.toContain("TASK-003");
		expect(board).not.toContain("TASK-004");
	});
});