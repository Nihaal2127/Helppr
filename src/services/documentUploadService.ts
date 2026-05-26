import { apiRequest } from "../lib/global/remote/apiHelper";
import { ApiPaths } from "../lib/global/remote/apiPaths";
import { AppConstant } from "../lib/global/AppConstant";
import { showLog } from "../helper/utility";

const IMAGE_UPLOAD_DEBUG = true;
const DEBUG_TAG = "[ImageUploadDebug]";

function debugLog(label: string, data?: unknown) {
  if (!IMAGE_UPLOAD_DEBUG) return;
  if (data !== undefined) {
    console.log(DEBUG_TAG, label, data);
  } else {
    console.log(DEBUG_TAG, label);
  }
}

/** Serialize FormData for DevTools (file meta + parsed JSON fields). */
export function serializeFormDataForLog(formData: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (value instanceof File) {
      const meta = {
        name: value.name,
        size: value.size,
        type: value.type,
        lastModified: value.lastModified,
      };
      const prev = out[key];
      if (!prev) out[key] = [meta];
      else if (Array.isArray(prev)) (prev as unknown[]).push(meta);
      else out[key] = [prev, meta];
    } else if (key === "update_file_urls") {
      try {
        out[key] = JSON.parse(String(value));
      } catch {
        out[key] = String(value);
      }
    } else {
      out[key] = String(value);
    }
  }
  return out;
}

/** Not a server storage key — preview-only (must not go in `update_file_urls`). */
export function isNonStorageImageUrl(url: string | null | undefined): boolean {
  const u = String(url ?? "").trim().toLowerCase();
  return u.startsWith("data:") || u.startsWith("blob:");
}

