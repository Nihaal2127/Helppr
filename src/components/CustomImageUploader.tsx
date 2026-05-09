import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { Button, Col, Row } from "react-bootstrap";
import { AppConstant } from "../constant/AppConstant";
import { showErrorAlert } from "../helper/alertHelper";
import {
  getSupportedImageExtensions,
  getSupportedImageMaxSizeBytes,
  isSupportedImageFile,
} from "../helper/utility";

interface CustomImageUploaderProps {
  label: string;
  maxFiles?: number;
  isEditable?: boolean;
  existingImages?: string[];
  onFileChange: (files: File[], replaceUrls: string[]) => void;
}

export function resolveExistingImageSrc(url?: string): string {
  const u = (url ?? "").trim();
  if (!u) return "";
  if (
    u.startsWith("http://") ||
    u.startsWith("https://") ||
    u.startsWith("data:")
  ) {
    return `${u}${u.includes("?") ? "&" : "?"}t=${Date.now()}`;
  }
  if (u.startsWith("//")) {
    return `https:${u}${u.includes("?") ? "&" : "?"}t=${Date.now()}`;
  }
  const base = AppConstant.IMAGE_BASE_URL.replace(/\/?$/, "/");
  const path = u.replace(/^\//, "");
  return `${base}${path}?t=${Date.now()}`;
}

function LocalFilePreview({ file }: { file: File }) {
  const [objectUrl, setObjectUrl] = useState("");
  useLayoutEffect(() => {
    const u = URL.createObjectURL(file);
    setObjectUrl(u);
    return () => {
      URL.revokeObjectURL(u);
    };
  }, [file]);
  if (!objectUrl) return null;
  return (
    <img
      alt=""
      src={objectUrl}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        display: "block",
      }}
    />
  );
}

