"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";

import { useSetup } from "./setup-provider";
import { Button } from "@/components/ui/button";
import { FileUploadCard } from "./file-upload-card";

export function StepTimetableUpload() {
  const {
    nextStep,
    prevStep,
    timetableDisplayStatus,
    timetableProcessingProgress,
    timetableProcessingStep,
    timetableState,
    uploadTimetable,
    removeTimetable,
  } = useSetup();

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h2 className="text-xl font-bold tracking-tight">Upload Timetable</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a photo or PDF of your class timetable. Our AI will
          automatically extract subjects, timings, and room numbers.
        </p>
      </div>

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

      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" onClick={prevStep}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={nextStep}
          disabled={timetableDisplayStatus !== "completed" && timetableDisplayStatus !== "idle"}
        >
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
