/**
 * Recipe Scheduling Engine
 * Based on PRD Section 9.3: Coach mode scheduling
 */

import {
  RecipeGraph,
  OperationNode,
  Task,
  CoachModeState,
  ScheduleParams,
  ScheduleResult,
  TimelineEvent
} from '../types/recipe';

export class RecipeScheduler {
  private graph: RecipeGraph;
  private operationNodes: OperationNode[];

  constructor(graph: RecipeGraph) {
    this.graph = graph;
    this.operationNodes = graph.nodes.filter((n): n is OperationNode => n.type === 'operation');
  }

  /**
   * Perform topological sort of operation nodes
   * Returns operations in dependency order
   */
  topologicalSort(): OperationNode[] {
    const adjList = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    // Initialize
    for (const op of this.operationNodes) {
      adjList.set(op.id, []);
      inDegree.set(op.id, 0);
    }

    // Build adjacency list and in-degree count
    for (const edge of this.graph.edges) {
      if (edge.type === 'must-follow') {
        // Direct operation -> operation dependency
        if (adjList.has(edge.from) && adjList.has(edge.to)) {
          adjList.get(edge.from)!.push(edge.to);
          inDegree.set(edge.to, (inDegree.get(edge.to) || 0) + 1);
        }
      } else if (edge.type === 'consumes') {
        // Resource -> Operation dependency
        // Find which operation produces this resource
        const producesEdge = this.graph.edges.find(
          e => e.type === 'produces' && e.to === edge.from
        );
        if (producesEdge && adjList.has(producesEdge.from) && adjList.has(edge.to)) {
          adjList.get(producesEdge.from)!.push(edge.to);
          inDegree.set(edge.to, (inDegree.get(edge.to) || 0) + 1);
        }
      }
    }

    // Kahn's algorithm for topological sort
    const queue: OperationNode[] = [];
    const result: OperationNode[] = [];

    // Start with nodes that have no dependencies
    for (const op of this.operationNodes) {
      if (inDegree.get(op.id) === 0) {
        queue.push(op);
      }
    }

    // Sort queue by original step index if available
    queue.sort((a, b) => (a.originalStepIndex || 0) - (b.originalStepIndex || 0));

    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);

      const neighbors = adjList.get(current.id) || [];
      for (const neighborId of neighbors) {
        inDegree.set(neighborId, inDegree.get(neighborId)! - 1);
        if (inDegree.get(neighborId) === 0) {
          const neighborNode = this.operationNodes.find(n => n.id === neighborId)!;
          queue.push(neighborNode);
        }
      }

