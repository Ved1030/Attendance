import { createClient } from "@/lib/supabase/client";
import type { ApiResponse } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

export type ServerProcessingStatus = "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface ProcessingJobStatus {
  id: string;
  status: ServerProcessingStatus;
  progress: number;
  currentStep: string | null;
  error: string | null;
  fileType: string;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

async function getAuthToken(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export async function startProcessing(
  fileId: string,
  fileType: string,
  storagePath: string,
): Promise<ApiResponse<{ jobId: string }>> {
  const token = await getAuthToken();
  if (!token) {
    return { success: false, message: "Authentication required" };
  }

  try {
    const response = await fetch(`${API_URL}/api/v1/uploads/process`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ fileId, fileType, storagePath }),
    });

    const data = (await response.json()) as ApiResponse<{ jobId: string }>;
    return data;
  } catch {
    return { success: false, message: "Failed to start processing. Is the server running?" };
  }
}

export async function getProcessingStatus(
  jobId: string,
): Promise<ApiResponse<ProcessingJobStatus>> {
  const token = await getAuthToken();
  if (!token) {
    return { success: false, message: "Authentication required" };
  }

  try {
    const response = await fetch(`${API_URL}/api/v1/uploads/status/${jobId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = (await response.json()) as ApiResponse<ProcessingJobStatus>;
    return data;
  } catch {
    return { success: false, message: "Failed to fetch processing status" };
  }
}

export function pollProcessingStatus(
  jobId: string,
  onStatus: (status: ProcessingJobStatus) => void,
  intervalMs = 1500,
): () => void {
  let active = true;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const poll = async () => {
    if (!active) return;

    const result = await getProcessingStatus(jobId);
    if (!active) return;

    if (result.success && result.data) {
      onStatus(result.data);

      if (result.data.status === "COMPLETED" || result.data.status === "FAILED") {
        return;
      }
    }

    timer = setTimeout(poll, intervalMs);
  };

  poll();

  return () => {
    active = false;
    if (timer) clearTimeout(timer);
  };
}
