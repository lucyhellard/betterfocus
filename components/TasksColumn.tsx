'use client';

import { useState, useEffect } from 'react';
import { formatDate, getWeekDates } from '@/utils/dateUtils';
import { supabase } from '@/lib/supabase';
import { getCurrentUserId } from '@/lib/supabaseHelpers';
import { useWeek } from '@/lib/WeekContext';
import Link from 'next/link';
import {
  ArrowDownOnSquareIcon,
  ArrowUpOnSquareIcon,
  FlagIcon,
  TrashIcon,
  ArrowTurnDownLeftIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DocumentTextIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

type Task = {
  id: string;
  title: string;
  status: TaskStatus;
  date: string;
  dueDate?: string;
  notes?: string;
  projectId?: string;
  projectTag?: string;
  projectTagColor?: string;
  completedAt?: string;
  createdAt?: string;
  isBacklog?: boolean;
  isPriority?: boolean;
  isEvent?: boolean;
  eventTime?: string;
  eventDate?: string;
};

const TaskIcon = ({ status }: { status: TaskStatus }) => {
  switch (status) {
    case 'pending':
      return (
        <div className="w-6 h-6 border-2 border-gray-300 bg-white rounded-sm" />
      );
    case 'in_progress':
      return (
        <div className="w-6 h-6 border-2 bg-white rounded-sm relative overflow-hidden" style={{ borderColor: '#f59e0b' }}>
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(to top left, #f59e0b 0%, #f59e0b 50%, transparent 50%, transparent 100%)'
          }} />
        </div>
      );
    case 'completed':
      return (
        <div className="w-6 h-6 bg-status-green rounded-sm" />
      );
    case 'cancelled':
      return (
        <div className="w-6 h-6 border-2 border-status-red bg-white rounded-sm flex items-center justify-center">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 2L10 10M10 2L2 10" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      );
  }
};

// Calculate days open since task creation
const calculateDaysOpen = (createdAt?: string): number => {
  if (!createdAt) return 0;

  const created = new Date(createdAt);
  const now = new Date();

  // Reset hours to calculate full days difference
  created.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);

  const diffTime = now.getTime() - created.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // Add 1 so tasks created today show as 1d, yesterday shows as 2d, etc.
  return diffDays + 1;
};

// Component to display days open with conditional styling
const DaysOpenBadge = ({ createdAt }: { createdAt?: string }) => {
  const days = calculateDaysOpen(createdAt);
  const isOverdue = days > 14;
  const isVeryOverdue = days > 30;

  return (
    <span className={`font-normal ${isOverdue ? 'text-red-500' : 'text-gray-400'}`}>
      ({days}d){isVeryOverdue && ' ⚠️'}
    </span>
  );
};

// Component to display project/goal tag
const ProjectTag = ({ tag, color }: { tag: string; color: string }) => {
  return (
    <span
      className="inline-block px-2 py-0.5 text-xs font-medium rounded"
      style={{
        backgroundColor: `${color}20`,
        color: color,
        border: `1px solid ${color}40`
      }}
    >
      {tag}
    </span>
  );
};

