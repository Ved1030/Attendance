"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import filesApi, { type UploadFileResult } from "@/lib/api/files";
import {
  startProcessing,
  pollProcessingStatus,
  type ProcessingJobStatus,
} from "@/lib/api/processing";
import { FILE_TYPE, type FileTypeValue } from "@/lib/file-types";
import { useAuth } from "@/lib/auth-context";

type UploadStatus = "idle" | "uploading" | "success" | "error";

type FileState = {
  uploadStatus: UploadStatus;
  uploadProgress: number;
  processingJobId: string | null;
  processingStatus: ProcessingJobStatus | null;
  fileName: string | null;
  error: string | null;
  result: UploadFileResult | null;
};

type DisplayStatus = "idle" | "uploading" | "success" | "processing" | "completed" | "error";

interface SetupContextValue {
  timetableState: FileState;
  calendarState: FileState;
  timetableDisplayStatus: DisplayStatus;
  calendarDisplayStatus: DisplayStatus;
  timetableProcessingProgress: number;
  calendarProcessingProgress: number;
  timetableProcessingStep: string | null;
  calendarProcessingStep: string | null;
  isSubmitting: boolean;
  canContinue: boolean;
  uploadTimetable: (file: File) => Promise<void>;
  uploadCalendar: (file: File) => Promise<void>;
  removeTimetable: () => Promise<void>;
  removeCalendar: () => Promise<void>;
  completeSetup: () => Promise<void>;
}

const INITIAL_FILE_STATE: FileState = {
  uploadStatus: "idle",
  uploadProgress: 0,
  processingJobId: null,
  processingStatus: null,
  fileName: null,
  error: null,
  result: null,
};

const SetupContext = createContext<SetupContextValue | null>(null);

function getDisplayStatus(state: FileState): DisplayStatus {
  if (state.error && state.uploadStatus !== "success") return "error";
  if (state.uploadStatus === "uploading") return "uploading";
  if (state.processingStatus?.status === "FAILED") return "error";
  if (state.processingStatus?.status === "COMPLETED") return "completed";
  if (state.processingStatus?.status === "PROCESSING" || state.processingStatus?.status === "QUEUED") return "processing";
  if (state.uploadStatus === "success" && !state.processingJobId) return "success";
  return "idle";
}

