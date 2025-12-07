import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export type Habit = {
  id: string;
  name: string;
  target_days: number;
  created_at: string;
};

export type HabitEntry = {
  id: string;
  habit_id: string;
  date: string;
  status: 'green' | 'grey' | 'red' | 'yellow';
  created_at: string;
};

export type Task = {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'migrated' | 'cancelled';
  date: string;
  project_id?: string;
  notes?: string;
  created_at: string;
};

export type Project = {
  id: string;
  title: string;
  type: 'project' | 'goal';
  due_date?: string;
  notes?: string;
  tag?: string;
  tag_color?: string;
  created_at: string;
};
