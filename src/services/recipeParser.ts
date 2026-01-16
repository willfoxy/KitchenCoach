/**
 * Recipe Parser
 * Converts text recipes into recipe graphs
 * Note: In production, this would use an LLM for better accuracy
 */

import { RecipeGraph, RecipeInput, GraphNode, GraphEdge, ResourceNode, OperationNode } from '../types/recipe';

export class RecipeParser {
  private nodeIdCounter = 0;
  private edgeIdCounter = 0;

  parse(input: RecipeInput): RecipeGraph {
    this.nodeIdCounter = 0;
    this.edgeIdCounter = 0;

    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    // Parse ingredients into resource nodes
    const ingredientNodes = this.parseIngredients(input.ingredients);
    nodes.push(...ingredientNodes);

    // Parse steps into operation nodes with intermediates
    const { operationNodes, intermediateNodes, stepEdges } = this.parseSteps(
      input.steps,
      ingredientNodes
    );
    nodes.push(...operationNodes, ...intermediateNodes);
    edges.push(...stepEdges);

    return {
      schema_version: '1.0',
      nodes,
      edges,
      metadata: {
        title: input.title,
        servings: input.metadata?.servings,
        ...input.metadata
      }
    };
  }

  private parseIngredients(ingredients: string[]): ResourceNode[] {
    return ingredients.map((ingredient) => {
      const { name, quantity } = this.parseIngredientLine(ingredient);

      return {
        id: this.generateNodeId('res'),
        type: 'resource',
        name,
        quantity
      };
    });
  }

  private parseIngredientLine(line: string): { name: string; quantity?: { value: number; unit: string } } {
    // Try to extract quantity and unit
    const quantityPattern = /^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?\s+(.+)$/;
    const match = line.match(quantityPattern);

    if (match) {
      const [, valueStr, unit, name] = match;
      return {
        name: name.trim(),
        quantity: {
          value: parseFloat(valueStr),
          unit: unit?.trim() || 'whole'
        }
      };
    }

    return { name: line.trim() };
  }

  private parseSteps(steps: string[], ingredientNodes: ResourceNode[]): {
    operationNodes: OperationNode[];
    intermediateNodes: ResourceNode[];
    stepEdges: GraphEdge[];
  } {
    const operationNodes: OperationNode[] = [];
    const intermediateNodes: ResourceNode[] = [];
    const stepEdges: GraphEdge[] = [];

    let previousOutput: string | null = null;

    steps.forEach((step, index) => {
      const operationId = this.generateNodeId('op');
      const intermediateId = this.generateNodeId('res');

      // Extract operation details
      const { name, timing, temperature, equipment } = this.parseStepLine(step);

      // Create operation node
      const operationNode: OperationNode = {
        id: operationId,
        type: 'operation',
        name,
        timing,
        temperature,
        equipment,
        originalStepIndex: index
      };
      operationNodes.push(operationNode);

      // Create intermediate resource (or final if last step)
      const isLastStep = index === steps.length - 1;
      const intermediateNode: ResourceNode = {
        id: intermediateId,
        type: 'resource',
        name: isLastStep ? 'Final Dish' : `Step ${index + 1} Output`,
        isIntermediate: !isLastStep,
        isFinal: isLastStep
      };
      intermediateNodes.push(intermediateNode);

      // Create edges
      // Connect to ingredients or previous output
      if (index === 0) {
        // First step: consume relevant ingredients
        const relevantIngredients = this.findRelevantIngredients(step, ingredientNodes);
        relevantIngredients.forEach(ingredient => {
          stepEdges.push({
            id: this.generateEdgeId(),
            type: 'consumes',
            from: ingredient.id,
            to: operationId
          });
        });
      } else if (previousOutput) {
        // Subsequent steps: consume previous output
        stepEdges.push({
          id: this.generateEdgeId(),
          type: 'consumes',
          from: previousOutput,
          to: operationId
        });

        // Also check for additional ingredients needed in this step
        const additionalIngredients = this.findRelevantIngredients(step, ingredientNodes)
          .filter(ing => !stepEdges.some(e => e.from === ing.id));

        additionalIngredients.forEach(ingredient => {
          stepEdges.push({
            id: this.generateEdgeId(),
            type: 'consumes',
            from: ingredient.id,
            to: operationId
          });
        });
      }

      // Operation produces intermediate
      stepEdges.push({
        id: this.generateEdgeId(),
        type: 'produces',
        from: operationId,
        to: intermediateId
      });

      previousOutput = intermediateId;
    });

    return { operationNodes, intermediateNodes, stepEdges };
  }