const CustomImageUploader: React.FC<CustomImageUploaderProps> = ({
  label,
  maxFiles = 3,
  isEditable = false,
  existingImages = [],
  onFileChange,
}) => {
  const [fileInputs, setFileInputs] = useState<(File | null)[]>([null]);
  const [replaceUrls, setReplaceUrls] = useState<string[]>([]);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const initKeyRef = useRef<string>("");
  const existingImagesKey = existingImages.join("|");
  const maxKb = Math.floor(getSupportedImageMaxSizeBytes() / 1024);
  const extLabel = getSupportedImageExtensions().join(", ");

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

    setFileInputs(updatedFiles);
    setReplaceUrls(updatedReplaceUrls);

    onFileChange(
      updatedFiles.filter((f) => f !== null) as File[],
      updatedReplaceUrls
    );
  };

  const handleClearSlot = (index: number) => {
    const input = inputRefs.current[index];
    if (input) input.value = "";
    handleFileChange(index, null);
  };

  const addFileInput = () => {
    if (fileInputs.length < maxFiles) {
      setFileInputs((prev) => [...prev, null]);
    }
  };

  const openPicker = (index: number) => {
    inputRefs.current[index]?.click();
  };

  const previewSize = maxFiles === 1 ? 132 : 100;
  const isSingle = maxFiles === 1;

  return (
    <Row className="w-100 g-0 mx-0">
      <Col xs={12} className="px-0">
        <div className="mb-3">
          <label
            className="form-label fw-medium mb-2 d-block"
            style={{ color: "var(--content-txt-color)" }}
          >
            {label}
          </label>

          <div
            style={
              isSingle
                ? { width: "100%" }
                : {
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                    gap: 12,
                    maxWidth: "100%",
                  }
            }
          >
            {fileInputs.map((file, index) => {
              const existing = (existingImages[index] ?? "").trim();
              const hasPreview = Boolean(file || existing);

              return (
                <div
                  key={index}
                  style={{
                    padding: 10,
                    borderRadius: 10,
                    border: "1px solid var(--txtfld-border)",
                    background: "var(--bg-color)",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                    width: isSingle ? "100%" : undefined,
                    maxWidth: isSingle ? "100%" : undefined,
                    position: "relative",
                    display: isSingle ? "flex" : undefined,
                    flexDirection: isSingle ? "row" : undefined,
                    alignItems: isSingle ? "stretch" : undefined,
                    gap: isSingle ? 14 : undefined,
                  }}
                >
                <div
                  style={{
                    position: "relative",
                    flexShrink: 0,
                    alignSelf: isSingle ? "center" : undefined,
                  }}
                >
                  <button
                    type="button"
                    className={
                      isSingle
                        ? "border-0 p-0 bg-transparent d-block"
                        : "w-100 border-0 p-0 text-center bg-transparent"
                    }
                    onClick={() => openPicker(index)}
                    aria-label="Choose image file"
                    style={{ cursor: "pointer" }}
                  >
                    <div
                      style={{
                        width: previewSize,
                        height: previewSize,
                        margin: isSingle ? 0 : "0 auto",
                        borderRadius: 8,
                        border: hasPreview
                          ? "1px solid var(--txtfld-border)"
                          : "2px dashed var(--txtfld-border)",
                        overflow: "hidden",
                        background: "rgba(0,0,0,0.02)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                      }}
                    >
                      {file ? (
                        <LocalFilePreview file={file} />
                      ) : existing ? (
                        <img
                          alt=""
                          src={resolveExistingImageSrc(existing)}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                      ) : (
                        <div
                          className="d-flex flex-column align-items-center justify-content-center px-2 py-2"
                          style={{ width: "100%", height: "100%" }}
                        >
                          <i
                            className="bi bi-cloud-arrow-up"
                            style={{
                              fontSize: isSingle ? "1.65rem" : "1.35rem",
                              color: "var(--primary-color)",
                              opacity: 0.92,
                              lineHeight: 1,
                            }}
                            aria-hidden
                          />
                          <span
                            className="text-center"
                            style={{
                              color: "var(--placeholder-txt)",
                              fontSize: 10,
                              lineHeight: 1.25,
                              marginTop: 6,
                            }}
                          >
                            Tap to upload
                          </span>
                        </div>
                      )}
                    </div>
                  </button>

                  {file ? (
                    <button
                      type="button"
                      className="position-absolute border-0 rounded-circle d-flex align-items-center justify-content-center"
                      aria-label="Remove selected image"
                      title="Remove"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleClearSlot(index);
                      }}
                      style={{
                        top: 4,
                        right: 4,
                        width: 26,
                        height: 26,
                        fontSize: 14,
                        lineHeight: 1,
                        background: "rgba(255,255,255,0.95)",
                        color: "#b02a37",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
                        cursor: "pointer",
                      }}
                    >
                      ×
                    </button>
                  ) : null}
                </div>

                {isSingle ? (
                  <div
                    className="d-flex flex-column justify-content-center"
                    style={{ flex: "1 1 0", minWidth: 0, gap: 8 }}
                  >
                    <p
                      className="small mb-0"
                      style={{ color: "var(--placeholder-txt)", lineHeight: 1.45 }}
                    >
                      {extLabel} · up to {maxKb} KB
                    </p>
                    {file ? (
                      <p
                        className="small fw-medium mb-0 text-truncate"
                        style={{ color: "var(--content-txt-color)" }}
                        title={file.name}
                      >
                        {file.name}
                      </p>
                    ) : existing ? (
                      <p
                        className="small mb-0"
                        style={{ color: "var(--content-txt-color)", lineHeight: 1.45 }}
                      >
                        Preview shows your current image. Pick a new file to replace it.
                      </p>
                    ) : (
                      <p
                        className="small mb-0"
                        style={{ color: "var(--content-txt-color)", lineHeight: 1.45 }}
                      >
                        Tap the preview or use the link below to choose a file.
                      </p>
                    )}
                    <button
                      type="button"
                      className="btn btn-link p-0 text-decoration-none align-self-start"
                      style={{
                        color: "var(--primary-color)",
                        fontSize: "0.875rem",
                        fontWeight: 600,
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        openPicker(index);
                      }}
                    >
                      {hasPreview ? "Replace image" : "Browse files"}
                    </button>
                  </div>
                ) : null}

                <input
                  type="file"
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const selectedFile = e.target.files?.[0] || null;
                    if (
                      selectedFile &&
                      !isSupportedImageFile(selectedFile)
                    ) {
                      showErrorAlert(
                        `Only ${extLabel} formats up to ${maxKb} KB are supported.`
                      );
                      e.target.value = "";
                      return;
                    }
                    handleFileChange(index, selectedFile);
                  }}
                />
              </div>
            );
          })}
        </div>

        {maxFiles > 1 && fileInputs.length < maxFiles && (
          <Button
            type="button"
            variant="primary"
            style={{
              backgroundColor: "var(--primary-color)",
              border: "none",
              marginTop: 12,
            }}
            onClick={addFileInput}
          >
            + Add another
          </Button>
        )}
        </div>
      </Col>
    </Row>
  );
};

export default CustomImageUploader;
