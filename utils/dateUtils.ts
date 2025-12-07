export function getWeekNumber(date: Date): number {
  // ISO week date calculation using local time (Brisbane)
  // Create a copy to avoid modifying the original
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayNum = d.getDay() || 7; // Sunday = 7, Monday = 1
  d.setDate(d.getDate() + 4 - dayNum); // Thursday of current week
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export function getCurrentWeek(): number {
  return getWeekNumber(new Date());
}

export function getWeekDates(weekNumber: number, year: number = new Date().getFullYear()): Date[] {
  // ISO week date: Week 1 is the week with the first Thursday of the year
  // January 4th is always in week 1

  // Start with January 4th
  const jan4 = new Date(year, 0, 4);
  const jan4Day = jan4.getDay() || 7; // Convert Sunday from 0 to 7

  // Go back to the Monday of week 1
  const week1Monday = new Date(year, 0, 4 - jan4Day + 1);

  // Add (weekNumber - 1) weeks to get target Monday
  const targetMonday = new Date(week1Monday);
  targetMonday.setDate(week1Monday.getDate() + (weekNumber - 1) * 7);

  // Generate all 7 days of the week
  const weekDates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(targetMonday);
    date.setDate(targetMonday.getDate() + i);
    weekDates.push(date);
  }

  return weekDates;
}

export function formatDate(date: Date): string {
  // Format date in local timezone, not UTC
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDayName(date: Date): string {
  return ['S', 'M', 'T', 'W', 'T', 'F', 'S'][date.getDay()];
}

export function isToday(date: Date): boolean {
  const today = new Date();
  return formatDate(date) === formatDate(today);
}
