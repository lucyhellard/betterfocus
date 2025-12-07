'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { getCurrentWeek } from '@/utils/dateUtils';

type WeekContextType = {
  currentWeek: number;
  currentYear: number;
  setCurrentWeek: (week: number) => void;
};

const WeekContext = createContext<WeekContextType | undefined>(undefined);

export function WeekProvider({ children }: { children: ReactNode }) {
  const [currentWeek, setCurrentWeek] = useState(getCurrentWeek());
  const [currentYear] = useState(new Date().getFullYear());

  return (
    <WeekContext.Provider value={{ currentWeek, currentYear, setCurrentWeek }}>
      {children}
    </WeekContext.Provider>
  );
}

export function useWeek() {
  const context = useContext(WeekContext);
  if (context === undefined) {
    throw new Error('useWeek must be used within a WeekProvider');
  }
  return context;
}