      // Re-sort queue to maintain original order preference
      queue.sort((a, b) => (a.originalStepIndex || 0) - (b.originalStepIndex || 0));
    }

    return result;
  }

  /**
   * Create tasks from operations
   */
  createTasks(): Task[] {
    const sortedOps = this.topologicalSort();
    const tasks: Task[] = [];

    for (const op of sortedOps) {
      const dependencies = this.getOperationDependencies(op.id);

      tasks.push({
        id: `task_${op.id}`,
        operationId: op.id,
        name: op.name,
        description: this.buildTaskDescription(op),
        timing: op.timing,
        equipment: op.equipment,
        status: 'pending',
        dependencies: dependencies.map(depId => `task_${depId}`)
      });
    }

    return tasks;
  }

  /**
   * Get operation dependencies (operations that must complete before this one)
   */
  private getOperationDependencies(operationId: string): string[] {
    const dependencies = new Set<string>();

    // Check must-follow edges
    for (const edge of this.graph.edges) {
      if (edge.type === 'must-follow' && edge.to === operationId) {
        dependencies.add(edge.from);
      }
    }

    // Check resource dependencies (operations that produce consumed resources)
    const consumedResources = this.graph.edges
      .filter(e => e.type === 'consumes' && e.to === operationId)
      .map(e => e.from);

    for (const resourceId of consumedResources) {
      const producingEdge = this.graph.edges.find(
        e => e.type === 'produces' && e.to === resourceId
      );
      if (producingEdge) {
        dependencies.add(producingEdge.from);
      }
    }

    return Array.from(dependencies);
  }

  /**
   * Build a human-readable task description
   */
  private buildTaskDescription(op: OperationNode): string {
    const parts: string[] = [];

    if (op.timing) {
      if (op.timing.active_sec > 0) {
        parts.push(`Active: ${this.formatDuration(op.timing.active_sec)}`);
      }
      if (op.timing.passive_sec > 0) {
        parts.push(`Wait: ${this.formatDuration(op.timing.passive_sec)}`);
      }
    }

    if (op.temperature) {
      parts.push(op.temperature);
    }

    if (op.equipment && op.equipment.length > 0) {
      parts.push(`Equipment: ${op.equipment.join(', ')}`);
    }

    return parts.join(' • ');
  }

  /**
   * Format duration in seconds to human-readable format
   */
  private formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
  }

  /**
   * Initialize Coach Mode state
   */
  initializeCoachMode(): CoachModeState {
    const tasks = this.createTasks();

    return {
      now: this.getUnblockedTasks(tasks, []).slice(0, 3),
      next: null,
      later: [],
      activeTimers: [],
      completedTasks: []
    };
  }

  /**
   * Get tasks that are currently unblocked
   */
  private getUnblockedTasks(allTasks: Task[], completedTaskIds: string[]): Task[] {
    return allTasks.filter(task => {
      if (task.status === 'completed') return false;
      if (completedTaskIds.includes(task.id)) return false;

      // Check if all dependencies are completed
      return task.dependencies.every(depId =>
        completedTaskIds.includes(depId) ||
        allTasks.find(t => t.id === depId)?.status === 'completed'
      );
    });
  }

  /**
   * Update Coach Mode state after task completion
   */
  updateCoachMode(
    currentState: CoachModeState,
    completedTaskId: string,
    allTasks: Task[]
  ): CoachModeState {
    const completedTasks = [...currentState.completedTasks, completedTaskId];
    const completedTask = allTasks.find(t => t.id === completedTaskId);

    // Start timer for passive steps
    const newTimers = [...currentState.activeTimers];
    if (completedTask?.timing?.passive_sec && completedTask.timing.passive_sec > 0) {
      const now = Date.now();
      newTimers.push({
        id: `timer_${completedTaskId}`,
        operationId: completedTask.operationId,
        name: completedTask.name,
        durationSec: completedTask.timing.passive_sec,
        startedAt: now,
        endsAt: now + completedTask.timing.passive_sec * 1000,
        type: 'passive',
        notification: true
      });
    }

    const unblocked = this.getUnblockedTasks(allTasks, completedTasks);
    const now = unblocked.slice(0, 3);
    const next = unblocked.length > 3 ? unblocked[3] : null;
    const later = unblocked.slice(4, 7);

    return {
      now,
      next,
      later,
      activeTimers: newTimers,
      completedTasks
    };
  }

  /**
   * Calculate critical path (longest path through the graph)
   */
  calculateCriticalPath(): string[] {
    const sortedOps = this.topologicalSort();
    const distances = new Map<string, number>();
    const predecessors = new Map<string, string | null>();

    // Initialize
    for (const op of this.operationNodes) {
      distances.set(op.id, 0);
      predecessors.set(op.id, null);
    }

    // Calculate longest path (critical path)
    for (const op of sortedOps) {
      const opDuration = (op.timing?.active_sec || 0) + (op.timing?.passive_sec || 0);
      const currentDistance = distances.get(op.id) || 0;

      const dependencies = this.getOperationDependencies(op.id);
      for (const depId of dependencies) {
        const depDistance = distances.get(depId) || 0;
        const newDistance = depDistance + opDuration;

        if (newDistance > currentDistance) {
          distances.set(op.id, newDistance);
          predecessors.set(op.id, depId);
        }
      }
    }

    // Find the node with maximum distance
    let maxDistance = 0;
    let endNode: string | null = null;

    for (const [nodeId, distance] of distances.entries()) {
      if (distance > maxDistance) {
        maxDistance = distance;
        endNode = nodeId;
      }
    }

    // Reconstruct path
    const path: string[] = [];
    let current = endNode;

    while (current) {
      path.unshift(current);
      current = predecessors.get(current) || null;
    }

    return path;
  }

  /**
   * Generate a full schedule with timeline
   */
  generateSchedule(params: ScheduleParams): ScheduleResult {
    const tasks = this.createTasks();
    const criticalPath = this.calculateCriticalPath();
    const timeline: TimelineEvent[] = [];

    const startTime = params.startTime || Date.now();
    let currentTime = startTime;

    // Simple forward scheduling
    const taskStartTimes = new Map<string, number>();

    for (const task of tasks) {
      // Find latest dependency completion time
      let earliestStart = currentTime;

      for (const depId of task.dependencies) {
        const depStartTime = taskStartTimes.get(depId) || currentTime;
        const depTask = tasks.find(t => t.id === depId);
        const depDuration = ((depTask?.timing?.active_sec || 0) + (depTask?.timing?.passive_sec || 0)) * 1000;
        const depEndTime = depStartTime + depDuration;

        earliestStart = Math.max(earliestStart, depEndTime);
      }

      taskStartTimes.set(task.id, earliestStart);
      task.canStartAt = earliestStart;

      // Add timeline events
      timeline.push({
        timestamp: earliestStart,
        type: 'start_operation',
        operationId: task.operationId,
        description: `Start: ${task.name}`
      });

      const duration = ((task.timing?.active_sec || 0) + (task.timing?.passive_sec || 0)) * 1000;
      timeline.push({
        timestamp: earliestStart + duration,
        type: 'end_operation',
        operationId: task.operationId,
        description: `Complete: ${task.name}`
      });

      currentTime = earliestStart + duration;
    }

    // Sort timeline by timestamp
    timeline.sort((a, b) => a.timestamp - b.timestamp);

    return {
      tasks,
      timeline,
      criticalPath
    };
  }
}

/**
 * Convenience function to create a scheduler
 */
export function createScheduler(graph: RecipeGraph): RecipeScheduler {
  return new RecipeScheduler(graph);
}
