"use client";

import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuthErrorCardProps {
  title?: string;
  message: string;
  reasons?: string[];
  className?: string;
}

export function AuthErrorCard({
  title = "Something went wrong",
  message,
  reasons,
  className,
}: AuthErrorCardProps) {
  return (
    <motion.div
      role="alert"
      aria-live="polite"
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "rounded-xl border border-destructive/20 bg-destructive/5 p-4",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
          <AlertTriangle className="h-4.5 w-4.5 text-destructive" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-destructive">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{message}</p>
          {reasons && reasons.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {reasons.map((reason, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-destructive/50" />
                  {reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </motion.div>
  );
}
