import React, { useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "react-bootstrap";
import { useNavigate, useSearchParams } from "react-router-dom";
import CustomCloseButton from "../../components/CustomCloseButton";
import { ROUTES } from "../../routes/Routes";
import { fetchTicketById } from "../../services/ticketService";
import { TicketModel } from "../../models/TicketModel";

type DraftAttachment = {
    id: string;
    file: File;
    previewUrl?: string;
    kind: "image" | "video" | "file";
    caption: string;
};

type ChatAttachment = {
    id: string;
    fileName: string;
    previewUrl?: string;
    kind: "image" | "video" | "file";
    caption?: string;
};

type ChatMessage = {
    id: string;
    sender: "user" | "employee";
    text: string;
    sentAt: string;
    attachments?: ChatAttachment[];
};

const DisputeChatConversationPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const ticketId = searchParams.get("ticketId") || "";

    const [ticketDetails, setTicketDetails] = useState<TicketModel | null>(null);
    const fetchRef = useRef(false);
    const pollInFlightRef = useRef(false);
    const seededRef = useRef(false);

    const [messageDraft, setMessageDraft] = useState("");
    const [selectedFiles, setSelectedFiles] = useState<DraftAttachment[]>([]);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const messageAreaRef = useRef<HTMLDivElement | null>(null);
    const [showAttachmentModal, setShowAttachmentModal] = useState(false);

    const [messages, setMessages] = useState<ChatMessage[]>([]);

    const isTicketClosed =
        ticketDetails ? Number(ticketDetails.status) !== 1 || Number(ticketDetails.resolve_status) === 2 : false;

    const formatNow = () =>
        new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        });

    const formatDateTimeFromDate = (date: Date) => {
        return date.toLocaleString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const formatDateTime = (isoString?: string | null) => {
        if (!isoString) return "-";
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return "-";
        return formatDateTimeFromDate(date);
    };

    const ticketStartedAt = ticketDetails?.created_at ?? "";
    // Some APIs may not return `close_date` immediately; fall back to `updated_at`.
    let ticketClosedAt =
        ticketDetails?.close_date ||
        ticketDetails?.updated_at ||
        ticketDetails?.created_at ||
        "";

    // Ensure displayed start/end have some difference.
    if (ticketStartedAt && ticketClosedAt) {
        const startDate = new Date(ticketStartedAt);
        const endDate = new Date(ticketClosedAt);
        if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
            const diffMs = Math.abs(endDate.getTime() - startDate.getTime());
            if (endDate.getTime() <= startDate.getTime() || diffMs < 60 * 1000) {
                // If backend returns the same/earlier timestamp, bump end time a bit.
                endDate.setMinutes(endDate.getMinutes() + 10);
                ticketClosedAt = endDate.toISOString();
            }
        }
    }

    useEffect(() => {
        if (!ticketId) return;
        // New chat screen -> allow message seeding for this ticket.
        seededRef.current = false;
        setMessages([]);
        setMessageDraft("");
        setSelectedFiles([]);

        if (fetchRef.current) return;
        fetchRef.current = true;

        fetchTicketById(ticketId)
            .then(({ response, ticket }) => {
                if (response && ticket) {
                    setTicketDetails(ticket);
                }
            })
            .finally(() => {
                fetchRef.current = false;
            });
    }, [ticketId]);

    // Poll ticket status so the "Closed at ..." and input disabling feel real-time.
    useEffect(() => {
        if (!ticketId) return;

        const intervalId = window.setInterval(() => {
            if (pollInFlightRef.current) return;
            pollInFlightRef.current = true;

            fetchTicketById(ticketId)
                .then(({ response, ticket }) => {
                    if (response && ticket) setTicketDetails(ticket);
                })
                .finally(() => {
                    pollInFlightRef.current = false;
                });
        }, 10000);

        return () => window.clearInterval(intervalId);
    }, [ticketId]);

    const initialUserName = ticketDetails?.created_by_name || "User";

    useEffect(() => {
        if (!ticketDetails) return;
        if (seededRef.current) return;
        seededRef.current = true;

        // Base conversation seeded from the ticket query.
        const seedMessages: ChatMessage[] = [];
        if (ticketDetails.query) {
            seedMessages.push({
                id: "seed-user-query",
                sender: "user",
                text: ticketDetails.query,
                sentAt: formatNow(),
            });
        }

        seedMessages.push({
            id: "seed-employee-intro",
            sender: "employee",
            text: isTicketClosed
                ? "This dispute is already closed."
                : "Thanks. We are looking into your query now.",
            sentAt: formatNow(),
        });

        setMessages(seedMessages);
        setMessageDraft("");
        setSelectedFiles([]);
    }, [ticketDetails]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!messageAreaRef.current) return;
        messageAreaRef.current.scrollTop = messageAreaRef.current.scrollHeight;
    }, [messages, selectedFiles]);

    const openAttachmentPicker = () => {
        fileInputRef.current?.click();
    };

    const onAttachmentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        if (files.length === 0) return;

        setShowAttachmentModal(true);

        const mappedFiles: DraftAttachment[] = files.map((file, index) => {
            const isImage = file.type.startsWith("image/");
            const isVideo = file.type.startsWith("video/");
            const previewUrl = isImage || isVideo ? URL.createObjectURL(file) : undefined;
            return {
                id: `${Date.now()}-${index}-${file.name}`,
                file,
                previewUrl,
                kind: isImage ? "image" : isVideo ? "video" : "file",
                caption: "",
            };
        });

        setSelectedFiles((prev) => [...prev, ...mappedFiles]);
        event.target.value = "";
    };

    const removeAttachment = (id: string) => {
        setSelectedFiles((prev) => {
            const target = prev.find((item) => item.id === id);
            if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
            return prev.filter((item) => item.id !== id);
        });
    };

    const updateAttachmentCaption = (id: string, caption: string) => {
        setSelectedFiles((prev) => prev.map((item) => (item.id === id ? { ...item, caption } : item)));
    };

    const isSendDisabled = (messageDraft.trim().length === 0 && selectedFiles.length === 0) || isTicketClosed;

    const handleSend = () => {
        if (isSendDisabled) return;

        const outgoingAttachments: ChatAttachment[] = selectedFiles.map((item) => ({
            id: item.id,
            fileName: item.file.name,
            previewUrl: item.previewUrl,
            kind: item.kind,
            caption: item.caption.trim(),
        }));

        const text = messageDraft.trim();
        const outgoingText = text || (outgoingAttachments.length > 0 ? "Shared attachments" : "");

        setMessages((prev) => [
            ...prev,
            {
                id: `msg-${Date.now()}`,
                sender: "employee",
                text: outgoingText,
                sentAt: formatNow(),
                attachments: outgoingAttachments,
            },
        ]);

        setMessageDraft("");
        setSelectedFiles([]);
    };

    const chatAttachments = useMemo(() => {
        const all: ChatAttachment[] = [];
        messages.forEach((m) => {
            if (m.attachments && m.attachments.length > 0) all.push(...m.attachments);
        });
        // De-dupe by id.
        const seen = new Set<string>();
        return all.filter((a) => {
            if (seen.has(a.id)) return false;
            seen.add(a.id);
            return true;
        });
    }, [messages]);

    const ticketStatusText = isTicketClosed
        ? "Closed"
        : ticketDetails?.status === 1
          ? "Open"
          : "-";

    // Normalize any backend id (Mongo/uuid/etc) into `EMP-xxxx` like normal chats.
    const formatEmployeeIdForBadge = (rawId: string | null | undefined) => {
        const id = (rawId || "").toString().trim();
        if (!id) return "EMP-0000";
        if (id.toUpperCase().startsWith("EMP-")) return id;

        // Create a stable 0..9999 value from the string.
        let hash = 0;
        for (let i = 0; i < id.length; i++) {
            hash = (hash * 31 + id.charCodeAt(i)) % 10000;
        }
        return `EMP-${String(hash).padStart(4, "0")}`;
    };

    const employeeId = formatEmployeeIdForBadge(
        ticketDetails?.employee_unique_id || ticketDetails?.resolve_by_id
    );

    return (
        <div className="main-page-content">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="d-flex align-items-center gap-2">
                    <button
                        type="button"
                        className="btn btn-light border rounded-circle d-inline-flex align-items-center justify-content-center p-0"
                        style={{ width: 30, height: 30 }}
                        onClick={() => navigate(ROUTES.TICKET_MANAGEMENT.path)}
                        aria-label="Back to ticket management"
                    >
                        <i className="bi bi-chevron-left" />
                    </button>
                    <h4 className="m-0 p-0">Dispute Chat</h4>
                </div>
                <button type="button" className="btn p-0 border-0 bg-transparent" aria-label="Notifications">
                    <i className="bi bi-bell-fill text-danger fs-5" />
                </button>
            </div>

            <div className="row g-3">
                <div className="col-lg-8">
                    <div className="border rounded-3 bg-white">
                        <div className="d-flex align-items-center justify-content-between p-3 border-bottom">
                            <div className="d-flex align-items-center gap-2">
                                <div
                                    className="normal-chat-avatar d-inline-flex align-items-center justify-content-center position-relative flex-shrink-0"
                                    style={{ backgroundColor: "#b91c1c" }}
                                >
                                    {(initialUserName || "U").charAt(0)}
                                </div>
                                <div>
                                    <h6 className="normal-chat-user-name mb-0">{initialUserName}</h6>
                                    <small className="normal-chat-time">{ticketDetails?.user_unique_id || ticketId}</small>
                                </div>
                            </div>
                        </div>

                        <div className="normal-chat-message-area" ref={messageAreaRef}>
                            {ticketStartedAt && (
                                <div className="normal-chat-center-status">
                                    Started at {formatDateTime(ticketStartedAt)}
                                </div>
                            )}

                            {messages.map((msg) => {
                                const isEmployee = msg.sender === "employee";
                                return (
                                    <div
                                        key={msg.id}
                                        className={`d-flex mb-2 ${isEmployee ? "justify-content-end" : "justify-content-start"}`}
                                    >
                                        <div className={`normal-chat-bubble ${isEmployee ? "employee" : "user"}`}>
                                            <p className="mb-1">{msg.text}</p>
                                            {msg.attachments && msg.attachments.length > 0 && (
                                                <div
                                                    className={`normal-chat-bubble-attachments ${
                                                        msg.attachments.length > 1 ? "normal-chat-bubble-attachments-grid" : ""
                                                    }`}
                                                >
                                                    {msg.attachments.map((attachment) => (
                                                        <div
                                                            key={attachment.id}
                                                            className="normal-chat-bubble-attachment-item"
                                                        >
                                                            {attachment.kind === "image" && attachment.previewUrl && (
                                                                <img
                                                                    src={attachment.previewUrl}
                                                                    alt={attachment.fileName}
                                                                    className="normal-chat-bubble-attachment-preview"
                                                                />
                                                            )}
                                                            {attachment.kind === "video" && attachment.previewUrl && (
                                                                <video
                                                                    className="normal-chat-bubble-attachment-preview"
                                                                    controls
                                                                    src={attachment.previewUrl}
                                                                />
                                                            )}
                                                            {attachment.kind === "file" && (
                                                                <div className="normal-chat-bubble-file">
                                                                    <i className="bi bi-file-earmark-text" />
                                                                    <span>{attachment.fileName}</span>
                                                                </div>
                                                            )}
                                                            {attachment.caption && (
                                                                <div className="normal-chat-attachment-caption">
                                                                    {attachment.caption}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            <small>{msg.sentAt}</small>
                                        </div>
                                    </div>
                                );
                            })}

                            {isTicketClosed && ticketClosedAt && (
                                <div className="normal-chat-center-status normal-chat-center-status-closed">
                                    Closed at {formatDateTime(ticketClosedAt)}
                                </div>
                            )}
                        </div>

                        {!showAttachmentModal && selectedFiles.length > 0 && (
                            <div className="px-3 pt-2">
                                <div className="d-flex align-items-center justify-content-between gap-2">
                                    <div className="text-muted" style={{ fontSize: 12 }}>
                                        {selectedFiles.length} attachment{selectedFiles.length > 1 ? "s" : ""} selected
                                    </div>
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-light border"
                                        onClick={() => setShowAttachmentModal(true)}
                                    >
                                        Edit captions
                                    </button>
                                </div>
                                <div className="mt-2 d-flex flex-wrap gap-2">
                                    {selectedFiles.map((file) => (
                                        <div
                                            key={file.id}
                                            className="normal-chat-selected-file-card"
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => setShowAttachmentModal(true)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" || e.key === " ") setShowAttachmentModal(true);
                                            }}
                                        >
                                            <div className="normal-chat-selected-file-header">
                                                <div className="d-flex align-items-center gap-1">
                                                    <i
                                                        className={`bi ${
                                                            file.kind === "image"
                                                                ? "bi-image"
                                                                : file.kind === "video"
                                                                  ? "bi-film"
                                                                  : "bi-file-earmark-text"
                                                        }`}
                                                    />
                                                    <span className="text-truncate">{file.file.name}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    className="btn btn-sm p-0 border-0 bg-transparent"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeAttachment(file.id);
                                                    }}
                                                    aria-label="Remove attachment"
                                                >
                                                    <i className="bi bi-x-circle-fill" />
                                                </button>
                                            </div>
                                            {file.kind !== "file" && file.previewUrl && (
                                                file.kind === "image" ? (
                                                    <img
                                                        src={file.previewUrl}
                                                        alt={file.file.name}
                                                        className="normal-chat-selected-preview"
                                                    />
                                                ) : (
                                                    <video
                                                        src={file.previewUrl}
                                                        className="normal-chat-selected-preview"
                                                        controls
                                                    />
                                                )
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="d-flex align-items-center gap-2 p-3 border-top">
                            <input
                                ref={fileInputRef}
                                type="file"
                                className="d-none"
                                accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                                multiple
                                onChange={onAttachmentChange}
                            />
                            <button
                                type="button"
                                className="btn btn-light border rounded-circle d-inline-flex align-items-center justify-content-center p-0 normal-chat-icon-btn"
                                onClick={openAttachmentPicker}
                                aria-label="Attach image or document"
                                disabled={isTicketClosed}
                            >
                                <i className="bi bi-paperclip" />
                            </button>
                            <input
                                type="text"
                                className="form-control"
                                placeholder={isTicketClosed ? "Chat is closed" : "Type a message..."}
                                value={messageDraft}
                                onChange={(e) => setMessageDraft(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                        if (showAttachmentModal) setShowAttachmentModal(false);
                                    }
                                }}
                                disabled={isTicketClosed}
                            />
                            <button
                                type="button"
                                className="btn custom-btn-primary d-inline-flex align-items-center justify-content-center p-0 normal-chat-icon-btn"
                                onClick={handleSend}
                                disabled={isSendDisabled}
                                aria-label="Send message"
                            >
                                <i className="bi bi-send-fill" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="col-lg-4">
                    <button type="button" className="btn custom-btn-primary mb-3" disabled={isTicketClosed}>
                        Transfer Chat
                    </button>

                    <div className="border rounded-3 bg-white p-3">
                    <h6 className="normal-chat-section-title">Ticket Status</h6>
                        <div className="row g-2 mb-3">
                            <span className="col-4 normal-chat-detail-key">Status</span>
                            <strong className="col-8 normal-chat-detail-value">
                                <span
                                    className={`dispute-chat-status-badge ${
                                        ticketDetails?.status === 1 ? "open" : "close"
                                    }`}
                                >
                                    {ticketStatusText}
                                </span>
                            </strong>
                        </div>

                        <h6 className="normal-chat-section-title">User Details</h6>
                        <div className="row g-2 mb-3">
                            <span className="col-4 normal-chat-detail-key">ID</span>
                            <strong className="col-8 normal-chat-detail-value">
                                {ticketDetails?.user_unique_id || "-"}
                            </strong>
                            <span className="col-4 normal-chat-detail-key">Name</span>
                            <strong className="col-8 normal-chat-detail-value">
                                {ticketDetails?.created_by_name || "-"}
                            </strong>
                            <span className="col-4 normal-chat-detail-key">Phone</span>
                            <strong className="col-8 normal-chat-detail-value">
                                {ticketDetails?.phone_number || "-"}
                            </strong>
                            <span className="col-4 normal-chat-detail-key">Email</span>
                            <strong className="col-8 normal-chat-detail-value">
                                {ticketDetails?.email || "-"}
                            </strong>
                        </div>

                        <h6 className="normal-chat-section-title">Employee Details</h6>
                        <div className="row g-2 mb-3">
                            <span className="col-4 normal-chat-detail-key">ID</span>
                            <strong className="col-8 normal-chat-detail-value">
                                {employeeId}
                            </strong>
                            <span className="col-4 normal-chat-detail-key">Name</span>
                            <strong className="col-8 normal-chat-detail-value">
                                {ticketDetails?.resolved_by_name || "Assigned Employee"}
                            </strong>
                            <span className="col-4 normal-chat-detail-key">Phone</span>
                            <strong className="col-8 normal-chat-detail-value">-</strong>
                            <span className="col-4 normal-chat-detail-key">Email</span>
                            <strong className="col-8 normal-chat-detail-value">-</strong>
                        </div>

                        <h6 className="normal-chat-section-title">Attachments</h6>
                        <div className="mb-3 normal-chat-modal-attachments-scroll">
                            {chatAttachments.length === 0 ? (
                                <div className="normal-chat-attachment-row d-flex justify-content-between align-items-center gap-2">
                                    <div className="d-flex align-items-center gap-2">
                                        <i className="bi bi-paperclip" />
                                        <span>No attachments</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="row g-2">
                                    {chatAttachments.map((att) => (
                                        <div key={att.id} className="col-6">
                                            <div className="normal-chat-attachment-card">
                                                {att.kind === "image" && att.previewUrl ? (
                                                    <img
                                                        src={att.previewUrl}
                                                        alt={att.fileName}
                                                        className="normal-chat-attachment-thumb"
                                                        loading="lazy"
                                                    />
                                                ) : att.kind === "video" && att.previewUrl ? (
                                                    <video
                                                        src={att.previewUrl}
                                                        className="normal-chat-attachment-thumb"
                                                        controls
                                                    />
                                                ) : (
                                                    <div
                                                        className="border rounded-3 m-2 p-3 text-center"
                                                        style={{ background: "#fff" }}
                                                    >
                                                        <i className="bi bi-file-earmark-text" />
                                                    </div>
                                                )}
                                                <div className="p-2">
                                                    <div className="normal-chat-attachment-name">{att.fileName}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <Modal
                show={showAttachmentModal}
                onHide={() => setShowAttachmentModal(false)}
                centered
                dialogClassName="custom-big-modal"
            >
                <Modal.Header className="py-3 px-4 border-bottom-0">
                    <Modal.Title as="h5" className="custom-modal-title">
                        Attachments
                    </Modal.Title>
                    <CustomCloseButton onClose={() => setShowAttachmentModal(false)} />
                </Modal.Header>
                <Modal.Body className="px-4 pb-4 pt-0" style={{ maxHeight: "70vh", overflowY: "auto" }}>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <div className="text-muted" style={{ fontSize: 14 }}>
                            Preview and add captions before sending
                        </div>
                        <button type="button" className="btn custom-add-button" onClick={openAttachmentPicker}>
                            <i className="bi bi-plus-lg me-2" />
                            Add files
                        </button>
                    </div>

                    {selectedFiles.length === 0 ? (
                        <div className="normal-chat-empty-state">No attachments selected.</div>
                    ) : (
                        <div className="row g-3">
                            {selectedFiles.map((file) => (
                                <div key={file.id} className="col-6">
                                    <div className="border rounded-3 p-2 bg-white">
                                        <div
                                            className="d-flex justify-content-between align-items-center gap-2 mb-2"
                                        >
                                            <div
                                                className="text-truncate"
                                                style={{
                                                    fontSize: 12,
                                                    color: "var(--content-txt-color)",
                                                    fontWeight: 600,
                                                    maxWidth: "75%",
                                                }}
                                            >
                                                {file.file.name}
                                            </div>
                                            <button
                                                type="button"
                                                className="btn btn-sm p-0 border-0 bg-transparent"
                                                onClick={() => removeAttachment(file.id)}
                                                aria-label="Remove attachment"
                                            >
                                                <i className="bi bi-x-circle-fill" />
                                            </button>
                                        </div>

                                        {file.previewUrl && file.kind !== "file" ? (
                                            file.kind === "image" ? (
                                                <img
                                                    src={file.previewUrl}
                                                    alt={file.file.name}
                                                    className="normal-chat-modal-preview"
                                                />
                                            ) : (
                                                <video
                                                    src={file.previewUrl}
                                                    className="normal-chat-modal-preview"
                                                    controls
                                                />
                                            )
                                        ) : (
                                            <div className="border rounded-3 p-3 text-center">
                                                <i
                                                    className="bi bi-file-earmark-text"
                                                    style={{ fontSize: 24, color: "var(--primary-txt-color)" }}
                                                />
                                            </div>
                                        )}

                                        <textarea
                                            className="form-control form-control-sm mt-2"
                                            rows={2}
                                            placeholder="Caption"
                                            value={file.caption}
                                            onChange={(e) => updateAttachmentCaption(file.id, e.target.value)}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer className="border-top-0 px-4 pb-4">
                    <div className="row g-2 w-100">
                        <div className="col-6">
                            <button
                                type="button"
                                className="btn custom-btn-secondary w-100"
                                onClick={() => setShowAttachmentModal(false)}
                            >
                                Cancel
                            </button>
                        </div>
                        <div className="col-6">
                            <button
                                type="button"
                                className="btn custom-btn-primary w-100"
                                onClick={() => {
                                    handleSend();
                                    setShowAttachmentModal(false);
                                }}
                                disabled={isSendDisabled}
                            >
                                Send
                            </button>
                        </div>
                    </div>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default DisputeChatConversationPage;

