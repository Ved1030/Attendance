"use client";

import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileImage, FileText, X, Loader2 } from "lucide-react";

import { useSetup } from "./setup-provider";
import { Button } from "@/components/ui/button";
import type { TimetableSubject, TimetableEntry } from "@/types";
import { DAY_SHORT } from "@/types";

const ACCEPTED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "application/pdf",
];

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

interface ExtractedData {
  subjects: TimetableSubject[];
  timetable: TimetableEntry[];
}

export function StepTimetableUpload() {
  const { nextStep, setSubjects, setTimetable } = useSetup();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((selected: File) => {
    setError(null);

    if (!ACCEPTED_TYPES.includes(selected.type)) {
      setError("Please upload a PNG, JPG, JPEG, or PDF file.");
      return;
    }

    if (selected.size > MAX_SIZE) {
      setError("File size must be less than 10MB.");
      return;
    }

    setFile(selected);

    if (selected.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(selected);
    } else {
      setPreview("pdf");
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const dropped = e.dataTransfer.files[0];
      if (dropped) handleFile(dropped);
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleExtract = useCallback(async () => {
    if (!file) return;

    setIsExtracting(true);
    setError(null);

    try {
      if (file.type.startsWith("image/")) {
        const extracted = await extractFromImage(file);
        setExtractedData(extracted);
      } else {
        setExtractedData({
          subjects: [],
          timetable: [],
        });
      }
    } catch {
      setError("Failed to extract data. You can enter the information manually.");
      setExtractedData({ subjects: [], timetable: [] });
    } finally {
      setIsExtracting(false);
    }
  }, [file]);

  const handleUseExtracted = useCallback(() => {
    if (extractedData) {
      setSubjects(extractedData.subjects);
      setTimetable(extractedData.timetable);
      nextStep();
    }
  }, [extractedData, setSubjects, setTimetable, nextStep]);

  const handleManualEntry = useCallback(() => {
    setSubjects([]);
    setTimetable([]);
    nextStep();
  }, [setSubjects, setTimetable, nextStep]);

  const removeFile = useCallback(() => {
    setFile(null);
    setPreview(null);
    setExtractedData(null);
    setError(null);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h2 className="text-xl font-bold tracking-tight">Upload Timetable</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a photo or PDF of your class timetable. We&apos;ll try to
          extract the data automatically.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {!file ? (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className="flex cursor-pointer flex-col items-center gap-4 rounded-xl border-2 border-dashed border-muted-foreground/25 p-12 transition-colors hover:border-primary/50 hover:bg-muted/30"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <Upload className="h-7 w-7 text-primary" />
              </div>
              <div className="text-center">
                <p className="font-medium">Drag and drop your timetable</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Supports PNG, JPG, JPEG, and PDF (max 10MB)
                </p>
              </div>
              <Button variant="outline" size="sm">
                Browse Files
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES.join(",")}
              className="hidden"
              onChange={(e) => {
                const selected = e.target.files?.[0];
                if (selected) handleFile(selected);
              }}
            />
          </motion.div>
        ) : (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="relative rounded-xl border bg-card p-4">
              <button
                onClick={removeFile}
                className="absolute right-3 top-3 rounded-full bg-muted p-1 hover:bg-muted/80"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex items-start gap-4">
                {preview && preview !== "pdf" ? (
                  <img
                    src={preview}
                    alt="Timetable preview"
                    className="h-32 rounded-lg object-contain"
                  />
                ) : (
                  <div className="flex h-32 w-24 items-center justify-center rounded-lg bg-muted">
                    {file.type === "application/pdf" ? (
                      <FileText className="h-8 w-8 text-muted-foreground" />
                    ) : (
                      <FileImage className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
            </div>

            {!extractedData && (
              <div className="flex flex-col gap-3">
                <Button
                  onClick={handleExtract}
                  disabled={isExtracting}
                  className="w-full"
                >
                  {isExtracting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Extracting data...
                    </>
                  ) : (
                    "Auto-Extract Data"
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleManualEntry}
                  className="w-full"
                >
                  Enter Manually Instead
                </Button>
              </div>
            )}

            {extractedData && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-sm font-medium">
                    Found {extractedData.subjects.length} subjects and{" "}
                    {extractedData.timetable.length} timetable entries
                  </p>
                  {extractedData.subjects.length === 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      No data was automatically extracted. You can enter it
                      manually in the next step.
                    </p>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button onClick={handleUseExtracted} className="flex-1">
                    Review & Edit
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleManualEntry}
                    className="flex-1"
                  >
                    Enter Manually
                  </Button>
                </div>
              </motion.div>
            )}

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

async function extractFromImage(
  _file: File,
): Promise<ExtractedData> {
  return {
    subjects: [],
    timetable: [],
  };
}