export default function TasksColumn() {
  const { currentWeek, currentYear } = useWeek();
  const today = formatDate(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [backlogTasks, setBacklogTasks] = useState<Task[]>([]);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddBacklogTask, setShowAddBacklogTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newBacklogTaskTitle, setNewBacklogTaskTitle] = useState('');
  const [isEvent, setIsEvent] = useState(false);
  const [eventTime, setEventTime] = useState('');
  const [eventDate, setEventDate] = useState(today);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [projects, setProjects] = useState<Array<{ id: string; title: string; tag: string; tag_color: string }>>([]);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editProjectId, setEditProjectId] = useState<string>('');
  const [editingDueDate, setEditingDueDate] = useState<string | null>(null);
  const [editDueDateValue, setEditDueDateValue] = useState('');
  const [editingEventDetails, setEditingEventDetails] = useState<string | null>(null);
  const [editEventDateValue, setEditEventDateValue] = useState('');
  const [editEventTimeValue, setEditEventTimeValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [isWeekTasksExpanded, setIsWeekTasksExpanded] = useState(true);
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(true);
  const [isBacklogExpanded, setIsBacklogExpanded] = useState(true);

  useEffect(() => {
    fetchTasks();
    fetchProjects();
  }, [currentWeek]);

  const fetchProjects = async () => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) return;

      const { data, error } = await supabase
        .from('projects')
        .select('id, title, tag, tag_color')
        .eq('user_id', userId)
        .is('completed_at', null)
        .order('title')
        .limit(1000);

      if (error) throw error;
      if (data) {
        console.log(`Fetched ${data.length} active projects`);
        setProjects(data);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const moveOldOpenTasksToBacklog = async () => {
    try {
      // Get the date range for the current week
      const weekDates = getWeekDates(currentWeek, currentYear);
      const startDate = formatDate(weekDates[0]);

      // Find all open tasks (pending or in_progress) from before this week
      const { data: oldOpenTasks, error: fetchError } = await supabase
        .from('tasks')
        .select('id')
        .lt('date', startDate)
        .in('status', ['pending', 'in_progress'])
        .or('is_backlog.is.null,is_backlog.eq.false');

      if (fetchError) throw fetchError;

      if (oldOpenTasks && oldOpenTasks.length > 0) {
        // Move these tasks to backlog with current timestamp so they appear at top
        const now = new Date().toISOString();
        for (const task of oldOpenTasks) {
          await supabase
            .from('tasks')
            .update({
              is_backlog: true,
              created_at: now // Update created_at so they sort to top of backlog
            })
            .eq('id', task.id);
        }
        console.log(`Moved ${oldOpenTasks.length} old open tasks to backlog`);
      }
    } catch (error) {
      console.error('Error moving old tasks to backlog:', error);
    }
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);

      // First, move old open tasks to backlog
      await moveOldOpenTasksToBacklog();

      // Get the date range for the current week
      const weekDates = getWeekDates(currentWeek, currentYear);
      const startDate = formatDate(weekDates[0]);
      const endDate = formatDate(weekDates[6]);

      // Fetch week tasks (not in backlog) with project tags
      const { data: weekData, error: weekError } = await supabase
        .from('tasks')
        .select(`
          *,
          projects (tag, tag_color)
        `)
        .gte('date', startDate)
        .lte('date', endDate)
        .or('is_backlog.is.null,is_backlog.eq.false')
        .order('date', { ascending: true })
        .order('created_at', { ascending: true });

      if (weekError) throw weekError;

      const formattedWeekTasks: Task[] = (weekData || []).map((task) => ({
        id: task.id,
        title: task.title,
        status: task.status as TaskStatus,
        date: task.date,
        dueDate: task.due_date || task.date,
        notes: task.notes || undefined,
        projectId: task.project_id || undefined,
        projectTag: task.projects?.tag || undefined,
        projectTagColor: task.projects?.tag_color || undefined,
        completedAt: task.completed_at || undefined,
        createdAt: task.created_at || undefined,
        isBacklog: task.is_backlog || false,
        isPriority: task.is_priority || false,
        isEvent: task.is_event || false,
        eventTime: task.event_time || undefined,
        eventDate: task.event_date || undefined,
      }));

      setTasks(formattedWeekTasks);

      // Fetch backlog tasks with project tags
      const { data: backlogData, error: backlogError } = await supabase
        .from('tasks')
        .select(`
          *,
          projects (tag, tag_color)
        `)
        .eq('is_backlog', true)
        .order('created_at', { ascending: false });

      if (backlogError) throw backlogError;

      const formattedBacklogTasks: Task[] = (backlogData || []).map((task) => ({
        id: task.id,
        title: task.title,
        status: task.status as TaskStatus,
        date: task.date,
        dueDate: task.due_date || task.date,
        notes: task.notes || undefined,
        projectId: task.project_id || undefined,
        projectTag: task.projects?.tag || undefined,
        projectTagColor: task.projects?.tag_color || undefined,
        completedAt: task.completed_at || undefined,
        createdAt: task.created_at || undefined,
        isBacklog: true,
        isPriority: task.is_priority || false,
        isEvent: task.is_event || false,
        eventTime: task.event_time || undefined,
        eventDate: task.event_date || undefined,
      }));

      setBacklogTasks(formattedBacklogTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const cycleTaskStatus = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const statusCycle: TaskStatus[] = ['pending', 'in_progress', 'completed', 'cancelled'];
    const currentIndex = statusCycle.indexOf(task.status);
    const nextStatus = statusCycle[(currentIndex + 1) % statusCycle.length];

    // Determine completed_at based on status transition
    let newCompletedAt: string | null;
    const wasCompletedOrCancelled = task.status === 'completed' || task.status === 'cancelled';
    const isMovingToCompletedOrCancelled = nextStatus === 'completed' || nextStatus === 'cancelled';

    if (isMovingToCompletedOrCancelled) {
      // If already completed/cancelled and staying in that category, keep existing date
      if (wasCompletedOrCancelled && task.completedAt) {
        newCompletedAt = task.completedAt;
      } else {
        // First time completing/cancelling, set to today
        newCompletedAt = today;
      }
    } else {
      // Moving to pending/in_progress, clear completed_at
      newCompletedAt = null;
    }

    // Optimistically update UI
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;

        return {
          ...t,
          status: nextStatus,
          completedAt: newCompletedAt || undefined
        };
      })
    );

    try {
      await supabase
        .from('tasks')
        .update({
          status: nextStatus,
          completed_at: newCompletedAt,
        })
        .eq('id', taskId);
    } catch (error) {
      console.error('Error updating task status:', error);
      fetchTasks(); // Revert on error
    }
  };

  const addTask = async () => {
    if (!newTaskTitle.trim()) return;
    if (isSubmitting) return; // Prevent double submission

    try {
      setIsSubmitting(true);
      const userId = await getCurrentUserId();
      if (!userId) {
        console.error('No user logged in');
        setIsSubmitting(false);
        return;
      }

      const taskData: any = {
        title: newTaskTitle,
        status: 'pending',
        date: today,
        due_date: isEvent ? eventDate : today,
        user_id: userId,
        is_event: isEvent,
      };

      if (selectedProjectId) {
        taskData.project_id = selectedProjectId;
      }

      if (isEvent) {
        taskData.event_time = eventTime || null;
        taskData.event_date = eventDate;
      }

      const { data, error } = await supabase
        .from('tasks')
        .insert(taskData)
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        alert(`Error adding task: ${error.message || 'Unknown error'}\n\nMake sure you've run the database migration (supabase-migration-events.sql)`);
        setIsSubmitting(false);
        throw error;
      }

      if (data) {
        // Get project details if a project was selected
        const selectedProject = selectedProjectId ? projects.find(p => p.id === selectedProjectId) : undefined;

        const newTask: Task = {
          id: data.id,
          title: data.title,
          status: data.status as TaskStatus,
          date: data.date,
          dueDate: data.due_date || data.date,
          notes: data.notes || undefined,
          projectId: data.project_id || undefined,
          projectTag: selectedProject?.tag || undefined,
          projectTagColor: selectedProject?.tag_color || undefined,
          createdAt: data.created_at || undefined,
          isEvent: data.is_event || false,
          eventTime: data.event_time || undefined,
          eventDate: data.event_date || undefined,
        };
        setTasks([...tasks, newTask]);
      }

      setNewTaskTitle('');
      setIsEvent(false);
      setEventTime('');
      setEventDate(today);
      setSelectedProjectId('');
      setShowAddTask(false);
      setIsSubmitting(false);
    } catch (error) {
      console.error('Error adding task:', error);
      setIsSubmitting(false);
    }
  };

  const addBacklogTask = async () => {
    if (!newBacklogTaskTitle.trim()) return;

    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        console.error('No user logged in');
        return;
      }

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title: newBacklogTaskTitle,
          status: 'pending',
          date: today,
          due_date: null,
          is_backlog: true,
          user_id: userId,
        })
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        alert(`Error adding backlog task: ${error.message || 'Unknown error'}\n\nMake sure you've run the database migration (supabase-migration-backlog.sql)`);
        throw error;
      }

      if (data) {
        const newTask: Task = {
          id: data.id,
          title: data.title,
          status: data.status as TaskStatus,
          date: data.date,
          dueDate: data.due_date || undefined,
          notes: data.notes || undefined,
          projectId: data.project_id || undefined,
          createdAt: data.created_at || undefined,
          isBacklog: true,
        };
        setBacklogTasks([...backlogTasks, newTask]);
      }

      setNewBacklogTaskTitle('');
      setShowAddBacklogTask(false);
    } catch (error) {
      console.error('Error adding backlog task:', error);
    }
  };

  const cycleBacklogTaskStatus = async (taskId: string) => {
    const task = backlogTasks.find((t) => t.id === taskId);
    if (!task) return;

    const statusCycle: TaskStatus[] = ['pending', 'in_progress', 'completed', 'cancelled'];
    const currentIndex = statusCycle.indexOf(task.status);
    const nextStatus = statusCycle[(currentIndex + 1) % statusCycle.length];

    // Determine completed_at based on status transition
    let newCompletedAt: string | null;
    const wasCompletedOrCancelled = task.status === 'completed' || task.status === 'cancelled';
    const isMovingToCompletedOrCancelled = nextStatus === 'completed' || nextStatus === 'cancelled';

    if (isMovingToCompletedOrCancelled) {
      // If already completed/cancelled and staying in that category, keep existing date
      if (wasCompletedOrCancelled && task.completedAt) {
        newCompletedAt = task.completedAt;
      } else {
        // First time completing/cancelling, set to today
        newCompletedAt = today;
      }
    } else {
      // Moving to pending/in_progress, clear completed_at
      newCompletedAt = null;
    }

    // Optimistically update UI
    setBacklogTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          status: nextStatus,
          completedAt: newCompletedAt || undefined
        };
      })
    );

    try {
      await supabase
        .from('tasks')
        .update({
          status: nextStatus,
          completed_at: newCompletedAt,
        })
        .eq('id', taskId);
    } catch (error) {
      console.error('Error updating backlog task status:', error);
      fetchTasks();
    }
  };

  const moveToBacklog = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Optimistically update UI
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setBacklogTasks((prev) => [...prev, { ...task, isBacklog: true }]);
    setEditingTask(null);

    try {
      await supabase
        .from('tasks')
        .update({ is_backlog: true })
        .eq('id', taskId);
    } catch (error) {
      console.error('Error moving task to backlog:', error);
      fetchTasks();
    }
  };

  const moveToWeek = async (taskId: string) => {
    const task = backlogTasks.find((t) => t.id === taskId);
    if (!task) return;

    // Optimistically update UI
    setBacklogTasks((prev) => prev.filter((t) => t.id !== taskId));
    setTasks((prev) => [...prev, { ...task, isBacklog: false, date: today, dueDate: today }]);
    setEditingTask(null);

    try {
      await supabase
        .from('tasks')
        .update({ is_backlog: false, date: today, due_date: today })
        .eq('id', taskId);
    } catch (error) {
      console.error('Error moving task to week:', error);
      fetchTasks();
    }
  };

  const togglePriority = async (taskId: string, isBacklog: boolean = false) => {
    const sourceList = isBacklog ? backlogTasks : tasks;
    const task = sourceList.find((t) => t.id === taskId);
    if (!task) return;

    const newPriorityValue = !task.isPriority;

    // Close edit view immediately
    setEditingTask(null);
    setEditNotes('');

    // Optimistically update UI
    if (isBacklog) {
      setBacklogTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, isPriority: newPriorityValue } : t))
      );
    } else {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, isPriority: newPriorityValue } : t))
      );
    }

    try {
      await supabase
        .from('tasks')
        .update({ is_priority: newPriorityValue })
        .eq('id', taskId);
    } catch (error) {
      console.error('Error toggling priority:', error);
      fetchTasks();
    }
  };

  const saveNotes = async (taskId: string) => {
    // Get project details if changed
    const selectedProject = editProjectId ? projects.find(p => p.id === editProjectId) : undefined;

    // Optimistically update UI for both lists
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? {
          ...task,
          notes: editNotes,
          projectId: editProjectId || undefined,
          projectTag: selectedProject?.tag || (editProjectId ? undefined : task.projectTag),
          projectTagColor: selectedProject?.tag_color || (editProjectId ? undefined : task.projectTagColor),
        } : task
      )
    );
    setBacklogTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? {
          ...task,
          notes: editNotes,
          projectId: editProjectId || undefined,
          projectTag: selectedProject?.tag || (editProjectId ? undefined : task.projectTag),
          projectTagColor: selectedProject?.tag_color || (editProjectId ? undefined : task.projectTagColor),
        } : task
      )
    );

    setEditingTask(null);
    const notesToSave = editNotes;
    const projectIdToSave = editProjectId || null;
    setEditNotes('');
    setEditProjectId('');

    try {
      await supabase
        .from('tasks')
        .update({
          notes: notesToSave || null,
          project_id: projectIdToSave
        })
        .eq('id', taskId);
    } catch (error) {
      console.error('Error saving notes:', error);
      fetchTasks(); // Revert on error
    }
  };

  const updateDueDate = async (taskId: string, newDueDate: string) => {
    // Optimistically update UI for both lists
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, dueDate: newDueDate } : task
      )
    );
    setBacklogTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, dueDate: newDueDate } : task
      )
    );

    setEditingDueDate(null);
    setEditDueDateValue('');

    try {
      await supabase
        .from('tasks')
        .update({ due_date: newDueDate })
        .eq('id', taskId);
    } catch (error) {
      console.error('Error updating due date:', error);
      fetchTasks(); // Revert on error
    }
  };

  const updateEventDetails = async (taskId: string, newEventDate: string, newEventTime: string) => {
    // Optimistically update UI for both lists
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, eventDate: newEventDate, eventTime: newEventTime || undefined } : task
      )
    );
    setBacklogTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, eventDate: newEventDate, eventTime: newEventTime || undefined } : task
      )
    );

    setEditingEventDetails(null);
    setEditEventDateValue('');
    setEditEventTimeValue('');

    try {
      await supabase
        .from('tasks')
        .update({
          event_date: newEventDate,
          event_time: newEventTime || null
        })
        .eq('id', taskId);
    } catch (error) {
      console.error('Error updating event details:', error);
      fetchTasks(); // Revert on error
    }
  };

  const deleteTask = async (taskId: string) => {
    // Optimistically update UI for both lists
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
    setBacklogTasks((prev) => prev.filter((task) => task.id !== taskId));
    setEditingTask(null);
    setEditNotes('');

    try {
      await supabase.from('tasks').delete().eq('id', taskId);
    } catch (error) {
      console.error('Error deleting task:', error);
      fetchTasks(); // Revert on error
    }
  };

  // Group tasks by date and filter by status
  const tasksByDate: Record<string, Task[]> = {};
  const priorityTasks: Task[] = [];
  const completedCancelledTasksByDate: Record<string, Task[]> = {};

  // Get the date range for the current week for filtering completed tasks
  const weekDates = getWeekDates(currentWeek, currentYear);
  const startDate = formatDate(weekDates[0]);
  const endDate = formatDate(weekDates[6]);

  // Process weekly tasks only (backlog tasks handled separately)
  tasks.forEach((task) => {
    const isCompletedOrCancelled = task.status === 'completed' || task.status === 'cancelled';
    const completedAtIsBeforeToday = task.completedAt && task.completedAt < today;

    // Only move to completed/cancelled section if completed_at is before today
    const shouldMoveToCompleted = isCompletedOrCancelled && completedAtIsBeforeToday;

    if (shouldMoveToCompleted) {
      // Group by completed_at date in the completed section
      const groupDate = task.completedAt!;
      if (!completedCancelledTasksByDate[groupDate]) {
        completedCancelledTasksByDate[groupDate] = [];
      }
      completedCancelledTasksByDate[groupDate].push(task);
    } else {
      // Separate priority tasks from regular tasks
      // Tasks completed/cancelled today still show in active list (not hidden)
      if (task.isPriority && !isCompletedOrCancelled) {
        priorityTasks.push(task);
      } else {
        // Group by due_date in the active tasks section (includes completed/cancelled tasks from today)
        const groupDate = task.dueDate || task.date;
        if (!tasksByDate[groupDate]) {
          tasksByDate[groupDate] = [];
        }
        tasksByDate[groupDate].push(task);
      }
    }
  });

  // Process backlog tasks - only show completed ones if they were completed in current week
  const activeBacklogTasks: Task[] = [];
  backlogTasks.forEach((task) => {
    const isCompletedOrCancelled = task.status === 'completed' || task.status === 'cancelled';
    const completedAtIsBeforeToday = task.completedAt && task.completedAt < today;
    const shouldMoveToCompleted = isCompletedOrCancelled && completedAtIsBeforeToday;

    if (shouldMoveToCompleted) {
      // Only add to completed section if completed_at is within current week
      const completedAt = task.completedAt!;
      if (completedAt >= startDate && completedAt <= endDate) {
        if (!completedCancelledTasksByDate[completedAt]) {
          completedCancelledTasksByDate[completedAt] = [];
        }
        completedCancelledTasksByDate[completedAt].push(task);
      }
    } else {
      // Keep in active backlog list (includes tasks completed/cancelled today)
      activeBacklogTasks.push(task);
    }
  });

  return (
    <div className="space-y-8">
      {/* This Week's Tasks Section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        {/* Tasks for the current week */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-primary-black">This Week&apos;s Tasks</h2>
            <button
              onClick={() => setIsWeekTasksExpanded(!isWeekTasksExpanded)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title={isWeekTasksExpanded ? 'Collapse' : 'Expand'}
            >
              {isWeekTasksExpanded ? (
                <ChevronUpIcon className="w-5 h-5 text-gray-600" />
              ) : (
                <ChevronDownIcon className="w-5 h-5 text-gray-600" />
              )}
            </button>
          </div>
          <button
            onClick={() => setShowAddTask(!showAddTask)}
            className="w-8 h-8 flex items-center justify-center bg-black hover:bg-gray-800 rounded-full transition-colors"
          >
            <span className="text-xl font-bold text-white">+</span>
          </button>
        </div>

      {/* Add Task Form */}
      {showAddTask && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          {/* Task/Event Toggle Switch */}
          <div className="flex items-center gap-3 mb-3">
            <span className={`text-sm font-medium ${!isEvent ? 'text-black' : 'text-gray-500'}`}>
              Task
            </span>
            <button
              onClick={() => setIsEvent(!isEvent)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-yellow focus:ring-offset-2 ${
                isEvent ? 'bg-blue-600' : 'bg-gray-300'
              }`}
              type="button"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isEvent ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm font-medium ${isEvent ? 'text-black' : 'text-gray-500'}`}>
              Event
            </span>
          </div>

          <input
            type="text"
            placeholder={isEvent ? "Event title" : "Task title"}
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !isEvent && addTask()}
            className="w-full px-3 py-2 mb-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-yellow"
            autoFocus
          />

          {/* Project/Goal Selector */}
          <div className="mb-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project/Goal (optional)
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-yellow"
            >
              <option value="">None</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
          </div>

          {/* Event-specific fields */}
          {isEvent && (
            <div className="mb-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Event Date
                  </label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-yellow"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time (optional)
                  </label>
                  <input
                    type="time"
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-yellow"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={addTask}
              disabled={isSubmitting}
              className="px-4 py-2 bg-primary-yellow hover:bg-primary-yellow-dark rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Adding...' : 'Add'}
            </button>
            <button
              onClick={() => {
                setShowAddTask(false);
                setIsEvent(false);
                setEventTime('');
                setEventDate(today);
                setNewTaskTitle('');
                setSelectedProjectId('');
              }}
              disabled={isSubmitting}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {isWeekTasksExpanded && (
        <>
          {/* Tasks List */}
          <div className="space-y-4">
            {loading ? (
              <p className="text-gray-400 text-center py-8">Loading tasks...</p>
            ) : tasks.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No tasks for this week</p>
            ) : (
          <>
            {/* Priority Tasks */}
            {priorityTasks.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-red-600 mb-2">Priority</h3>
                <div className="space-y-2">
                  {priorityTasks.map((task) => (
                    <div key={task.id} className="border border-red-500 rounded-lg p-2 hover:border-red-600 transition-colors bg-red-50">
                      <div className="flex items-start gap-2">
                        <button
                          onClick={() => cycleTaskStatus(task.id)}
                          className="hover:opacity-70 transition-opacity flex-shrink-0 mt-0.5"
                          title={task.status}
                        >
                          <TaskIcon status={task.status} />
                        </button>
                        <div className="flex-1 min-w-0">
                          <button
                            onClick={() => {
                              if (editingTask === task.id) {
                                setEditingTask(null);
                                setEditNotes('');
                                setEditProjectId('');
                              } else {
                                setEditingTask(task.id);
                                setEditNotes(task.notes || '');
                                setEditProjectId(task.projectId || '');
                              }
                            }}
                            className="text-left w-full transition-colors"
                          >
                            <p className={`text-sm font-medium ${task.status === 'completed' ? 'line-through text-gray-400' : ''}`}>
                              {task.isEvent && <CalendarIcon className="w-4 h-4 inline-block mr-1 text-blue-600" />}
                              {task.title}{' '}
                              {!task.isEvent && <DaysOpenBadge createdAt={task.createdAt} />}
                              {task.projectTag && task.projectTagColor && (
                                <>
                                  {' '}
                                  <ProjectTag tag={task.projectTag} color={task.projectTagColor} />
                                </>
                              )}
                            </p>
                            {task.notes && !editingTask && (
                              <p className="text-sm text-gray-500 mt-1">{task.notes}</p>
                            )}
                          </button>

                          {/* Due Date Display */}
                          {task.dueDate && !task.isEvent && (
                            <div className="mt-1">
                              {editingDueDate === task.id ? (
                                <div className="flex gap-2 items-center">
                                  <input
                                    type="date"
                                    value={editDueDateValue}
                                    onChange={(e) => setEditDueDateValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        updateDueDate(task.id, editDueDateValue);
                                      } else if (e.key === 'Escape') {
                                        setEditingDueDate(null);
                                        setEditDueDateValue('');
                                      }
                                    }}
                                    className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-yellow"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => updateDueDate(task.id, editDueDateValue)}
                                    className="text-xs px-2 py-1 bg-primary-yellow hover:bg-primary-yellow-dark rounded"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingDueDate(null);
                                      setEditDueDateValue('');
                                    }}
                                    className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingDueDate(task.id);
                                    setEditDueDateValue(task.dueDate || '');
                                  }}
                                  className="text-xs text-gray-600 hover:text-gray-800 hover:underline"
                                >
                                  Due: {(() => {
                                    const d = new Date(task.dueDate + 'T00:00:00');
                                    const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
                                    const day = d.getDate();
                                    const month = d.toLocaleDateString('en-US', { month: 'short' });
                                    return `${weekday} ${day}-${month}`;
                                  })()}
                                </button>
                              )}
                            </div>
                          )}

                          {/* Event Details */}
                          {task.isEvent && (
                            <div className="mt-1">
                              {editingEventDetails === task.id ? (
                                <div className="flex gap-2 items-center flex-wrap">
                                  <input
                                    type="date"
                                    value={editEventDateValue}
                                    onChange={(e) => setEditEventDateValue(e.target.value)}
                                    className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-yellow"
                                  />
                                  <input
                                    type="time"
                                    value={editEventTimeValue}
                                    onChange={(e) => setEditEventTimeValue(e.target.value)}
                                    placeholder="Time (optional)"
                                    className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-yellow"
                                  />
                                  <button
                                    onClick={() => updateEventDetails(task.id, editEventDateValue, editEventTimeValue)}
                                    className="text-xs px-2 py-1 bg-primary-yellow hover:bg-primary-yellow-dark rounded"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingEventDetails(null);
                                      setEditEventDateValue('');
                                      setEditEventTimeValue('');
                                    }}
                                    className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingEventDetails(task.id);
                                    setEditEventDateValue(task.eventDate || today);
                                    setEditEventTimeValue(task.eventTime || '');
                                  }}
                                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                                >
                                  {task.eventDate && (() => {
                                    const d = new Date(task.eventDate + 'T00:00:00');
                                    const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
                                    const day = d.getDate();
                                    const month = d.toLocaleDateString('en-US', { month: 'short' });
                                    return `${weekday} ${day}-${month}`;
                                  })()}
                                  {task.eventTime && ` at ${task.eventTime.substring(0, 5)}`}
                                  {!task.eventDate && 'Set event date/time'}
                                </button>
                              )}
                            </div>
                          )}

                          {/* Detailed Notes Link */}
                          <Link
                            href={`/notes?taskId=${task.id}&taskTitle=${encodeURIComponent(task.title)}${task.projectTag ? `&projectTag=${encodeURIComponent(task.projectTag)}` : ''}`}
                            className="mt-1 text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <DocumentTextIcon className="w-3 h-3" />
                            View Detailed Notes
                          </Link>

                          {/* Edit Notes */}
                          {editingTask === task.id && (
                            <div className="mt-2">
                              <div className="mb-2">
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Project/Goal
                                </label>
                                <select
                                  value={editProjectId}
                                  onChange={(e) => setEditProjectId(e.target.value)}
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-yellow"
                                >
                                  <option value="">None</option>
                                  {projects.map((project) => (
                                    <option key={project.id} value={project.id}>
                                      {project.title}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <textarea
                                value={editNotes}
                                onChange={(e) => setEditNotes(e.target.value)}
                                placeholder="Add notes..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-yellow text-sm"
                                rows={3}
                              />
                              <div className="flex gap-2 mt-2">
                                <button
                                  onClick={() => saveNotes(task.id)}
                                  className="p-2 border border-gray-300 hover:bg-gray-100 rounded transition-colors"
                                  title="Save"
                                >
                                  <ArrowTurnDownLeftIcon className="w-4 h-4 text-gray-600" />
                                </button>
                                <button
                                  onClick={() => togglePriority(task.id)}
                                  className="p-2 border border-gray-300 hover:bg-gray-100 rounded transition-colors"
                                  title="Remove Priority"
                                >
                                  <FlagIcon className="w-4 h-4 text-gray-600" />
                                </button>
                                <button
                                  onClick={() => moveToBacklog(task.id)}
                                  className="p-2 border border-gray-300 hover:bg-gray-100 rounded transition-colors"
                                  title="Move to Backlog"
                                >
                                  <ArrowDownOnSquareIcon className="w-4 h-4 text-gray-600" />
                                </button>
                                <button
                                  onClick={() => deleteTask(task.id)}
                                  className="p-2 border border-gray-300 hover:bg-gray-100 rounded transition-colors"
                                  title="Delete"
                                >
                                  <TrashIcon className="w-4 h-4 text-gray-600" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Regular Tasks by Date */}
            {Object.keys(tasksByDate).sort((a, b) => {
              // Today's tasks come first
              if (a === today) return -1;
              if (b === today) return 1;
              // Then sort remaining dates in descending order (most recent first)
              return b.localeCompare(a);
            }).map((date) => {
              const isToday = date === today;
              return (
              <div key={date}>
                <h3 className={`text-xs mb-2 ${isToday ? 'font-bold text-black' : 'font-semibold text-gray-500'}`}>
                  {(() => {
                    const d = new Date(date + 'T00:00:00');
                    const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
                    const day = d.getDate();
                    const month = d.toLocaleDateString('en-US', { month: 'short' });
                    return `${weekday} ${day}-${month}`;
                  })()}
                  {isToday && ' (Today)'}
                </h3>
                <div className="space-y-2">
                  {tasksByDate[date].map((task) => (
                    <div key={task.id} className={`border rounded-lg p-2 hover:border-black transition-colors ${isToday ? 'border-black bg-white' : 'border-gray-200'}`}>
                      <div className="flex items-start gap-2">
                        <button
                          onClick={() => cycleTaskStatus(task.id)}
                          className="hover:opacity-70 transition-opacity flex-shrink-0 mt-0.5"
                          title={task.status}
                        >
                          <TaskIcon status={task.status} />
                        </button>
                        <div className="flex-1 min-w-0">
                          <button
                            onClick={() => {
                              if (editingTask === task.id) {
                                setEditingTask(null);
                                setEditNotes('');
                                setEditProjectId('');
                              } else {
                                setEditingTask(task.id);
                                setEditNotes(task.notes || '');
                                setEditProjectId(task.projectId || '');
                              }
                            }}
                            className="text-left w-full transition-colors"
                          >
                            <p className={`text-sm font-medium ${task.status === 'completed' ? 'line-through text-gray-400' : ''}`}>
                              {task.isEvent && <CalendarIcon className="w-4 h-4 inline-block mr-1 text-blue-600" />}
                              {task.title}{' '}
                              {!task.isEvent && <DaysOpenBadge createdAt={task.createdAt} />}
                              {task.projectTag && task.projectTagColor && (
                                <>
                                  {' '}
                                  <ProjectTag tag={task.projectTag} color={task.projectTagColor} />
                                </>
                              )}
                            </p>
                            {task.notes && !editingTask && (
                              <p className="text-sm text-gray-500 mt-1">{task.notes}</p>
                            )}
                          </button>

                          {/* Due Date Display */}
                          {task.dueDate && !task.isEvent && (
                            <div className="mt-1">
                              {editingDueDate === task.id ? (
                                <div className="flex gap-2 items-center">
                                  <input
                                    type="date"
                                    value={editDueDateValue}
                                    onChange={(e) => setEditDueDateValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        updateDueDate(task.id, editDueDateValue);
                                      } else if (e.key === 'Escape') {
                                        setEditingDueDate(null);
                                        setEditDueDateValue('');
                                      }
                                    }}
                                    className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-yellow"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => updateDueDate(task.id, editDueDateValue)}
                                    className="text-xs px-2 py-1 bg-primary-yellow hover:bg-primary-yellow-dark rounded"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingDueDate(null);
                                      setEditDueDateValue('');
                                    }}
                                    className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingDueDate(task.id);
                                    setEditDueDateValue(task.dueDate || '');
                                  }}
                                  className="text-xs text-gray-600 hover:text-gray-800 hover:underline"
                                >
                                  Due: {(() => {
                                    const d = new Date(task.dueDate + 'T00:00:00');
                                    const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
                                    const day = d.getDate();
                                    const month = d.toLocaleDateString('en-US', { month: 'short' });
                                    return `${weekday} ${day}-${month}`;
                                  })()}
                                </button>
                              )}
                            </div>
                          )}

                          {/* Event Details */}
                          {task.isEvent && (
                            <div className="mt-1">
                              {editingEventDetails === task.id ? (
                                <div className="flex gap-2 items-center flex-wrap">
                                  <input
                                    type="date"
                                    value={editEventDateValue}
                                    onChange={(e) => setEditEventDateValue(e.target.value)}
                                    className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-yellow"
                                  />
                                  <input
                                    type="time"
                                    value={editEventTimeValue}
                                    onChange={(e) => setEditEventTimeValue(e.target.value)}
                                    placeholder="Time (optional)"
                                    className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-yellow"
                                  />
                                  <button
                                    onClick={() => updateEventDetails(task.id, editEventDateValue, editEventTimeValue)}
                                    className="text-xs px-2 py-1 bg-primary-yellow hover:bg-primary-yellow-dark rounded"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingEventDetails(null);
                                      setEditEventDateValue('');
                                      setEditEventTimeValue('');
                                    }}
                                    className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingEventDetails(task.id);
                                    setEditEventDateValue(task.eventDate || today);
                                    setEditEventTimeValue(task.eventTime || '');
                                  }}
                                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                                >
                                  {task.eventDate && (() => {
                                    const d = new Date(task.eventDate + 'T00:00:00');
                                    const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
                                    const day = d.getDate();
                                    const month = d.toLocaleDateString('en-US', { month: 'short' });
                                    return `${weekday} ${day}-${month}`;
                                  })()}
                                  {task.eventTime && ` at ${task.eventTime.substring(0, 5)}`}
                                  {!task.eventDate && 'Set event date/time'}
                                </button>
                              )}
                            </div>
                          )}

                          {/* Detailed Notes Link */}
                          <Link
                            href={`/notes?taskId=${task.id}&taskTitle=${encodeURIComponent(task.title)}${task.projectTag ? `&projectTag=${encodeURIComponent(task.projectTag)}` : ''}`}
                            className="mt-1 text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <DocumentTextIcon className="w-3 h-3" />
                            View Detailed Notes
                          </Link>

                          {/* Edit Notes */}
                          {editingTask === task.id && (
                            <div className="mt-2">
                              <div className="mb-2">
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Project/Goal
                                </label>
                                <select
                                  value={editProjectId}
                                  onChange={(e) => setEditProjectId(e.target.value)}
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-yellow"
                                >
                                  <option value="">None</option>
                                  {projects.map((project) => (
                                    <option key={project.id} value={project.id}>
                                      {project.title}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <textarea
                                value={editNotes}
                                onChange={(e) => setEditNotes(e.target.value)}
                                placeholder="Add notes..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-yellow text-sm"
                                rows={3}
                              />
                              <div className="flex gap-2 mt-2 flex-wrap">
                                <button
                                  onClick={() => saveNotes(task.id)}
                                  className="p-2 border border-gray-300 hover:bg-gray-100 rounded transition-colors"
                                  title="Save"
                                >
                                  <ArrowTurnDownLeftIcon className="w-4 h-4 text-gray-600" />
                                </button>
                                <button
                                  onClick={() => togglePriority(task.id)}
                                  className="p-2 border border-gray-300 hover:bg-gray-100 rounded transition-colors"
                                  title="Set Priority"
                                >
                                  <FlagIcon className="w-4 h-4 text-gray-600" />
                                </button>
                                <button
                                  onClick={() => moveToBacklog(task.id)}
                                  className="p-2 border border-gray-300 hover:bg-gray-100 rounded transition-colors"
                                  title="Move to Backlog"
                                >
                                  <ArrowDownOnSquareIcon className="w-4 h-4 text-gray-600" />
                                </button>
                                <button
                                  onClick={() => deleteTask(task.id)}
                                  className="p-2 border border-gray-300 hover:bg-gray-100 rounded transition-colors"
                                  title="Delete"
                                >
                                  <TrashIcon className="w-4 h-4 text-gray-600" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
              );
            })}
          </>
            )}
          </div>
        </>
      )}

        {/* Legend */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 mb-2">Status icons:</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <TaskIcon status="pending" />
              <span>Pending</span>
            </div>
            <div className="flex items-center gap-2">
              <TaskIcon status="in_progress" />
              <span>In Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <TaskIcon status="completed" />
              <span>Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <TaskIcon status="cancelled" />
              <span>Cancelled</span>
            </div>
          </div>
        </div>
      </div>

      {/* Backlog Section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-700">Backlog</h2>
            <button
              onClick={() => setIsBacklogExpanded(!isBacklogExpanded)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title={isBacklogExpanded ? 'Collapse' : 'Expand'}
            >
              {isBacklogExpanded ? (
                <ChevronUpIcon className="w-5 h-5 text-gray-600" />
              ) : (
                <ChevronDownIcon className="w-5 h-5 text-gray-600" />
              )}
            </button>
          </div>
          <button
            onClick={() => setShowAddBacklogTask(!showAddBacklogTask)}
            className="w-8 h-8 flex items-center justify-center bg-black hover:bg-gray-800 rounded-full transition-colors"
          >
            <span className="text-xl font-bold text-white">+</span>
          </button>
        </div>

        {/* Add Backlog Task Form */}
        {showAddBacklogTask && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <input
              type="text"
              placeholder="Backlog task title"
              value={newBacklogTaskTitle}
              onChange={(e) => setNewBacklogTaskTitle(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addBacklogTask()}
              className="w-full px-3 py-2 mb-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={addBacklogTask}
                className="px-4 py-2 bg-gray-400 hover:bg-gray-500 text-white rounded-lg transition-colors"
              >
                Add
              </button>
              <button
                onClick={() => setShowAddBacklogTask(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {isBacklogExpanded && (
          <>
            {/* Backlog Tasks List */}
            <div className="space-y-2">
              {loading ? (
                <p className="text-gray-400 text-center py-8">Loading backlog...</p>
              ) : activeBacklogTasks.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No backlog tasks</p>
              ) : (
            activeBacklogTasks.map((task) => (
              <div key={task.id} className="border border-gray-200 rounded-lg p-2 hover:border-black transition-colors bg-gray-50">
                <div className="flex items-start gap-2">
                  <button
                    onClick={() => cycleBacklogTaskStatus(task.id)}
                    className="hover:opacity-70 transition-opacity flex-shrink-0 mt-0.5"
                    title={task.status}
                  >
                    <TaskIcon status={task.status} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => {
                        if (editingTask === task.id) {
                          setEditingTask(null);
                          setEditNotes('');
                          setEditProjectId('');
                        } else {
                          setEditingTask(task.id);
                          setEditNotes(task.notes || '');
                          setEditProjectId(task.projectId || '');
                        }
                      }}
                      className="text-left w-full transition-colors"
                    >
                      <p className={`text-sm font-medium ${task.status === 'completed' ? 'line-through text-gray-400' : ''}`}>
                        {task.isEvent && <CalendarIcon className="w-4 h-4 inline-block mr-1 text-blue-600" />}
                        {task.title}{' '}
                        {!task.isEvent && <DaysOpenBadge createdAt={task.createdAt} />}
                        {task.projectTag && task.projectTagColor && (
                          <>
                            {' '}
                            <ProjectTag tag={task.projectTag} color={task.projectTagColor} />
                          </>
                        )}
                      </p>
                      {task.notes && editingTask !== task.id && (
                        <p className="text-sm text-gray-500 mt-1">{task.notes}</p>
                      )}
                    </button>

                    {/* Event Details */}
                    {task.isEvent && (
                      <div className="mt-1">
                        {editingEventDetails === task.id ? (
                          <div className="flex gap-2 items-center flex-wrap">
                            <input
                              type="date"
                              value={editEventDateValue}
                              onChange={(e) => setEditEventDateValue(e.target.value)}
                              className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-yellow"
                            />
                            <input
                              type="time"
                              value={editEventTimeValue}
                              onChange={(e) => setEditEventTimeValue(e.target.value)}
                              placeholder="Time (optional)"
                              className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-yellow"
                            />
                            <button
                              onClick={() => updateEventDetails(task.id, editEventDateValue, editEventTimeValue)}
                              className="text-xs px-2 py-1 bg-primary-yellow hover:bg-primary-yellow-dark rounded"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingEventDetails(null);
                                setEditEventDateValue('');
                                setEditEventTimeValue('');
                              }}
                              className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingEventDetails(task.id);
                              setEditEventDateValue(task.eventDate || today);
                              setEditEventTimeValue(task.eventTime || '');
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                          >
                            {task.eventDate && (() => {
                              const d = new Date(task.eventDate + 'T00:00:00');
                              const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
                              const day = d.getDate();
                              const month = d.toLocaleDateString('en-US', { month: 'short' });
                              return `${weekday} ${day}-${month}`;
                            })()}
                            {task.eventTime && ` at ${task.eventTime.substring(0, 5)}`}
                            {!task.eventDate && 'Set event date/time'}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Detailed Notes Link */}
                    <Link
                      href={`/notes?taskId=${task.id}&taskTitle=${encodeURIComponent(task.title)}${task.projectTag ? `&projectTag=${encodeURIComponent(task.projectTag)}` : ''}`}
                      className="mt-1 text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DocumentTextIcon className="w-3 h-3" />
                      View Detailed Notes
                    </Link>

                    {/* Edit Notes */}
                    {editingTask === task.id && (
                      <div className="mt-2">
                        <div className="mb-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Project/Goal
                          </label>
                          <select
                            value={editProjectId}
                            onChange={(e) => setEditProjectId(e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-yellow"
                          >
                            <option value="">None</option>
                            {projects.map((project) => (
                              <option key={project.id} value={project.id}>
                                {project.title}
                              </option>
                            ))}
                          </select>
                        </div>
                        <textarea
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          placeholder="Add notes..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm"
                          rows={3}
                        />
                        <div className="flex gap-2 mt-2 flex-wrap">
                          <button
                            onClick={() => saveNotes(task.id)}
                            className="p-2 border border-gray-300 hover:bg-gray-100 rounded transition-colors"
                            title="Save"
                          >
                            <ArrowTurnDownLeftIcon className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            onClick={() => togglePriority(task.id, true)}
                            className="p-2 border border-gray-300 hover:bg-gray-100 rounded transition-colors"
                            title="Set Priority"
                          >
                            <FlagIcon className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            onClick={() => moveToWeek(task.id)}
                            className="p-2 border border-gray-300 hover:bg-gray-100 rounded transition-colors"
                            title="Move to This Week"
                          >
                            <ArrowUpOnSquareIcon className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="p-2 border border-gray-300 hover:bg-gray-100 rounded transition-colors"
                            title="Delete"
                          >
                            <TrashIcon className="w-4 h-4 text-gray-600" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Completed/Cancelled Tasks Section */}
      {Object.keys(completedCancelledTasksByDate).length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-bold text-gray-600">Completed/Cancelled Tasks</h2>
            <button
              onClick={() => setIsCompletedExpanded(!isCompletedExpanded)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title={isCompletedExpanded ? 'Collapse' : 'Expand'}
            >
              {isCompletedExpanded ? (
                <ChevronUpIcon className="w-5 h-5 text-gray-600" />
              ) : (
                <ChevronDownIcon className="w-5 h-5 text-gray-600" />
              )}
            </button>
          </div>
          {isCompletedExpanded && (
          <div className="space-y-4">
            {Object.keys(completedCancelledTasksByDate).sort().reverse().map((date) => {
              const isToday = date === today;
              return (
              <div key={date}>
                <h3 className={`text-xs mb-2 ${isToday ? 'font-bold text-black' : 'font-semibold text-gray-500'}`}>
                  {(() => {
                    const d = new Date(date + 'T00:00:00');
                    const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
                    const day = d.getDate();
                    const month = d.toLocaleDateString('en-US', { month: 'short' });
                    return `${weekday} ${day}-${month}`;
                  })()}
                  {isToday && ' (Today)'}
                </h3>
                <div className="space-y-2">
                  {completedCancelledTasksByDate[date].map((task) => (
                    <div key={task.id} className={`border rounded-lg p-2 hover:border-black transition-colors opacity-70 ${isToday ? 'border-black bg-white' : 'border-gray-200'}`}>
                      <div className="flex items-start gap-2">
                        <button
                          onClick={() => cycleTaskStatus(task.id)}
                          className="hover:opacity-70 transition-opacity flex-shrink-0 mt-0.5"
                          title={task.status}
                        >
                          <TaskIcon status={task.status} />
                        </button>
                        <div className="flex-1 min-w-0">
                          <button
                            onClick={() => {
                              if (editingTask === task.id) {
                                setEditingTask(null);
                                setEditNotes('');
                                setEditProjectId('');
                              } else {
                                setEditingTask(task.id);
                                setEditNotes(task.notes || '');
                                setEditProjectId(task.projectId || '');
                              }
                            }}
                            className="text-left w-full transition-colors"
                          >
                            <p className="text-sm font-medium">
                              {task.isEvent && <CalendarIcon className="w-4 h-4 inline-block mr-1 text-blue-600" />}
                              {task.title}{' '}
                              {!task.isEvent && <DaysOpenBadge createdAt={task.createdAt} />}
                              {task.projectTag && task.projectTagColor && (
                                <>
                                  {' '}
                                  <ProjectTag tag={task.projectTag} color={task.projectTagColor} />
                                </>
                              )}
                            </p>
                            {task.notes && !editingTask && (
                              <p className="text-sm text-gray-500 mt-1">{task.notes}</p>
                            )}
                          </button>

                          {/* Event Details */}
                          {task.isEvent && (
                            <div className="mt-1">
                              {editingEventDetails === task.id ? (
                                <div className="flex gap-2 items-center flex-wrap">
                                  <input
                                    type="date"
                                    value={editEventDateValue}
                                    onChange={(e) => setEditEventDateValue(e.target.value)}
                                    className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-yellow"
                                  />
                                  <input
                                    type="time"
                                    value={editEventTimeValue}
                                    onChange={(e) => setEditEventTimeValue(e.target.value)}
                                    placeholder="Time (optional)"
                                    className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-yellow"
                                  />
                                  <button
                                    onClick={() => updateEventDetails(task.id, editEventDateValue, editEventTimeValue)}
                                    className="text-xs px-2 py-1 bg-primary-yellow hover:bg-primary-yellow-dark rounded"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingEventDetails(null);
                                      setEditEventDateValue('');
                                      setEditEventTimeValue('');
                                    }}
                                    className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingEventDetails(task.id);
                                    setEditEventDateValue(task.eventDate || today);
                                    setEditEventTimeValue(task.eventTime || '');
                                  }}
                                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                                >
                                  {task.eventDate && (() => {
                                    const d = new Date(task.eventDate + 'T00:00:00');
                                    const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
                                    const day = d.getDate();
                                    const month = d.toLocaleDateString('en-US', { month: 'short' });
                                    return `${weekday} ${day}-${month}`;
                                  })()}
                                  {task.eventTime && ` at ${task.eventTime.substring(0, 5)}`}
                                  {!task.eventDate && 'Set event date/time'}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Detailed Notes Link */}
                          <Link
                            href={`/notes?taskId=${task.id}&taskTitle=${encodeURIComponent(task.title)}${task.projectTag ? `&projectTag=${encodeURIComponent(task.projectTag)}` : ''}`}
                            className="mt-1 text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <DocumentTextIcon className="w-3 h-3" />
                            View Detailed Notes
                          </Link>

                          {/* Edit Notes */}
                          {editingTask === task.id && (
                            <div className="mt-2">
                              <div className="mb-2">
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Project/Goal
                                </label>
                                <select
                                  value={editProjectId}
                                  onChange={(e) => setEditProjectId(e.target.value)}
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-yellow"
                                >
                                  <option value="">None</option>
                                  {projects.map((project) => (
                                    <option key={project.id} value={project.id}>
                                      {project.title}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <textarea
                                value={editNotes}
                                onChange={(e) => setEditNotes(e.target.value)}
                                placeholder="Add notes..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-yellow text-sm"
                                rows={3}
                              />
                              <div className="flex gap-2 mt-2">
                                <button
                                  onClick={() => saveNotes(task.id)}
                                  className="p-2 border border-gray-300 hover:bg-gray-100 rounded transition-colors"
                                  title="Save"
                                >
                                  <ArrowTurnDownLeftIcon className="w-4 h-4 text-gray-600" />
                                </button>
                                <button
                                  onClick={() => deleteTask(task.id)}
                                  className="p-2 border border-gray-300 hover:bg-gray-100 rounded transition-colors"
                                  title="Delete"
                                >
                                  <TrashIcon className="w-4 h-4 text-gray-600" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              );
            })}
          </div>
          )}
        </div>
      )}
    </div>
  );
}
