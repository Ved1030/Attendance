"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";

import { useSetup } from "./setup-provider";
import { Button } from "@/components/ui/button";
import { FileUploadCard } from "./file-upload-card";

export function StepCalendarUpload() {
  const {
    nextStep,
    prevStep,
    calendarDisplayStatus,
    calendarProcessingProgress,
    calendarProcessingStep,
    calendarState,
    uploadCalendar,
    removeCalendar,
  } = useSetup();

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h2 className="text-xl font-bold tracking-tight">
          Upload Academic Calendar
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload your academic calendar with holidays, exams, and college
          events so you never miss an important date.
        </p>
      </div>

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

      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" onClick={prevStep}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={nextStep}
          disabled={calendarDisplayStatus !== "completed" && calendarDisplayStatus !== "idle"}
        >
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
