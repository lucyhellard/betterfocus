'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { supabase } from '@/lib/supabase';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type Habit = {
  id: string;
  name: string;
  target_days: number;
  archived: boolean;
  sort_order: number;
  created_at: string;
};

function SortableHabitItem({
  habit,
  editingHabit,
  editName,
  editTarget,
  setEditName,
  setEditTarget,
  saveEdit,
  setEditingHabit,
  startEdit,
  toggleArchive,
  setDeleteConfirm
}: {
  habit: Habit;
  editingHabit: string | null;
  editName: string;
  editTarget: number;
  setEditName: (name: string) => void;
  setEditTarget: (target: number) => void;
  saveEdit: (id: string) => void;
  setEditingHabit: (id: string | null) => void;
  startEdit: (habit: Habit) => void;
  toggleArchive: (id: string, archived: boolean) => void;
  setDeleteConfirm: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: habit.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border border-gray-200 rounded-lg p-4 bg-white"
    >
      {editingHabit === habit.id ? (
        <div>
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="w-full px-3 py-2 mb-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-yellow"
            placeholder="Habit name"
          />
          <div className="flex items-center gap-2 mb-3">
            <label className="text-sm text-gray-600">Target days per week:</label>
            <input
              type="number"
              min="1"
              max="7"
              value={editTarget}
              onChange={(e) => setEditTarget(parseInt(e.target.value) || 1)}
              className="w-16 px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-yellow"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => saveEdit(habit.id)}
              className="px-4 py-2 bg-primary-yellow hover:bg-primary-yellow-dark rounded-lg transition-colors text-sm font-medium"
            >
              Save
            </button>
            <button
              onClick={() => setEditingHabit(null)}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div {...attributes} {...listeners} className="cursor-move flex-shrink-0">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{habit.name}</h3>
            <p className="text-sm text-gray-500">Target: {habit.target_days} days/week</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => startEdit(habit)}
              className="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => toggleArchive(habit.id, habit.archived)}
              className="px-3 py-1 text-sm bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-colors"
            >
              Archive
            </button>
            <button
              onClick={() => setDeleteConfirm(habit.id)}
              className="px-3 py-1 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function HabitsPage() {
  const router = useRouter();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingHabit, setEditingHabit] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editTarget, setEditTarget] = useState(5);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchHabits();
  }, []);

  const fetchHabits = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('habits')
        .select('*')
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true });

      if (error) throw error;
      setHabits(data || []);
    } catch (error) {
      console.error('Error fetching habits:', error);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (habit: Habit) => {
    setEditingHabit(habit.id);
    // Extract target days from name if it's in format "5/7d Name"
    const match = habit.name.match(/^(\d+)\/7d\s+(.+)$/);
    if (match) {
      setEditTarget(parseInt(match[1]));
      setEditName(match[2]);
    } else {
      setEditName(habit.name);
      setEditTarget(habit.target_days);
    }
  };

  const saveEdit = async (habitId: string) => {
    try {
      const { error } = await supabase
        .from('habits')
        .update({
          name: `${editTarget}/7d ${editName}`,
          target_days: editTarget,
        })
        .eq('id', habitId);

      if (error) throw error;

      setEditingHabit(null);
      fetchHabits();
    } catch (error) {
      console.error('Error updating habit:', error);
      alert('Failed to update habit');
    }
  };

  const toggleArchive = async (habitId: string, currentArchived: boolean) => {
    try {
      const { error } = await supabase
        .from('habits')
        .update({ archived: !currentArchived })
        .eq('id', habitId);

      if (error) throw error;
      fetchHabits();
    } catch (error) {
      console.error('Error archiving habit:', error);
      alert('Failed to archive habit');
    }
  };

  const deleteHabit = async (habitId: string) => {
    try {
      // First delete all habit entries
      const { error: entriesError } = await supabase
        .from('habit_entries')
        .delete()
        .eq('habit_id', habitId);

      if (entriesError) throw entriesError;

      // Then delete the habit
      const { error: habitError } = await supabase
        .from('habits')
        .delete()
        .eq('id', habitId);

      if (habitError) throw habitError;

      setDeleteConfirm(null);
      fetchHabits();
    } catch (error) {
      console.error('Error deleting habit:', error);
      alert('Failed to delete habit');
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const activeHabits = habits.filter(h => !h.archived);
    const oldIndex = activeHabits.findIndex(h => h.id === active.id);
    const newIndex = activeHabits.findIndex(h => h.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // Reorder the active habits
    const reorderedActiveHabits = arrayMove(activeHabits, oldIndex, newIndex);

    // Combine with archived habits (keep them at the end)
    const archivedHabits = habits.filter(h => h.archived);
    const allHabits = [...reorderedActiveHabits, ...archivedHabits];

    // Optimistically update UI
    setHabits(allHabits);

    // Update sort_order in database
    try {
      const updates = reorderedActiveHabits.map((habit, index) => ({
        id: habit.id,
        sort_order: index + 1,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('habits')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id);

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error updating habit order:', error);
      alert('Failed to update habit order');
      // Revert on error
      fetchHabits();
    }
  };

  const activeHabits = habits.filter(h => !h.archived);
  const archivedHabits = habits.filter(h => h.archived);

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Dashboard
            </button>
            <h1 className="text-3xl font-bold text-primary-black mb-2">Manage Habits</h1>
            <p className="text-gray-600">Edit, archive, or delete your habits</p>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading habits...</div>
          ) : (
            <>
              {/* Active Habits */}
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h2 className="text-xl font-bold text-primary-black mb-4">Active Habits</h2>
                {activeHabits.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No active habits</p>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={activeHabits.map(h => h.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-3">
                        {activeHabits.map((habit) => (
                          <SortableHabitItem
                            key={habit.id}
                            habit={habit}
                            editingHabit={editingHabit}
                            editName={editName}
                            editTarget={editTarget}
                            setEditName={setEditName}
                            setEditTarget={setEditTarget}
                            saveEdit={saveEdit}
                            setEditingHabit={setEditingHabit}
                            startEdit={startEdit}
                            toggleArchive={toggleArchive}
                            setDeleteConfirm={setDeleteConfirm}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>

              {/* Archived Habits */}
              {archivedHabits.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-xl font-bold text-gray-600 mb-4">Archived Habits</h2>
                  <div className="space-y-3">
                    {archivedHabits.map((habit) => (
                      <div key={habit.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-gray-600">{habit.name}</h3>
                            <p className="text-sm text-gray-500">Target: {habit.target_days} days/week</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => toggleArchive(habit.id, habit.archived)}
                              className="px-3 py-1 text-sm text-white rounded-lg transition-colors"
                              style={{ backgroundColor: '#92d050' }}
                              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#7bc040'}
                              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#92d050'}
                            >
                              Unarchive
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(habit.id)}
                              className="px-3 py-1 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Delete Confirmation Modal */}
          {deleteConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md mx-4">
                <h3 className="text-xl font-bold text-red-600 mb-4">
                  ⚠️ Confirm Delete
                </h3>
                <p className="text-gray-700 mb-4">
                  Are you sure you want to delete this habit? This will permanently delete the habit and all its tracking data.
                </p>
                <p className="text-sm font-semibold text-red-600 mb-6">
                  This action cannot be undone!
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => deleteHabit(deleteConfirm)}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
                  >
                    Yes, Delete
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
