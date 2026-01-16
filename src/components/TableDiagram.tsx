/**
 * Table Diagram Renderer
 * Based on PRD Section 10.1.1: Table diagram renderer (MVP target)
 */

import React, { useRef, useEffect } from 'react';
import { RecipeGraph, OperationNode, ResourceNode, GraphEdge } from '../types/recipe';
import { RecipeScheduler } from '../services/scheduler';
import './TableDiagram.css';

interface Track {
  id: string;
  resourceId: string;
  name: string;
  quantity?: string;
  active: boolean;
  row: number;
}

interface OperationBlock {
  id: string;
  operation: OperationNode;
  column: number;
  rowStart: number;
  rowEnd: number;
  inputTracks: string[];
  outputTrack: string;
}

interface TableDiagramProps {
  graph: RecipeGraph;
  onOperationClick?: (operationId: string) => void;
}

export const TableDiagram: React.FC<TableDiagramProps> = ({ graph, onOperationClick }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const layout = React.useMemo(() => {
    return computeTableLayout(graph);
  }, [graph]);

  const handleBlockClick = (operationId: string) => {
    if (onOperationClick) {
      onOperationClick(operationId);
    }
  };

  return (
    <div className="table-diagram" ref={containerRef}>
      <div className="diagram-header">
        <h2>{graph.metadata?.title || 'Recipe Flow Diagram'}</h2>
        {graph.metadata?.servings && (
          <p className="servings">Serves: {graph.metadata.servings}</p>
        )}
      </div>

      <div className="diagram-grid">
        {/* Ingredient labels column */}
        <div className="ingredient-labels">
          {layout.tracks.map(track => (
            <div
              key={track.id}
              className={`ingredient-label ${!track.active ? 'inactive' : ''}`}
              style={{ gridRow: track.row + 1 }}
            >
              <span className="ingredient-name">{track.name}</span>
              {track.quantity && <span className="ingredient-qty">{track.quantity}</span>}
            </div>
          ))}
        </div>

        {/* Main grid with tracks and operations */}
        <div
          className="diagram-main"
          style={{
            gridTemplateColumns: `repeat(${layout.maxColumns}, 1fr)`,
            gridTemplateRows: `repeat(${layout.tracks.length}, auto)`
          }}
        >
          {/* Draw tracks */}
          {layout.tracks.map(track => (
            <React.Fragment key={`track-${track.id}`}>
              {Array.from({ length: layout.maxColumns }).map((_, col) => {
                const hasBlock = layout.blocks.some(
                  block =>
                    block.column === col &&
                    block.rowStart <= track.row &&
                    block.rowEnd >= track.row
                );

                return !hasBlock ? (
                  <div
                    key={`track-${track.id}-${col}`}
                    className={`track-cell ${track.active ? 'active' : 'inactive'}`}
                    style={{
                      gridColumn: col + 1,
                      gridRow: track.row + 1
                    }}
                  />
                ) : null;
              })}
            </React.Fragment>
          ))}

          {/* Draw operation blocks */}
          {layout.blocks.map(block => (
            <div
              key={block.id}
              className="operation-block"
              style={{
                gridColumn: block.column + 1,
                gridRow: `${block.rowStart + 1} / ${block.rowEnd + 2}`
              }}
              onClick={() => handleBlockClick(block.operation.id)}
            >
              <div className="operation-name">{block.operation.name}</div>
              {block.operation.timing && (
                <div className="operation-timing">
                  {block.operation.timing.active_sec > 0 && (
                    <span className="active-time">
                      {formatTime(block.operation.timing.active_sec)}
                    </span>
                  )}
                  {block.operation.timing.passive_sec > 0 && (
                    <span className="passive-time">
                      {formatTime(block.operation.timing.passive_sec)}
                    </span>
                  )}
                </div>
              )}
              {block.operation.temperature && (
                <div className="operation-temp">{block.operation.temperature}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Compute the table layout from a recipe graph
 */
function computeTableLayout(graph: RecipeGraph): {
  tracks: Track[];
  blocks: OperationBlock[];
  maxColumns: number;
} {
  const scheduler = new RecipeScheduler(graph);
  const sortedOps = scheduler.topologicalSort();

  const resourceNodes = graph.nodes.filter((n): n is ResourceNode => n.type === 'resource');
  const ingredients = resourceNodes.filter(r => {
    // Ingredients are resources not produced by any operation
    return !graph.edges.some(e => e.type === 'produces' && e.to === r.id);
  });

  // Initialize tracks for ingredients
  const tracks: Track[] = ingredients.map((ingredient, idx) => ({
    id: `track-${ingredient.id}`,
    resourceId: ingredient.id,
    name: ingredient.name,
    quantity: ingredient.quantity ? `${ingredient.quantity.value}${ingredient.quantity.unit}` : undefined,
    active: true,
    row: idx
  }));

  const trackByResource = new Map<string, Track>();
  tracks.forEach(track => trackByResource.set(track.resourceId, track));

  const blocks: OperationBlock[] = [];
  let currentColumn = 0;

  // Place operations
  for (const op of sortedOps) {
    // Find input resources
    const inputEdges = graph.edges.filter(
      (e): e is GraphEdge => e.type === 'consumes' && e.to === op.id
    );
    const inputResourceIds = inputEdges.map(e => e.from);

    // Find output resources
    const outputEdges = graph.edges.filter(
      (e): e is GraphEdge => e.type === 'produces' && e.from === op.id
    );
    const outputResourceIds = outputEdges.map(e => e.to);

    if (inputResourceIds.length === 0) continue;

    // Find tracks for inputs
    const inputTracks = inputResourceIds
      .map(resId => trackByResource.get(resId))
      .filter((t): t is Track => t !== undefined);

    if (inputTracks.length === 0) continue;

    // Determine row span
    const rowStart = Math.min(...inputTracks.map(t => t.row));
    const rowEnd = Math.max(...inputTracks.map(t => t.row));

    // Create operation block
    const block: OperationBlock = {
      id: `block-${op.id}`,
      operation: op,
      column: currentColumn,
      rowStart,
      rowEnd,
      inputTracks: inputTracks.map(t => t.id),
      outputTrack: inputTracks[0].id // Primary output track (simplification)
    };

    blocks.push(block);

    // Update tracks - merge inputs into primary track
    const primaryTrack = inputTracks[0];

    // Deactivate consumed tracks (except primary)
    for (let i = 1; i < inputTracks.length; i++) {
      inputTracks[i].active = false;
    }

    // Create new tracks for additional outputs
    if (outputResourceIds.length > 1) {
      for (let i = 1; i < outputResourceIds.length; i++) {
        const outputRes = resourceNodes.find(r => r.id === outputResourceIds[i]);
        if (outputRes) {
          const newTrack: Track = {
            id: `track-${outputRes.id}`,
            resourceId: outputRes.id,
            name: outputRes.name,
            active: true,
            row: tracks.length
          };
          tracks.push(newTrack);
          trackByResource.set(outputRes.id, newTrack);
        }
      }
    }

    // Update primary track to point to primary output
    if (outputResourceIds.length > 0) {
      const primaryOutput = resourceNodes.find(r => r.id === outputResourceIds[0]);
      if (primaryOutput) {
        primaryTrack.resourceId = primaryOutput.id;
        primaryTrack.name = primaryOutput.name;
        trackByResource.set(primaryOutput.id, primaryTrack);
      }
    }

    currentColumn++;
  }

  return {
    tracks,
    blocks,
    maxColumns: currentColumn
  };
}

/**
 * Format time in seconds to human-readable
 */
function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    return `${mins}m`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
}
