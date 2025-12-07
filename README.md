# BetterFocus

A comprehensive habit and task tracking application built with Next.js, TypeScript, and Tailwind CSS.

## Features

### Core Dashboard
- **3-Column Layout**: Habits, Tasks, and Projects/Goals
- **Responsive Design**: Works on desktop and mobile devices
- **Yellow/Black Theme**: Clean, modern interface with light background

### Habits Tracking
- Track daily habits with visual status indicators
- Week navigation (< Week# >)
- Color-coded status system:
  - Green: Complete
  - Yellow: To do today (auto-assigned)
  - Grey: Missed but in range
  - Red: Missed out of range
- Weekly streak view showing historical completion rates
- Configurable target days per habit (e.g., 5/7 days)
- Click to cycle through statuses

### Tasks Management
- Today's task list
- Status cycling: Pending → In Progress → Completed → Migrated → Cancelled
- Click task name to add/edit notes
- Migrated tasks automatically move to current day
- Visual status icons

### Projects & Goals
- Separate sections for Projects and Goals (work identically)
- Due date tracking
- Associated tasks for each project/goal
- Notes support
- Click project/goal name to edit or delete
- + button to quickly add tasks to specific projects

## Getting Started

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Clone or navigate to the project directory:
```bash
cd BetterFocus
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
BetterFocus/
├── app/
│   ├── globals.css          # Global styles and Tailwind directives
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Main dashboard page
├── components/
│   ├── DashboardLayout.tsx   # Main layout with sidebar
│   ├── Sidebar.tsx           # Navigation sidebar (collapsible on desktop, bottom nav on mobile)
│   ├── HabitsColumn.tsx      # Habits tracking component
│   ├── TasksColumn.tsx       # Tasks management component
│   └── ProjectsColumn.tsx    # Projects and goals component
├── lib/
│   └── supabase.ts           # Supabase client and type definitions
├── utils/
│   └── dateUtils.ts          # Date utility functions
└── public/                    # Static assets
```

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (ready for integration)
- **Deployment**: Vercel (recommended)

## Current Status

### ✅ Completed
- Core dashboard layout with 3 columns
- Responsive sidebar navigation (collapsible on desktop, bottom nav on mobile)
- Habits tracking with daily and weekly views
- Week navigation system
- Task management with status cycling
- Projects and Goals sections
- Full UI interactions (click to cycle statuses, add items, edit notes)
- Yellow/Black theme with light background

### 🔄 Next Steps
1. Set up Supabase database
2. Integrate backend data persistence
3. Deploy to Vercel

## Database Schema (Supabase)

When ready to connect to Supabase, create the following tables:

### habits
- id: uuid (primary key)
- name: text
- target_days: integer
- created_at: timestamp

### habit_entries
- id: uuid (primary key)
- habit_id: uuid (foreign key)
- date: date
- status: text (green, grey, red, yellow)
- created_at: timestamp

### tasks
- id: uuid (primary key)
- title: text
- status: text (pending, in_progress, completed, migrated, cancelled)
- date: date
- project_id: uuid (nullable, foreign key)
- notes: text (nullable)
- created_at: timestamp

### projects
- id: uuid (primary key)
- title: text
- type: text (project, goal)
- due_date: date (nullable)
- notes: text (nullable)
- created_at: timestamp

## Environment Variables

Create a `.env.local` file with your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Contributing

This is a personal project. Feel free to fork and customize for your own use.

## License

Private - All rights reserved
