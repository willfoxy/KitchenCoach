/**
 * Main Application Component
 * KitchenCoach - Recipe Graph Visualizer & Cooking Coach
 */

import { useState } from 'react';
import { RecipeGraph, RecipeInput, ValidationResult } from './types/recipe';
import { RecipeInput as RecipeInputComponent } from './components/RecipeInput';
import { TableDiagram } from './components/TableDiagram';
import { CoachMode } from './components/CoachMode';
import { validateRecipeGraph } from './services/graphValidation';
import { parseRecipe } from './services/recipeParser';
import { basqueCheesecake } from './data/sampleRecipes';
import './App.css';

type ViewMode = 'input' | 'diagram' | 'coach';

function App() {
  const [recipeGraph, setRecipeGraph] = useState<RecipeGraph | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('input');
  const [validation, setValidation] = useState<ValidationResult | null>(null);

  const handleRecipeSubmit = (recipeInput: RecipeInput) => {
    // Parse recipe into graph
    const graph = parseRecipe(recipeInput);

    // Validate graph
    const validationResult = validateRecipeGraph(graph);
    setValidation(validationResult);

    // Set graph and switch to diagram view
    setRecipeGraph(graph);
    setViewMode('diagram');

    // Show validation warnings/errors if any
    if (validationResult.warnings.length > 0 || validationResult.errors.length > 0) {
      console.warn('Validation issues:', validationResult);
    }
  };

  const handleLoadSample = () => {
    const validationResult = validateRecipeGraph(basqueCheesecake);
    setValidation(validationResult);
    setRecipeGraph(basqueCheesecake);
    setViewMode('diagram');
  };

  const handleExport = async () => {
    if (!recipeGraph) return;

    // Simple JSON export for MVP
    const dataStr = JSON.stringify(recipeGraph, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${recipeGraph.metadata?.title || 'recipe'}.json`;
    link.click();

    URL.revokeObjectURL(url);
  };

  const handleOperationClick = (operationId: string) => {
    // Find operation details
    const operation = recipeGraph?.nodes.find(n => n.id === operationId);
    if (operation) {
      alert(`Operation: ${operation.name}\n${JSON.stringify(operation, null, 2)}`);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">
            <span className="title-icon">🍳</span>
            KitchenCoach
          </h1>
          <p className="app-subtitle">Recipe Graph Visualizer & Cooking Coach</p>
        </div>

        {recipeGraph && (
          <nav className="view-nav">
            <button
              className={`nav-button ${viewMode === 'input' ? 'active' : ''}`}
              onClick={() => setViewMode('input')}
            >
              📝 Input
            </button>
            <button
              className={`nav-button ${viewMode === 'diagram' ? 'active' : ''}`}
              onClick={() => setViewMode('diagram')}
            >
              📊 Diagram
            </button>
            <button
              className={`nav-button ${viewMode === 'coach' ? 'active' : ''}`}
              onClick={() => setViewMode('coach')}
            >
              🧑‍🍳 Coach
            </button>
            <button className="nav-button export" onClick={handleExport}>
              💾 Export
            </button>
          </nav>
        )}
      </header>

      <main className="app-main">
        {viewMode === 'input' && (
          <RecipeInputComponent onSubmit={handleRecipeSubmit} onLoadSample={handleLoadSample} />
        )}

        {viewMode === 'diagram' && recipeGraph && (
          <div className="view-container">
            {validation && (validation.warnings.length > 0 || validation.errors.length > 0) && (
              <div className="validation-panel">
                {validation.errors.length > 0 && (
                  <div className="validation-errors">
                    <h3>⚠️ Errors</h3>
                    <ul>
                      {validation.errors.map((error, idx) => (
                        <li key={idx}>{error.message}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {validation.warnings.length > 0 && (
                  <div className="validation-warnings">
                    <h3>⚡ Warnings</h3>
                    <ul>
                      {validation.warnings.map((warning, idx) => (
                        <li key={idx}>{warning.message}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <TableDiagram graph={recipeGraph} onOperationClick={handleOperationClick} />
          </div>
        )}

        {viewMode === 'coach' && recipeGraph && (
          <div className="view-container">
            <CoachMode graph={recipeGraph} />
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>
          Built with ❤️ for better cooking experiences •{' '}
          <a href="https://github.com" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
        </p>
      </footer>
    </div>
  );
}

export default App;
