/**
 * Recipe Input Component
 * Allows users to input recipes via text or structured form
 */

import React, { useState } from 'react';
import { RecipeInput as RecipeInputType } from '../types/recipe';
import './RecipeInput.css';

interface RecipeInputProps {
  onSubmit: (recipe: RecipeInputType) => void;
  onLoadSample: () => void;
}

export const RecipeInput: React.FC<RecipeInputProps> = ({ onSubmit, onLoadSample }) => {
  const [title, setTitle] = useState('');
  const [servings, setServings] = useState(4);
  const [ingredientsText, setIngredientsText] = useState('');
  const [stepsText, setStepsText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const ingredients = ingredientsText
      .split('\n')
      .filter(line => line.trim().length > 0);

    const steps = stepsText
      .split('\n')
      .filter(line => line.trim().length > 0);

    if (ingredients.length === 0 || steps.length === 0) {
      alert('Please enter both ingredients and steps');
      return;
    }

    const recipe: RecipeInputType = {
      title: title || 'Untitled Recipe',
      ingredients,
      steps,
      metadata: {
        servings
      }
    };

    onSubmit(recipe);
  };

  return (
    <div className="recipe-input">
      <div className="input-header">
        <h2>📝 Enter Your Recipe</h2>
        <button className="sample-button" onClick={onLoadSample}>
          Load Sample Recipe
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Recipe Title</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Basque Burnt Cheesecake"
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="servings">Servings</label>
          <input
            id="servings"
            type="number"
            value={servings}
            onChange={(e) => setServings(parseInt(e.target.value) || 4)}
            min="1"
            max="100"
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="ingredients">
            Ingredients
            <span className="label-hint">(one per line)</span>
          </label>
          <textarea
            id="ingredients"
            value={ingredientsText}
            onChange={(e) => setIngredientsText(e.target.value)}
            placeholder="500g cream cheese&#10;200ml double cream&#10;150g sugar&#10;4 eggs&#10;20g flour"
            className="form-textarea"
            rows={10}
          />
        </div>

        <div className="form-group">
          <label htmlFor="steps">
            Steps
            <span className="label-hint">(one per line)</span>
          </label>
          <textarea
            id="steps"
            value={stepsText}
            onChange={(e) => setStepsText(e.target.value)}
            placeholder="Preheat oven to 240°C&#10;Mix cream cheese and sugar&#10;Add eggs one at a time&#10;Add flour and cream&#10;Pour into lined tin&#10;Bang tin to remove bubbles&#10;Bake for 30 minutes&#10;Cool for 2 hours"
            className="form-textarea"
            rows={12}
          />
        </div>

        <button type="submit" className="submit-button">
          Generate Recipe Flow
        </button>
      </form>

      <div className="input-help">
        <h3>Tips for Best Results</h3>
        <ul>
          <li>List ingredients with quantities (e.g., "500g flour")</li>
          <li>Write steps as clear actions (e.g., "Mix A and B")</li>
          <li>Include temperatures and times (e.g., "Bake at 180°C for 20 min")</li>
          <li>Mention equipment when relevant (e.g., "in a large bowl")</li>
        </ul>
      </div>
    </div>
  );
};
