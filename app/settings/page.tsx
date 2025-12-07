'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { supabase } from '@/lib/supabase';

const TIMEZONES = [
  { value: 'Pacific/Auckland', label: 'Auckland (UTC+12/+13)' },
  { value: 'Australia/Sydney', label: 'Sydney (UTC+10/+11)' },
  { value: 'Australia/Brisbane', label: 'Brisbane (UTC+10)' },
  { value: 'Australia/Melbourne', label: 'Melbourne (UTC+10/+11)' },
  { value: 'Australia/Perth', label: 'Perth (UTC+8)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (UTC+9)' },
  { value: 'Asia/Singapore', label: 'Singapore (UTC+8)' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong (UTC+8)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (UTC+8)' },
  { value: 'Asia/Dubai', label: 'Dubai (UTC+4)' },
  { value: 'Europe/London', label: 'London (UTC+0/+1)' },
  { value: 'Europe/Paris', label: 'Paris (UTC+1/+2)' },
  { value: 'Europe/Berlin', label: 'Berlin (UTC+1/+2)' },
  { value: 'America/New_York', label: 'New York (UTC-5/-4)' },
  { value: 'America/Chicago', label: 'Chicago (UTC-6/-5)' },
  { value: 'America/Denver', label: 'Denver (UTC-7/-6)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (UTC-8/-7)' },
  { value: 'America/Toronto', label: 'Toronto (UTC-5/-4)' },
  { value: 'America/Vancouver', label: 'Vancouver (UTC-8/-7)' },
];

export default function SettingsPage() {
  const router = useRouter();
  const [timezone, setTimezone] = useState('Australia/Brisbane');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      if (data) {
        setTimezone(data.timezone || 'Australia/Brisbane');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('settings')
        .upsert({
          id: 1, // Single row for settings
          timezone: timezone,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      // Reload the page to apply timezone changes
      window.location.href = '/';
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const resetHabitTracking = async () => {
    try {
      setResetting(true);

      const { error } = await supabase
        .from('habit_entries')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

      if (error) throw error;

      setShowResetConfirm(false);
      alert('Habit tracking data has been reset successfully.');
      window.location.href = '/';
    } catch (error) {
      console.error('Error resetting habit tracking:', error);
      alert('Failed to reset habit tracking. Please try again.');
    } finally {
      setResetting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-2xl mx-auto">
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
            <h1 className="text-3xl font-bold text-primary-black mb-2">Settings</h1>
            <p className="text-gray-600">Customize your BetterFocus experience</p>
          </div>

          {/* Settings Form */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            {loading ? (
              <div className="text-center py-8 text-gray-400">Loading settings...</div>
            ) : (
              <>
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Timezone
                  </label>
                  <p className="text-sm text-gray-500 mb-3">
                    All dates and times will be displayed in your selected timezone
                  </p>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-yellow"
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={saveSettings}
                    disabled={saving}
                    className="px-6 py-2 bg-primary-yellow hover:bg-primary-yellow-dark rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : 'Save Settings'}
                  </button>
                  <button
                    onClick={() => router.push('/')}
                    className="px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Danger Zone */}
          <div className="bg-white rounded-lg shadow-sm p-6 mt-6 border-2 border-red-200">
            <h3 className="text-lg font-semibold text-red-600 mb-2">Danger Zone</h3>
            <p className="text-sm text-gray-600 mb-4">
              These actions cannot be undone. Please be careful.
            </p>

            <div className="border-t border-red-200 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900">Reset Habit Tracking</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Delete all habit tracking entries. Your habits will remain, but all daily records will be removed.
                  </p>
                </div>
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium ml-4"
                >
                  Reset Data
                </button>
              </div>
            </div>
          </div>

          {/* Confirmation Modal */}
          {showResetConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md mx-4">
                <h3 className="text-xl font-bold text-red-600 mb-4">
                  ⚠️ Confirm Reset
                </h3>
                <p className="text-gray-700 mb-2">
                  Are you sure you want to reset all habit tracking data?
                </p>
                <p className="text-gray-700 mb-4">
                  This will permanently delete all your daily habit entries. Your habits themselves will not be deleted.
                </p>
                <p className="text-sm font-semibold text-red-600 mb-6">
                  This action cannot be undone!
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={resetHabitTracking}
                    disabled={resetting}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resetting ? 'Resetting...' : 'Yes, Reset All Data'}
                  </button>
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    disabled={resetting}
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
