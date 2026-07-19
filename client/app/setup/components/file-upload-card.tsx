"use client";

import { useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Brain,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ACCEPTED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
];

export type UploadCardStatus =
  | "idle"
  | "uploading"
  | "success"
  | "processing"
  | "completed"
  | "error";

interface FileUploadCardProps {
  title: string;
  description: string;
  status: UploadCardStatus;
  progress: number;
  processingProgress: number;
  processingStep: string | null;
  fileName: string | null;
  error: string | null;
  onUpload: (file: File) => void;
  onRemove: () => void;
}

export function FileUploadCard({
  title,
  description,
  status,
  progress,
  processingProgress,
  processingStep,
  fileName,
  error,
  onUpload,
  onRemove,
}: FileUploadCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (selected: File) => {
      onUpload(selected);
    },
    [onUpload],
  );

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

  const borderColor = (() => {
    switch (status) {
      case "completed":
        return "border-green-500/30 bg-green-500/5";
      case "processing":
        return "border-blue-500/30 bg-blue-500/5";
      case "error":
        return "border-destructive/30 bg-destructive/5";
      default:
        return "border-muted-foreground/15";
    }
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("rounded-xl border-2 p-6 transition-colors", borderColor)}
    >
      <div className="mb-4">
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      <AnimatePresence mode="wait">
        {status === "idle" && (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className="flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/20 p-8 transition-colors hover:border-primary/40 hover:bg-muted/30"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Upload className="h-6 w-6 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">
                  Drag &amp; drop your file here
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  or click to browse
                </p>
              </div>
              <Button variant="outline" size="sm" type="button">
                Browse Files
              </Button>
              <p className="text-[11px] text-muted-foreground">
                PDF, PNG, JPG, JPEG &middot; Max 10 MB
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES.join(",")}
              className="hidden"
              onChange={(e) => {
                const selected = e.target.files?.[0];
                if (selected) handleFile(selected);
                e.target.value = "";
              }}
            />
          </motion.div>
        )}

        {status === "uploading" && (
          <motion.div
            key="uploading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{fileName}</p>
                <p className="text-xs text-muted-foreground">Uploading...</p>
              </div>
              <span className="text-xs font-medium text-primary">
                {progress}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
                className="h-full rounded-full bg-primary"
              />
            </div>
          </motion.div>
        )}

        {status === "success" && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-3 rounded-lg border border-green-500/20 bg-green-500/5 p-4">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{fileName}</p>
                <p className="text-xs text-green-600">
                  Uploaded successfully
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={onRemove}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {status === "processing" && (
          <motion.div
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-3 rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
              <Brain className="h-5 w-5 animate-pulse text-blue-500" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{fileName}</p>
                <p className="text-xs text-blue-600">
                  {processingStep ?? "Processing..."}
                </p>
              </div>
              <span className="text-xs font-medium text-blue-500">
                {processingProgress}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${processingProgress}%` }}
                transition={{ duration: 0.5 }}
                className="h-full rounded-full bg-blue-500"
              />
            </div>
          </motion.div>
        )}

        {status === "completed" && (
          <motion.div
            key="completed"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-3 rounded-lg border border-green-500/20 bg-green-500/5 p-4">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{fileName}</p>
                <p className="text-xs text-green-600">
                  AI extraction complete
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={onRemove}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {status === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{fileName}</p>
                <p className="text-xs text-destructive">{error}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={onRemove}
              className="w-full"
            >
              Try Again
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
