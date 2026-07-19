import { createClient } from "@/lib/supabase/client";
import {
  FILE_TYPE,
  type FileTypeValue,
  toStorageSegment,
  toProfileField,
} from "@/lib/file-types";
import type { ApiResponse } from "@/types";

export interface UploadedFileRecord {
  id: string;
  user_id: string;
  file_type: FileTypeValue;
  file_name: string;
  storage_path: string;
  mime_type: string;
  file_size: number;
  upload_status: string;
}

export interface UploadFileResult {
  record: UploadedFileRecord;
  storagePath: string;
}

const ACCEPTED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
];

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export function validateFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return "Unsupported file type. Please upload a PDF, PNG, JPG, or JPEG file.";
  }
  if (file.size > MAX_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return `File is too large (${sizeMB} MB). Maximum size is 10 MB.`;
  }
  return null;
}

function buildStoragePath(
  userId: string,
  fileType: FileTypeValue,
  fileName: string,
): string {
  const timestamp = Date.now();
  const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${userId}/${toStorageSegment(fileType)}/${timestamp}-${sanitized}`;
}

async function deleteExistingFile(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  fileType: FileTypeValue,
): Promise<void> {
  const { data: existing } = await supabase
    .from("uploaded_files")
    .select("storage_path")
    .eq("user_id", userId)
    .eq("file_type", fileType)
    .eq("upload_status", "COMPLETED")
    .order("created_at", { ascending: false });

  if (existing && existing.length > 0) {
    for (const row of existing) {
      await supabase.storage.from("attendance-files").remove([row.storage_path]);
    }

    await supabase
      .from("uploaded_files")
      .update({ upload_status: "REPLACED" })
      .eq("user_id", userId)
      .eq("file_type", fileType)
      .eq("upload_status", "COMPLETED");
  }
}

export async function uploadFile(
  file: File,
  fileType: FileTypeValue,
  onProgress?: (progress: number) => void,
): Promise<ApiResponse<UploadFileResult>> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "You must be logged in to upload files." };
  }

  const validationError = validateFile(file);
  if (validationError) {
    return { success: false, message: validationError };
  }

  try {
    onProgress?.(10);
    await deleteExistingFile(supabase, user.id, fileType);
    onProgress?.(30);

    const storagePath = buildStoragePath(user.id, fileType, file.name);

    const { error: uploadError } = await supabase.storage
      .from("attendance-files")
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      if (uploadError.message?.includes("Duplicate")) {
        return {
          success: false,
          message: "A file with this name was already uploaded. Please rename and try again.",
        };
      }
      return {
        success: false,
        message: `Upload failed: ${uploadError.message}`,
      };
    }

    onProgress?.(70);

    const { error: dbError } = await supabase.from("uploaded_files").insert({
      user_id: user.id,
      file_type: fileType,
      file_name: file.name,
      storage_path: storagePath,
      mime_type: file.type,
      file_size: file.size,
      upload_status: "COMPLETED",
    });

    if (dbError) {
      return {
        success: false,
        message: `File uploaded but failed to save record: ${dbError.message}`,
      };
    }

    onProgress?.(90);

    const profileField = toProfileField(fileType);

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ [profileField]: true })
      .eq("id", user.id);

    if (profileError) {
      return {
        success: false,
        message: `File uploaded but failed to update profile: ${profileError.message}`,
      };
    }

    onProgress?.(100);

    const { data: record } = await supabase
      .from("uploaded_files")
      .select("*")
      .eq("storage_path", storagePath)
      .single();

    return {
      success: true,
      message: "File uploaded successfully.",
      data: {
        record: record as UploadedFileRecord,
        storagePath,
      },
    };
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("fetch")) {
      return {
        success: false,
        message: "Network error. Please check your connection and try again.",
      };
    }
    return {
      success: false,
      message: "An unexpected error occurred during upload. Please try again.",
    };
  }
}

export async function markSetupCompleted(): Promise<ApiResponse> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "You must be logged in." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ setup_completed: true })
    .eq("id", user.id);

  if (error) {
    return {
      success: false,
      message: `Failed to complete setup: ${error.message}`,
    };
  }

  return { success: true, message: "Setup completed successfully." };
}

export async function removeUploadedFile(
  fileType: FileTypeValue,
): Promise<ApiResponse> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "You must be logged in." };
  }

  const { data: existing } = await supabase
    .from("uploaded_files")
    .select("storage_path")
    .eq("user_id", user.id)
    .eq("file_type", fileType)
    .eq("upload_status", "COMPLETED")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (existing) {
    await supabase.storage.from("attendance-files").remove([existing.storage_path]);
  }

  await supabase
    .from("uploaded_files")
    .update({ upload_status: "REMOVED" })
    .eq("user_id", user.id)
    .eq("file_type", fileType)
    .eq("upload_status", "COMPLETED");

  const profileField = toProfileField(fileType);

  await supabase
    .from("profiles")
    .update({ [profileField]: false })
    .eq("id", user.id);

  return { success: true, message: "File removed." };
}

const filesApi = {
  uploadFile,
  removeUploadedFile,
  markSetupCompleted,
  validateFile,
};

export default filesApi;
