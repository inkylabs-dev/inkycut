# Input Component

A clean, reusable input component with stacked layout for consistent form styling.

## Features

### 🎯 **Stacked Layout**
- Label displayed above the input field
- Consistent spacing and alignment
- Full-width input utilization

### 🎨 **Clean Design**
- **Simple interface**: Focus on clarity and usability
- **Consistent styling**: Unified appearance across all input types
- **Theme support**: Works with both light and dark themes
- **Focus states**: Clear visual feedback for active inputs
- **Deferred commits**: Project state updates only on blur events

### 🔧 **Input Types**
- **Text**: Standard text input
- **Number**: Number input with min/max/step support
- **Color**: Color picker + hex text input

## Usage

```tsx
import Input from './components/Input';

// Text Input
<Input
  label="Name"
  value={name}
  type="text"
  placeholder="Enter name"
  onChange={setName}
  onBlur={commitChanges}
/>

// Number Input
<Input
  label="Duration"
  value={duration}
  type="number"
  unit="seconds"
  step={0.1}
  min={0.1}
  max={60}
  onChange={setDuration}
  onBlur={commitChanges}
/>

// Color Input
<Input
  label="Background"
  value={color}
  type="color"
  placeholder="#000000"
  onChange={setColor}
  onBlur={commitChanges}
/>
```

## Implementation Details

### Change Handling
- **onChange**: Updates local state immediately (visual feedback)
- **onBlur**: Commits changes to project state (actual persistence)
- **Immediate feedback**: Values update as user types
- **Deferred commits**: Project changes only on blur for performance