"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { GraduationCap } from "lucide-react";

interface AuthLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

const sizeConfig = {
  sm: { icon: 20, text: "text-lg" },
  md: { icon: 24, text: "text-xl" },
  lg: { icon: 32, text: "text-2xl" },
};

export function AuthLogo({ size = "md", showText = true }: AuthLogoProps) {
  const config = sizeConfig[size];

  return (
    <Link href="/" className="inline-flex items-center gap-2.5">
      <motion.div
        className="flex items-center justify-center rounded-xl bg-primary p-2"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <GraduationCap
          className="text-primary-foreground"
          size={config.icon}
        />
      </motion.div>
      {showText && (
        <span className={`font-bold tracking-tight ${config.text}`}>
          Attendance
          <span className="text-muted-foreground font-normal">Pro</span>
        </span>
      )}
    </Link>
  );
}
