---
title: Client-Side Slash Commands
description: Complete guide to slash commands - keyboard shortcuts for InkyCut's chat interface with autocomplete and fuzzy matching
---

This document defines the behavior and implementation of client-side slash commands in the InkyCut video editor. These commands execute locally without sending data to the server, providing immediate responses for common operations.

## Overview

Client-side slash commands are special messages that begin with a forward slash (`/`) and trigger specific actions within the editor. They provide a quick way to perform common tasks without using the UI menus.

### Key Characteristics

- **Local Execution**: Commands run entirely client-side, no server communication
- **Immediate Response**: Actions execute instantly without AI processing delays
- **Chat Integration**: Commands are entered in the chat interface and results appear in the chat
- **Confirmation Support**: Destructive operations prompt for user confirmation
- **Extensible Architecture**: New commands can be easily added through the command registry
- **Autocomplete Support**: Type `/` to see available commands with fuzzy matching and keyboard navigation

## Autocomplete Features

When you type `/` in the chat input, an autocomplete dropdown appears with the following features:

### Smart Matching
- **Prefix matching**: `/res` matches `/reset`
- **Fuzzy matching**: `/rst` matches `/reset` (highlights matching characters)
- **Real-time filtering**: Results update as you type more characters

### Keyboard Navigation
- **Arrow Up/Down**: Navigate through command options
- **Enter**: Select the highlighted command and insert it into input
- **Escape**: Close the autocomplete dropdown
- **Click**: Select a command by clicking on it

### Visual Feedback
- **Highlighted selection**: Currently selected command has blue background
- **Character highlighting**: Matching characters are highlighted in yellow
- **Command details**: Shows command name, description, and usage pattern
- **Upward expansion**: Dropdown expands upward to avoid blocking input field

## Available Commands

### `/reset`

Resets the project to its default state, equivalent to clicking "Reset Project" in the menu.

**Usage:** `/reset`

**Behavior:**
- Prompts for confirmation with: "Are you sure you want to reset the project? All unsaved changes and files will be lost."
- If confirmed:
  - Clears all files from storage (IndexedDB for local projects, memory for shared projects)
  - Creates a new default project with default composition
  - Resets chat history to welcome message
  - Clears selected elements and pages
  - Converts shared projects to local projects
- If cancelled: Shows "Command Cancelled" message

**Response Messages:**
- Success: Silent (no message shown for clean reset experience)
- Error: "❌ **Reset Failed** - Failed to reset project. Please try again or use the Reset Project button in the menu."

### `/import`

Opens the Import Dialog to import a project from a JSON file, equivalent to clicking "Import Project" in the menu.

**Usage:** `/import`

**Behavior:**
- Opens the Import Dialog immediately
- No confirmation required (file selection serves as confirmation)
- Dialog allows drag-and-drop or file browser selection
- Supports `.json` files containing project data
- Validates project structure before importing
- Automatically imports files to IndexedDB storage
- Resets chat history with import success message
- Sets project to local mode (not shared)

**Response Messages:**
- Success: Silent (dialog handles the import process and feedback)
- Error: "❌ **Import Failed** - Failed to open import dialog. Please try using the Import button in the menu."
- Unavailable: "❌ **Import Unavailable** - Import functionality is not available in this context."

### `/export`

Exports the project or opens the Export Dialog with optional format selection and auto-export capability.

**Usage:** `/export [--format|-f json|mp4|webm] [--yes|-y]`

**Options:**
- `--format`, `-f`: Pre-select export format (json, mp4, webm). Default: json
- `--yes`, `-y`: Skip dialog and export directly (only works with JSON format currently)

**Behavior:**
- Without options: Opens Export Dialog with JSON format selected
- With `--format`: Opens Export Dialog with specified format pre-selected
- With `--yes` (JSON only): Performs direct export and download, bypassing dialog
- With `--yes` (MP4/WebM): Shows error message (direct video export not yet supported)

**Examples:**
- `/export` - Opens export dialog
- `/export --format mp4` - Opens dialog with MP4 pre-selected
- `/export -f json --yes` - Directly exports JSON file
- `/export -y` - Directly exports JSON file (default format)

**Response Messages:**
- Success (dialog): Silent or format confirmation message
- Success (direct export): "✅ **Export Complete** - Project exported as JSON file and downloaded successfully."
- Error (unsupported direct format): "❌ **Format Not Supported** - MP4/WebM direct export not yet supported."
- Error (invalid format): "❌ **Invalid Format** - Unsupported format 'xyz'. Supported: json, mp4, webm"
- Error (unknown option): "❌ **Unknown Option** - Unknown option '--xyz'"
- Unavailable: "❌ **Export Unavailable** - Export functionality is not available in this context."

### `/share`

Shares the project with a secure, encrypted link or opens the Share Dialog.

**Usage:** `/share [--yes|-y]`

**Options:**
- `--yes`, `-y`: Skip dialog and share directly, returning the shareable URL in chat

**Behavior:**
- Without options: Opens Share Dialog for interactive sharing
- With `--yes`: Performs direct sharing with end-to-end encryption and returns URL immediately
- Creates encrypted shareable link with embedded decryption key in URL fragment
- Uploads project data securely to server with end-to-end encryption

**Examples:**
- `/share` - Opens share dialog
- `/share --yes` - Directly shares and returns URL
- `/share -y` - Directly shares and returns URL (short form)

**Response Messages:**
- Success (dialog): Silent (dialog handles the sharing process)
- Success (direct share): "🔗 **Project Shared Successfully** - Your project has been shared with end-to-end encryption. Here's your secure shareable link: [URL]"
- Error: "❌ **Share Failed** - [Error details]"
- Unavailable: "❌ **Share Unavailable** - Share functionality is not available in this context."
- Unknown option: "❌ **Unknown Option** - Unknown option '--xyz'. Usage: /share [--yes]"

### `/new-page`

Adds blank page(s) after the currently selected page. If no page is selected, adds after page 1. Supports --copy to copy from existing page.

**Usage:** `/new-page [--num|-n n] [--copy id]`

**Options:**
- `--num`, `-n`: Number of pages to add (1-20). Default: 1
- `--copy`: Copy from existing page with specified ID

**Behavior:**
- Adds blank page(s) after the selected page in the composition
- If no page is selected, adds after the first page (or at beginning if no pages exist)
- Automatically names new pages sequentially based on current total (if you have 3 pages, new pages will be Page 4, Page 5, etc.)
- With `--copy`: Copies all properties from source page including backgroundColor and all elements
- Copied elements receive new unique IDs to prevent conflicts
- Preserves animations and nested group elements
- Selects the first newly created page after adding
- Validates number input to prevent excessive page creation

**Examples:**
- `/new-page` - Adds 1 blank page after selected page
- `/new-page --num 3` - Adds 3 blank pages after selected page
- `/new-page -n 5` - Adds 5 blank pages after selected page
- `/new-page --copy page-123` - Copies properties from page-123 to new page
- `/new-page --copy page-456 --num 3` - Creates 3 copies of page-456

**Response Messages:**
- Success: "✅ **N New Page(s) Added** - N blank page(s) have been added after page X. The first new page is now selected."
- Success (with copy): "✅ **N New Page(s) Added** - N page(s) have been added after page X (copied from page 'Source Page'). The first new page is now selected."
- Error (invalid number): "❌ **Invalid Number** - Number of pages must be between 1 and 20. Got 'xyz'"
- Error (source not found): "❌ **Source Page Not Found** - Cannot find page with ID 'xyz' to copy from."
- Error (no project): "❌ **No Project** - No project is currently loaded. Please create or load a project first."
- Error (unknown option): "❌ **Unknown Option** - Unknown option '--xyz'. Usage: /new-page [--num|-n n] [--copy id]"

### `/del-page`

Deletes the selected page and optionally additional consecutive pages after it. Requires user confirmation.

**Usage:** `/del-page [--num|-n n]`

