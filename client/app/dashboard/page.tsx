"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  LogOut,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Target,
  BookOpen,
  ArrowRight,
} from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import dashboardApi from "@/lib/api/dashboard";
import type {
  DashboardData,
  SubjectAttendance,
  TodayTimetableEntry,
} from "@/lib/api/dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  present: "bg-green-500/10 text-green-600 border-green-500/20",
  absent: "bg-red-500/10 text-red-600 border-red-500/20",
  cancelled: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  holiday: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  extra: "bg-purple-500/10 text-purple-600 border-purple-500/20",
};

function AttendanceGauge({
  percentage,
  target,
}: {
  percentage: number;
  target: number;
}) {
  const radius = 70;
  const stroke = 10;
  const normalizedRadius = radius - stroke;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const color =
    percentage >= target
      ? "text-green-500"
      : percentage >= target - 10
        ? "text-yellow-500"
        : "text-red-500";

  return (
    <div className="relative flex items-center justify-center">
      <svg height={radius * 2} width={radius * 2}>
        <circle
          stroke="currentColor"
          className="text-muted/30"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <motion.circle
          stroke="currentColor"
          className={color}
          fill="transparent"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          transform={`rotate(-90 ${radius} ${radius})`}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={cn("text-3xl font-bold", color)}>
          {percentage}%
        </span>
        <span className="text-xs text-muted-foreground">
          Target: {target}%
        </span>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg",
            color,
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-lg font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SubjectCard({ subject }: { subject: SubjectAttendance }) {
  const color =
    subject.percentage >= 75
      ? "text-green-600"
      : subject.percentage >= 60
        ? "text-yellow-600"
        : "text-red-600";

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h4 className="font-medium truncate">{subject.name}</h4>
            <p className="text-xs text-muted-foreground">{subject.code}</p>
            {subject.faculty && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {subject.faculty}
              </p>
            )}
          </div>
          <span className={cn("text-lg font-bold", color)}>
            {subject.percentage}%
          </span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${subject.percentage}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={cn(
              "h-full rounded-full",
              subject.percentage >= 75
                ? "bg-green-500"
                : subject.percentage >= 60
                  ? "bg-yellow-500"
                  : "bg-red-500",
            )}
          />
        </div>
        <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
          <span>
            <span className="text-green-600">{subject.present}</span> present
          </span>
          <span>
            <span className="text-red-600">{subject.absent}</span> absent
          </span>
          {subject.cancelled > 0 && (
            <span>
              <span className="text-yellow-600">{subject.cancelled}</span>{" "}
              cancelled
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TimetableCard({ entry }: { entry: TodayTimetableEntry }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border px-3 py-2.5",
        entry.status ? STATUS_COLORS[entry.status] : "bg-card",
      )}
    >
      <div className="flex flex-col items-center">
        <span className="font-mono text-xs font-medium">
          {entry.startTime}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {entry.endTime}
        </span>
      </div>
      <div className="h-8 w-px bg-border" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{entry.subject.name}</p>
        <p className="text-xs text-muted-foreground">
          {entry.subject.code}
          {entry.room && ` • ${entry.room}`}
          {entry.subject.faculty &&
            ` • ${entry.subject.faculty.name}`}
        </p>
      </div>
      {entry.status && (
        <span className="text-xs font-medium capitalize">{entry.status}</span>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading, logout, needsOnboarding } =
    useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
    if (!isLoading && isAuthenticated && needsOnboarding) {
      router.replace("/setup");
    }
  }, [isLoading, isAuthenticated, needsOnboarding, router]);

  const { data: dashboardData, isLoading: dataLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const result = await dashboardApi.getDashboard();
      if (result.success && result.data) {
        return result.data;
      }
      return null;
    },
    retry: false,
    enabled: isAuthenticated && !needsOnboarding,
  });

  if (isLoading || !isAuthenticated || needsOnboarding) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (dataLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <DashboardHeader user={user} onLogout={logout} />
        <main className="flex-1 items-center justify-center">
          <LoadingSpinner size="lg" />
        </main>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex min-h-screen flex-col">
        <DashboardHeader user={user} onLogout={logout} />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Failed to load dashboard data</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader user={user} onLogout={logout} />

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {/* Greeting */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight">
              Welcome back, {user?.name || "Student"}
            </h2>
            <p className="text-muted-foreground">
              {dashboardData.profile.college}
              {dashboardData.profile.department &&
                ` • ${dashboardData.profile.department}`}
              {dashboardData.profile.division &&
                ` • ${dashboardData.profile.division}`}
              {dashboardData.profile.semester &&
                ` • Sem ${dashboardData.profile.semester}`}
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left Column: Gauge + Stats */}
            <div className="space-y-6 lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Overall Attendance</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <AttendanceGauge
                    percentage={dashboardData.overallPercentage}
                    target={dashboardData.targetPercentage}
                  />
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  label="Present"
                  value={dashboardData.totalPresent}
                  icon={CheckCircle2}
                  color="bg-green-500/10 text-green-600"
                />
                <StatCard
                  label="Absent"
                  value={dashboardData.totalAbsent}
                  icon={AlertTriangle}
                  color="bg-red-500/10 text-red-600"
                />
                <StatCard
                  label="Can Miss"
                  value={dashboardData.canMiss}
                  icon={Target}
                  color="bg-blue-500/10 text-blue-600"
                />
                <StatCard
                  label="Need to Attend"
                  value={dashboardData.neededLectures}
                  icon={TrendingUp}
                  color="bg-orange-500/10 text-orange-600"
                />
              </div>
            </div>

            {/* Right Column: Subjects + Timetable + Events */}
            <div className="space-y-6 lg:col-span-2">
              {/* Today's Timetable */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">
                      <Clock className="mr-2 inline h-4 w-4" />
                      Today&apos;s Schedule
                    </CardTitle>
                    <span className="text-xs text-muted-foreground">
                      {new Date().toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  {dashboardData.todayTimetable.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      No classes scheduled for today
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {dashboardData.todayTimetable.map((entry) => (
                        <TimetableCard key={entry.id} entry={entry} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Subject-wise Attendance */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">
                      <BookOpen className="mr-2 inline h-4 w-4" />
                      Subject Attendance
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push("/attendance")}
                    >
                      View All
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {dashboardData.subjects.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      No attendance data yet. Start marking your lectures!
                    </p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {dashboardData.subjects.map((subject) => (
                        <SubjectCard
                          key={subject.id}
                          subject={subject}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function DashboardHeader({
  user,
  onLogout,
}: {
  user: { name?: string; email?: string } | null;
  onLogout: () => Promise<void>;
}) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
            AP
          </div>
          <span className="font-semibold">
            Attendance
            <span className="text-muted-foreground font-normal">Pro</span>
          </span>
        </div>
        <nav className="flex items-center gap-1">
          <a href="/attendance">
            <Button variant="ghost" size="sm">
              Attendance
            </Button>
          </a>
          <a href="/analytics">
            <Button variant="ghost" size="sm">
              Analytics
            </Button>
          </a>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void onLogout()}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </nav>
      </div>
    </header>
  );
}
