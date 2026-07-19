import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Attendance Pro - First Time Setup",
  description: "Set up your timetable and academic calendar",
};

export default function SetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      {children}
    </div>
  );
}