  private parseStepLine(step: string): {
    name: string;
    timing?: { active_sec: number; passive_sec: number };
    temperature?: string;
    equipment?: string[];
  } {
    let name = step.trim();
    let timing: { active_sec: number; passive_sec: number } | undefined;
    let temperature: string | undefined;
    const equipment: string[] = [];

    // Extract temperature (e.g., "180°C", "350°F")
    const tempPattern = /(\d+)°([CF])/;
    const tempMatch = step.match(tempPattern);
    if (tempMatch) {
      temperature = tempMatch[0];
    }

    // Extract timing
    // Passive time: "bake for X min", "rest for X hours"
    const passivePattern = /(?:bake|rest|chill|cool|wait|refrigerate|freeze)\s+(?:for\s+)?(\d+)\s*(min|minute|minutes|hour|hours|hr|h|sec|second|seconds|s)/i;
    const passiveMatch = step.match(passivePattern);

    if (passiveMatch) {
      const value = parseInt(passiveMatch[1]);
      const unit = passiveMatch[2].toLowerCase();
      const seconds = this.convertToSeconds(value, unit);
      timing = { active_sec: 30, passive_sec: seconds };
    } else {
      // Default active time based on operation type
      const isQuick = /mix|stir|add|pour|sprinkle/i.test(step);
      const isMedium = /beat|whisk|combine|fold/i.test(step);
      const isSlow = /knead|roll|shape|chop|dice|slice/i.test(step);

      const activeSec = isQuick ? 60 : isMedium ? 120 : isSlow ? 180 : 90;
      timing = { active_sec: activeSec, passive_sec: 0 };
    }

    // Extract equipment mentions
    const equipmentKeywords = ['oven', 'mixer', 'bowl', 'pan', 'pot', 'tin', 'tray', 'whisk', 'spatula', 'knife'];
    equipmentKeywords.forEach(keyword => {
      if (step.toLowerCase().includes(keyword)) {
        equipment.push(keyword);
      }
    });

    // Clean up the name by removing timing details
    name = name.replace(/\s+for\s+\d+\s*(min|minute|minutes|hour|hours|hr|h|sec|second|seconds|s).*/i, '');
    name = name.charAt(0).toUpperCase() + name.slice(1);

    return { name, timing, temperature, equipment: equipment.length > 0 ? equipment : undefined };
  }

  private convertToSeconds(value: number, unit: string): number {
    const unitLower = unit.toLowerCase();
    if (unitLower.startsWith('h')) {
      return value * 3600;
    } else if (unitLower.startsWith('m')) {
      return value * 60;
    } else {
      return value;
    }
  }

  private findRelevantIngredients(step: string, ingredients: ResourceNode[]): ResourceNode[] {
    const stepLower = step.toLowerCase();
    return ingredients.filter(ingredient => {
      const nameLower = ingredient.name.toLowerCase();
      // Check if ingredient name appears in step
      const words = nameLower.split(/\s+/);
      return words.some(word => word.length > 3 && stepLower.includes(word));
    });
  }

  private generateNodeId(prefix: string): string {
    return `${prefix}_${this.nodeIdCounter++}`;
  }

  private generateEdgeId(): string {
    return `e_${this.edgeIdCounter++}`;
  }
}

export function parseRecipe(input: RecipeInput): RecipeGraph {
  const parser = new RecipeParser();
  return parser.parse(input);
}
