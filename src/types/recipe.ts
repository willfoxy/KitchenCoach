/**
 * Recipe Graph Data Models
 * Based on PRD Section 8: Data model: DAG as nodes + edges
 */

export interface Quantity {
  value: number;
  unit: string; // e.g., "g", "ml", "cups", "tsp", "tbsp", "whole"
}

export interface Timing {
  active_sec: number;  // Active work time
  passive_sec: number; // Waiting time (bake, rest, chill)
}

export interface Equipment {
  id: string;
  name: string;
  capacity?: number;
}

// Node Types
export type NodeType = 'resource' | 'operation' | 'equipment';

export interface BaseNode {
  id: string;
  type: NodeType;
  name: string;
}

export interface ResourceNode extends BaseNode {
  type: 'resource';
  quantity?: Quantity;
  isIntermediate?: boolean;
  isFinal?: boolean;
  isOptional?: boolean;
}

export interface OperationNode extends BaseNode {
  type: 'operation';
  timing?: Timing;
  temperature?: string; // e.g., "240°C", "350°F"
  cues?: string[]; // Visual/audio/tactile cues (e.g., "golden brown", "doubled in size")
  equipment?: string[]; // Required equipment IDs
  lane?: string; // For delegation (e.g., "prep", "cook", "finish")
  assignee?: string; // Person assigned to this operation
  originalStepIndex?: number; // Original position in recipe text
}

export interface EquipmentNode extends BaseNode {
  type: 'equipment';
  capacity?: number;
}

export type GraphNode = ResourceNode | OperationNode | EquipmentNode;

// Edge Types
export type EdgeType = 'consumes' | 'produces' | 'must-follow' | 'locks-equipment' | 'handoff' | 'portion-of';

export interface BaseEdge {
  id: string;
  type: EdgeType;
  from: string; // Node ID
  to: string;   // Node ID
}

export interface ConsumesEdge extends BaseEdge {
  type: 'consumes';
  amount?: Quantity; // Optional: specific amount consumed
}

export interface ProducesEdge extends BaseEdge {
  type: 'produces';
  amount?: Quantity; // Optional: amount produced
}

export interface MustFollowEdge extends BaseEdge {
  type: 'must-follow';
  reason?: string; // Why this ordering is required
}

export interface LocksEquipmentEdge extends BaseEdge {
  type: 'locks-equipment';
  duration_sec?: number;
}

export interface HandoffEdge extends BaseEdge {
  type: 'handoff';
  deliverable?: string; // What is being handed off
  context?: string; // Instructions for the handoff
}

export interface PortionOfEdge extends BaseEdge {
  type: 'portion-of';
  portion?: number; // e.g., 0.5 for "half"
  description?: string; // e.g., "half the sauce"
}

export type GraphEdge = ConsumesEdge | ProducesEdge | MustFollowEdge | LocksEquipmentEdge | HandoffEdge | PortionOfEdge;

// Recipe Graph
export interface RecipeGraph {
  schema_version: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata?: RecipeMetadata;
}

export interface RecipeMetadata {
  title?: string;
  author?: string;
  description?: string;
  servings?: number;
  prepTime?: number; // Total prep time in seconds
  cookTime?: number; // Total cook time in seconds
  totalTime?: number; // Total time in seconds
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  tags?: string[];
  allergens?: string[];
  created?: string; // ISO date string
  modified?: string; // ISO date string
}

// Recipe Input (for parsing)
export interface RecipeInput {
  title?: string;
  ingredients: string[]; // Raw ingredient lines
  steps: string[]; // Raw step instructions
  metadata?: Partial<RecipeMetadata>;
}

// Validation Results
export interface ValidationError {
  type: 'error' | 'warning';
  message: string;
  nodeId?: string;
  edgeId?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// Coach Mode Types
export interface Task {
  id: string;
  operationId: string;
  name: string;
  description?: string;
  timing?: Timing;
  equipment?: string[];
  status: 'pending' | 'in_progress' | 'completed';
  dependencies: string[]; // Task IDs that must complete first
  canStartAt?: number; // Timestamp when task can start (unix timestamp)
}

export interface CoachModeState {
  now: Task[]; // Currently actionable tasks (1-3)
  next: Task | null; // Next task to do
  later: Task[]; // Optional parallel prep tasks
  activeTimers: Timer[];
  completedTasks: string[]; // Task IDs
}

export interface Timer {
  id: string;
  operationId: string;
  name: string;
  durationSec: number;
  startedAt: number; // Unix timestamp
  endsAt: number; // Unix timestamp
  type: 'passive'; // Can extend with 'active' later
  notification?: boolean;
}

// Help Mode Types
export interface Lane {
  id: string;
  name: string;
  tasks: Task[];
  assignee?: string;
  color?: string;
}

export interface Handoff {
  id: string;
  fromLane: string;
  toLane: string;
  deliverable: string;
  scheduledAt?: number; // Unix timestamp
  context?: string;
}

export interface HelpModeState {
  lanes: Lane[];
  handoffs: Handoff[];
}

// Scheduling
export interface ScheduleParams {
  startTime?: number; // Unix timestamp
  serveTime?: number; // Unix timestamp
  participants?: string[];
  equipment?: Equipment[];
}

export interface ScheduleResult {
  tasks: Task[];
  timeline: TimelineEvent[];
  criticalPath: string[]; // Operation IDs on critical path
}

export interface TimelineEvent {
  timestamp: number; // Unix timestamp
  type: 'start_operation' | 'end_operation' | 'timer_complete' | 'handoff';
  operationId?: string;
  description: string;
}
