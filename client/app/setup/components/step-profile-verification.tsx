"use client";

import { motion } from "framer-motion";
import {
  GraduationCap,
  Building2,
  CalendarDays,
  Users,
  Target,
  ArrowRight,
} from "lucide-react";

import { useSetup } from "./setup-provider";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

export function StepProfileVerification() {
  const { nextStep } = useSetup();
  const { user } = useAuth();

  const profile = user?.user_metadata;

  const college =
    profile?.college_name || profile?.college || "Not set";
  const department =
    profile?.department_name || profile?.department || "Not set";
  const semester = profile?.semester
    ? `Semester ${profile.semester}`
    : "Not set";
  const division = profile?.division_name || profile?.division || "Not set";
  const target = profile?.target_attendance
    ? `${profile.target_attendance}%`
    : "75%";

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h2 className="text-xl font-bold tracking-tight">
          Verify Your Profile
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Confirm your college details before we set up your schedule.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardContent className="space-y-3 p-4">
            <InfoRow
              icon={GraduationCap}
              label="College"
              value={college}
            />
            <InfoRow
              icon={Building2}
              label="Department"
              value={department}
            />
            <InfoRow
              icon={CalendarDays}
              label="Semester"
              value={semester}
            />
            <InfoRow
              icon={Users}
              label="Division"
              value={division}
            />
            <InfoRow
              icon={Target}
              label="Target Attendance"
              value={target}
            />
          </CardContent>
        </Card>
      </motion.div>

      <div className="flex justify-end pt-2">
        <Button onClick={nextStep} className="px-6">
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
