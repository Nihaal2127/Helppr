import React, { useState, useEffect, useRef, useMemo } from "react";
import { Button, Col, Form } from "react-bootstrap";
import { AppConstant } from "../constant/AppConstant";
import { showErrorAlert } from "../helper/alertHelper";
import {
  getSupportedImageExtensions,
  getSupportedImageMaxSizeBytes,
  isSupportedImageFile,
} from "../helper/utility";

type ImageUploaderChangeMeta = {
  /** User removed the saved server image (clear `image_url` on update). */
  imageCleared?: boolean;
};

interface CustomImageUploaderProps {
  label: string;
  hint?: string;
  maxFiles?: number;
  isEditable?: boolean;
  existingImages?: string[];
  onFileChange: (
    files: File[],
    replaceUrls: string[],
    meta?: ImageUploaderChangeMeta
  ) => void;
  /** Max width of the upload zone (px). Default 272. */
  maxUploadWidth?: number;
  asCol?: boolean;
  controlId?: string;
}

function resolveExistingImageSrc(url?: string): string {
  const u = (url ?? "").trim();
  if (!u) return "";
  if (
    u.startsWith("http://") ||
    u.startsWith("https://") ||
    u.startsWith("data:")
  ) {
    return `${u}${u.includes("?") ? "&" : "?"}t=${Date.now()}`;
  }
  return `${AppConstant.IMAGE_BASE_URL}${u}?t=${Date.now()}`;
}

function useResolvedPreviewSrc(
  file: File | null,
  effectiveExistingUrl: string | undefined,
  isEditable: boolean
): string | null {
  const localPreviewUrl = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    if (!localPreviewUrl) return;
    return () => URL.revokeObjectURL(localPreviewUrl);
  }, [localPreviewUrl]);

  const remoteSrc =
    !file && isEditable && (effectiveExistingUrl ?? "").trim()
      ? resolveExistingImageSrc(effectiveExistingUrl)
      : "";

  return localPreviewUrl || remoteSrc || null;
}

function footerLine(
  file: File | null,
  effectiveExisting: string | undefined,
  previewSrc: string | null
): string | null {
  if (file) return file.name;
  if (previewSrc && (effectiveExisting ?? "").trim())
    return "Image saved on server";
  if (!previewSrc) return null;
  return null;
}

/** Babel in this project cannot parse assignment via optional chain (`ref?.value =`). */
function clearHiddenFileInput(el: HTMLInputElement | null) {
  if (el) {
    el.value = "";
  }
}

type ImageDropZoneProps = {
  index: number;
  file: File | null;
  existingUrl?: string;
  isEditable: boolean;
  inputId: string;
  maxUploadWidth: number;
  onPick: (index: number, file: File | null) => void;
  onServerImageRemoved: (index: number) => void;
};

