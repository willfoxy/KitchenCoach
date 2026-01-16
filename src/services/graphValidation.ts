/**
 * Graph Validation Engine
 * Based on PRD Section 9.2: Validation rules
 */

import { RecipeGraph, GraphNode, GraphEdge, ValidationResult, ValidationError, OperationNode, ResourceNode } from '../types/recipe';

export class GraphValidator {
  private graph: RecipeGraph;
  private errors: ValidationError[] = [];
  private warnings: ValidationError[] = [];

  constructor(graph: RecipeGraph) {
    this.graph = graph;
  }

  /**
   * Run all validation checks
   */
  validate(): ValidationResult {
    this.errors = [];
    this.warnings = [];

    this.validateNodeIds();
    this.validateEdgeEndpoints();
    this.validateAcyclic();
    this.validateFinalOutputsReachable();
    this.validateOperationInputsOutputs();
    this.validateNoOrphanResources();
    this.detectResourceReuseLoops();

    return {
      isValid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings
    };
  }

  /**
   * Validate that all node IDs are unique
   */
  private validateNodeIds(): void {
    const nodeIds = new Set<string>();
    for (const node of this.graph.nodes) {
      if (nodeIds.has(node.id)) {
        this.errors.push({
          type: 'error',
          message: `Duplicate node ID: ${node.id}`,
          nodeId: node.id
        });
      }
      nodeIds.add(node.id);
    }
  }

  /**
   * All edge endpoints must reference existing nodes
   */
  private validateEdgeEndpoints(): void {
    const nodeIds = new Set(this.graph.nodes.map(n => n.id));

    for (const edge of this.graph.edges) {
      if (!nodeIds.has(edge.from)) {
        this.errors.push({
          type: 'error',
          message: `Edge ${edge.id} references non-existent 'from' node: ${edge.from}`,
          edgeId: edge.id
        });
      }
      if (!nodeIds.has(edge.to)) {
        this.errors.push({
          type: 'error',
          message: `Edge ${edge.id} references non-existent 'to' node: ${edge.to}`,
          edgeId: edge.id
        });
      }
    }
  }

  /**
   * Graph must be acyclic (ignoring equipment locks)
   */
  private validateAcyclic(): void {
    const adjList = this.buildAdjacencyList();
    const visited = new Set<string>();
    const recStack = new Set<string>();

    const hasCycle = (nodeId: string): boolean => {
      visited.add(nodeId);
      recStack.add(nodeId);

      const neighbors = adjList.get(nodeId) || [];
      for (const neighborId of neighbors) {
        if (!visited.has(neighborId)) {
          if (hasCycle(neighborId)) {
            return true;
          }
        } else if (recStack.has(neighborId)) {
          this.errors.push({
            type: 'error',
            message: `Cycle detected in graph involving node: ${neighborId}`,
            nodeId: neighborId
          });
          return true;
        }
      }

      recStack.delete(nodeId);
      return false;
    };

    for (const node of this.graph.nodes) {
      if (!visited.has(node.id)) {
        hasCycle(node.id);
      }
    }
  }

  /**
   * Build adjacency list for dependency edges (excluding equipment locks)
   */
  private buildAdjacencyList(): Map<string, string[]> {
    const adjList = new Map<string, string[]>();

    // Initialize with all nodes
    for (const node of this.graph.nodes) {
      adjList.set(node.id, []);
    }

    // Add edges (excluding locks-equipment)
    for (const edge of this.graph.edges) {
      if (edge.type === 'locks-equipment') continue;

      const neighbors = adjList.get(edge.from) || [];
      neighbors.push(edge.to);
      adjList.set(edge.from, neighbors);
    }

    return adjList;
  }

  /**
   * Every final output must be reachable from at least one operation chain
   */
  private validateFinalOutputsReachable(): void {
    const finalOutputs = this.graph.nodes.filter(
      (n): n is ResourceNode => n.type === 'resource' && (n as ResourceNode).isFinal === true
    );

    if (finalOutputs.length === 0) {
      this.warnings.push({
        type: 'warning',
        message: 'No final outputs marked in the recipe graph'
      });
      return;
    }

    const reachableNodes = this.findReachableNodes();

    for (const output of finalOutputs) {
      if (!reachableNodes.has(output.id)) {
        this.errors.push({
          type: 'error',
          message: `Final output "${output.name}" (${output.id}) is not reachable from any operation`,
          nodeId: output.id
        });
      }
    }
  }