/** Normalize API / stored image paths for `update_file_urls` (relative storage key). */
export function toStorageRelativePath(url: string | null | undefined): string {
  const u = String(url ?? "").trim();
  if (!u || isNonStorageImageUrl(u)) return "";
  const base = AppConstant.IMAGE_BASE_URL.replace(/\/?$/, "/");
  if (u.startsWith(base)) {
    return u.slice(base.length).replace(/^\//, "");
  }
  if (u.startsWith("http://") || u.startsWith("https://")) {
    try {
      return new URL(u).pathname.replace(/^\//, "");
    } catch {
      return u.replace(/^\//, "");
    }
  }
  return u.replace(/^\//, "");
}

/** Paths safe for `update_file_urls` (never base64 / blob previews). */
export function normalizeReplaceStoragePaths(
  urls: (string | null | undefined)[]
): string[] {
  return urls.map((u) => toStorageRelativePath(u)).filter(Boolean);
}

function pathFromUploadRecord(record: unknown): string {
  if (typeof record === "string") return record.trim();
  if (record && typeof record === "object") {
    const row = record as Record<string, unknown>;
    return String(
      row.url ?? row.path ?? row.file_url ?? row.image_url ?? row.key ?? ""
    ).trim();
  }
  return String(record ?? "").trim();
}

/** `POST/PUT /document_upload/*` — supports flat or nested `data.records`. */
export function extractUploadedFilePaths(data: unknown): string[] {
  if (!data || typeof data !== "object") return [];
  const root = data as Record<string, unknown>;
  const inner =
    root.data != null && typeof root.data === "object" && !Array.isArray(root.data)
      ? (root.data as Record<string, unknown>)
      : null;
  const recordsRaw = inner?.records ?? root.records ?? [];
  if (!Array.isArray(recordsRaw)) return [];
  return recordsRaw.map(pathFromUploadRecord).filter(Boolean);
}

export type UploadDocumentImagesParams = {
  /** Document upload `type` (e.g. `"2"` category/service, `"4"` profile). */
  uploadType: string | number;
  files: File[];
  isEditMode: boolean;
  replaceUrls?: string[];
  /** Fallback storage keys when replacing (e.g. existing `profile_url` / `image_url`). */
  existingStoragePaths?: (string | null | undefined)[];
  /**
   * When true (default for `type` `"2"` on edit): `POST` new file only — never `PUT` replace.
   * Avoids reusing the old `image_url` when the API returns `records: []`.
   */
  alwaysPostNewFile?: boolean;
};

export type UploadDocumentImagesResult = {
  ok: boolean;
  paths: string[];
  usedReplace: boolean;
};

/** Shared upload/replace flow (User Information, Category, Service, etc.). */
export async function uploadDocumentImages(
  params: UploadDocumentImagesParams
): Promise<UploadDocumentImagesResult> {
  const {
    uploadType,
    files,
    isEditMode,
    replaceUrls = [],
    existingStoragePaths = [],
    alwaysPostNewFile: alwaysPostNewFileParam,
  } = params;

  /** Category/service catalog images must get a new storage key from `POST`, not in-place `PUT`. */
  const forceNewUpload =
    alwaysPostNewFileParam === true ||
    (isEditMode && String(uploadType) === "2");

  debugLog("uploadDocumentImages — input", {
    uploadType,
    isEditMode,
    forceNewUpload,
    fileCount: files.length,
    files: files.map((f) => ({
      name: f.name,
      size: f.size,
      type: f.type,
    })),
    replaceUrls,
    existingStoragePaths,
    existingStoragePathsNormalized: normalizeReplaceStoragePaths(
      existingStoragePaths
    ),
    replaceUrlsNormalized: normalizeReplaceStoragePaths(replaceUrls),
  });

  if (files.length === 0) {
    debugLog("uploadDocumentImages — skip (no files)");
    return { ok: true, paths: [], usedReplace: false };
  }

  const formData = new FormData();
  formData.append("type", String(uploadType));
  files.forEach((file) => formData.append("files", file));

  const replacePaths =
    isEditMode && !forceNewUpload
      ? normalizeReplaceStoragePaths(
          replaceUrls.length > 0 ? replaceUrls : existingStoragePaths
        )
      : [];
  const usedReplace = replacePaths.length > 0;
  if (usedReplace) {
    formData.append("update_file_urls", JSON.stringify(replacePaths));
  }

  debugLog("uploadDocumentImages — request plan", {
    forceNewUpload,
    usedReplace,
    replacePaths,
    api: usedReplace
      ? "PUT /document_upload/update_files"
      : "POST /document_upload/files",
    formData: serializeFormDataForLog(formData),
  });

  const { response, fileList: rawFileList } = await createOrUpdateDocument(
    formData,
    usedReplace,
    {
      replaceFallbackPaths: replacePaths,
      allowReplaceFallback: !forceNewUpload,
    }
  );

  const fileList = rawFileList
    .map((p) => toStorageRelativePath(p) || p)
    .filter(Boolean);

  debugLog("uploadDocumentImages — result", {
    response,
    rawFileList,
    fileList,
    usedReplace,
    forceNewUpload,
  });

  if (!response || fileList.length === 0) {
    return { ok: false, paths: [], usedReplace };
  }

  return { ok: true, paths: fileList, usedReplace };
}

export function documentUploadFailureMessage(usedReplace: boolean): string {
  return usedReplace
    ? "Image replace failed. Please try again."
    : "Image upload did not return a file path. Please try again.";
}

export const createOrUpdateDocument = async (
  data: FormData,
  isEditable: boolean,
  options?: { replaceFallbackPaths?: string[] }
): Promise<{ fileList: string[]; response: boolean }> => {
  const path = isEditable
    ? ApiPaths.UPDATE_DOCUMENT_UPLOAD
    : ApiPaths.DOCUMENT_UPLOAD;
  const method = isEditable ? "PUT" : "POST";

  debugLog(`createOrUpdateDocument — ${method} ${path}`, {
    formData: serializeFormDataForLog(data),
    replaceFallbackPaths: options?.replaceFallbackPaths,
  });

  const response = await apiRequest(path, method, data, true);
  if (response.success) {
    let fileList = extractUploadedFilePaths(response.data);
    const recordsFromApi = [...fileList];
    const allowReplaceFallback = options?.allowReplaceFallback !== false;
    // PUT replace often returns `records: []` — only reuse old path for profile-style replace.
    if (
      fileList.length === 0 &&
      isEditable &&
      allowReplaceFallback &&
      (options?.replaceFallbackPaths?.length ?? 0) > 0
    ) {
      fileList = options!.replaceFallbackPaths!
        .map((p) => toStorageRelativePath(p))
        .filter(Boolean);
      debugLog("createOrUpdateDocument — empty records, using fallback paths", {
        recordsFromApi,
        fallbackFileList: fileList,
        rawResponseData: response.data,
      });
    } else {
      debugLog("createOrUpdateDocument — success", {
        recordsFromApi,
        fileList,
        rawResponseData: response.data,
      });
    }
    return {
      fileList,
      response: true,
    };
  }
  debugLog("createOrUpdateDocument — failed", {
    message: response.message,
    data: (response as { data?: unknown }).data,
  });
  showLog("Document fail:", response.message || "Unknown error");
  return {
    fileList: [],
    response: false,
  };
};
