import type { Metadata } from "next";
import "./globals.css";
import { TimezoneProvider } from "@/lib/TimezoneContext";
import { AuthProvider } from "@/lib/AuthContext";

export const metadata: Metadata = {
  title: "BetterFocus - Habit & Task Tracker",
  description: "Track your habits, tasks, and projects with ease",
  icons: {
    icon: '/favicon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <AuthProvider>
          <TimezoneProvider>
            {children}
          </TimezoneProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
