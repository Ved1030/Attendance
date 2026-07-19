"use client";

import { motion } from "framer-motion";
import { Calendar, BookOpen, Upload } from "lucide-react";

import { useSetup } from "./setup-provider";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Upload,
    title: "Upload Your Timetable",
    description:
      "Upload a photo or PDF of your class timetable. We'll extract subjects, lecture timings, and more.",
  },
  {
    icon: Calendar,
    title: "Upload Academic Calendar",
    description:
      "Add holidays, exams, and college events so you always know what's coming up.",
  },
  {
    icon: BookOpen,
    title: "Start Tracking",
    description:
      "Once set up, you can mark attendance, view analytics, and stay on top of your schedule.",
  },
];

export function StepWelcome() {
  const { nextStep } = useSetup();

  return (
    <div className="flex flex-col items-center gap-8 text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10"
      >
        <Upload className="h-8 w-8 text-primary" />
      </motion.div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">
          Set Up Your Schedule
        </h1>
        <p className="text-muted-foreground">
          Upload your timetable and academic calendar to get the most out of
          Attendance Pro.
        </p>
      </div>

      <div className="grid gap-4 text-left sm:grid-cols-3">
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * index }}
            className="rounded-lg border p-4"
          >
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <feature.icon className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-medium">{feature.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {feature.description}
            </p>
          </motion.div>
        ))}
      </div>

      <Button size="lg" onClick={nextStep} className="px-8">
        Get Started
      </Button>
    </div>
  );
}
