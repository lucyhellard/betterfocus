'use client';

import { useState, useEffect } from 'react';
import { getWeekDates, getDayName, formatDate, getWeekNumber } from '@/utils/dateUtils';
import { supabase } from '@/lib/supabase';
import { getCurrentUserId } from '@/lib/supabaseHelpers';
import { useWeek } from '@/lib/WeekContext';
import { ChevronDownIcon, ChevronUpIcon, ArrowTurnDownLeftIcon } from '@heroicons/react/24/outline';

type HabitStatus = '' | 'green' | 'grey' | 'red' | 'yellow';

type Habit = {
  id: string;
  name: string;
  targetDays: number;
  dailyStatuses: Record<string, HabitStatus>;
  weeklyStreak: { week: number; status: 'green' | 'green-light' | 'red'; completion: number }[];
};

export default function HabitsColumn() {
  const { currentWeek, currentYear } = useWeek();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitTarget, setNewHabitTarget] = useState(5);
  const [loading, setLoading] = useState(true);
  const [isDailyHabitsExpanded, setIsDailyHabitsExpanded] = useState(true);
  const [isWeeklyStreakExpanded, setIsWeeklyStreakExpanded] = useState(true);
  const [isNotesExpanded, setIsNotesExpanded] = useState(false);
  const [notes, setNotes] = useState('');
  const [editingNotes, setEditingNotes] = useState('');

  const weekDates = getWeekDates(currentWeek, currentYear);

  // Fetch habits and their entries
  useEffect(() => {
    fetchHabits();
    fetchWeeklyNotes();
  }, [currentWeek]);

  const fetchWeeklyNotes = async () => {
    try {
      console.log('Fetching notes for week:', currentWeek, 'year:', currentYear);
      const { data, error } = await supabase
        .from('habit_weekly_notes')
        .select('notes')
        .eq('week_number', currentWeek)
        .eq('year', currentYear)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
        console.error('Error fetching notes:', error);
        throw error;
      }

      console.log('Fetched notes:', data);
      setNotes(data?.notes || '');
      setEditingNotes(data?.notes || '');
    } catch (error) {
      console.error('Error fetching weekly notes:', error);
      setNotes('');
      setEditingNotes('');
    }
  };

  const saveWeeklyNotes = async () => {
    try {
      await supabase
        .from('habit_weekly_notes')
        .upsert({
          week_number: currentWeek,
          year: currentYear,
          notes: editingNotes,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'week_number,year'
        });

      setNotes(editingNotes);
    } catch (error) {
      console.error('Error saving weekly notes:', error);
    }
  };

  const fetchHabits = async () => {
    try {
      setLoading(true);

      // Fetch all habits (exclude archived)
      const { data: habitsData, error: habitsError } = await supabase
        .from('habits')
        .select('*')
        .eq('archived', false)
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true });

      if (habitsError) throw habitsError;

      if (!habitsData) {
        setHabits([]);
        return;
      }

      // Fetch habit entries for the current week
      const startDate = formatDate(weekDates[0]);
      const endDate = formatDate(weekDates[6]);

      const { data: entriesData, error: entriesError } = await supabase
        .from('habit_entries')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate);

      if (entriesError) throw entriesError;

      // Fetch all entries for weekly streak calculation
      const { data: allEntriesData, error: allEntriesError } = await supabase
        .from('habit_entries')
        .select('*');

      if (allEntriesError) throw allEntriesError;

      // Get today's date
      const todayDate = formatDate(new Date());

      // Combine habits with their entries
      const habitsWithEntries: Habit[] = habitsData.map((habit) => {
        // Create dailyStatuses map for current week
        const dailyStatuses: Record<string, HabitStatus> = {};
        entriesData?.forEach((entry) => {
          if (entry.habit_id === habit.id) {
            dailyStatuses[entry.date] = entry.status as HabitStatus;
          }
        });

        // Auto-set today to yellow if it's empty and we're viewing the current week
        const isCurrentWeek = weekDates.some(date => formatDate(date) === todayDate);
        if (isCurrentWeek && !dailyStatuses[todayDate]) {
          dailyStatuses[todayDate] = 'yellow';
        }

        // Calculate weekly streak
        const weeklyStreak = calculateWeeklyStreak(habit.id, habit.target_days, allEntriesData || []);

        return {
          id: habit.id,
          name: habit.name,
          targetDays: habit.target_days,
          dailyStatuses,
          weeklyStreak,
        };
      });

      setHabits(habitsWithEntries);
    } catch (error) {
      console.error('Error fetching habits:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateWeeklyStreak = (habitId: string, targetDays: number, allEntries: any[]) => {
    const habitEntries = allEntries.filter((e) => e.habit_id === habitId);
    const entriesByWeek: Record<number, Map<string, string>> = {};

    // Group entries by week, keeping only the latest status for each date
    habitEntries.forEach((entry) => {
      // Parse date as local date to avoid timezone issues
      const [year, month, day] = entry.date.split('-').map(Number);
      const entryDate = new Date(year, month - 1, day);
      const weekNum = getWeekNumber(entryDate);
      if (!entriesByWeek[weekNum]) {
        entriesByWeek[weekNum] = new Map();
      }
      // Store by date to avoid counting duplicates
      entriesByWeek[weekNum].set(entry.date, entry.status);
    });

    // Calculate completion for each week
    const streaks = Object.keys(entriesByWeek)
      .map((weekStr) => {
        const week = parseInt(weekStr);
        const dateStatusMap = entriesByWeek[week];

        // Count unique dates with green status
        const completedDays = Array.from(dateStatusMap.values()).filter((status) => status === 'green').length;
        const completion = Math.round((completedDays / targetDays) * 100);

        let status: 'green' | 'green-light' | 'red';
        if (completion >= 100) {
          status = 'green';
        } else if (completion >= 75) {
          status = 'green-light';
        } else {
          status = 'red';
        }

        return { week, status, completion };
      })
      .filter((s) => s.week < currentWeek) // Only show past weeks
      .sort((a, b) => a.week - b.week);

    return streaks;
  };

  const cycleStatus = async (habitId: string, date: string) => {
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;

    const currentStatus = habit.dailyStatuses[date] || '';
    const statusCycle: HabitStatus[] = ['', 'yellow', 'green', 'grey', 'red'];
    const currentIndex = statusCycle.indexOf(currentStatus);
    const nextStatus = statusCycle[(currentIndex + 1) % statusCycle.length];

    // Optimistically update UI
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== habitId) return h;

        return {
          ...h,
          dailyStatuses: {
            ...h.dailyStatuses,
            [date]: nextStatus,
          },
        };
      })
    );

    try {
      if (nextStatus === '') {
        // Delete the entry if cycling back to empty
        await supabase
          .from('habit_entries')
          .delete()
          .eq('habit_id', habitId)
          .eq('date', date);
      } else {
        // Upsert the entry
        await supabase
          .from('habit_entries')
          .upsert({
            habit_id: habitId,
            date: date,
            status: nextStatus,
          }, {
            onConflict: 'habit_id,date'
          });
      }
    } catch (error) {
      console.error('Error updating habit status:', error);
      // Revert on error
      fetchHabits();
    }
  };

  const getStatusColor = (status: HabitStatus) => {
    switch (status) {
      case 'green':
        return 'bg-status-green';
      case 'grey':
        return 'bg-status-grey';
      case 'red':
        return 'bg-status-red';
      case 'yellow':
        return 'bg-status-yellow';
      default:
        return 'bg-white border border-gray-300';
    }
  };

  const getWeeklyStreakColor = (status: 'green' | 'green-light' | 'red') => {
    switch (status) {
      case 'green':
        return 'bg-status-green';
      case 'green-light':
        return 'bg-status-green-light';
      case 'red':
        return 'bg-status-red';
    }
  };

  const addHabit = async () => {
    if (!newHabitName.trim()) return;

    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        console.error('No user logged in');
        return;
      }

      const { data, error } = await supabase
        .from('habits')
        .insert({
          name: `${newHabitTarget}/7d ${newHabitName}`,
          target_days: newHabitTarget,
          user_id: userId,
        })
        .select()
        .single();

      if (error) throw error;

      // Add to local state
      if (data) {
        const newHabit: Habit = {
          id: data.id,
          name: data.name,
          targetDays: data.target_days,
          dailyStatuses: {},
          weeklyStreak: [],
        };
        setHabits([...habits, newHabit]);
      }

      setNewHabitName('');
      setNewHabitTarget(5);
      setShowAddHabit(false);
    } catch (error) {
      console.error('Error adding habit:', error);
    }
  };

  return (
    <div className="space-y-8">
      {/* Daily Habits */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-primary-black">Daily Habits</h2>
            <button
              onClick={() => setIsDailyHabitsExpanded(!isDailyHabitsExpanded)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title={isDailyHabitsExpanded ? 'Collapse' : 'Expand'}
            >
              {isDailyHabitsExpanded ? (
                <ChevronUpIcon className="w-5 h-5 text-gray-600" />
              ) : (
                <ChevronDownIcon className="w-5 h-5 text-gray-600" />
              )}
            </button>
          </div>
          <button
            onClick={() => setShowAddHabit(!showAddHabit)}
            className="w-8 h-8 flex items-center justify-center bg-black hover:bg-gray-800 rounded-full transition-colors"
          >
            <span className="text-xl font-bold text-white">+</span>
          </button>
        </div>

        {/* Add Habit Form */}
        {showAddHabit && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <input
              type="text"
              placeholder="Habit name"
              value={newHabitName}
              onChange={(e) => setNewHabitName(e.target.value)}
              className="w-full px-3 py-2 mb-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-yellow"
            />
            <div className="flex items-center gap-2 mb-2">
              <label className="text-sm text-gray-600">Target days per week:</label>
              <input
                type="number"
                min="1"
                max="7"
                value={newHabitTarget}
                onChange={(e) => setNewHabitTarget(parseInt(e.target.value) || 1)}
                className="w-16 px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-yellow"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={addHabit}
                className="px-4 py-2 bg-primary-yellow hover:bg-primary-yellow-dark rounded-lg transition-colors"
              >
                Add
              </button>
              <button
                onClick={() => setShowAddHabit(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {isDailyHabitsExpanded && (
          <>
            {/* Daily Habits List */}
            <div className="mb-6">
              {loading ? (
                <div className="text-center py-8 text-gray-400">Loading habits...</div>
              ) : habits.length === 0 ? (
                <div className="text-center py-8 text-gray-400">No habits yet. Click + to add one!</div>
              ) : (
                <div className="space-y-3">
                  {habits.map((habit) => (
                  <div key={habit.id}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{habit.name}</span>
                      <div className="flex gap-1">
                    {weekDates.map((date) => {
                      const dateStr = formatDate(date);
                      const status = habit.dailyStatuses[dateStr] || '';
                      return (
                        <button
                          key={dateStr}
                          onClick={() => cycleStatus(habit.id, dateStr)}
                          className={`w-8 h-8 rounded ${getStatusColor(status)} hover:opacity-80 transition-opacity flex items-center justify-center text-xs font-medium`}
                          title={getDayName(date)}
                        >
                          {getDayName(date)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              ))}
            </div>
          )}
        </div>
          </>
        )}

        {/* Notes Section */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={() => setIsNotesExpanded(!isNotesExpanded)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors mb-2"
          >
            {isNotesExpanded ? (
              <ChevronUpIcon className="w-4 h-4" />
            ) : (
              <ChevronDownIcon className="w-4 h-4" />
            )}
            <span>Notes</span>
          </button>
          {isNotesExpanded && (
            <div>
              <textarea
                value={editingNotes}
                onChange={(e) => setEditingNotes(e.target.value)}
                placeholder="Add notes about your habits..."
                className="w-full px-3 py-2 mb-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-yellow text-sm"
                rows={4}
              />
              <button
                onClick={saveWeeklyNotes}
                className="p-2 border border-gray-300 hover:bg-gray-100 rounded transition-colors"
                title="Save notes"
              >
                <ArrowTurnDownLeftIcon className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 mb-2">Key:</p>
          <div className="flex flex-wrap gap-3 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-status-green"></div>
              <span>Complete</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-status-yellow"></div>
              <span>To do today</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-status-grey"></div>
              <span>Missed (in range)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-status-red"></div>
              <span>Missed (out of range)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Streak */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-xl font-bold text-primary-black">Habits - Weekly Streak</h2>
          <button
            onClick={() => setIsWeeklyStreakExpanded(!isWeeklyStreakExpanded)}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title={isWeeklyStreakExpanded ? 'Collapse' : 'Expand'}
          >
            {isWeeklyStreakExpanded ? (
              <ChevronUpIcon className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronDownIcon className="w-5 h-5 text-gray-600" />
            )}
          </button>
        </div>
        {isWeeklyStreakExpanded && (
          <div className="space-y-3">
            {habits.map((habit) => (
              <div key={habit.id}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{habit.name}</span>
                  <div className="flex gap-1">
                    {habit.weeklyStreak.map((streak) => (
                      <div
                        key={streak.week}
                        className={`w-8 h-8 rounded ${getWeeklyStreakColor(streak.status)} flex items-center justify-center text-xs font-medium`}
                        title={`Week ${streak.week}: ${streak.completion}%`}
                      >
                        {streak.week}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
