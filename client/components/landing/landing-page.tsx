"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Calendar,
  BookOpen,
  BarChart3,
  CheckCircle2,
  ArrowRight,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { AuthLogo } from "@/components/auth/auth-logo";

const features = [
  {
    icon: Upload,
    title: "Smart Timetable Upload",
    description:
      "Upload a photo or PDF of your timetable. Our AI extracts subjects, timings, and room numbers automatically.",
  },
  {
    icon: Calendar,
    title: "Academic Calendar",
    description:
      "Track holidays, exams, and college events so you never miss an important date.",
  },
  {
    icon: CheckCircle2,
    title: "Easy Attendance Marking",
    description:
      "Mark your daily attendance in seconds with a clean, intuitive interface.",
  },
  {
    icon: BarChart3,
    title: "Insightful Analytics",
    description:
      "Visualize your attendance trends, identify risk subjects, and stay on top of your goals.",
  },
];

const steps = [
  "Sign up for free",
  "Upload your timetable",
  "Start tracking attendance",
];

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <AuthLogo size="sm" />
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-6 py-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Never Lose Track of
              <br />
              <span className="text-primary">Your Attendance</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              Attendance Pro uses AI to automatically parse your timetable and
              track your attendance. Stay informed, stay ahead.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          >
            <Link href="/signup">
              <Button size="lg" className="px-8">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg" className="px-8">
                Sign In
              </Button>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground"
          >
            {steps.map((step, i) => (
              <div key={step} className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                  {i + 1}
                </span>
                {step}
              </div>
            ))}
          </motion.div>
        </section>

        <section className="border-t bg-muted/30 px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-12 text-center"
            >
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Everything You Need
              </h2>
              <p className="mt-3 text-muted-foreground">
                Powerful features to keep your attendance on track
              </p>
            </motion.div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="rounded-xl border bg-card p-6"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Ready to Take Control?
              </h2>
              <p className="mt-3 text-muted-foreground">
                Join students who are already using Attendance Pro to stay on
                top of their attendance.
              </p>
              <Link href="/signup" className="mt-8 inline-block">
                <Button size="lg" className="px-8">
                  Start Tracking Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </motion.div>
          </div>
        </section>
      </main>

      <footer className="border-t px-6 py-6">
        <p className="text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Attendance Pro. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
