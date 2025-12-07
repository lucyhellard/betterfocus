'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from './supabase';

type TimezoneContextType = {
  timezone: string;
  loading: boolean;
};

const TimezoneContext = createContext<TimezoneContextType>({
  timezone: 'Australia/Brisbane',
  loading: true,
});

export function TimezoneProvider({ children }: { children: ReactNode }) {
  const [timezone, setTimezone] = useState('Australia/Brisbane');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTimezone();
  }, []);

  const loadTimezone = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('timezone')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data?.timezone) {
        setTimezone(data.timezone);
      }
    } catch (error) {
      console.error('Error loading timezone:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TimezoneContext.Provider value={{ timezone, loading }}>
      {children}
    </TimezoneContext.Provider>
  );
}

export function useTimezone() {
  return useContext(TimezoneContext);
}
