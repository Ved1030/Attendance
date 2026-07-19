"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, CheckCircle2 } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { AuthLogo } from "@/components/auth/auth-logo";
import { Button } from "@/components/ui/button";
import { SetupProvider, useSetup } from "./components/setup-provider";
import { SetupProgress } from "./components/setup-progress";
import { FileUploadCard } from "./components/file-upload-card";

function SetupPageContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return <SetupWizard />;
}

function SetupWizard() {
  const {
    timetableDisplayStatus,
    calendarDisplayStatus,
    timetableProcessingProgress,
    calendarProcessingProgress,
    timetableProcessingStep,
    calendarProcessingStep,
    timetableState,
    calendarState,
    canContinue,
    isSubmitting,
    uploadTimetable,
    uploadCalendar,
    removeTimetable,
    removeCalendar,
    completeSetup,
  } = useSetup();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b px-6 py-4">
        <AuthLogo size="sm" />
      </header>

      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          <SetupProgress currentStep={0} />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8 text-center"
          >
            <h1 className="text-2xl font-bold tracking-tight">
              Set Up Your Schedule
            </h1>
            <p className="mt-2 text-muted-foreground">
              Upload your timetable and academic calendar. Our AI will
              automatically extract all the data.
            </p>
          </motion.div>

          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <FileUploadCard
                title="Timetable"
                description="Upload a photo or PDF of your class timetable."
                status={timetableDisplayStatus}
                progress={timetableState.uploadProgress}
                processingProgress={timetableProcessingProgress}
                processingStep={timetableProcessingStep}
                fileName={timetableState.fileName}
                error={timetableState.error}
                onUpload={uploadTimetable}
                onRemove={removeTimetable}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <FileUploadCard
                title="Academic Calendar"
                description="Upload your academic calendar with holidays, exams, and events."
                status={calendarDisplayStatus}
                progress={calendarState.uploadProgress}
                processingProgress={calendarProcessingProgress}
                processingStep={calendarProcessingStep}
                fileName={calendarState.fileName}
                error={calendarState.error}
                onUpload={uploadCalendar}
                onRemove={removeCalendar}
              />
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8"
          >
            {canContinue ? (
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  Both files processed successfully!
                </div>
                <Button
                  size="lg"
                  onClick={completeSetup}
                  disabled={isSubmitting}
                  className="w-full"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Redirecting to dashboard...
                    </>
                  ) : (
                    <>
                      Continue to Dashboard
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <Button
                size="lg"
                onClick={completeSetup}
                disabled={!canContinue}
                className="w-full"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Completing setup...
                  </>
                ) : (
                  "Continue to Dashboard"
                )}
              </Button>
            )}
          </motion.div>
        </div>
      </main>

      <footer className="border-t px-6 py-4">
        <p className="text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Attendance Pro. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

export default function SetupPage() {
  return (
    <SetupProvider>
      <SetupPageContent />
    </SetupProvider>
  );
}
