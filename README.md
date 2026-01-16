# 🍳 KitchenCoach

**Recipe Graph Visualizer & Cooking Coach MVP**

Transform traditional sequential recipes into interactive dependency graphs with built-in coaching features.

## Overview

KitchenCoach converts recipes into directed acyclic graphs (DAGs) that make cooking easier by:

- **Visualizing dependencies** between ingredients and operations
- **Providing step-by-step coaching** with timers and task management
- **Enabling parallel preparation** by showing what can be done simultaneously
- **Making recipes more accessible** for beginners and home cooks

## Features

### ✅ MVP Features (Implemented)

1. **Recipe Input** (FR-1)
   - Text-based input for ingredients and steps
   - Structured form with title and servings

2. **Graph Generation** (FR-2)
   - Automatic conversion of recipes into DAG format
   - Resource nodes (ingredients, intermediates, outputs)
   - Operation nodes (cooking actions with timing)

3. **Table Diagram Renderer** (FR-3)
   - Interactive flow diagram showing ingredient tracks
   - Operation blocks with timing and temperature
   - Color-coded visualization

4. **Coach Mode** (FR-4, FR-5)
   - Now/Next/Later task organization
   - Active and passive timers
   - Real-time progress tracking
   - Browser notifications for completed timers

5. **Graph Validation** (FR-8)
   - Cycle detection
   - Missing input/output validation
   - Orphan resource detection
   - Reachability analysis

6. **Export** (FR-9)
   - JSON export of recipe graphs
   - Sharable recipe format

7. **Sample Recipe** (FR-10)
   - Basque Burnt Cheesecake example
   - Fully annotated with timing and equipment

### 🚧 Future Enhancements (Not in MVP)

- Help Mode with delegation lanes (FR-6, FR-7)
- Visual graph editing interface
- PDF export with diagrams
- Recipe library with versioning
- LLM-powered recipe parsing
- Unit conversion and scaling

## Architecture

```
src/
├── components/          # React UI components
│   ├── TableDiagram.tsx    # Main diagram renderer
│   ├── CoachMode.tsx       # Coaching interface
│   └── RecipeInput.tsx     # Recipe entry form
├── services/            # Business logic
│   ├── graphValidation.ts  # DAG validation
│   ├── scheduler.ts        # Topological sort & scheduling
│   └── recipeParser.ts     # Text-to-graph conversion
├── types/               # TypeScript definitions
│   └── recipe.ts           # Core data models
└── data/                # Sample data
    └── sampleRecipes.ts    # Example recipes
```

## Data Model

The core data structure follows a bipartite graph model:

```typescript
RecipeGraph {
  nodes: [
    ResourceNode {      // Ingredients, intermediates, outputs
      id, type, name, quantity
    },
    OperationNode {     // Cooking actions
      id, type, name, timing, temperature, equipment
    }
  ],
  edges: [
    ConsumesEdge,       // Resource → Operation
    ProducesEdge,       // Operation → Resource
    MustFollowEdge,     // Operation → Operation
    // ... other edge types
  ]
}
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Usage

1. **Enter a Recipe**
   - Click "Load Sample Recipe" to try the Basque Cheesecake example
   - Or enter your own ingredients and steps

2. **View the Diagram**
   - See the flow of ingredients through operations
   - Click on operation blocks to see details

3. **Use Coach Mode**
   - Follow step-by-step instructions
   - Start timers for passive steps (baking, resting)
   - Track your progress through the recipe

4. **Export**
   - Download recipe as JSON for sharing or backup

## Example: Basque Burnt Cheesecake

The included sample recipe demonstrates:

- **10 operations** (preheat, mix, bake, cool, etc.)
- **Multiple timing types** (active work + passive waiting)
- **Parallel preparation** (oven preheating while mixing)
- **Temperature control** (240°C baking)
- **Equipment tracking** (mixer, tin, oven)

Total time: ~3 hours (15 min prep + 30 min bake + 2 hours cooling)

## Technical Decisions

### Why a Table Diagram?

The table diagram (horizontal ingredient tracks with operation blocks) provides:

- Clear left-to-right flow matching reading direction
- Intuitive merging of ingredients
- Easy identification of parallel tasks
- Minimal edge crossings

### Validation Strategy

The validation engine ensures recipe integrity by:

1. Checking for cycles (impossible dependencies)
2. Verifying all edges reference valid nodes
3. Confirming final outputs are reachable
4. Warning about unused ingredients
5. Detecting resource reuse patterns

### Scheduling Algorithm

Coach mode uses:

- **Topological sort** to order operations by dependencies
- **Critical path calculation** to identify timing bottlenecks
- **Greedy scheduling** to suggest 1-3 concurrent tasks
- **Timer management** for passive operations

## Development

### Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool & dev server
- **CSS3** - Styling with gradients and animations

### Code Organization

- **Types-first approach** - All data models defined upfront
- **Service layer** - Business logic separated from UI
- **Component composition** - Small, focused components
- **Immutable data** - New resource IDs for each transformation

## Contributing

This is an MVP implementation. Key areas for contribution:

1. **LLM Integration** - Improve recipe parsing accuracy
2. **Help Mode** - Implement delegation and handoff features
3. **Graph Editing** - Visual editor for correcting graphs
4. **Export Options** - PDF generation with diagrams
5. **Recipe Library** - Storage and versioning system

## License

MIT License - see LICENSE file for details

## Acknowledgments

Based on the Product Requirements Document for Recipe Graph Visualizer & Cooking Coach (v0.9, Dec 2024)

---

Built with ❤️ for better cooking experiences
