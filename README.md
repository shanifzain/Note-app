# Daybook

Daybook is a responsive note-taking web app for capturing thoughts, ideas, lists, and reminders in one focused workspace.

## Features

- Create, edit, pin, archive, and delete notes
- Search notes and filter them by tag
- Sort notes by last update, title, or color
- Switch between grid and list layouts
- Assign note colors and comma-separated tags
- Select and delete multiple notes
- Save notes automatically in browser local storage
- Use keyboard shortcuts for quick actions
- Responsive navigation and layout for mobile and desktop

## Tech Stack

- React 19
- Vite 8
- Tailwind CSS 4
- Lucide React
- ESLint

## Getting Started

### Prerequisites

- Node.js 20 or later
- npm

### Installation

```bash
npm install
```

### Run the Development Server

```bash
npm run dev
```

Open the local URL printed by Vite, normally `http://localhost:5173`.

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Create a production build in `dist/` |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview the production build locally |

## Keyboard Shortcuts

| Shortcut | Action |
| --- | --- |
| `N` | Create a new note |
| `Ctrl+K` or `Cmd+K` | Focus search |
| `Esc` | Close the editor or delete confirmation |

## Data Storage

Notes are stored in the browser under the local storage key `daybook-notes-v1`. Data remains in the current browser and does not sync between devices or browsers.
