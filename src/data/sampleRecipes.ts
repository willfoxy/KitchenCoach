/**
 * Sample Recipes for Testing
 * Includes the Basque Cheesecake example from the PRD
 */

import { RecipeGraph } from '../types/recipe';

export const basqueCheesecake: RecipeGraph = {
  schema_version: '1.0',
  metadata: {
    title: 'Burnt Basque Cheesecake',
    description: 'A rich, creamy cheesecake with a distinctive burnt top',
    servings: 8,
    prepTime: 900, // 15 minutes
    cookTime: 1800, // 30 minutes
    totalTime: 10500, // + 2 hours cooling
    difficulty: 'intermediate',
    tags: ['dessert', 'cheesecake', 'basque'],
    allergens: ['dairy', 'eggs', 'gluten']
  },
  nodes: [
    // Ingredients (Resources)
    { id: 'res_cream_cheese', type: 'resource', name: 'Cream Cheese', quantity: { value: 500, unit: 'g' } },
    { id: 'res_sugar', type: 'resource', name: 'Sugar', quantity: { value: 150, unit: 'g' } },
    { id: 'res_eggs', type: 'resource', name: 'Eggs', quantity: { value: 4, unit: 'whole' } },
    { id: 'res_cream', type: 'resource', name: 'Double Cream', quantity: { value: 200, unit: 'ml' } },
    { id: 'res_flour', type: 'resource', name: 'Plain Flour', quantity: { value: 20, unit: 'g' } },
    { id: 'res_tin', type: 'resource', name: 'Springform Tin', quantity: { value: 1, unit: 'whole' } },

    // Operations
    {
      id: 'op_preheat',
      type: 'operation',
      name: 'Preheat Oven',
      timing: { active_sec: 60, passive_sec: 600 },
      temperature: '240°C',
      equipment: ['oven'],
      lane: 'prep',
      originalStepIndex: 0
    },
    {
      id: 'op_line_tin',
      type: 'operation',
      name: 'Line Tin with Parchment',
      timing: { active_sec: 180, passive_sec: 0 },
      equipment: ['springform_tin', 'parchment_paper'],
      lane: 'prep',
      originalStepIndex: 1
    },
    {
      id: 'op_mix_base',
      type: 'operation',
      name: 'Beat Cream Cheese and Sugar',
      timing: { active_sec: 180, passive_sec: 0 },
      equipment: ['mixer', 'bowl'],
      cues: ['smooth', 'no lumps'],
      lane: 'cook',
      originalStepIndex: 2
    },
    {
      id: 'op_add_eggs',
      type: 'operation',
      name: 'Add Eggs One at a Time',
      timing: { active_sec: 240, passive_sec: 0 },
      equipment: ['mixer', 'bowl'],
      cues: ['fully incorporated'],
      lane: 'cook',
      originalStepIndex: 3
    },
    {
      id: 'op_add_flour',
      type: 'operation',
      name: 'Mix in Flour',
      timing: { active_sec: 60, passive_sec: 0 },
      equipment: ['mixer', 'bowl'],
      lane: 'cook',
      originalStepIndex: 4
    },
    {
      id: 'op_add_cream',
      type: 'operation',
      name: 'Fold in Double Cream',
      timing: { active_sec: 120, passive_sec: 0 },
      equipment: ['spatula', 'bowl'],
      cues: ['smooth', 'well combined'],
      lane: 'cook',
      originalStepIndex: 5
    },
    {
      id: 'op_pour',
      type: 'operation',
      name: 'Pour Batter into Tin',
      timing: { active_sec: 60, passive_sec: 0 },
      equipment: ['prepared_tin'],
      lane: 'cook',
      originalStepIndex: 6
    },
    {
      id: 'op_debubble',
      type: 'operation',
      name: 'Bang Tin to Remove Bubbles',
      timing: { active_sec: 30, passive_sec: 0 },
      equipment: ['filled_tin'],
      lane: 'cook',
      originalStepIndex: 7
    },
    {
      id: 'op_bake',
      type: 'operation',
      name: 'Bake',
      timing: { active_sec: 0, passive_sec: 1800 },
      temperature: '240°C',
      equipment: ['oven'],
      cues: ['deeply browned top', 'jiggly center'],
      lane: 'cook',
      originalStepIndex: 8
    },
    {
      id: 'op_cool',
      type: 'operation',
      name: 'Cool and Refrigerate',
      timing: { active_sec: 0, passive_sec: 7200 },
      cues: ['room temperature then chilled'],
      lane: 'finish',
      originalStepIndex: 9
    },

    // Intermediates (Resources produced by operations)
    { id: 'res_oven_ready', type: 'resource', name: 'Oven Ready', isIntermediate: true },
    { id: 'res_tin_lined', type: 'resource', name: 'Lined Tin', isIntermediate: true },
    { id: 'res_base_mix', type: 'resource', name: 'Cream Cheese Base', isIntermediate: true },
    { id: 'res_batter_eggs', type: 'resource', name: 'Batter with Eggs', isIntermediate: true },
    { id: 'res_batter_flour', type: 'resource', name: 'Batter with Flour', isIntermediate: true },
    { id: 'res_final_batter', type: 'resource', name: 'Final Batter', isIntermediate: true },
    { id: 'res_filled_tin', type: 'resource', name: 'Filled Tin', isIntermediate: true },
    { id: 'res_ready_to_bake', type: 'resource', name: 'Ready to Bake', isIntermediate: true },
    { id: 'res_baked_cake', type: 'resource', name: 'Baked Cheesecake', isIntermediate: true },
    { id: 'res_final', type: 'resource', name: 'Chilled Cheesecake', isFinal: true }
  ],
  edges: [
    // Preheat oven
    { id: 'e1', type: 'produces', from: 'op_preheat', to: 'res_oven_ready' },

    // Line tin
    { id: 'e2', type: 'consumes', from: 'res_tin', to: 'op_line_tin' },
    { id: 'e3', type: 'produces', from: 'op_line_tin', to: 'res_tin_lined' },

    // Mix base
    { id: 'e4', type: 'consumes', from: 'res_cream_cheese', to: 'op_mix_base' },
    { id: 'e5', type: 'consumes', from: 'res_sugar', to: 'op_mix_base' },
    { id: 'e6', type: 'produces', from: 'op_mix_base', to: 'res_base_mix' },

    // Add eggs
    { id: 'e7', type: 'consumes', from: 'res_base_mix', to: 'op_add_eggs' },
    { id: 'e8', type: 'consumes', from: 'res_eggs', to: 'op_add_eggs' },
    { id: 'e9', type: 'produces', from: 'op_add_eggs', to: 'res_batter_eggs' },

    // Add flour
    { id: 'e10', type: 'consumes', from: 'res_batter_eggs', to: 'op_add_flour' },
    { id: 'e11', type: 'consumes', from: 'res_flour', to: 'op_add_flour' },
    { id: 'e12', type: 'produces', from: 'op_add_flour', to: 'res_batter_flour' },

    // Add cream
    { id: 'e13', type: 'consumes', from: 'res_batter_flour', to: 'op_add_cream' },
    { id: 'e14', type: 'consumes', from: 'res_cream', to: 'op_add_cream' },
    { id: 'e15', type: 'produces', from: 'op_add_cream', to: 'res_final_batter' },

    // Pour into tin
    { id: 'e16', type: 'consumes', from: 'res_final_batter', to: 'op_pour' },
    { id: 'e17', type: 'consumes', from: 'res_tin_lined', to: 'op_pour' },
    { id: 'e18', type: 'produces', from: 'op_pour', to: 'res_filled_tin' },

    // De-bubble
    { id: 'e19', type: 'consumes', from: 'res_filled_tin', to: 'op_debubble' },
    { id: 'e20', type: 'produces', from: 'op_debubble', to: 'res_ready_to_bake' },

    // Bake
    { id: 'e21', type: 'consumes', from: 'res_ready_to_bake', to: 'op_bake' },
    { id: 'e22', type: 'consumes', from: 'res_oven_ready', to: 'op_bake' },
    { id: 'e23', type: 'produces', from: 'op_bake', to: 'res_baked_cake' },

    // Cool
    { id: 'e24', type: 'consumes', from: 'res_baked_cake', to: 'op_cool' },
    { id: 'e25', type: 'produces', from: 'op_cool', to: 'res_final' }
  ]
};

export const sampleRecipes = {
  basqueCheesecake
};
