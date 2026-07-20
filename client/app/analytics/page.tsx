"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  LogOut,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  BarChart3,
} from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import dashboardApi from "@/lib/api/dashboard";
import type { AttendanceInsights, SubjectAttendance } from "@/lib/api/dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { cn } from "@/lib/utils";

function WeeklyTrendChart({
  data,
}: {
  data: { week: string; percentage: number }[];
}) {
  const maxPercentage = Math.max(...data.map((d) => d.percentage), 100);

  return (
    <div className="flex items-end gap-2 h-40">
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <span className="text-xs font-medium">{d.percentage}%</span>
          <motion.div
            initial={{ height: 0 }}
            animate={{
              height: `${(d.percentage / maxPercentage) * 100}%`,
            }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className={cn(
              "w-full rounded-t-md min-h-[4px]",
              d.percentage >= 75
                ? "bg-green-500"
                : d.percentage >= 60
                  ? "bg-yellow-500"
                  : "bg-red-500",
            )}
          />
          <span className="text-[10px] text-muted-foreground">{d.week}</span>
        </div>
      ))}
    </div>
  );
}

function RiskSubjectCard({ subject }: { subject: SubjectAttendance }) {
  const gap = 75 - subject.percentage;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-500/5 p-3">
      <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{subject.name}</p>
        <p className="text-xs text-muted-foreground">
          {subject.code} • {subject.present}/{subject.total} lectures
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold text-red-600">{subject.percentage}%</p>
        <p className="text-[10px] text-red-500">
          {gap}% below target
        </p>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { user, isAuthenticated, isLoading, logout, needsOnboarding } =
    useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
    if (!isLoading && isAuthenticated && needsOnboarding) {
      router.replace("/dashboard");
    }
  }, [isLoading, isAuthenticated, needsOnboarding, router]);

  const { data: insights, isLoading: insightsLoading } = useQuery({
    queryKey: ["analytics", "insights"],
    queryFn: async () => {
      const result = await dashboardApi.getInsights();
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
            <h1 className="text-lg font-semibold tracking-tight">Analytics</h1>
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
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
          {insightsLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : !insights ? (
            <div className="py-12 text-center">
              <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-muted-foreground">
                No analytics data available yet. Start marking attendance!
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Weekly Trend */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    <TrendingUp className="mr-2 inline h-4 w-4" />
                    Weekly Attendance Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {insights.weeklyTrend.every((w) => w.total === 0) ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      No attendance data for the last 4 weeks
                    </p>
                  ) : (
                    <WeeklyTrendChart data={insights.weeklyTrend} />
                  )}
                </CardContent>
              </Card>

              {/* Risk Subjects */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    <AlertTriangle className="mr-2 inline h-4 w-4 text-red-500" />
                    Risk Subjects (Below 75%)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {insights.riskSubjects.length === 0 ? (
                    <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-500/5 p-4">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <p className="text-sm text-green-700">
                        All subjects are above the 75% target. Great job!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {insights.riskSubjects.map((subject) => (
                        <RiskSubjectCard
                          key={subject.id}
                          subject={subject}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Summary Stats */}
              <div className="grid gap-4 sm:grid-cols-3">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold">{insights.subjectCount}</p>
                    <p className="text-sm text-muted-foreground">
                      Total Subjects
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-green-600">
                      {insights.subjectCount - insights.riskSubjects.length}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      On Track
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-red-600">
                      {insights.riskSubjects.length}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      At Risk
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