export function SetupProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { refreshProfile } = useAuth();
  const [timetableState, setTimetableState] = useState<FileState>(INITIAL_FILE_STATE);
  const [calendarState, setCalendarState] = useState<FileState>(INITIAL_FILE_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pollCleanupRef = useRef<Map<string, () => void>>(new Map());

  useEffect(() => {
    return () => {
      for (const cleanup of pollCleanupRef.current.values()) {
        cleanup();
      }
    };
  }, []);

  const startPolling = useCallback(
    (jobId: string, fileType: FileTypeValue) => {
      const cleanup = pollProcessingStatus(jobId, (status) => {
        const setter = fileType === FILE_TYPE.TIMETABLE ? setTimetableState : setCalendarState;
        setter((prev) => ({ ...prev, processingStatus: status }));

        if (status.status === "COMPLETED") {
          toast.success(
            fileType === FILE_TYPE.TIMETABLE ? "Timetable processed" : "Calendar processed",
            { description: "AI extraction completed successfully." },
          );
          pollCleanupRef.current.get(jobId)?.();
          pollCleanupRef.current.delete(jobId);
        } else if (status.status === "FAILED") {
          toast.error(
            fileType === FILE_TYPE.TIMETABLE ? "Timetable processing failed" : "Calendar processing failed",
            { description: status.error ?? "Unknown error occurred." },
          );
          pollCleanupRef.current.get(jobId)?.();
          pollCleanupRef.current.delete(jobId);
        }
      });

      pollCleanupRef.current.set(jobId, cleanup);
    },
    [],
  );

  const triggerProcessing = useCallback(
    async (fileId: string, fileType: FileTypeValue, storagePath: string, fileName: string) => {
      const setter = fileType === FILE_TYPE.TIMETABLE ? setTimetableState : setCalendarState;
      setter((prev) => ({
        ...prev,
        processingStatus: {
          id: "",
          status: "QUEUED",
          progress: 0,
          currentStep: "Queued for processing...",
          error: null,
          fileType,
          createdAt: new Date().toISOString(),
          startedAt: null,
          completedAt: null,
        },
      }));

      const result = await startProcessing(fileId, fileType, storagePath);

      if (result.success && result.data) {
        setter((prev) => ({
          ...prev,
          processingJobId: result.data!.jobId,
        }));
        startPolling(result.data.jobId, fileType);
      } else {
        setter((prev) => ({
          ...prev,
          processingStatus: {
            id: "",
            status: "FAILED",
            progress: 0,
            currentStep: null,
            error: result.message,
            fileType,
            createdAt: new Date().toISOString(),
            startedAt: null,
            completedAt: null,
          },
        }));
        toast.error("Processing failed", { description: result.message });
      }
    },
    [startPolling],
  );

  const uploadTimetable = useCallback(async (file: File) => {
    const validationError = filesApi.validateFile(file);
    if (validationError) {
      toast.error("Invalid file", { description: validationError });
      setTimetableState((prev) => ({
        ...prev,
        uploadStatus: "error",
        error: validationError,
      }));
      return;
    }

    setTimetableState({
      ...INITIAL_FILE_STATE,
      uploadStatus: "uploading",
      fileName: file.name,
    });

    const result = await filesApi.uploadFile(file, FILE_TYPE.TIMETABLE, (progress) => {
      setTimetableState((prev) => ({ ...prev, uploadProgress: progress }));
    });

    if (result.success && result.data) {
      setTimetableState((prev) => ({
        ...prev,
        uploadStatus: "success",
        uploadProgress: 100,
        result: result.data!,
      }));
      toast.success("Timetable uploaded", {
        description: `${file.name} uploaded. Starting AI processing...`,
      });

      await triggerProcessing(
        result.data.record.id,
        FILE_TYPE.TIMETABLE,
        result.data.storagePath,
        file.name,
      );
    } else {
      setTimetableState((prev) => ({
        ...prev,
        uploadStatus: "error",
        error: result.message,
      }));
      toast.error("Upload failed", { description: result.message });
    }
  }, [triggerProcessing]);

  const uploadCalendar = useCallback(async (file: File) => {
    const validationError = filesApi.validateFile(file);
    if (validationError) {
      toast.error("Invalid file", { description: validationError });
      setCalendarState((prev) => ({
        ...prev,
        uploadStatus: "error",
        error: validationError,
      }));
      return;
    }

    setCalendarState({
      ...INITIAL_FILE_STATE,
      uploadStatus: "uploading",
      fileName: file.name,
    });

    const result = await filesApi.uploadFile(file, FILE_TYPE.ACADEMIC_CALENDAR, (progress) => {
      setCalendarState((prev) => ({ ...prev, uploadProgress: progress }));
    });

    if (result.success && result.data) {
      setCalendarState((prev) => ({
        ...prev,
        uploadStatus: "success",
        uploadProgress: 100,
        result: result.data!,
      }));
      toast.success("Calendar uploaded", {
        description: `${file.name} uploaded. Starting AI processing...`,
      });

      await triggerProcessing(
        result.data.record.id,
        FILE_TYPE.ACADEMIC_CALENDAR,
        result.data.storagePath,
        file.name,
      );
    } else {
      setCalendarState((prev) => ({
        ...prev,
        uploadStatus: "error",
        error: result.message,
      }));
      toast.error("Upload failed", { description: result.message });
    }
  }, [triggerProcessing]);

  const removeTimetable = useCallback(async () => {
    if (timetableState.result) {
      await filesApi.removeUploadedFile(FILE_TYPE.TIMETABLE);
    }
    if (timetableState.processingJobId) {
      pollCleanupRef.current.get(timetableState.processingJobId)?.();
      pollCleanupRef.current.delete(timetableState.processingJobId);
    }
    setTimetableState(INITIAL_FILE_STATE);
  }, [timetableState]);

  const removeCalendar = useCallback(async () => {
    if (calendarState.result) {
      await filesApi.removeUploadedFile(FILE_TYPE.ACADEMIC_CALENDAR);
    }
    if (calendarState.processingJobId) {
      pollCleanupRef.current.get(calendarState.processingJobId)?.();
      pollCleanupRef.current.delete(calendarState.processingJobId);
    }
    setCalendarState(INITIAL_FILE_STATE);
  }, [calendarState]);

  const completeSetup = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const result = await filesApi.markSetupCompleted();
      if (result.success) {
        await refreshProfile();
        toast.success("Setup complete!", {
          description: "Welcome to Attendance Pro!",
        });
        router.push("/dashboard");
      } else {
        toast.error("Setup failed", { description: result.message });
      }
    } catch {
      toast.error("Something went wrong", { description: "Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  }, [refreshProfile, router]);

  const timetableDisplayStatus = getDisplayStatus(timetableState);
  const calendarDisplayStatus = getDisplayStatus(calendarState);

  const timetableProcessingProgress = timetableState.processingStatus?.progress ?? 0;
  const calendarProcessingProgress = calendarState.processingStatus?.progress ?? 0;
  const timetableProcessingStep = timetableState.processingStatus?.currentStep ?? null;
  const calendarProcessingStep = calendarState.processingStatus?.currentStep ?? null;

  const bothCompleted = timetableDisplayStatus === "completed" && calendarDisplayStatus === "completed";
  const anyFailed = timetableDisplayStatus === "error" || calendarDisplayStatus === "error";

  useEffect(() => {
    if (bothCompleted && !isSubmitting) {
      const timer = setTimeout(() => {
        completeSetup();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [bothCompleted, isSubmitting, completeSetup]);

  const canContinue = bothCompleted && !isSubmitting;

  const value = useMemo<SetupContextValue>(
    () => ({
      timetableState,
      calendarState,
      timetableDisplayStatus,
      calendarDisplayStatus,
      timetableProcessingProgress,
      calendarProcessingProgress,
      timetableProcessingStep,
      calendarProcessingStep,
      isSubmitting,
      canContinue,
      uploadTimetable,
      uploadCalendar,
      removeTimetable,
      removeCalendar,
      completeSetup,
    }),
    [
      timetableState,
      calendarState,
      timetableDisplayStatus,
      calendarDisplayStatus,
      timetableProcessingProgress,
      calendarProcessingProgress,
      timetableProcessingStep,
      calendarProcessingStep,
      isSubmitting,
      canContinue,
      uploadTimetable,
      uploadCalendar,
      removeTimetable,
      removeCalendar,
      completeSetup,
    ],
  );

  return (
    <SetupContext.Provider value={value}>{children}</SetupContext.Provider>
  );
}

export function useSetup(): SetupContextValue {
  const context = useContext(SetupContext);
  if (!context) {
    throw new Error("useSetup must be used within a SetupProvider");
  }
  return context;
}