**Options:**
- `--num`, `-n`: Number of pages to delete starting from selected page (1-50). Default: 1

**Behavior:**
- Deletes the selected page and optionally consecutive pages after it
- If no page is selected, defaults to deleting the first page
- Always prompts for confirmation before deletion (destructive operation)
- Prevents deletion of all pages (at least one page must remain)
- Automatically selects the next logical page after deletion
- Shows names of deleted pages in success message

**Examples:**
- `/del-page` - Deletes the selected page (with confirmation)
- `/del-page --num 3` - Deletes selected page and 2 pages after it
- `/del-page -n 2` - Deletes selected page and 1 page after it

**Response Messages:**
- Success: "✅ **N Page(s) Deleted** - Deleted pages: [Page Names]. [New Selected Page] is now selected."
- Error (invalid number): "❌ **Invalid Number** - Number of pages to delete must be between 1 and 50. Got 'xyz'"
- Error (no project): "❌ **No Project** - No project is currently loaded. Please create or load a project first."
- Error (no pages): "❌ **No Pages** - There are no pages to delete in this project."
- Error (all pages): "❌ **Cannot Delete All Pages** - At least one page must remain in the project."
- Error (cancelled): "⏸️ **Command Cancelled** - The deletion was cancelled."
- Error (unknown option): "❌ **Unknown Option** - Unknown option '--xyz'. Usage: /del-page [--num|-n n]"

### `/set-page`

Sets properties of a page including ID, name, duration, background color, and position within the composition.

**Usage:** `/set-page [target_page_id] [--id|-i id] [--name|-n name] [--duration|-d duration] [--background-color|-bg color] [--after|-a id|n] [--before|-b id|n]`

**Options:**
- `target_page_id` (optional): ID of the page to modify. If not specified, uses currently selected page or first page
- `--id`, `-i`: Set new page ID (must be unique across all pages)
- `--name`, `-n`: Set page name/title
- `--duration`, `-d`: Set page duration in milliseconds
- `--background-color`, `-bg`: Set page background color (hex, RGB, or CSS color names)
- `--after`, `-a`: Move page after specified page ID or relative position (n)
- `--before`, `-b`: Move page before specified page ID or relative position (n)

**Behavior:**
- Modifies properties of the target page with comprehensive validation
- Enforces ID uniqueness across all pages in the composition
- Validates duration as positive number in milliseconds
- Validates color format (hex, RGB, or CSS color names)
- Supports both absolute positioning (by page ID) and relative positioning (n)
- Shows detailed change summary after successful modification
- Automatically updates project state and UI

**Examples:**
- `/set-page --name "Introduction" --duration 8000` - Set name and 8-second duration for current page
- `/set-page page-1 --id "intro-page" --background-color "#ff0000"` - Update specific page ID and background
- `/set-page --duration 3000 --after 1` - Set duration and move 1 position forward
- `/set-page --name "Conclusion" --before "page-intro"` - Set name and move before specific page
- `/set-page page-2 --after "page-1" --background-color "blue"` - Move page-2 after page-1 and set blue background

**Response Messages:**
- Success: "✅ **Page Updated** - Page '[name]' has been updated: • [list of changes]"
- Error (no project): "❌ **No Project** - No project is currently loaded. Please create or load a project first."
- Error (missing parameters): "❌ **Missing Parameters** - Please specify at least one option to set."
- Error (missing value): "❌ **Missing Value** - Option '--[option]' requires a value."
- Error (invalid duration): "❌ **Invalid Duration** - Duration must be a positive number in milliseconds. Got: '[value]'"
- Error (invalid color): "❌ **Invalid Color** - Invalid color format: '[value]'. Supported formats: hex, RGB, CSS names"
- Error (duplicate ID): "❌ **Duplicate ID** - Page ID '[id]' already exists. Page IDs must be unique."
- Error (page not found): "❌ **Page Not Found** - Page with ID '[id]' not found."
- Error (invalid position): "❌ **Invalid Position** - Invalid relative position: '[value]'. Use format: 2 or 1"
- Error (reference page not found): "❌ **Reference Page Not Found** - Page with ID '[id]' not found for positioning."