function ImageDropZone({
  index,
  file,
  existingUrl,
  isEditable,
  inputId,
  maxUploadWidth,
  onPick,
  onServerImageRemoved,
}: ImageDropZoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  /** Hides server URL in preview after user deletes saved image (prop still present until save). */
  const [userRemovedServerImage, setUserRemovedServerImage] = useState(false);
  const [previewLoadFailed, setPreviewLoadFailed] = useState(false);

  useEffect(() => {
    setUserRemovedServerImage(false);
  }, [existingUrl]);

  const effectiveExisting = userRemovedServerImage ? undefined : existingUrl;
  const previewSrc = useResolvedPreviewSrc(
    file,
    effectiveExisting,
    isEditable
  );
  const isLocalPreview = Boolean(file);
  const showPreview =
    Boolean(previewSrc) && (!previewLoadFailed || isLocalPreview);
  useEffect(() => {
    setPreviewLoadFailed(false);
  }, [previewSrc]);
  const footer = footerLine(file, effectiveExisting, previewSrc);
  const [hover, setHover] = useState(false);

  const maxKb = Math.floor(getSupportedImageMaxSizeBytes() / 1024);
  const formats = getSupportedImageExtensions().join(", ");

  const openPicker = () => {
    if (isEditable && inputRef.current) inputRef.current.click();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!isEditable) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openPicker();
    }
  };

  const zoneBorder =
    hover && isEditable ? "var(--primary-color)" : "var(--txtfld-border)";

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!isEditable || !showPreview) return;
    clearHiddenFileInput(inputRef.current);

    if (file) {
      onPick(index, null);
      setUserRemovedServerImage(false);
      return;
    }

    if ((existingUrl ?? "").trim()) {
      setUserRemovedServerImage(true);
      onServerImageRemoved(index);
    }
  };

  const showRemove =
    isEditable &&
    showPreview &&
    (Boolean(file) || Boolean((existingUrl ?? "").trim()));

  return (
    <div className="min-w-0" style={{ maxWidth: maxUploadWidth }}>
      <input
        id={inputId}
        type="file"
        ref={inputRef}
        accept=".jpg,.jpeg,.png,image/jpeg,image/png"
        style={{ display: "none" }}
        tabIndex={-1}
        onChange={(e) => {
          const selectedFile = e.target.files?.[0] || null;
          if (selectedFile && !isSupportedImageFile(selectedFile)) {
            showErrorAlert(
              `Only ${getSupportedImageExtensions().join(
                ", "
              )} formats up to ${maxKb}KB are supported.`
            );
            e.target.value = "";
            return;
          }
          if (selectedFile) setUserRemovedServerImage(false);
          onPick(index, selectedFile);
        }}
      />

      <div className="position-relative">
        <div
          role={isEditable ? "button" : undefined}
          tabIndex={isEditable ? 0 : -1}
          aria-label={
            showPreview
              ? "Image preview, activate to replace"
              : "Upload image, activate to choose file"
          }
          className="position-relative w-100 overflow-hidden"
          style={{
            minHeight: showPreview ? 112 : 136,
            borderRadius: "12px",
            border: `2px dashed ${zoneBorder}`,
            backgroundColor:
              hover && isEditable ? "rgba(128, 128, 128, 0.06)" : "transparent",
            cursor: isEditable ? "pointer" : "default",
            transition:
              "border-color 0.15s ease, background-color 0.15s ease",
          }}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          onClick={openPicker}
          onKeyDown={onKeyDown}
        >
          {showPreview ? (
            <div
              className="d-flex align-items-center justify-content-center"
              style={{
                minHeight: 112,
                padding: "10px 32px 10px 10px",
              }}
            >
              <img
                alt=""
                src={previewSrc ?? undefined}
                onError={() => {
                  if (!isLocalPreview) setPreviewLoadFailed(true);
                }}
                style={{
                  maxWidth: "100%",
                  maxHeight: 140,
                  width: "auto",
                  height: "auto",
                  objectFit: "contain",
                  borderRadius: "8px",
                }}
              />
            </div>
          ) : (
            <div
              className="d-flex flex-column align-items-center justify-content-center text-center"
              style={{
                minHeight: 136,
                padding: "18px 12px",
                gap: 8,
              }}
            >
              <div
                className="d-flex align-items-center justify-content-center rounded-circle"
                style={{
                  width: 44,
                  height: 44,
                  backgroundColor: "rgba(128, 128, 128, 0.12)",
                  color: "var(--primary-color)",
                }}
              >
                <i
                  className="bi bi-cloud-upload"
                  style={{ fontSize: "22px" }}
                  aria-hidden
                />
              </div>
              <div>
                <div
                  className="fw-semibold"
                  style={{
                    fontSize: "14px",
                    color: "var(--content-txt-color)",
                    marginBottom: 2,
                  }}
                >
                  {previewLoadFailed
                    ? "Image not available"
                    : isEditable
                    ? "Upload image"
                    : "No image"}
                </div>
                <div
                  style={{ fontSize: "12px", color: "var(--placeholder-txt)" }}
                >
                  {previewLoadFailed ? (
                    "Saved image could not be loaded"
                  ) : isEditable ? (
                    <>
                      Tap to choose
                      <br />
                      {formats} · max {maxKb} KB
                    </>
                  ) : (
                    "Upload is disabled"
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {showRemove ? (
          <button
            type="button"
            title="Remove image"
            aria-label="Remove image"
            className="position-absolute border-0 d-flex align-items-center justify-content-center rounded-circle"
            style={{
              top: 6,
              right: 6,
              width: 28,
              height: 28,
              padding: 0,
              backgroundColor: "rgba(255,255,255,0.95)",
              boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
              color: "#b42318",
              zIndex: 2,
            }}
            onClick={handleRemove}
          >
            <i className="bi bi-trash" style={{ fontSize: "14px" }} aria-hidden />
          </button>
        ) : null}
      </div>

      {footer && !previewLoadFailed ? (
        <div
          className="mt-2 small text-truncate px-1"
          style={{ color: "var(--content-txt-color)", fontSize: "12px" }}
          title={footer}
        >
          {footer}
        </div>
      ) : null}
    </div>
  );
}

const CustomImageUploader: React.FC<CustomImageUploaderProps> = ({
  label,
  hint,
  maxFiles = 3,
  isEditable = false,
  existingImages = [],
  onFileChange,
  maxUploadWidth = 272,
  asCol = true,
  controlId = "custom-image-upload",
}) => {
  const [fileInputs, setFileInputs] = useState<(File | null)[]>([]);
  const [replaceUrls, setReplaceUrls] = useState<string[]>([]);
  const initKeyRef = useRef<string>("");
  const existingImagesKey = existingImages.join("|");

  useEffect(() => {
    const initKey = `${isEditable ? "1" : "0"}|${existingImagesKey}`;
    if (initKeyRef.current === initKey) return;
    initKeyRef.current = initKey;

    const initialFileInputs = isEditable
      ? existingImages.length > 0
        ? existingImages.map(() => null)
        : [null]
      : [null];
    setFileInputs(initialFileInputs);
    setReplaceUrls([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditable, existingImages.length, existingImagesKey]);

  const emitFileChange = (
    updatedFiles: (File | null)[],
    updatedReplaceUrls: string[],
    meta?: ImageUploaderChangeMeta
  ) => {
    setFileInputs(updatedFiles);
    setReplaceUrls(updatedReplaceUrls);
    onFileChange(
      updatedFiles.filter((f) => f !== null) as File[],
      updatedReplaceUrls,
      meta
    );
  };

  const handleFileChange = (index: number, file: File | null) => {
    const updatedFiles = [...fileInputs];
    const updatedReplaceUrls = [...replaceUrls];

    updatedFiles[index] = file;

    if (file && existingImages[index]) {
      if (!updatedReplaceUrls.includes(existingImages[index])) {
        updatedReplaceUrls.push(existingImages[index]);
      }
    } else if (!file && existingImages[index]) {
      const urlIndex = updatedReplaceUrls.indexOf(existingImages[index]);
      if (urlIndex !== -1) {
        updatedReplaceUrls.splice(urlIndex, 1);
      }
    }

    emitFileChange(updatedFiles, updatedReplaceUrls);
  };

  const handleServerImageRemoved = (index: number) => {
    const updatedFiles = [...fileInputs];
    updatedFiles[index] = null;
    let updatedReplaceUrls = [...replaceUrls];
    const ex = existingImages[index];
    if (ex && updatedReplaceUrls.includes(ex)) {
      updatedReplaceUrls = updatedReplaceUrls.filter((u) => u !== ex);
    }
    emitFileChange(updatedFiles, updatedReplaceUrls, { imageCleared: true });
  };

  const addFileInput = () => {
    if (fileInputs.length < maxFiles) {
      setFileInputs((prev) => [...prev, null]);
    }
  };

  const inner = (
    <>
      {label?.trim() ? (
        <Form.Label className="fw-medium mb-2" htmlFor={`${controlId}-file-0`}>
          {label}
        </Form.Label>
      ) : null}

      <div className="w-100 min-w-0">
        {fileInputs.map((file, index) => (
          <div key={index}>
            {index > 0 ? <hr className="my-4 opacity-25" /> : null}
            <ImageDropZone
              index={index}
              file={file}
              existingUrl={existingImages[index]}
              isEditable={isEditable}
              inputId={`${controlId}-file-${index}`}
              maxUploadWidth={maxUploadWidth}
              onPick={handleFileChange}
              onServerImageRemoved={handleServerImageRemoved}
            />
          </div>
        ))}

        {maxFiles > 1 && fileInputs.length < maxFiles && (
          <Button
            variant="primary"
            className="mt-3"
            style={{
              backgroundColor: "var(--primary-color)",
              border: "none",
            }}
            onClick={addFileInput}
          >
            + Add another
          </Button>
        )}

        {hint?.trim() ? (
          <Form.Text
            muted
            className="d-block mt-3"
            style={{ fontSize: "12px", lineHeight: 1.45 }}
          >
            {hint.trim()}
          </Form.Text>
        ) : null}
      </div>
    </>
  );

  if (asCol) {
    return (
      <Col sm={12} className="mb-3 w-100 min-w-0">
        <Form.Group controlId={controlId}>{inner}</Form.Group>
      </Col>
    );
  }

  return (
    <div className="mb-2 w-100 min-w-0">
      <Form.Group controlId={controlId}>{inner}</Form.Group>
    </div>
  );
};

export default CustomImageUploader;
