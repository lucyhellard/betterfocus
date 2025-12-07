'use client';

import DashboardLayout from '@/components/DashboardLayout';
import HabitsColumn from '@/components/HabitsColumn';
import TasksColumn from '@/components/TasksColumn';
import ProjectsColumn from '@/components/ProjectsColumn';
import ProtectedRoute from '@/components/ProtectedRoute';
import { WeekProvider, useWeek } from '@/lib/WeekContext';
import { getWeekDates, getWeekNumber } from '@/utils/dateUtils';

function DashboardContent() {
  const { currentWeek, setCurrentWeek } = useWeek();
  const today = new Date();
  const weekDates = getWeekDates(currentWeek, today.getFullYear());

  // Get the date for display (use first day of the selected week or today if current week)
  const isCurrentWeek = currentWeek === getWeekNumber(today);
  const displayDate = isCurrentWeek ? today : weekDates[0];

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const dayName = dayNames[displayDate.getDay()];
  const day = displayDate.getDate();
  const month = monthNames[displayDate.getMonth()];
  const year = displayDate.getFullYear().toString().slice(-2);

  return (
    <DashboardLayout>
      <div className="p-6">
        {/* Dashboard Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-primary-black mb-2">Dashboard</h1>
            <p className="text-gray-600">Track your habits, tasks, and goals with ease.</p>
          </div>

          {/* Date and Week Navigation */}
          <div className="text-right">
            <div className="text-2xl font-bold text-primary-black mb-1">
              {dayName} {day}-{month}-{year}
            </div>
            <div className="flex items-center gap-3 justify-end">
              <span className="text-sm text-gray-600">Week {currentWeek}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentWeek(currentWeek - 1)}
                  className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
                >
                  &lt;
                </button>
                <span className="font-medium min-w-[2rem] text-center">{currentWeek}</span>
                <button
                  onClick={() => setCurrentWeek(currentWeek + 1)}
                  className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
                >
                  &gt;
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Three Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Habits */}
          <div>
            <HabitsColumn />
          </div>

          {/* Column 2: Today's Tasks */}
          <div>
            <TasksColumn />
          </div>

          {/* Column 3: Projects & Goals */}
          <div>
            <ProjectsColumn />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function Home() {
  return (
    <ProtectedRoute>
      <WeekProvider>
        <DashboardContent />
      </WeekProvider>
    </ProtectedRoute>
  );
}
