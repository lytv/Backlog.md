# Sprint Commands Documentation

## Available Commands

### TDD Assessment Command

**Command**: `/project:simone:task_tdd <Sprint_ID>`

**Purpose**: Evaluates all tasks in a sprint for TDD (Test-Driven Development) suitability.

**Usage Example**:
```
/project:simone:task_tdd S01_M01_Foundation_Infrastructure
```

**What it does**:
1. Analyzes all tasks in the specified sprint
2. Classifies tasks by type (Business Logic, UI, API, etc.)
3. Assigns TDD suitability score (1-10) to each task
4. Generates comprehensive report with recommendations
5. Saves report to `.simone/11_TDD_ASSESSMENTS/`

**When to use**:
- Before starting a new sprint to plan testing strategy
- To decide which tasks require TDD enforcement
- To configure TDD-Guard rules appropriately
- To allocate testing resources effectively

**Output**:
- Console summary with key findings
- Detailed report file with task-by-task analysis
- Actionable recommendations for testing approach

### TDD-Enhanced Task Processing

**Command**: `/project:simone:do_task_tdd <Task_ID>`

**Purpose**: Process tasks with integrated TDD workflow based on task complexity.

**Usage Example**:
```
/project:simone:do_task_tdd T01_S01
```

**What it does**:
1. All standard do_task functionality PLUS:
2. Reads TDD assessment score for the task
3. Configures appropriate TDD enforcement level
4. Enforces test-first development for high-score tasks
5. Runs unit tests as part of workflow
6. Performs testing quality review
7. Tracks TDD metrics (tests written, bugs caught)

**TDD Workflows by Score**:
- **8-10 (STRICT)**: Must write failing test before any code
- **5-7 (MODERATE)**: Flexible approach, test complex logic first
- **1-4 (RELAXED)**: Implementation-first allowed, test critical paths

### Testing Review Command

**Command**: `/project:simone:testing_review <Task_ID>`

**Purpose**: Validate test quality and coverage for completed work.

**Usage Example**:
```
/project:simone:testing_review T01_S01
```

**What it does**:
1. Analyzes test files structure
2. Runs coverage analysis
3. Checks for test anti-patterns
4. Validates TDD compliance based on enforcement level
5. Provides detailed quality report

**When to use**:
- After task completion to ensure quality
- During code review process
- To validate TDD compliance
- Before marking task as complete

## Integration with TDD-Guard

Based on assessment results:
- **Score 8-10**: Configure strict TDD-Guard enforcement
- **Score 5-7**: Use selective TDD rules
- **Score 1-4**: Focus on integration/manual testing instead

## TDD Configuration

Task-specific TDD settings are stored in `.simone/TDD_CONFIG.json`:
```json
{
  "tasks": {
    "T01_S01": {
      "tddScore": 9,
      "enforcement": "strict",
      "reason": "Complex business logic"
    }
  }
}
```

## Best Practices

1. **Always run TDD assessment** before starting sprint work
2. **Use do_task_tdd** for better test coverage and quality
3. **Review test quality** not just coverage numbers
4. **Track TDD metrics** to measure effectiveness
5. **Adjust enforcement** based on real-world experience
