import React, { useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "react-bootstrap";
import { useNavigate, useSearchParams } from "react-router-dom";
import CustomCloseButton from "../../components/CustomCloseButton";
import TransferChatModal from "../../components/TransferChatModal";
import { ROUTES } from "../../routes/Routes";
import { groupChatConversations, groupChatDetails } from "./quoteChatMockData";

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

type GroupSender = "admin" | "employee" | "partner" | "user";

type ChatMessage = {
  id: string;
  sender: GroupSender;
  text: string;
  sentAt: string;
  attachments?: ChatAttachment[];
};

const GroupChatConversationPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const chatId = searchParams.get("chatId") || "";

  const [messageDraft, setMessageDraft] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<DraftAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messageAreaRef = useRef<HTMLDivElement | null>(null);
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  const selectedChat =
    groupChatConversations.find((chat) => chat.id === chatId) || groupChatConversations[0];

  const fallbackDetail = {
    chatId: selectedChat.id,
    participants: {
      admin: { id: "ADM-0000", name: "Admin", phone: "-", email: "-" },
      employee: { id: "EMP-0000", name: "Employee", phone: "-", email: "-" },
      partner: { id: "PAR-0000", name: "Partner", phone: "-", email: "-" },
      user: { id: "USR-0000", name: "User", phone: "-", email: "-" },
    },
    messages: [
      {
        id: "fallback-1",
        sender: "user" as const,
        text: selectedChat.lastMessage,
        sentAt: selectedChat.lastMessageAt,
      },
    ],
    attachments: [] as { id: string; fileName: string; imageUrl: string }[],
    transferHistory: [] as { employeeName: string; date: string; note?: string }[],
    currentEmployeeName: "Assigned Employee",
  };

  const detail = groupChatDetails[selectedChat.id] || fallbackDetail;

  const getSenderProfile = (sender: GroupSender) => {
    // Prefer participant names coming from mock data.
    const participant =
      sender === "admin"
        ? detail.participants.admin
        : sender === "employee"
          ? detail.participants.employee
          : sender === "partner"
            ? detail.participants.partner
            : detail.participants.user;

    const letter = (participant?.name || "U").charAt(0);

    // Distinct colors per sender type.
    const bg =
      sender === "admin"
        ? "#b91c1c"
        : sender === "employee"
          ? "#991b1b"
          : sender === "partner"
            ? "#15803d"
            : "#7f1d1d";

    return { letter, bg };
  };

  const baseMessages = useMemo<ChatMessage[]>(
    () =>
      (detail.messages ?? []).map((msg) => ({
        id: msg.id,
        sender: msg.sender,
        text: msg.text,
        sentAt: msg.sentAt,
      })),
    [detail]
  );

  const [messages, setMessages] = useState<ChatMessage[]>(baseMessages);
  const isSendDisabled = messageDraft.trim().length === 0 && selectedFiles.length === 0;

  const transferAssigneeOptions = useMemo(
    () => [
      { value: "admin", label: "Admin" },
      { value: "employee_1", label: "Employee 1" },
      { value: "employee_2", label: "Employee 2" },
      { value: "employee_3", label: "Employee 3" },
    ],
    []
  );

  useEffect(() => {
    setMessages(baseMessages);
    setMessageDraft("");
    setSelectedFiles([]);
  }, [baseMessages, selectedChat.id]);

  useEffect(() => {
    if (!messageAreaRef.current) return;
    messageAreaRef.current.scrollTop = messageAreaRef.current.scrollHeight;
  }, [messages, selectedFiles]);

  const openAttachmentPicker = () => fileInputRef.current?.click();

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

  const formatNow = () =>
    new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

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

  return (
    <div className="main-page-content">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
             className="financial-subpage-back text-danger"
            onClick={() => navigate(ROUTES.TICKET_MANAGEMENT_GROUP_CHAT.path)}
            aria-label="Back to group chat list"
          >
            <i className="bi bi-chevron-left" />
          </button>
          <h4 className="m-0 p-0">Group Chat</h4>
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
                  style={{ backgroundColor: selectedChat.avatarColor }}
                >
                  {selectedChat.groupName.charAt(0)}
                </div>
                <div>
                  <h6 className="normal-chat-user-name mb-0">{selectedChat.groupName}</h6>
                  <small className="normal-chat-time">{selectedChat.groupId}</small>
                </div>
              </div>
            </div>

            <div className="normal-chat-message-area" ref={messageAreaRef}>
              {messages.map((msg) => {
                // WhatsApp-style: messages from the logged-in user (employee) appear on the right.
                const isLeft = msg.sender !== "employee";
                const senderProfile = getSenderProfile(msg.sender);
                return (
                  <div
                    key={msg.id}
                    className={`d-flex mb-2 ${isLeft ? "justify-content-start" : "justify-content-end"}`}
                    
                  >
                    {isLeft && (
                      <div
                        className="group-chat-sender-icon"
                        style={{ backgroundColor: senderProfile.bg, marginRight: 8 }}
                        aria-label="sender avatar"
                      >
                        {senderProfile.letter}
                      </div>
                    )}

                    <div className={`normal-chat-bubble ${isLeft ? "user" : "employee"}`}>
                      <p className="mb-1">{msg.text}</p>
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div
                          className={`normal-chat-bubble-attachments ${
                            msg.attachments.length > 1 ? "normal-chat-bubble-attachments-grid" : ""
                          }`}
                        >
                          {msg.attachments.map((attachment) => (
                            <div key={attachment.id} className="normal-chat-bubble-attachment-item">
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
                                <div className="normal-chat-attachment-caption">{attachment.caption}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      <small>{msg.sentAt}</small>
                    </div>

                    {!isLeft && (
                      <div
                        className="group-chat-sender-icon"
                        style={{ backgroundColor: senderProfile.bg, marginLeft: 8 }}
                        aria-label="sender avatar"
                      >
                        {senderProfile.letter}
                      </div>
                    )}
                  </div>
                );
              })}
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
                          <img src={file.previewUrl} alt={file.file.name} className="normal-chat-selected-preview" />
                        ) : (
                          <video src={file.previewUrl} className="normal-chat-selected-preview" controls />
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
              >
                <i className="bi bi-paperclip" />
              </button>

              <input
                type="text"
                className="form-control"
                placeholder="Type a message..."
                value={messageDraft}
                onChange={(e) => setMessageDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                    if (showAttachmentModal) setShowAttachmentModal(false);
                  }
                }}
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
          <button
            type="button"
            className="btn custom-btn-primary mb-3"
            onClick={() => setShowTransferModal(true)}
          >
            Transfer Chat
          </button>
          <div className="border rounded-3 bg-white p-3">
            <h6 className="normal-chat-section-title">Transfer chats info</h6>
            <div className="mb-3 small">
              {(detail.transferHistory ?? []).length === 0 ? (
                <div className="text-muted">No transfer history yet.</div>
              ) : (
                <ul className="list-unstyled mb-2 ps-0">
                  {(detail.transferHistory ?? []).map((t, idx) => (
                    <li key={`${t.employeeName}-${idx}`} className="mb-2">
                      <span className="fw-semibold">{t.employeeName}</span>
                      <span className="text-muted"> · {t.date}</span>
                      {t.note ? <span className="d-block text-muted">({t.note})</span> : null}
                    </li>
                  ))}
                </ul>
              )}
              <div className="fw-semibold">
                Current employee — {detail.currentEmployeeName ?? detail.participants.employee.name}
              </div>
            </div>

            <h6 className="normal-chat-section-title">Participants</h6>
            <div className="small mb-3">
              <div className="mb-2">
                <span className="text-muted">Admin: </span>
                <span className="fw-semibold">{detail.participants.admin.name}</span>
                <div className="text-muted" style={{ fontSize: 12 }}>
                  {detail.participants.admin.email}
                </div>
              </div>
              <div className="mb-2">
                <span className="text-muted">Employee: </span>
                <span className="fw-semibold">{detail.participants.employee.name}</span>
                <div className="text-muted" style={{ fontSize: 12 }}>
                  {detail.participants.employee.email}
                </div>
              </div>
              <div className="mb-2">
                <span className="text-muted">Partner: </span>
                <span className="fw-semibold">{detail.participants.partner.name}</span>
                <div className="text-muted" style={{ fontSize: 12 }}>
                  {detail.participants.partner.email}
                </div>
              </div>
              <div className="mb-2">
                <span className="text-muted">User: </span>
                <span className="fw-semibold">{detail.participants.user.name}</span>
                <div className="text-muted" style={{ fontSize: 12 }}>
                  {detail.participants.user.email}
                </div>
              </div>
            </div>

            <h6 className="normal-chat-section-title">Attachments</h6>
            <div className="mb-0 normal-chat-modal-attachments-scroll">
              {(detail.attachments ?? []).length === 0 ? (
                <div className="normal-chat-attachment-row d-flex justify-content-between align-items-center gap-2">
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-paperclip" />
                    <span>No attachments</span>
                  </div>
                </div>
              ) : (
                <div className="row g-2">
                  {(detail.attachments ?? []).map((att) => (
                    <div key={att.id} className="col-6">
                      <div className="normal-chat-attachment-card">
                        <img
                          src={att.imageUrl}
                          alt={att.fileName}
                          className="normal-chat-attachment-thumb"
                          loading="lazy"
                        />
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
                    <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
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
                        <img src={file.previewUrl} alt={file.file.name} className="normal-chat-modal-preview" />
                      ) : (
                        <video src={file.previewUrl} className="normal-chat-modal-preview" controls />
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
      <TransferChatModal
        show={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        assigneeOptions={transferAssigneeOptions}
      />
    </div>
  );
};

export default GroupChatConversationPage;

