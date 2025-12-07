'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getCurrentUserId } from '@/lib/supabaseHelpers';
import { formatDate, getWeekDates, getWeekNumber } from '@/utils/dateUtils';
import { useWeek } from '@/lib/WeekContext';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { RocketLaunchIcon, TrophyIcon } from '@heroicons/react/24/solid';

type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'migrated' | 'cancelled';

type ProjectTask = {
  id: string;
  title: string;
  status: TaskStatus;
  createdAt?: string;
};

type Project = {
  id: string;
  title: string;
  type: 'project' | 'goal';
  dueDate?: string;
  tag?: string;
  tagColor?: string;
  tasks: ProjectTask[];
  completedAt?: string;
};

const TaskIcon = ({ status }: { status: TaskStatus }) => {
  switch (status) {
    case 'pending':
      return (
        <div className="w-5 h-5 border-2 border-gray-300 bg-white rounded-sm" />
      );
    case 'in_progress':
      return (
        <div className="w-5 h-5 border-2 bg-white rounded-sm relative overflow-hidden" style={{ borderColor: '#f59e0b' }}>
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(to top left, #f59e0b 0%, #f59e0b 50%, transparent 50%, transparent 100%)'
          }} />
        </div>
      );
    case 'completed':
      return (
        <div className="w-5 h-5 bg-status-green rounded-sm" />
      );
    case 'migrated':
      return (
        <div className="w-5 h-5 border-2 border-blue-500 bg-white rounded-sm flex items-center justify-center">
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 7H13M13 7L7 1M13 7L7 13" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      );
    case 'cancelled':
      return (
        <div className="w-5 h-5 border-2 border-status-red bg-white rounded-sm flex items-center justify-center">
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 2L10 10M10 2L2 10" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      );
  }
};

// Bootstrap 5 color palette
const BOOTSTRAP_COLORS = [
  { name: 'Blue', value: '#0d6efd' },
  { name: 'Indigo', value: '#6610f2' },
  { name: 'Purple', value: '#6f42c1' },
  { name: 'Pink', value: '#d63384' },
  { name: 'Red', value: '#dc3545' },
  { name: 'Orange', value: '#fd7e14' },
  { name: 'Yellow', value: '#ffc107' },
  { name: 'Green', value: '#198754' },
  { name: 'Teal', value: '#20c997' },
  { name: 'Cyan', value: '#0dcaf0' },
];

export default function ProjectsColumn() {
  const { currentWeek, currentYear } = useWeek();
  const [items, setItems] = useState<Project[]>([]);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemType, setNewItemType] = useState<'project' | 'goal'>('project');
  const [newItemDueDate, setNewItemDueDate] = useState('');
  const [newItemTag, setNewItemTag] = useState('');
  const [newItemTagColor, setNewItemTagColor] = useState('#0d6efd');
  const [addingTaskTo, setAddingTaskTo] = useState<{ type: 'project' | 'goal'; id: string } | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    fetchProjectsAndGoals();
  }, [currentWeek]);

  const fetchProjectsAndGoals = async () => {
    try {
      setLoading(true);

      // Get the date range for the current week
      const weekDates = getWeekDates(currentWeek, currentYear);
      const startDate = formatDate(weekDates[0]);
      const endDate = formatDate(weekDates[6]);

      // Fetch projects and goals that are either:
      // 1. Not completed (completed_at is null)
      // 2. Completed during this week (completed_at between start and end of week)
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .or(`completed_at.is.null,and(completed_at.gte.${startDate},completed_at.lte.${endDate})`)
        .order('display_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true });

      if (projectsError) throw projectsError;

      // Fetch all tasks associated with projects/goals
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .not('project_id', 'is', null)
        .order('created_at', { ascending: true });

      if (tasksError) throw tasksError;

      // Group tasks by project_id
      const tasksByProject: Record<string, ProjectTask[]> = {};
      (tasksData || []).forEach((task) => {
        if (!task.project_id) return;

        if (!tasksByProject[task.project_id]) {
          tasksByProject[task.project_id] = [];
        }

        tasksByProject[task.project_id].push({
          id: task.id,
          title: task.title,
          status: task.status as TaskStatus,
          createdAt: task.created_at || undefined,
        });
      });

      // Combine all items
      const itemsList: Project[] = (projectsData || []).map((item) => ({
        id: item.id,
        title: item.title,
        type: item.type as 'project' | 'goal',
        dueDate: item.due_date || undefined,
        tag: item.tag || undefined,
        tagColor: item.tag_color || undefined,
        tasks: tasksByProject[item.id] || [],
        completedAt: item.completed_at || undefined,
      }));

      setItems(itemsList);
    } catch (error) {
      console.error('Error fetching projects and goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const addItem = async () => {
    if (!newItemTitle.trim()) return;

    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        console.error('No user logged in');
        return;
      }

      const { data, error } = await supabase
        .from('projects')
        .insert({
          title: newItemTitle,
          type: newItemType,
          due_date: newItemDueDate || null,
          tag: newItemTag || null,
          tag_color: newItemTag ? newItemTagColor : null,
          user_id: userId,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const newItem: Project = {
          id: data.id,
          title: data.title,
          type: newItemType,
          dueDate: data.due_date || undefined,
          tag: data.tag || undefined,
          tagColor: data.tag_color || undefined,
          tasks: [],
        };
        setItems([...items, newItem]);
      }

      setNewItemTitle('');
      setNewItemType('project');
      setNewItemDueDate('');
      setNewItemTag('');
      setNewItemTagColor('#0d6efd');
      setShowAddItem(false);
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  const addTask = async (type: 'project' | 'goal', projectId: string) => {
    if (!newTaskTitle.trim()) return;

    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        console.error('No user logged in');
        return;
      }

      const { data, error} = await supabase
        .from('tasks')
        .insert({
          title: newTaskTitle,
          status: 'pending',
          date: formatDate(new Date()),
          project_id: projectId,
          user_id: userId,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const newTask: ProjectTask = {
          id: data.id,
          title: data.title,
          status: data.status as TaskStatus,
          createdAt: data.created_at || undefined,
        };

        setItems((prev) =>
          prev.map((item) =>
            item.id === projectId ? { ...item, tasks: [...item.tasks, newTask] } : item
          )
        );
      }

      setNewTaskTitle('');
      setAddingTaskTo(null);

      // Refresh the page to update the TasksColumn
      window.location.reload();
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  const cycleTaskStatus = async (type: 'project' | 'goal', projectId: string, taskId: string) => {
    const project = items.find((item) => item.id === projectId);
    const task = project?.tasks.find((t) => t.id === taskId);
    if (!task) return;

    const statusCycle: TaskStatus[] = ['pending', 'in_progress', 'completed', 'migrated', 'cancelled'];
    const currentIndex = statusCycle.indexOf(task.status);
    const nextStatus = statusCycle[(currentIndex + 1) % statusCycle.length];

    // Determine completed_at based on status transition
    const today = formatDate(new Date());
    let newCompletedAt: string | null;
    const isMovingToCompletedOrCancelled = nextStatus === 'completed' || nextStatus === 'cancelled';

    if (isMovingToCompletedOrCancelled) {
      // Set to today when first completing/cancelling
      newCompletedAt = today;
    } else {
      // Moving to pending/in_progress, clear completed_at
      newCompletedAt = null;
    }

    // Optimistically update UI
    setItems((prev) => prev.map((item) => {
      if (item.id !== projectId) return item;

      return {
        ...item,
        tasks: item.tasks.map((t) => {
          if (t.id !== taskId) return t;
          return { ...t, status: nextStatus };
        }),
      };
    }));

    try {
      await supabase
        .from('tasks')
        .update({
          status: nextStatus,
          completed_at: newCompletedAt
        })
        .eq('id', taskId);
    } catch (error) {
      console.error('Error updating task status:', error);
      fetchProjectsAndGoals(); // Revert on error
    }
  };


  const toggleCompletion = async (type: 'project' | 'goal', id: string) => {
    const item = items.find(item => item.id === id);

    if (!item) return;

    const newCompletedAt = item.completedAt ? null : formatDate(new Date());

    // Optimistically update UI
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, completedAt: newCompletedAt || undefined } : item))
    );

    try {
      await supabase
        .from('projects')
        .update({ completed_at: newCompletedAt })
        .eq('id', id);
    } catch (error) {
      console.error('Error toggling completion:', error);
      fetchProjectsAndGoals(); // Revert on error
    }
  };

  const formatDisplayDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    const day = d.getDate();
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-primary-black">Projects/Goals</h2>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <ChevronUpIcon className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronDownIcon className="w-5 h-5 text-gray-600" />
            )}
          </button>
        </div>
        <button
          onClick={() => setShowAddItem(!showAddItem)}
          className="w-8 h-8 flex items-center justify-center bg-black hover:bg-gray-800 rounded-full transition-colors"
        >
          <span className="text-xl font-bold text-white">+</span>
        </button>
      </div>

      {/* Add Item Form */}
      {showAddItem && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <select
            value={newItemType}
            onChange={(e) => setNewItemType(e.target.value as 'project' | 'goal')}
            className="w-full px-3 py-2 mb-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-yellow"
          >
            <option value="project">Project</option>
            <option value="goal">Goal</option>
          </select>
          <input
            type="text"
            placeholder="Title"
            value={newItemTitle}
            onChange={(e) => setNewItemTitle(e.target.value)}
            className="w-full px-3 py-2 mb-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-yellow"
          />
          <input
            type="date"
            value={newItemDueDate}
            onChange={(e) => setNewItemDueDate(e.target.value)}
            className="w-full px-3 py-2 mb-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-yellow"
            placeholder="Due date (optional)"
          />
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder="Tag (optional, max 20 chars)"
              value={newItemTag}
              onChange={(e) => setNewItemTag(e.target.value.slice(0, 20))}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-yellow"
            />
            <select
              value={newItemTagColor}
              onChange={(e) => setNewItemTagColor(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-yellow cursor-pointer font-medium"
              style={{
                minWidth: '120px',
                backgroundColor: `${newItemTagColor}20`,
                color: newItemTagColor,
                border: `1px solid ${newItemTagColor}40`
              }}
              title="Tag color"
            >
              {BOOTSTRAP_COLORS.map((color) => (
                <option
                  key={color.value}
                  value={color.value}
                  style={{
                    backgroundColor: `${color.value}20`,
                    color: color.value
                  }}
                >
                  {color.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={addItem}
              className="px-4 py-2 bg-primary-yellow hover:bg-primary-yellow-dark rounded-lg transition-colors"
            >
              Add
            </button>
            <button
              onClick={() => {
                setShowAddItem(false);
                setNewItemTitle('');
                setNewItemType('project');
                setNewItemDueDate('');
                setNewItemTag('');
                setNewItemTagColor('#0d6efd');
              }}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {isExpanded && (
        <>
          {/* Items List */}
          <div className="space-y-4">
            {loading ? (
              <p className="text-gray-400 text-center py-8">Loading projects/goals...</p>
            ) : items.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No projects/goals yet</p>
            ) : (
              items.map((item) => (
                <div key={item.id} className={`border rounded-lg p-2 hover:border-black transition-colors ${item.completedAt ? 'border-status-green' : 'border-gray-200'}`} style={item.completedAt ? { backgroundColor: '#e8f5e0' } : {}}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2 flex-1">
                      <button
                        onClick={() => toggleCompletion(item.type, item.id)}
                        className={`text-xl flex-shrink-0 mt-0.5 ${item.completedAt ? 'text-status-green' : 'text-gray-400'} hover:opacity-70 transition-opacity`}
                        title={item.completedAt ? 'Mark as incomplete' : 'Mark as complete'}
                      >
                        {item.completedAt ? '✓' : '◻'}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className={`w-full text-left ${item.completedAt ? 'opacity-70' : ''}`}>
                          <p className={`text-sm font-medium ${item.completedAt ? 'line-through' : ''}`}>
                            {item.type === 'project' ? (
                              <RocketLaunchIcon className="w-4 h-4 text-gray-500 inline-block mr-1" style={{ verticalAlign: 'text-bottom' }} />
                            ) : (
                              <TrophyIcon className="w-4 h-4 text-gray-500 inline-block mr-1" style={{ verticalAlign: 'text-bottom' }} />
                            )}
                            {item.title}{' '}
                            {item.tag && item.tagColor && (
                              <span
                                className="inline-block px-2 py-0.5 text-xs font-medium rounded ml-2"
                                style={{
                                  backgroundColor: `${item.tagColor}20`,
                                  color: item.tagColor,
                                  border: `1px solid ${item.tagColor}40`
                                }}
                              >
                                {item.tag}
                              </span>
                            )}
                          </p>
                          {item.dueDate && (
                            <p className="text-sm text-gray-500 mt-0.5">Due: {formatDisplayDate(item.dueDate)}</p>
                          )}
                          {item.completedAt && (
                            <p className="text-sm text-status-green mt-0.5">
                              Completed: {formatDisplayDate(item.completedAt)}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => setAddingTaskTo({ type: item.type, id: item.id })}
                        className="ml-2 w-6 h-6 flex items-center justify-center bg-black hover:bg-gray-800 rounded-full transition-colors flex-shrink-0"
                        disabled={!!item.completedAt}
                        title={item.completedAt ? 'Cannot add tasks to completed items' : 'Add task'}
                      >
                        <span className="text-sm font-bold text-white">+</span>
                      </button>
                    </div>

                    {/* Add Task Form */}
                    {addingTaskTo?.type === item.type && addingTaskTo?.id === item.id && (
                      <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                        <input
                          type="text"
                          placeholder="Task title"
                          value={newTaskTitle}
                          onChange={(e) => setNewTaskTitle(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && addTask(item.type, item.id)}
                          className="w-full px-3 py-2 mb-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-yellow text-sm"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => addTask(item.type, item.id)}
                            className="px-3 py-1 text-sm bg-primary-yellow hover:bg-primary-yellow-dark rounded-lg transition-colors"
                          >
                            Add
                          </button>
                          <button
                            onClick={() => {
                              setAddingTaskTo(null);
                              setNewTaskTitle('');
                            }}
                            className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
