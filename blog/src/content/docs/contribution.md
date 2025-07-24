---
title: Contribution to InkyCut
description: Thank you for your interest in contributing to the InkyCut blog! This document provides guidelines for maintaining consistency and quality across all InkyCut code.
---


## Style Guide

### Code Change Procedures

#### Implementing Features Like Theme Support
When implementing comprehensive features like the theme system, follow these procedures:

1. **Plan the Architecture**: Define atoms and hooks in the appropriate scope (packages/editor for editor-specific features)
2. **Use Established Patterns**: Follow existing patterns in the codebase (e.g., jotai atoms with `atomWithStorage` for persistent state)
3. **Maintain Scope Boundaries**: Packages should not import from outside their scope; move shared code to the appropriate location
4. **Implement Incrementally**: Add features in small, testable chunks with proper validation at each step
5. **Follow UI Consistency**: Apply theme changes comprehensively across all related components

#### Dark Mode Implementation Pattern
When adding dark mode support to components:

```tsx
// Use dark: prefix for all theme-sensitive classes
className="bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200"

// For interactive elements, include hover states for both themes
className="bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500"

// Maintain proper contrast ratios in both themes
className="border-gray-300 dark:border-gray-600"
```

#### State Management with Jotai
Follow these patterns for global state management:

```tsx
// In atoms.ts - use atomWithStorage for persistent state
export const themeAtom = atomWithStorage<'light' | 'dark' | 'system'>('theme', 'system');

// In components - use useAtom for state access
const [theme, setTheme] = useAtom(themeAtom);
```

### Writing Style
- Use clear, concise language that is accessible to users of all technical levels
- Write in active voice whenever possible
- Use present tense for instructions and descriptions
- Maintain a friendly but professional tone

### Content Structure
- Start each post with a brief introduction that explains the topic and its relevance
- Use descriptive headings (H2, H3) to organize content into logical sections
- Include practical examples and code snippets where applicable
- End with a conclusion that summarizes key takeaways

### Technical Content
- Use code blocks with appropriate language syntax highlighting
- Include screenshots or diagrams for visual explanations
- Test all code examples before publishing
- Provide context for technical concepts that may be unfamiliar to readers
- Follow established architectural patterns (jotai for state, packages scope separation)
- Document breaking changes and migration paths for major updates

### Code Quality Standards
- Maintain consistent TypeScript typing throughout
- Use Tailwind CSS classes for styling with proper dark mode support
- Follow component composition patterns used in the editor
- Ensure accessibility standards are met (proper ARIA labels, keyboard navigation)
- Write self-documenting code with clear variable and function names

### Formatting Guidelines
- Use markdown formatting consistently
- Format code inline with backticks for short snippets
- Use bullet points or numbered lists for step-by-step instructions
- Include alt text for all images