**Type Validation:**
- **ID**: String validation with uniqueness check across all pages
- **Name**: String validation (any non-empty string accepted)
- **Duration**: Integer validation (must be positive number in milliseconds)
- **Background Color**: Regex validation for hex (#fff, #ffffff), RGB (rgb(r,g,b)), and CSS color names
- **Position References**: Existence validation for page IDs, numeric validation for relative positions

**Position Logic:**
- **Absolute positioning**: `--after "page-id"` or `--before "page-id"` references specific pages
- **Relative positioning**: `--after 2` moves 2 positions forward, `--before 1` moves 1 position back
- **Boundary handling**: Positions are automatically clamped to valid range (0 to pages.length-1)
- **Self-reference prevention**: Cannot position a page relative to itself

### `/zoom-tl`

Sets the timeline zoom level to a specified percentage for better timeline navigation and precision editing.

**Usage:** `/zoom-tl <percentage>`

**Options:**
- `<percentage>`: Zoom percentage (10-1000). Can be specified as `50%` or `50`. Default: 100%

**Behavior:**
- Sets the timeline zoom level to the specified percentage
- Zoom range is automatically clamped between 10% and 1000% for usability
- Higher zoom levels show more timeline detail and make page blocks larger
- Lower zoom levels show more timeline content and make page blocks smaller
- Timeline maintains horizontal scrolling when zoomed in beyond container width
- Zoom level is persisted in project state and restored on reload
- Alternative: Use Ctrl+scroll (Windows/Linux) or Cmd+scroll (Mac) to zoom with mouse wheel in timeline area

**Examples:**
- `/zoom-tl 50%` - Sets timeline zoom to 50%
- `/zoom-tl 150` - Sets timeline zoom to 150%
- `/zoom-tl 25` - Sets timeline zoom to 25%
- `/zoom-tl 200%` - Sets timeline zoom to 200%

**Response Messages:**
- Success: "🔍 **Timeline Zoom Updated** - Timeline zoom set to N%."
- Success (clamped): "🔍 **Timeline Zoom Updated** - Timeline zoom set to N%. ⚠️ *Zoom level was clamped from X% to N% (valid range: 10%-1000%)*"
- Error (no project): "❌ **No Project** - No project is currently loaded. Please create or load a project first."
- Error (missing parameter): "❌ **Missing Parameter** - Please specify a zoom percentage. Usage: `/zoom-tl <percentage>` Example: `/zoom-tl 50%` or `/zoom-tl 150`"
- Error (invalid percentage): "❌ **Invalid Percentage** - Invalid percentage value 'xyz'. Please provide a positive number. Example: `/zoom-tl 50%` or `/zoom-tl 150`"
- Error (execution failed): "❌ **Zoom Failed** - Failed to set timeline zoom level. Please try again."

### `/new-text`

Adds a new text element to the currently selected page with customizable text properties and positioning. Supports --copy to copy from existing element.

**Usage:** `/new-text [--text|-t "text"] [--font-size|-fs size] [--color|-c color] [--font-family|-ff family] [--font-weight|-fw weight] [--text-align|-ta align] [--left|-l x] [--top|-tp y] [--width|-w width] [--copy id]`

**Options:**
- `--text`, `-t`: Text content for the element (use quotes for multi-word text). Default: "New Text"
- `--font-size`, `-fs`: Font size in pixels (positive number). Default: 32
- `--color`, `-c`: Text color (hex, RGB, or CSS color name). Default: "#000000"
- `--font-family`, `-ff`: Font family specification. Default: "Arial, sans-serif"
- `--font-weight`, `-fw`: Font weight (normal, bold, or numeric values). Default: "normal"
- `--text-align`, `-ta`: Text alignment (left, center, right). Default: "left"
- `--left`, `-l`: X-coordinate position in pixels. Default: 100
- `--top`, `-tp`: Y-coordinate position in pixels. Default: 100
- `--width`, `-w`: Element width in pixels (positive number). Default: 200
- `--copy`: Copy properties from any existing element with specified ID

**Behavior:**
- Creates a new text element on the currently selected page
- Requires a page to be selected (selects first page if none selected)
- Generates unique element ID automatically (format: `text-{timestamp}-{random}`)
- Supports all standard text styling properties
- Height is auto-calculated based on font size and text content
- Multi-word text must be wrapped in double quotes
- With `--copy`: Copies compatible properties from any element type (position, size, opacity, rotation, animations)
- Text-specific properties are only copied from text elements
- Additional options override copied properties
- Elements are immediately visible in the composition
- Updates project state and refreshes the UI

**Examples:**
- `/new-text` - Creates text element with default "New Text"
- `/new-text --text "Hello World" --font-size 48 --color "#ff0000"` - Creates red "Hello World" text at 48px
- `/new-text -t "Multi Word Title" -fs 64 -c "blue" -ta center -w 400 -l 300` - Creates centered blue title with multiple words
- `/new-text --text "Welcome to our site!" --font-family "Georgia, serif" --font-weight bold --left 50 --top 400` - Creates bold welcome message
- `/new-text --copy text-123` - Copies all properties from text-123
- `/new-text --copy video-456 --text "New Text"` - Copies position/size from video-456, sets custom text

**Response Messages:**
- Success: "✅ **Text Element Added** - Added text element '[text]' to page '[page name]' • Position: (x, y) • Width: widthpx (height auto-calculated) • Font: sizepx family • Color: color"
- Success (with copy): "✅ **Text Element Added** - Added text element '[text]' to page '[page name]' (copied from element ID: source-id) • Position: (x, y) • Width: widthpx (height auto-calculated) • Font: sizepx family • Color: color"
- Error (no project): "❌ **No Project** - No project is currently loaded. Please create or load a project first."
- Error (no page selected): "❌ **No Page Selected** - Please select a page first before adding elements."
- Error (page not found): "❌ **Page Not Found** - The selected page could not be found."
- Error (invalid font size): "❌ **Invalid Font Size** - Font size must be a positive number. Got 'xyz'"
- Error (invalid text align): "❌ **Invalid Text Align** - Text align must be 'left', 'center', or 'right'. Got 'xyz'"
- Error (invalid position/size): "❌ **Invalid Position/Width/Height** - Value must be a (positive) number. Got 'xyz'"
- Error (unknown option): "❌ **Unknown Option** - Unknown option '--xyz'. Use /new-text without arguments to see usage."
- Error (execution failed): "❌ **Text Creation Failed** - Failed to create text element. Please try again."

### `/new-image`

Adds a new image element to the currently selected page with customizable positioning and visual properties. Automatically detects LocalFile dimensions and centers elements on the canvas. Supports --copy to copy from existing element.

**Usage:** `/new-image --src|-s url [--left|-l x] [--top|-tp y] [--width|-w width] [--height|-h height] [--opacity|-o opacity] [--rotation|-r degrees] [--copy id]`

**Options:**
- `--src`, `-s`: **Required** - Image source URL (web URL or local file path)
- `--left`, `-l`: X-coordinate position in pixels. Default: Center of canvas
- `--top`, `-tp`: Y-coordinate position in pixels. Default: Center of canvas
- `--width`, `-w`: Element width in pixels (positive number). Default: LocalFile width or 200px
- `--height`, `-h`: Element height in pixels (positive number). Default: LocalFile height or 150px
- `--opacity`, `-o`: Element opacity (0.0 to 1.0). Default: 1.0
- `--rotation`, `-r`: Rotation angle in degrees. Default: 0
- `--copy`: Copy properties from any existing element with specified ID

**Smart Defaults:**
- **LocalFile Detection**: When using a LocalFile from storage, automatically uses the file's original dimensions
- **Canvas Centering**: If position is not specified, centers the element on the canvas based on composition dimensions
- **Fallback Dimensions**: Uses 200x150px for external URLs or when LocalFile dimensions are unavailable
- **Preserves Aspect Ratio**: Maintains original proportions when only width or height is specified

**Behavior:**
- Creates a new image element on the currently selected page
- Requires a page to be selected and image source URL to be provided
- Generates unique element ID automatically (format: `image-{timestamp}-{random}`)
- Supports web URLs, data URLs, and LocalFile references
- For LocalFiles: Detects original dimensions from file storage and uses them as defaults
- For external URLs: Uses fallback dimensions (200x150px) unless explicitly specified
- With `--copy`: Copies compatible properties from any element type (position, size, opacity, rotation, animations)
- Image source is only copied from image/video elements
- Additional options override copied properties
- Automatically centers element on canvas if position is not provided
- Images are loaded asynchronously and displayed when available
- Updates project state and refreshes the UI

**Examples:**
- `/new-image --src "localfile.jpg"` - Uses original file dimensions, centered on canvas
- `/new-image --src "https://picsum.photos/300/200"` - Creates 200x150px image (fallback), centered
- `/new-image -s "logo.png" --left 50 --top 50` - Uses LocalFile dimensions, positioned at (50,50)
- `/new-image --src "banner.jpg" --width 800` - Sets width to 800px, height auto-calculated from aspect ratio
- `/new-image -s "https://via.placeholder.com/150" -w 150 -h 150 -r 45 -o 0.7` - Creates rotated placeholder with custom dimensions
- `/new-image --copy image-123` - Copies all properties from image-123
- `/new-image --copy text-456 --src "photo.jpg"` - Copies position/size from text-456, uses custom image source

**Response Messages:**
- Success: "✅ **Image Element Added** - Added image element to page '[page name]' • Source: url • Position: (x, y) • Size: width×height • Opacity: opacity • Rotation: degrees°"
- Success (with copy): "✅ **Image Element Added** - Added image element to page '[page name]' (copied from element ID: source-id) • Source: url • Position: (x, y) • Size: width×height • Opacity: opacity • Rotation: degrees°"
- Error (source not found): "❌ **Source Element Not Found** - Cannot find element with ID 'xyz' to copy from."
- Error (no project): "❌ **No Project** - No project is currently loaded. Please create or load a project first."
- Error (missing src): "❌ **Missing Image Source** - Image source is required. Usage: `/new-image --src 'https://example.com/image.jpg'` Example: • `/new-image --src 'https://picsum.photos/300/200' --width 300 --height 200`"
- Error (no page selected): "❌ **No Page Selected** - Please select a page first before adding elements."
- Error (page not found): "❌ **Page Not Found** - The selected page could not be found."
- Error (invalid position/size): "❌ **Invalid Position/Width/Height** - Value must be a (positive) number. Got 'xyz'"
- Error (invalid opacity): "❌ **Invalid Opacity** - Opacity must be a number between 0.0 and 1.0. Got 'xyz'"
- Error (invalid rotation): "❌ **Invalid Rotation** - Rotation must be a number (degrees). Got 'xyz'"
- Error (unknown option): "❌ **Unknown Option** - Unknown option '--xyz'. Use /new-image without arguments to see usage."
- Error (execution failed): "❌ **Image Creation Failed** - Failed to create image element. Please try again."

### `/new-video`

Adds a new video element to the currently selected page with customizable positioning, visual properties, and timing. Automatically detects LocalFile dimensions and centers elements on the canvas. Supports --copy to copy from existing element.

**Usage:** `/new-video --src|-s url [--left|-l x] [--top|-tp y] [--width|-w width] [--height|-h height] [--opacity|-o opacity] [--rotation|-r degrees] [--delay|-d milliseconds] [--copy id]`

**Options:**
- `--src`, `-s`: **Required** - Video source URL (web URL or local file path)
- `--left`, `-l`: X-coordinate position in pixels. Default: Center of canvas
- `--top`, `-tp`: Y-coordinate position in pixels. Default: Center of canvas
- `--width`, `-w`: Element width in pixels (positive number). Default: LocalFile width or 320px
- `--height`, `-h`: Element height in pixels (positive number). Default: LocalFile height or 240px
- `--opacity`, `-o`: Element opacity (0.0 to 1.0). Default: 1.0
- `--rotation`, `-r`: Rotation angle in degrees. Default: 0
- `--delay`, `-d`: Animation delay in milliseconds (non-negative). Default: 0
- `--copy`: Copy properties from any existing element with specified ID

**Smart Defaults:**
- **LocalFile Detection**: When using a LocalFile from storage, automatically uses the file's original dimensions
- **Canvas Centering**: If position is not specified, centers the element on the canvas based on composition dimensions
- **Fallback Dimensions**: Uses 320x240px for external URLs or when LocalFile dimensions are unavailable
- **Preserves Aspect Ratio**: Maintains original proportions when only width or height is specified

**Behavior:**
- Creates a new video element on the currently selected page
- Requires a page to be selected and video source URL to be provided
- Generates unique element ID automatically (format: `video-{timestamp}-{random}`)
- Supports MP4, WebM, and other HTML5 video formats via web URLs or LocalFile references
- For LocalFiles: Detects original dimensions from file storage and uses them as defaults
- For external URLs: Uses fallback dimensions (320x240px) unless explicitly specified
- With `--copy`: Copies compatible properties from any element type (position, size, opacity, rotation, animations, delay)
- Video source is only copied from video/image elements
- Additional options override copied properties
- Automatically centers element on canvas if position is not provided
- Videos are loaded asynchronously and can be controlled through the player
- Delay parameter controls when the video starts playing relative to page start
- Updates project state and refreshes the UI

**Examples:**
- `/new-video --src "intro.mp4"` - Uses original video dimensions, centered on canvas
- `/new-video --src "https://sample-videos.com/clip.mp4"` - Creates 320x240px video (fallback), centered
- `/new-video -s "demo.webm" --left 200 --top 100` - Uses LocalFile dimensions, positioned at (200,100)
- `/new-video --src "promo.mp4" --width 640` - Sets width to 640px, height auto-calculated from aspect ratio
- `/new-video -s "clip.mp4" -w 400 -h 300 -r 10 -d 1500 -o 0.8` - Creates rotated video with custom dimensions and delay
- `/new-video --copy video-123` - Copies all properties from video-123
- `/new-video --copy image-456 --src "movie.mp4"` - Copies position/size from image-456, uses custom video source

**Response Messages:**
- Success: "✅ **Video Element Added** - Added video element to page '[page name]' • Source: url • Position: (x, y) • Size: width×height • Opacity: opacity • Rotation: degrees° • Delay: delayms"
- Success (with copy): "✅ **Video Element Added** - Added video element to page '[page name]' (copied from element ID: source-id) • Source: url • Position: (x, y) • Size: width×height • Opacity: opacity • Rotation: degrees° • Delay: delayms"
- Error (source not found): "❌ **Source Element Not Found** - Cannot find element with ID 'xyz' to copy from."
- Error (no project): "❌ **No Project** - No project is currently loaded. Please create or load a project first."
- Error (missing src): "❌ **Missing Video Source** - Video source is required. Usage: `/new-video --src 'https://example.com/video.mp4'` Example: • `/new-video --src 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4' --width 640 --height 360`"
- Error (no page selected): "❌ **No Page Selected** - Please select a page first before adding elements."
- Error (page not found): "❌ **Page Not Found** - The selected page could not be found."
- Error (invalid position/size): "❌ **Invalid Position/Width/Height** - Value must be a (positive) number. Got 'xyz'"
- Error (invalid opacity): "❌ **Invalid Opacity** - Opacity must be a number between 0.0 and 1.0. Got 'xyz'"
- Error (invalid rotation): "❌ **Invalid Rotation** - Rotation must be a number (degrees). Got 'xyz'"
- Error (invalid delay): "❌ **Invalid Delay** - Delay must be a non-negative number (milliseconds). Got 'xyz'"
- Error (unknown option): "❌ **Unknown Option** - Unknown option '--xyz'. Use /new-video without arguments to see usage."
- Error (execution failed): "❌ **Video Creation Failed** - Failed to create video element. Please try again."

### `/new-audio`

Creates a new audio track and adds it to the composition's audio timeline. Supports all CompositionAudio properties including volume, timing, playback controls, and audio effects.

**Usage:** `/new-audio --src|-s url [--volume|-v 0-1] [--trim-before|-b ms] [--trim-after|-a ms] [--playback-rate|-r rate] [--muted|-m] [--loop|-l] [--tone-frequency|-f 0.01-2] [--delay|-d ms] [--duration|-dr ms]`

**Options:**
- `--src`, `-s`: **Required.** Audio source URL or LocalFile reference
- `--volume`, `-v`: Audio volume level (0.0 to 1.0, default: 1.0)
- `--trim-before`, `-b`: Trim audio from beginning in milliseconds (default: 0)
- `--trim-after`, `-a`: Trim audio from end in milliseconds (default: 0)
- `--playback-rate`, `-r`: Playback speed multiplier (positive number, default: 1.0)
- `--muted`, `-m`: Start audio muted (flag, no value needed)
- `--loop`, `-l`: Enable audio looping (flag, no value needed)
- `--tone-frequency`, `-f`: Tone/pitch adjustment (0.01 to 2.0, default: 1.0)
- `--delay`, `-d`: Start delay in milliseconds (default: 0)
- `--duration`, `-dr`: Audio duration in milliseconds (default: 5000)

**Duration Format Support:**
- Milliseconds: `5000`, `1500`
- Seconds: `5s`, `1.5s`, `10s`
- Minutes: `2m`, `1.5m`

**Behavior:**
- Creates a new audio track with a unique ID: `audio-{timestamp}-{random}`
- Adds the track to the composition's audio timeline
- Audio tracks can overlap with other audio tracks (unlike page elements)
- Generates unique ID for easy reference in other commands
- Supports both external URLs and LocalFile references

**Examples:**
- `/new-audio --src "LocalFile:music.mp3"` - Add local music file with defaults
- `/new-audio --src "https://example.com/sound.mp3" --volume 0.8 --delay 2s` - Add web audio with volume and delay
- `/new-audio -s "LocalFile:voice.wav" -v 0.5 -d 1000 -dr 10s -l` - Add looping voice track with 1s delay and 10s duration
- `/new-audio --src "bgm.mp3" --volume 0.3 --loop --delay 0 --duration 30s` - Add background music loop
- `/new-audio -s "effect.wav" -m -r 1.5 -f 1.2 -b 500 -a 200` - Add muted effect with pitch shift and trimming

**Response Messages:**
- Success: "✅ **Audio Track Added** - Added new audio track to composition • ID: {audio_id} • Source: {src} • Volume: {volume} • Delay: {formatted_delay} • Duration: {formatted_duration} • Playback Rate: {rate}x • Muted: {Yes/No} • Loop: {Yes/No}"
- Error (no project): "❌ **No Project** - No project is currently loaded. Please create or load a project first."
- Error (missing src): "❌ **Missing Audio Source** - Audio source is required. Usage: `/new-audio --src 'https://example.com/audio.mp3'` Example: • `/new-audio --src 'LocalFile:music.mp3' --volume 0.8 --delay 1s`"
- Error (invalid volume): "❌ **Invalid Volume** - Volume must be a number between 0.0 and 1.0. Got '{value}'"
- Error (invalid duration): "❌ **Invalid Duration** - Duration must be a positive duration. Got '{value}' Supported formats: `5000`, `5s`, `1.5m`"
- Error (invalid playback rate): "❌ **Invalid Playback Rate** - Playback rate must be a positive number. Got '{value}'"
- Error (invalid tone frequency): "❌ **Invalid Tone Frequency** - Tone frequency must be between 0.01 and 2. Got '{value}'"
- Error (unknown option): "❌ **Unknown Option** - Unknown option '{option}'. Use /new-audio without arguments to see usage."
- Error (execution failed): "❌ **Audio Creation Failed** - Failed to create audio track. Please try again."

### `/set-audio`

Updates properties of an existing audio track by its unique ID. Allows modification of all CompositionAudio properties including volume, timing, playback controls, and audio effects.

**Usage:** `/set-audio --id|-i audio_id [--src|-s url] [--volume|-v 0-1] [--trim-before|-b ms] [--trim-after|-a ms] [--playback-rate|-r rate] [--muted|-m true|false] [--loop|-l true|false] [--tone-frequency|-f 0.01-2] [--delay|-d ms] [--duration|-dr ms]`

**Options:**
- `--id`, `-i`: **Required.** The unique ID of the audio track to modify
- `--src`, `-s`: Update audio source URL or LocalFile reference
- `--volume`, `-v`: Update volume level (0.0 to 1.0)
- `--trim-before`, `-b`: Update trim from beginning in milliseconds
- `--trim-after`, `-a`: Update trim from end in milliseconds
- `--playback-rate`, `-r`: Update playback speed multiplier
- `--muted`, `-m`: Set muted state (true or false)
- `--loop`, `-l`: Set looping state (true or false)
- `--tone-frequency`, `-f`: Update tone/pitch adjustment (0.01 to 2.0)
- `--delay`, `-d`: Update start delay in milliseconds
- `--duration`, `-dr`: Update audio duration in milliseconds

**Duration Format Support:**
- Same as `/new-audio`: milliseconds, seconds (`5s`), or minutes (`2m`)

**Behavior:**
- Finds audio track by unique ID across the composition
- Updates only the specified properties, leaving others unchanged
- Provides detailed feedback about what properties were changed
- Supports both external URLs and LocalFile references for source updates

**Examples:**
- `/set-audio --id audio-123456789-abc123 --volume 0.5` - Adjust volume of specific track
- `/set-audio -i audio-987654321-def456 --delay 3s --duration 15s` - Update timing
- `/set-audio --id audio-111222333-ghi789 --muted true --loop false` - Change playback state
- `/set-audio -i audio-444555666-jkl012 --src "LocalFile:new-music.mp3" --volume 0.8` - Replace source and adjust volume
- `/set-audio --id audio-777888999-mno345 --trim-before 1s --trim-after 500ms --playback-rate 1.2` - Advanced editing

**Response Messages:**
- Success: "✅ **Audio Track Updated** - Updated audio track '{audio_id}' properties: • {property}: {old_value} → {new_value} • {property}: {old_value} → {new_value}"
- Error (no project): "❌ **No Project** - No project is currently loaded. Please create or load a project first."
- Error (missing params): "❌ **Missing Parameters** - Please specify audio track ID and at least one property to update. Usage: `/set-audio --id audio_id [options]` Example: `/set-audio --id audio-123456789-abc123 --volume 0.5 --delay 2s`"
- Error (missing ID): "❌ **Missing Audio ID** - Audio track ID is required. Usage: `/set-audio --id audio_id [options]`"
- Error (no updates): "❌ **No Updates Specified** - Please specify at least one property to update. Available options: --src, --volume, --trim-before, --trim-after, --playback-rate, --muted, --loop, --tone-frequency, --delay, --duration"
- Error (no tracks): "❌ **No Audio Tracks** - No audio tracks found in the composition. Use `/new-audio` to create one first."
- Error (track not found): "❌ **Audio Track Not Found** - Audio track with ID '{id}' not found. Use `/list-audio` to see available audio tracks."
- Error (invalid values): Same validation errors as `/new-audio` for respective properties
- Error (execution failed): "❌ **Audio Update Failed** - Failed to update audio track. Please try again."

### `/del-audio`

Deletes an audio track from the composition by its unique ID. This is a destructive operation that requires confirmation unless bypassed with the `--yes` flag.

**Usage:** `/del-audio --id|-i audio_id [--yes|-y]`

**Options:**
- `--id`, `-i`: **Required.** The unique ID of the audio track to delete
- `--yes`, `-y`: Skip confirmation dialog and delete immediately

**Behavior:**
- Finds and removes audio track by unique ID from the composition
- Requires user confirmation before deletion unless `--yes` flag is used
- Permanently removes the audio track - cannot be undone
- Provides detailed feedback about the deleted track

**Examples:**
- `/del-audio --id audio-123456789-abc123` - Delete audio track with confirmation
- `/del-audio -i audio-987654321-def456 --yes` - Delete immediately without confirmation
- `/del-audio --id audio-111222333-ghi789 -y` - Delete with short confirmation bypass

**Finding Audio Track IDs:**
- Audio IDs are shown when creating tracks with `/new-audio`
- Use `/list-audio` command (if available) to see all audio tracks
- Audio IDs follow the format: `audio-{timestamp}-{random}`
- Example: `audio-1640995200000-abc123def`

**Response Messages:**
- Success: "✅ **Audio Track Deleted** - Deleted audio track '{audio_id}': • Source: {src} • Volume: {volume} • Duration: {duration}ms"
- Error (no project): "❌ **No Project** - No project is currently loaded. Please create or load a project first."
- Error (missing ID): "❌ **Missing Audio ID** - Audio track ID is required. Usage: `/del-audio --id audio_id` Example: `/del-audio --id audio-123456789-abc123 --yes` (skip confirmation)"
- Error (no tracks): "❌ **No Audio Tracks** - No audio tracks found in the composition."
- Error (track not found): "❌ **Audio Track Not Found** - Audio track with ID '{id}' not found. Use `/list-audio` to see available audio tracks."
- Error (missing value): "❌ **Missing Value** - Option `--id` requires a value. Example: `--id audio-123456789-abc123`"
- Error (unknown option): "❌ **Unknown Option** - Unknown option '{option}'. Usage: /del-audio --id audio_id [--yes]"
- Error (execution failed): "❌ **Audio Deletion Failed** - Failed to delete audio track. Please try again."

### `/del-elem`

Deletes an element from the composition by its unique ID, or deletes the currently selected element if no ID is provided. This is a destructive operation that requires confirmation.

**Usage:** `/del-elem [--id|-i element_id] [--yes|-y]`

**Options:**
- `--id`, `-i`: The unique ID of the element to delete (optional - uses selected element if not provided)
- `--yes`, `-y`: Skip confirmation dialog and delete immediately

**Behavior:**
- **Without arguments**: Deletes the currently selected element
- **With ID argument**: Searches for the specified element across all pages in the composition
- **With --yes flag**: Skips confirmation dialog and deletes immediately
- Requires user confirmation before deletion unless `--yes` flag is used (destructive operation)
- Automatically clears element selection if the deleted element was selected
- Provides detailed feedback about the deleted element and deletion method
- Cannot be undone - element is permanently removed from the project
- Supports both formal `--id` syntax and shorthand direct ID specification

**Examples:**
- `/del-elem` - Delete the currently selected element (with confirmation)
- `/del-elem --yes` - Delete the currently selected element without confirmation
- `/del-elem --id text-1234567890-abc123` - Delete text element by ID (with confirmation)
- `/del-elem -i image-1234567890-def456 --yes` - Delete image element without confirmation
- `/del-elem video-1234567890-ghi789 -y` - Delete video element without confirmation (direct ID + short flag)

**Finding Element IDs:**
- Use the properties panel to view element IDs
- Check the composition structure in developer tools
- Element IDs follow the format: `{type}-{timestamp}-{random}`
- Examples: `text-1640995200000-abc123`, `image-1640995201000-def456`

**Response Messages:**
- Success (selected): "✅ **Element Deleted** - Deleted selected element ({type}) from page '{page name}' • Element ID: {id} • Element type: {type} • {content details} • Page: {page name} • Selection cleared"
- Success (by ID): "✅ **Element Deleted** - Deleted element '{id}' ({type}) from page '{page name}' • Element ID: {id} • Element type: {type} • {content details} • Page: {page name}"
- Error (no project): "❌ **No Project** - No project is currently loaded. Please create or load a project first."
- Error (no selection): "❌ **No Element Selected** - No element ID provided and no element is currently selected. Options: • Select an element in the editor, then use `/del-elem` • Specify an element ID: `/del-elem --id element_id`"
- Error (missing ID after args): "❌ **Missing Element ID** - Please specify an element ID to delete. Usage: `/del-elem [--id element_id]` Or select an element and use `/del-elem` without arguments."
- Error (missing value): "❌ **Missing Value** - Option `--id` requires a value. Example: `--id text-1234567890-abc123`"
- Error (element not found): "❌ **Element Not Found** - No element with ID '{id}' was found in the composition. Tip: Use the properties panel to find element IDs, or check the composition structure."
- Error (unknown option): "❌ **Unknown Option** - Unknown option '{option}'. Usage: /del-elem [--id element_id]"
- Error (confirmation cancelled): "⏸️ **Command Cancelled** - Element deletion was cancelled."
- Error (execution failed): "❌ **Delete Failed** - Failed to delete element. Please try again."

### `/set-text`

Modifies properties of an existing text element, including content, styling, and positioning. Works with the currently selected element or a specific element ID.

**Usage:** `/set-text [--id|-i element_id] [--text|-t "text"] [--font-size|-fs size] [--color|-c color] [--font-family|-ff family] [--font-weight|-fw weight] [--text-align|-ta align] [--left|-l x] [--top|-tp y] [--width|-w width] [--opacity|-o opacity] [--rotation|-r degrees]`

**Options:**
- `--id`, `-i`: Element ID to modify (optional - uses selected element if not provided)
- `--text`, `-t`: New text content for the element (use quotes for multi-word text)
- `--font-size`, `-fs`: Font size in pixels (positive number)
- `--color`, `-c`: Text color (hex, RGB, or CSS color name)
- `--font-family`, `-ff`: Font family specification
- `--font-weight`, `-fw`: Font weight (normal, bold, or numeric values)
- `--text-align`, `-ta`: Text alignment (left, center, right)
- `--left`, `-l`: X-coordinate position in pixels
- `--top`, `-tp`: Y-coordinate position in pixels
- `--width`, `-w`: Element width in pixels (positive number)
- `--opacity`, `-o`: Element opacity (0.0 to 1.0)
- `--rotation`, `-r`: Rotation angle in degrees

**Behavior:**
- Modifies an existing text element rather than creating a new one
- If no ID is provided, modifies the currently selected text element
- Only affects the specific properties provided in the command
- Validates element type - will error if target element is not a text element
- Immediately updates the visual representation in the composition
- Preserves existing properties that are not explicitly changed

**Examples:**
- `/set-text --text "Updated Content"` - Change text of selected element
- `/set-text --id text-123 --font-size 48 --color "#ff0000"` - Make specific text larger and red
- `/set-text -t "Centered Title" -ta center -fs 64 -fw bold` - Update selected text to be a centered bold title
- `/set-text --id text-456 --left 200 --top 100 --rotation 15` - Move and rotate specific text element

**Response Messages:**
- Success: "✅ **Text Element Updated** - Updated text element '{id}' on page '{page name}' • {list of changes made}"
- Error (no project): "❌ **No Project** - No project is currently loaded. Please create or load a project first."
- Error (no selection): "❌ **No Element Selected** - No element ID provided and no element is currently selected. Options: • Select a text element in the editor, then use `/set-text` • Specify an element ID: `/set-text --id element_id`"
- Error (missing ID): "❌ **Missing Element ID** - Please specify an element ID or select an element. Usage: `/set-text [--id element_id] [options...]`"
- Error (no updates): "❌ **No Updates Specified** - Please specify at least one property to update. Available options: --text, --font-size, --color, --font-family, --font-weight, --text-align, --left, --top, --width, --opacity, --rotation"
- Error (element not found): "❌ **Element Not Found** - No element with ID '{id}' was found in the composition."
- Error (wrong type): "❌ **Wrong Element Type** - Element '{id}' is a {type} element, not a text element. Use: • /set-text for text elements • /set-image for image elements • /set-video for video elements"
- Error (invalid values): Various validation errors for font size, text align, position, opacity, etc.
- Error (execution failed): "❌ **Update Failed** - Failed to update text element. Please try again."

### `/set-image`

Modifies properties of an existing image element, including source, dimensions, and positioning. Works with the currently selected element or a specific element ID.

**Usage:** `/set-image [--id|-i element_id] [--src|-s url] [--left|-l x] [--top|-tp y] [--width|-w width] [--height|-h height] [--opacity|-o opacity] [--rotation|-r degrees]`

**Options:**
- `--id`, `-i`: Element ID to modify (optional - uses selected element if not provided)
- `--src`, `-s`: New image source URL (web URL or local file path)
- `--left`, `-l`: X-coordinate position in pixels
- `--top`, `-tp`: Y-coordinate position in pixels
- `--width`, `-w`: Element width in pixels (positive number)
- `--height`, `-h`: Element height in pixels (positive number)
- `--opacity`, `-o`: Element opacity (0.0 to 1.0)
- `--rotation`, `-r`: Rotation angle in degrees

**Behavior:**
- Modifies an existing image element rather than creating a new one
- If no ID is provided, modifies the currently selected image element
- Only affects the specific properties provided in the command
- Validates element type - will error if target element is not an image element
- Changing the source URL will reload the image with the new content
- Immediately updates the visual representation in the composition
- Preserves existing properties that are not explicitly changed

**Examples:**
- `/set-image --src "https://example.com/new-image.jpg"` - Change image source of selected element
- `/set-image --id image-123 --width 400 --height 300` - Resize specific image
- `/set-image -s "new-logo.png" -l 50 -tp 50 -o 0.8` - Update selected image with new source, position, and opacity
- `/set-image --id image-456 --rotation 45 --opacity 0.5` - Rotate and make specific image semi-transparent

**Response Messages:**
- Success: "✅ **Image Element Updated** - Updated image element '{id}' on page '{page name}' • {list of changes made}"
- Error (no project): "❌ **No Project** - No project is currently loaded. Please create or load a project first."
- Error (no selection): "❌ **No Element Selected** - No element ID provided and no element is currently selected. Options: • Select an image element in the editor, then use `/set-image` • Specify an element ID: `/set-image --id element_id`"
- Error (missing ID): "❌ **Missing Element ID** - Please specify an element ID or select an element. Usage: `/set-image [--id element_id] [options...]`"
- Error (no updates): "❌ **No Updates Specified** - Please specify at least one property to update. Available options: --src, --left, --top, --width, --height, --opacity, --rotation"
- Error (element not found): "❌ **Element Not Found** - No element with ID '{id}' was found in the composition."
- Error (wrong type): "❌ **Wrong Element Type** - Element '{id}' is a {type} element, not an image element. Use: • /set-text for text elements • /set-image for image elements • /set-video for video elements"
- Error (invalid values): Various validation errors for position, size, opacity, rotation, etc.
- Error (execution failed): "❌ **Update Failed** - Failed to update image element. Please try again."

### `/set-video`

Modifies properties of an existing video element, including source, dimensions, timing, and positioning. Works with the currently selected element or a specific element ID.

**Usage:** `/set-video [--id|-i element_id] [--src|-s url] [--left|-l x] [--top|-tp y] [--width|-w width] [--height|-h height] [--opacity|-o opacity] [--rotation|-r degrees] [--delay|-d milliseconds]`

**Options:**
- `--id`, `-i`: Element ID to modify (optional - uses selected element if not provided)
- `--src`, `-s`: New video source URL (web URL or local file path)
- `--left`, `-l`: X-coordinate position in pixels
- `--top`, `-tp`: Y-coordinate position in pixels
- `--width`, `-w`: Element width in pixels (positive number)
- `--height`, `-h`: Element height in pixels (positive number)
- `--opacity`, `-o`: Element opacity (0.0 to 1.0)
- `--rotation`, `-r`: Rotation angle in degrees
- `--delay`, `-d`: Animation delay in milliseconds (non-negative)

**Behavior:**
- Modifies an existing video element rather than creating a new one
- If no ID is provided, modifies the currently selected video element
- Only affects the specific properties provided in the command
- Validates element type - will error if target element is not a video element
- Changing the source URL will reload the video with the new content
- Delay parameter controls when the video starts playing relative to page start
- Immediately updates the visual representation in the composition
- Preserves existing properties that are not explicitly changed

**Examples:**
- `/set-video --src "https://example.com/new-video.mp4"` - Change video source of selected element
- `/set-video --id video-123 --delay 2000 --opacity 0.8` - Add 2-second delay and transparency to specific video
- `/set-video -s "intro.webm" -w 640 -h 480 -l 100` - Update selected video with new source, size, and position
- `/set-video --id video-456 --rotation 10 --delay 1500` - Rotate specific video and delay playback

**Response Messages:**
- Success: "✅ **Video Element Updated** - Updated video element '{id}' on page '{page name}' • {list of changes made}"
- Error (no project): "❌ **No Project** - No project is currently loaded. Please create or load a project first."
- Error (no selection): "❌ **No Element Selected** - No element ID provided and no element is currently selected. Options: • Select a video element in the editor, then use `/set-video` • Specify an element ID: `/set-video --id element_id`"
- Error (missing ID): "❌ **Missing Element ID** - Please specify an element ID or select an element. Usage: `/set-video [--id element_id] [options...]`"
- Error (no updates): "❌ **No Updates Specified** - Please specify at least one property to update. Available options: --src, --left, --top, --width, --height, --opacity, --rotation, --delay"
- Error (element not found): "❌ **Element Not Found** - No element with ID '{id}' was found in the composition."
- Error (wrong type): "❌ **Wrong Element Type** - Element '{id}' is a {type} element, not a video element. Use: • /set-text for text elements • /set-image for image elements • /set-video for video elements"
- Error (invalid values): Various validation errors for position, size, opacity, rotation, delay, etc.
- Error (execution failed): "❌ **Update Failed** - Failed to update video element. Please try again."

## `/set-comp` - Modify Composition Properties

**Syntax:** `/set-comp [options...]`

**Purpose:** Modify global composition properties including project title, frame rate, and canvas dimensions.

**Parameters:**
- `--title`, `-t` - Project title (string)
- `--fps`, `-f` - Frame rate in frames per second (number: 1-120)
- `--width`, `-w` - Canvas width in pixels (number: 1-7680)
- `--height`, `-h` - Canvas height in pixels (number: 1-4320)

**Features:**
- Updates global composition settings that affect the entire project
- Validates frame rate and dimension limits for optimal performance
- Changes the project title displayed in the interface
- Modifies the canvas size for all pages in the composition
- Adjusts frame rate for smoother or more efficient video output

**Technical Notes:**
- Frame rate affects video smoothness and file size
- Canvas dimensions determine the output resolution
- All changes are immediately applied to the composition
- Title changes are reflected in the project interface

**Examples:**
- `/set-comp --title "My Video Project"` - Change project title
- `/set-comp --fps 60` - Set frame rate to 60 FPS
- `/set-comp -w 1920 -h 1080` - Set HD resolution (1920x1080)
- `/set-comp -t "Demo Video" -f 30 -w 1280 -h 720` - Set title, frame rate, and 720p resolution

**Response Messages:**
- Success: "✅ **Composition Updated** - Updated composition properties • {list of changes made}"
- Error (no project): "❌ **No Project** - No project is currently loaded. Please create or load a project first."
- Error (no updates): "❌ **No Updates Specified** - Please specify at least one property to update. Available options: --title, --fps, --width, --height"
- Error (invalid fps): "❌ **Invalid FPS** - Frame rate must be between 1 and 120. Provided: {value}"
- Error (invalid width): "❌ **Invalid Width** - Width must be between 1 and 7680 pixels. Provided: {value}"
- Error (invalid height): "❌ **Invalid Height** - Height must be between 1 and 4320 pixels. Provided: {value}"
- Error (execution failed): "❌ **Update Failed** - Failed to update composition properties. Please try again."

### `/ls-comp`

Lists composition overview with basic project information and page summary. Returns machine-readable JSON format for easy parsing.

**Usage:** `/ls-comp`

**Behavior:**
- Displays composition overview without detailed page contents
- Shows project metadata (name, ID) and composition settings (dimensions, fps)
- Lists all pages with basic information (ID, name, duration, element count)
- Returns structured JSON data within markdown code blocks
- Provides total page count and composition statistics
- No arguments required - simply lists the current composition state

**JSON Structure:**
```json
{
  "project": {
    "name": "Project Title",
    "id": "project-id"
  },
  "composition": {
    "width": 1920,
    "height": 1080,
    "fps": 30,
    "totalPages": 3
  },
  "pages": [
    {
      "index": 1,
      "id": "page-id",
      "name": "Page Name",
      "duration": 5000,
      "durationSeconds": 5,
      "elementCount": 2
    }
  ]
}
```

**Response Messages:**
- Success: Returns JSON data in markdown code block
- Error (no project): "❌ **No Project** - No project is currently loaded. Please create or load a project first."
- Error (execution failed): "❌ **List Failed** - Failed to list composition information. Please try again."

### `/ls-page`

Lists detailed information for a specific page, returning the raw page data model exactly as stored in the composition.

**Usage:** `/ls-page [--id|-i page_id]`

**Options:**
- `--id`, `-i`: Specific page ID to display (optional - uses selected page if not provided)

**Behavior:**
- Returns complete raw page data model in JSON format
- Uses currently selected page if no ID is specified
- Shows all page properties exactly as stored (no transformation or restructuring)
- Includes complete element data with all properties and type-specific attributes
- Preserves original data structure for programmatic access
- Returns syntax-highlighted JSON within markdown code blocks

**Data Structure:**
Returns the raw page object including:
- Page metadata (id, name, duration, backgroundColor)
- Complete elements array with all properties
- Type-specific element data (text content, image/video sources, styling)
- Position, size, opacity, rotation, and other element properties
- Unmodified data structure matching internal composition format

**Examples:**
- `/ls-page` - Show details for currently selected page
- `/ls-page --id page-intro` - Show details for specific page by ID
- `/ls-page -i page-conclusion` - Show details for specific page (short form)

**Response Messages:**
- Success: Returns raw page JSON data in markdown code block
- Error (no project): "❌ **No Project** - No project is currently loaded. Please create or load a project first."
- Error (no pages): "❌ **No Pages** - The composition has no pages. Use `/new-page` to add pages."
- Error (no page specified): "❌ **No Page Specified** - No page ID provided and no page is currently selected. Options: • Select a page in the editor, then use `/ls-page` • Specify a page ID: `/ls-page --id page_id`"
- Error (page not found): "❌ **Page Not Found** - No page with ID '{id}' was found in the composition. Available pages: {page_ids}"
- Error (execution failed): "❌ **List Failed** - Failed to list page information. Please try again."

### `/ls-files`

Lists all file metadata from the current project storage, returning complete information about uploaded and stored files.

**Usage:** `/ls-files`

**Behavior:**
- Returns filtered file metadata for all stored files in JSON format
- Shows file properties including name, size, type, dimensions (for images/videos), and other metadata
- Excludes large binary data (dataUrl, blob, arrayBuffer) to keep output readable
- Provides programmatic access to useful file information currently in storage
- Returns syntax-highlighted JSON within markdown code blocks
- No arguments required - lists all files in current project storage

**Data Structure:**
Returns an array of file objects including:
- File identification (name, type, size, lastModified)
- Dimensions for media files (width, height)
- Duration for video/audio files
- Other useful metadata properties
- Binary data fields (dataUrl, blob, arrayBuffer) are filtered out for readability

**Examples:**
- `/ls-files` - List all file metadata in current project

**Response Messages:**
- Success: Returns file metadata JSON array in markdown code block
- Success (no files): "📁 **No Files** - No files are currently stored in the project."
- Error (no storage): "❌ **No File Storage** - File storage is not available in the current context."
- Error (execution failed): "❌ **List Failed** - Failed to list file metadata. Please try again."

## Architecture

### Core Components

The slash command system consists of several key files:

#### `clientSlashCommands.ts`
- **Location**: `/app/src/packages/editor/utils/clientSlashCommands.ts`
- **Purpose**: Core slash command processing logic
- **Key Functions**:
  - `parseSlashCommand()`: Detects and parses slash commands from user input
  - `executeSlashCommand()`: Executes commands with proper context
  - `registerSlashCommand()`: Adds new commands to the registry
  - Command registry management and validation

#### `RightPanel.tsx`
- **Location**: `/app/src/packages/editor/RightPanel.tsx`
- **Purpose**: Chat interface integration
- **Integration Point**: `handleSendMessage()` function detects slash commands before AI processing
- **Context Provision**: Provides command execution context (project state, update functions)

#### Command Context Interface
```typescript
interface SlashCommandContext {
  project: any;                           // Current project state
  updateProject: (project: any) => void;  // Project update function
  addMessage: (content: string) => void;  // Add message to chat
  clearAllFiles?: () => Promise<void>;    // Clear all files from storage
  setChatMessages?: (messages: any[]) => void; // Set entire chat history
  setSelectedPage?: (page: any) => void;  // Update selected page
  setSelectedElement?: (element: any) => void; // Update selected element
  setIsSharedProject?: (isShared: boolean) => void; // Toggle project mode
  setShowImportDialog?: (show: boolean) => void; // Show/hide import dialog
  setShowExportDialog?: (show: boolean) => void; // Show/hide export dialog
  setExportFormat?: (format: 'json' | 'mp4' | 'webm') => void; // Set export format
  fileStorage?: any; // File storage for direct JSON export
  setShowShareDialog?: (show: boolean) => void; // Show/hide share dialog
  onShare?: (args: { encryptedData: string; projectName: string }) => Promise<{ shareId: string }>; // Share function
}
```

### Command Registration

Commands are registered in a central registry using the `SlashCommand` interface:

```typescript
interface SlashCommand {
  name: string;                    // Command name (without /)
  description: string;             // Human-readable description
  usage: string;                   // Usage example
  requiresConfirmation: boolean;   // Whether to show confirmation dialog
  confirmationMessage?: string;    // Custom confirmation message
  execute: (context: SlashCommandContext) => Promise<SlashCommandResult>;
}
```

### Execution Flow

1. **Input Detection**: User types message starting with `/` in chat
2. **Command Parsing**: `parseSlashCommand()` extracts command name and arguments
3. **Registry Lookup**: System finds command in registry or returns "Unknown Command" error
4. **Confirmation Check**: If required, shows browser confirmation dialog
5. **Context Creation**: Builds execution context with current project state and update functions
6. **Command Execution**: Runs command's `execute()` function with context
7. **Result Display**: Shows success/error message in chat

### Error Handling

The system provides comprehensive error handling:

- **Unknown Commands**: Shows available commands list
- **Execution Errors**: Catches and displays error messages
- **Confirmation Cancellation**: Graceful handling when user cancels destructive operations
- **Context Validation**: Ensures required context functions are available

## Implementation Guide

### Adding New Commands

To add a new client-side slash command:

1. **Define the Command**:
```typescript
const myCommand: SlashCommand = {
  name: 'mycommand',
  description: 'Description of what this command does',
  usage: '/mycommand [args]',
  requiresConfirmation: false, // Set to true for destructive operations
  execute: async (context: SlashCommandContext): Promise<SlashCommandResult> => {
    try {
      // Command implementation here
      // Access current state: context.project
      // Update project: context.updateProject(newProject)
      // Add chat message: context.addMessage('Response text')
      
      return {
        success: true,
        message: '✅ **Success Message**\n\nCommand completed successfully.',
        handled: true
      };
    } catch (error) {
      return {
        success: false,
        message: '❌ **Error Message**\n\nSomething went wrong.',
        handled: true
      };
    }
  }
};
```

2. **Register the Command**:
```typescript
// Add to the commandRegistry Map in clientSlashCommands.ts
const commandRegistry: Map<string, SlashCommand> = new Map([
  ['reset', resetCommand],
  ['import', importCommand],
  ['export', exportCommand],
  ['share', shareCommand],
  ['new-page', newPageCommand],
  ['del-page', delPageCommand],
  ['zoom-tl', zoomTimelineCommand],
  ['set-page', setPageCommand],
  ['set-comp', setCompCommand],
  ['ls-comp', lsCompCommand],
  ['ls-page', lsPageCommand],
  ['ls-files', lsFilesCommand],
  ['new-text', newTextCommand],
  ['new-image', newImageCommand],
  ['new-video', newVideoCommand],
  ['del-elem', delElementCommand],
  ['set-text', setTextCommand],
  ['set-image', setImageCommand],
  ['set-video', setVideoCommand],
  ['mycommand', myCommand], // Add your command here
]);
```

3. **Update Context** (if needed):
   - If your command needs additional context functions, add them to the `SlashCommandContext` interface
   - Update the context creation in `RightPanel.tsx`
   - Pass the functions from the parent component (`VibeEditorPage.tsx`)

### Best Practices

1. **Naming**: Use lowercase command names, keep them short and memorable
2. **Descriptions**: Write clear, concise descriptions for help messages
3. **Confirmations**: Always require confirmation for destructive operations
4. **Error Messages**: Provide helpful error messages with suggested alternatives
5. **Success Messages**: Use consistent formatting with emojis and markdown
6. **State Management**: Use the provided context functions instead of direct atom access
7. **Async Operations**: Handle promises properly, especially for file operations

### Testing Commands

To test new commands:

1. **Development**: Start the development server and open the editor
2. **Autocomplete**: Type `/` to verify the command appears in autocomplete dropdown
3. **Chat Interface**: Type your command in the chat interface or select from autocomplete
4. **Verification**: Confirm the command executes correctly and shows appropriate messages
5. **Error Cases**: Test error scenarios (invalid args, confirmation cancellation, etc.)
6. **Integration**: Verify the command works with different project states (local/shared)
7. **Fuzzy Matching**: Test that partial matches like `/rst` correctly suggest `/reset`

## Future Enhancements

The slash command system is designed to be extensible. Potential future commands could include:

- `/help` - Show available commands and usage
- `/export [format]` - Export project in specified format
- `/save` - Save current project
- `/undo` - Undo last action
- `/redo` - Redo last undone action
- `/settings` - Open settings dialog
- `/share` - Share current project

## Technical Notes

### Storage Integration

The system integrates with the dual storage architecture:
- **Local Projects**: Use IndexedDB storage via `clearAllFiles()` atom
- **Shared Projects**: Use memory storage, automatically handled by storage atoms

### Chat Integration

Commands are fully integrated with the chat system:
- User commands appear in chat history
- Command responses use the same message format as AI responses
- Commands don't interfere with AI modes (edit/ask/agent)

### Performance

Client-side execution ensures:
- No network latency
- No API usage costs
- Immediate user feedback
- Offline functionality
- Fast autocomplete with fuzzy matching
- Responsive keyboard navigation

### Autocomplete Implementation

The autocomplete system includes:
- **Fuzzy matching algorithm** that scores commands based on character matches
- **Real-time filtering** that updates results as the user types
- **Keyboard navigation** with arrow keys and enter selection
- **Visual highlighting** of matching characters for better UX
- **Click-to-select** functionality for mouse users
- **Automatic positioning** above input to avoid layout issues

This architecture provides a solid foundation for expanding the command system while maintaining consistency, reliability, and excellent user experience.
