---
title: Type Faster, Create Faster - Introducing Slash Commands
description: Skip the menus and streamline your workflow with powerful slash commands that put every action at your fingertips
date: 2025-07-28
authors:
  - name: Dev Team
tags:
  - features
  - productivity
  - workflow
  - commands
---

Ever noticed how the fastest creators barely touch their mouse? They live in keyboard shortcuts, command palettes, and quick actions. If you're tired of hunting through menus for basic tasks, **slash commands** are about to become your new best friend.

Type `/` in InkyCut's chat, and watch a whole world of instant actions unfold. No more clicking through menus. No more interrupting your creative flow. Just pure, streamlined efficiency.

## What Are Slash Commands?

Slash commands are your direct line to InkyCut's most common actions. Start typing `/` in the chat input, and you'll see an intelligent autocomplete dropdown that learns what you want before you finish typing.

Think of them as **keyboard shortcuts for the chat era**—but smarter.

## The Magic of Smart Autocomplete

Here's where it gets interesting. Our autocomplete doesn't just match exact text. It's built with **fuzzy matching** that understands what you're trying to do:

- Type `/res` → suggests `/reset`  
- Type `/rst` → also suggests `/reset` (with highlighted matching letters)
- Type `/sh` → suggests `/share`

The system learns your patterns and gets you there faster, whether you're a precise typer or someone who likes to abbreviate everything.

## Every Command at Your Fingertips

### 🔄 `/reset` - Fresh Start
Sometimes you need to clear the slate completely. This command resets your entire project to default state—files, chat history, everything. Perfect for starting over or clearing a test project.

```
/reset
```

### 📤 `/import` - Bring Projects In  
Got a project file you want to work with? Skip the menu navigation.

```
/import
```

Opens the import dialog instantly, ready for drag-and-drop or file selection.

### 💾 `/export` - Save Your Work
Export with surgical precision. Choose your format, even export directly without the dialog:

```
/export --format json --yes
/export --format mp4  
/export -f webm
```

The `--yes` flag bypasses the dialog entirely and downloads immediately. Perfect for quick backups.

### 🔗 `/share` - Instant Collaboration
Share your project with end-to-end encryption in seconds:

```
/share --yes
```

This creates an encrypted shareable link and returns the URL directly in chat. No dialog, no extra clicks—just pure efficiency.

## Keyboard Navigation That Actually Works

Once the autocomplete appears, your hands never need to leave the keyboard:

- **Arrow Up/Down**: Navigate through commands
- **Enter**: Select and auto-complete the command  
- **Escape**: Close the dropdown
- **Keep typing**: Filter results in real-time

It's the kind of interaction that feels natural after about 30 seconds and becomes indispensable after 30 minutes.

## Visual Feedback That Guides You

The autocomplete dropdown isn't just functional—it's informative:

- **Command highlighting**: See exactly which characters match your input
- **Full descriptions**: Understand what each command does without guessing  
- **Usage examples**: See the full syntax with available options
- **Selection highlighting**: Always know which command you're about to select

## Built for Speed, Designed for Flow

Every design decision prioritizes **flow state**:

- **Upward expansion**: Dropdown appears above input so it never blocks your view
- **Instant filtering**: Results update as you type, no lag
- **Smart positioning**: Works in any screen size or layout
- **Error handling**: Clear feedback when commands fail or options are invalid

## Why This Matters for Creators

When you're in the zone, every interruption costs creative momentum. Slash commands eliminate those micro-frustrations:

- No hunting through menus while your idea is hot
- No breaking focus to remember where a feature lives  
- No context switching between mouse and keyboard
- No waiting for dialogs when you know exactly what you want

## Getting Started

Ready to speed up your workflow? Just:

1. Open InkyCut's chat interface
2. Type `/` to see all available commands
3. Start typing to filter (try `/rst` for reset)
4. Use arrow keys to navigate or click to select
5. Hit Enter to execute

Within minutes, you'll discover your own shortcuts and patterns. Within days, you'll wonder how you ever worked without them.

## What's Next?

This is just the foundation. We're already working on:

- **Custom commands**: Define your own project-specific shortcuts
- **Command history**: Quick access to recently used commands  
- **Parameter memory**: Remember your preferred export formats and options
- **Advanced options**: More powerful arguments for complex workflows

The goal is simple: **every action you do more than once should be one keystroke away**.

---

**Ready to experience the speed?** Open InkyCut, type `/`, and discover how much faster creation can be when your tools get out of your way.

*Have ideas for new slash commands? [Let us know](https://github.com/inkylabs-dev/inkycut/issues) what would make your workflow even smoother.*