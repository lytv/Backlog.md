export interface ProjectProgress {
	milestones: MilestoneProgress[];
	sprints: SprintProgress[];
	overallMetrics: ProjectMetrics;
	timeline: TimelineData;
	healthIndicators: HealthMetrics;
}

export interface MilestoneProgress {
	id: string; // M01, M02, etc.
	directoryName: string; // M01_Foundation_and_Authentication
	name: string;
	status: "not_started" | "in_progress" | "completed" | "blocked";
	completionPercentage: number;
	sprints: string[]; // Sprint IDs
	deliverables: string[];
	startWeek: number;
	endWeek: number;
	dependencies: string[];
	risks: string[];
	estimatedDuration: number;
	actualDuration?: number;
	keyFeatures: string[];
	phase: string; // Foundation, Core Features, etc.
}

export interface SprintProgress {
	id: string; // S01_M01_Foundation_Infrastructure
	milestone: string; // M01
	title: string;
	status: "planned" | "active" | "completed" | "overdue";
	progress: {
		totalTasks: number;
		completedTasks: number; // TX prefix count
		pendingTasks: number; // T prefix count
		completionRate: number; // percentage
		velocity: number; // tasks per day
	};
	timeline: {
		startDate: string;
		endDate: string;
		actualStartDate?: string;
		actualEndDate?: string;
		durationWeeks: number;
	};
	team: {
		size: number;
		allocation: string[];
	};
	metadata: {
		goal: string;
		keyDeliverables: string[];
		successCriteria: string[];
		dependencies: string[];
		risks: string[];
	};
}

export interface ProjectMetrics {
	overall: {
		totalMilestones: number;
		completedMilestones: number;
		activeMilestones: number;
		blockedMilestones: number;
		progressPercentage: number;
	};
	sprints: {
		totalSprints: number;
		completedSprints: number;
		activeSprints: number;
		averageVelocity: number;
	};
	tasks: {
		totalTasks: number;
		completedTasks: number;
		pendingTasks: number;
		completionRate: number;
	};
	timeline: {
		projectStartDate: string;
		estimatedEndDate: string;
		currentWeek: number;
		totalWeeks: number;
		progressPercentage: number;
		onTrack: boolean;
	};
	performance: {
		averageSprintCompletion: number;
		taskVelocity: number;
		riskScore: number;
		healthScore: number;
	};
}

export interface HealthMetrics {
	overallHealth: "healthy" | "at_risk" | "critical";
	issues: {
		overduesprints: SprintProgress[];
		blockedMilestones: MilestoneProgress[];
		riskFactors: string[];
		recommendations: string[];
	};
	trends: {
		velocityTrend: "improving" | "stable" | "declining";
		completionTrend: "ahead" | "on_track" | "behind";
	};
}

export interface TimelineData {
	milestones: {
		id: string;
		name: string;
		startWeek: number;
		endWeek: number;
		status: string;
	}[];
	sprints: {
		id: string;
		milestone: string;
		startDate: string;
		endDate: string;
		status: string;
	}[];
}

export interface TaskDetail {
	id: string;
	title: string;
	status: "pending" | "completed";
	fileName: string;
	path: string;
	estimatedHours?: number;
	actualHours?: number;
	assignee?: string;
	priority?: "high" | "medium" | "low";
	dependencies?: string[];
	description?: string;
}

export interface SprintTaskBreakdown {
	sprint: SprintProgress;
	tasks: {
		completed: TaskDetail[];
		pending: TaskDetail[];
		breakdown: {
			totalTasks: number;
			completedTasks: number;
			pendingTasks: number;
			completionRate: number;
			estimatedHours: number;
			actualHours: number;
			efficiency: number;
		};
	};
}

export interface MilestoneRequirements {
	id: string;
	name: string;
	description: string;
	deliverables: string[];
	keyFeatures: string[];
	dependencies: string[];
	successMetrics: string[];
	qualityGates: string[];
	riskMitigation: string[];
	resourceAllocation: {
		developers: number;
		weeks: number;
		specializations: string[];
	};
}

// For API responses
export interface ProjectProgressResponse {
	success: boolean;
	data: ProjectProgress;
	timestamp: string;
	version: string;
}

export interface MilestoneProgressResponse {
	success: boolean;
	data: {
		milestone: MilestoneProgress;
		sprints: SprintProgress[];
		progress: {
			completionPercentage: number;
			status: string;
		};
	};
	timestamp: string;
}

export interface SprintProgressResponse {
	success: boolean;
	data: SprintTaskBreakdown;
	timestamp: string;
}