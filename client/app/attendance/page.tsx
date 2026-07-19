"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogOut,
  Check,
  X,
  Minus,
  Coffee,
  Zap,
  ArrowLeft,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth-context";
import attendanceApi from "@/lib/api/attendance";
import type { TodayLecture, AttendanceStatus } from "@/lib/api/attendance";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: {
  status: AttendanceStatus;
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}[] = [
  {
    status: "present",
    label: "Present",
    icon: Check,
    color: "text-green-600",
    bgColor: "bg-green-500/10 border-green-500/30 hover:bg-green-500/20",
  },
  {
    status: "absent",
    label: "Absent",
    icon: X,
    color: "text-red-600",
    bgColor: "bg-red-500/10 border-red-500/30 hover:bg-red-500/20",
  },
  {
    status: "cancelled",
    label: "Cancelled",
    icon: Minus,
    color: "text-yellow-600",
    bgColor: "bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20",
  },
  {
    status: "holiday",
    label: "Holiday",
    icon: Coffee,
    color: "text-blue-600",
    bgColor: "bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20",
  },
  {
    status: "extra",
    label: "Extra",
    icon: Zap,
    color: "text-purple-600",
    bgColor: "bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/20",
  },
];

const STATUS_COLORS: Record<string, string> = {
  present: "bg-green-500 text-white",
  absent: "bg-red-500 text-white",
  cancelled: "bg-yellow-500 text-white",
  holiday: "bg-blue-500 text-white",
  extra: "bg-purple-500 text-white",
};

function LectureCard({
  lecture,
  onMark,
  isMarking,
}: {
  lecture: TodayLecture;
  onMark: (subjectId: string, status: AttendanceStatus) => void;
  isMarking: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border bg-card p-4"
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="font-medium">{lecture.subject.name}</h3>
          <p className="text-sm text-muted-foreground">
            {lecture.subject.code}
            {lecture.room && ` • ${lecture.room}`}
          </p>
          {lecture.subject.faculty && (
            <p className="text-xs text-muted-foreground">
              {lecture.subject.faculty.name}
            </p>
          )}
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            {lecture.startTime} - {lecture.endTime}
          </p>
        </div>

        {lecture.status && (
          <span
            className={cn(
              "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium capitalize",
              STATUS_COLORS[lecture.status],
            )}
          >
            {lecture.status}
          </span>
        )}
      </div>

      {!lecture.status && (
        <div className="mt-3 grid grid-cols-5 gap-1.5">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.status}
              onClick={() => onMark(lecture.subject.id, option.status)}
              disabled={isMarking}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg border p-2 transition-colors",
                option.bgColor,
                isMarking && "opacity-50",
              )}
            >
              <option.icon className={cn("h-4 w-4", option.color)} />
              <span className={cn("text-[10px] font-medium", option.color)}>
                {option.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}

export default function AttendancePage() {
  const { user, isAuthenticated, isLoading, logout, needsOnboarding } =
    useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
    if (!isLoading && isAuthenticated && needsOnboarding) {
      router.replace("/setup");
    }
  }, [isLoading, isAuthenticated, needsOnboarding, router]);

  const { data: schedule, isLoading: scheduleLoading } = useQuery({
    queryKey: ["attendance", "today"],
    queryFn: async () => {
      const result = await attendanceApi.getTodaySchedule();
      if (result.success && result.data) {
        return result.data;
      }
      return [];
    },
    retry: false,
    enabled: isAuthenticated && !needsOnboarding,
  });

  const markMutation = useMutation({
    mutationFn: async ({
      subjectId,
      status,
    }: {
      subjectId: string;
      status: AttendanceStatus;
    }) => {
      return attendanceApi.markAttendance(subjectId, selectedDate, status);
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Attendance marked");
        queryClient.invalidateQueries({ queryKey: ["attendance"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      } else {
        toast.error(result.message);
      }
    },
    onError: () => {
      toast.error("Failed to mark attendance");
    },
  });

  const handleMark = useCallback(
    (subjectId: string, status: AttendanceStatus) => {
      markMutation.mutate({ subjectId, status });
    },
    [markMutation],
  );

  if (isLoading || !isAuthenticated || needsOnboarding) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/dashboard")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">
                Mark Attendance
              </h1>
              <p className="text-xs text-muted-foreground">
                {new Date(selectedDate + "T12:00:00").toLocaleDateString(
                  "en-US",
                  {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  },
                )}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void logout()}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
          {/* Date selector */}
          <div className="mb-6 flex items-center gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="flex h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            />
          </div>

          {/* Lectures */}
          {scheduleLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : !schedule || schedule.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-sm text-muted-foreground">
                  No lectures scheduled for today
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {schedule.map((lecture) => (
                  <LectureCard
                    key={lecture.id}
                    lecture={lecture}
                    onMark={handleMark}
                    isMarking={markMutation.isPending}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
