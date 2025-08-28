#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

/**
 * Script to sync sprint tasks to backlog tasks
 * Usage: node scripts/sync-sprint-to-backlog.js <sprint-path>
 * Example: node scripts/sync-sprint-to-backlog.js .simone/03_SPRINTS/S01_M01_Foundation_Infrastructure
 */

function parseSprintTask(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');

  // Extract task_id from frontmatter
  const taskIdMatch = content.match(/- \*\*task_id\*\*:\s*(.+)/);
  const taskId = taskIdMatch ? taskIdMatch[1].trim() : path.basename(filePath, '.md');

  // Use filename without .md extension as title
  const title = path.basename(filePath, '.md');

  // Extract description
  const descMatch = content.match(/## Description\s*\n((?:[^#]|#(?!# ))*)/);
  const description = descMatch ? descMatch[1].trim() : 'No description available';

  return {
    taskId,
    title,
    description,
  };
}

function getNextBacklogTaskId() {
  const backlogDir = 'backlog/tasks';
  if (!fs.existsSync(backlogDir)) {
    return 'task-001';
  }

  const files = fs.readdirSync(backlogDir);
  const taskNumbers = files
    .filter(file => file.startsWith('task-') && file.endsWith('.md'))
    .map((file) => {
      const match = file.match(/task-(\d+)/);
      return match ? Number.parseInt(match[1]) : 0;
    })
    .filter(num => num > 0);

  const nextNum = taskNumbers.length > 0 ? Math.max(...taskNumbers) + 1 : 1;
  return `task-${nextNum.toString().padStart(3, '0')}`;
}

function createBacklogTask(sprintTask, backlogTaskId, sprintName) {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 16).replace('T', ' ');

  const frontmatter = `---
id: ${backlogTaskId}
title: ${sprintTask.title}
status: To Do
assignee: []
created_date: '${dateStr}'
labels: []
dependencies: []
sprint_source: ${sprintName}
---

## Description

${sprintTask.description}
`;

  const filename = `${backlogTaskId} - ${sprintTask.title.toLowerCase().replace(/\s+/g, '-')}.md`;
  const filepath = path.join('backlog/tasks', filename);

  fs.writeFileSync(filepath, frontmatter);
  return { filename, filepath };
}

function main() {
  const sprintPath = process.argv[2];

  if (!sprintPath) {
    console.error('Usage: node scripts/sync-sprint-to-backlog.js <sprint-path>');
    console.error('Example: node scripts/sync-sprint-to-backlog.js .simone/03_SPRINTS/S01_M01_Foundation_Infrastructure');
    process.exit(1);
  }

  if (!fs.existsSync(sprintPath)) {
    console.error(`Sprint path does not exist: ${sprintPath}`);
    process.exit(1);
  }

  // Ensure backlog/tasks directory exists
  const backlogDir = 'backlog/tasks';
  if (!fs.existsSync(backlogDir)) {
    fs.mkdirSync(backlogDir, { recursive: true });
  }

  // Find all task files in sprint directory
  const files = fs.readdirSync(sprintPath);
  const taskFiles = files.filter(file =>
    file.match(/^T\d+[A-Z]?_S\d+_.+\.md$/) && !file.startsWith('TX'),
  );

  console.log(`Found ${taskFiles.length} sprint tasks to sync`);

  // Extract sprint name from path
  const sprintName = path.basename(sprintPath);

  const createdTasks = [];

  for (const taskFile of taskFiles) {
    const taskPath = path.join(sprintPath, taskFile);

    try {
      const sprintTask = parseSprintTask(taskPath);
      const backlogTaskId = getNextBacklogTaskId();
      const result = createBacklogTask(sprintTask, backlogTaskId, sprintName);

      createdTasks.push({
        sprintTask: sprintTask.taskId,
        backlogTask: backlogTaskId,
        filename: result.filename,
      });

      console.log(`✓ Created: ${result.filename}`);
    } catch (error) {
      console.error(`✗ Error processing ${taskFile}:`, error.message);
    }
  }

  console.log(`\n🎉 Successfully synced ${createdTasks.length} tasks to backlog`);
  console.log('\nCreated tasks:');
  createdTasks.forEach((task) => {
    console.log(`  ${task.sprintTask} → ${task.backlogTask}`);
  });
}

if (require.main === module) {
  main();
}

module.exports = { parseSprintTask, createBacklogTask, getNextBacklogTaskId };
