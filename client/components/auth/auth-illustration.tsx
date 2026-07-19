"use client";

import { motion } from "framer-motion";
import {
  CalendarCheck,
  Users,
  BarChart3,
  Bell,
  Clock,
  BookOpen,
} from "lucide-react";

const floatingIcons = [
  { Icon: CalendarCheck, x: "15%", y: "20%", delay: 0, size: 32 },
  { Icon: Users, x: "75%", y: "15%", delay: 0.2, size: 28 },
  { Icon: BarChart3, x: "60%", y: "65%", delay: 0.4, size: 30 },
  { Icon: Bell, x: "25%", y: "70%", delay: 0.6, size: 24 },
  { Icon: Clock, x: "80%", y: "45%", delay: 0.8, size: 26 },
  { Icon: BookOpen, x: "10%", y: "48%", delay: 1.0, size: 28 },
];

export function AuthIllustration() {
  return (
    <div className="relative flex h-full items-center justify-center overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent" />

      {/* Animated grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]">
        <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern
              id="grid"
              width="32"
              height="32"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 32 0 L 0 0 0 32"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Floating icons */}
      {floatingIcons.map(({ Icon, x, y, delay, size }, i) => (
        <motion.div
          key={i}
          className="absolute text-primary/40"
          style={{ left: x, top: y }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: delay + 0.3, duration: 0.5 }}
        >
          <motion.div
            animate={{ y: [-4, 4, -4] }}
            transition={{
              duration: 3 + i * 0.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <Icon size={size} />
          </motion.div>
        </motion.div>
      ))}

      {/* Central hero element */}
      <motion.div
        className="relative z-10 flex flex-col items-center gap-4 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
      >
        <motion.div
          className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20"
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        >
          <CalendarCheck className="h-10 w-10 text-primary" />
        </motion.div>
        <div>
          <h2 className="text-xl font-bold tracking-tight">
            Smart Attendance
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Track, manage, and optimize your attendance
          </p>
        </div>
      </motion.div>

      {/* Decorative circles */}
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/5" />
      <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-primary/5" />
    </div>
  );
}