  /**
   * Find all nodes reachable from source nodes (ingredients)
   */
  private findReachableNodes(): Set<string> {
    const reachable = new Set<string>();
    const adjList = this.buildAdjacencyList();

    // Start from all source nodes (ingredients with no incoming edges)
    const sourceNodes = this.graph.nodes.filter(node => {
      const hasIncoming = this.graph.edges.some(edge => edge.to === node.id && edge.type !== 'locks-equipment');
      return !hasIncoming;
    });

    const dfs = (nodeId: string) => {
      if (reachable.has(nodeId)) return;
      reachable.add(nodeId);

      const neighbors = adjList.get(nodeId) || [];
      for (const neighbor of neighbors) {
        dfs(neighbor);
      }
    };

    for (const source of sourceNodes) {
      dfs(source.id);
    }

    return reachable;
  }

  /**
   * Each operation must have at least one input and one output
   * (except pure timers, if supported)
   */
  private validateOperationInputsOutputs(): void {
    const operationNodes = this.graph.nodes.filter(
      (n): n is OperationNode => n.type === 'operation'
    );

    for (const operation of operationNodes) {
      const inputs = this.graph.edges.filter(
        e => e.to === operation.id && e.type === 'consumes'
      );
      const outputs = this.graph.edges.filter(
        e => e.from === operation.id && e.type === 'produces'
      );

      // Check if it's a pure timer (passive time only, no active work)
      const isPureTimer = operation.timing?.active_sec === 0 && (operation.timing?.passive_sec ?? 0) > 0;

      if (inputs.length === 0 && !isPureTimer) {
        this.errors.push({
          type: 'error',
          message: `Operation "${operation.name}" (${operation.id}) has no input resources`,
          nodeId: operation.id
        });
      }

      if (outputs.length === 0) {
        this.errors.push({
          type: 'error',
          message: `Operation "${operation.name}" (${operation.id}) has no output resources`,
          nodeId: operation.id
        });
      }
    }
  }

  /**
   * Warn about orphan resources (not consumed or not produced)
   */
  private validateNoOrphanResources(): void {
    const resourceNodes = this.graph.nodes.filter(
      (n): n is ResourceNode => n.type === 'resource'
    );

    for (const resource of resourceNodes) {
      const isConsumed = this.graph.edges.some(
        e => e.from === resource.id && e.type === 'consumes'
      );
      const isProduced = this.graph.edges.some(
        e => e.to === resource.id && e.type === 'produces'
      );

      // Ingredients (not produced by any operation) should be consumed
      if (!isProduced && !isConsumed && !resource.isFinal) {
        this.warnings.push({
          type: 'warning',
          message: `Ingredient "${resource.name}" (${resource.id}) is never used in any operation`,
          nodeId: resource.id
        });
      }

      // Intermediates should be both produced and consumed (unless they're final)
      if (isProduced && !isConsumed && !resource.isFinal) {
        this.warnings.push({
          type: 'warning',
          message: `Intermediate "${resource.name}" (${resource.id}) is produced but never consumed`,
          nodeId: resource.id
        });
      }
    }
  }

  /**
   * Detect resource reuse loops caused by in-place updates
   * Prefer immutable resources (new resource IDs per step)
   */
  private detectResourceReuseLoops(): void {
    for (const edge of this.graph.edges) {
      if (edge.type === 'consumes') {
        // Check if this resource is both consumed and produced by the same operation
        const sameOpProduces = this.graph.edges.find(
          e => e.type === 'produces' &&
               e.from === edge.to &&
               e.to === edge.from
        );

        if (sameOpProduces) {
          const operation = this.graph.nodes.find(n => n.id === edge.to);
          this.warnings.push({
            type: 'warning',
            message: `Operation "${operation?.name}" (${edge.to}) has an in-place update pattern. Consider using immutable resources (new IDs) instead.`,
            nodeId: edge.to
          });
        }
      }
    }
  }
}

/**
 * Convenience function to validate a recipe graph
 */
export function validateRecipeGraph(graph: RecipeGraph): ValidationResult {
  const validator = new GraphValidator(graph);
  return validator.validate();
}
