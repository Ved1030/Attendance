"use client";

import { motion } from "framer-motion";
import { CheckCircle2, ArrowRight, Loader2 } from "lucide-react";

import { useSetup } from "./setup-provider";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

export function StepComplete() {
  const { completeSetup, isSubmitting } = useSetup();
  const { user } = useAuth();

  return (
    <div className="flex flex-col items-center gap-8 text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
      >
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10">
          <CheckCircle2 className="h-10 w-10 text-green-500" />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-2"
      >
        <h1 className="text-2xl font-bold tracking-tight">All Set!</h1>
        <p className="text-muted-foreground">
          {user?.user_metadata?.full_name
            ? `Welcome, ${user.user_metadata.full_name}! `
            : "Welcome! "}
          Your timetable and academic calendar have been saved. You&apos;re
          ready to start tracking your attendance.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Button
          size="lg"
          onClick={completeSetup}
          disabled={isSubmitting}
          className="px-8"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Redirecting...
            </>
          ) : (
            <>
              Go to Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </motion.div>
    </div>
  );
}
