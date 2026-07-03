import React from "react";
import {
  ChatAttachmentItem,
  ChatTransferHistoryItem,
  downloadChatMediaFile,
} from "../../lib/chat/chatDisplayHelpers";
import { showErrorAlert } from "../../lib/global/alertHelper";
import {
  ChatRecordModel,
  ChatUserDisplay,
  chatCustomerDisplayName,
  chatEmployeeDisplayName,
  chatHasAssignedEmployee,
} from "../../lib/models/ChatModel";
import { APP_USER_TYPE } from "../../services/userService";

type ChatConversationSidebarProps = {
  chatMeta: ChatRecordModel | null;
  isGroup: boolean;
  disputeSummary?: string;
  showTransfer: boolean;
  canTransfer?: boolean;
  transferHistory: ChatTransferHistoryItem[];
  attachments: ChatAttachmentItem[];
  customerEmail?: string;
  employeeEmail?: string;
  onTransferClick: () => void;
};

function participantByType(
  users: ChatUserDisplay[] | undefined,
  type: number
): ChatUserDisplay | undefined {
  return users?.find((u) => Number(u.type) === type);
}

const ChatConversationSidebar: React.FC<ChatConversationSidebarProps> = ({
  chatMeta,
  isGroup,
  disputeSummary,
  showTransfer,
  canTransfer = false,
  transferHistory,
  attachments,
  customerEmail,
  employeeEmail,
  onTransferClick,
}) => {
  const customerName = chatMeta ? chatCustomerDisplayName(chatMeta) : "—";
  const hasEmployee = chatMeta ? chatHasAssignedEmployee(chatMeta) : false;
  const participants = chatMeta?.participantUsers ?? [];
  const admin = participantByType(participants, APP_USER_TYPE.FRANCHISE_ADMIN);
  const employee = participantByType(participants, APP_USER_TYPE.FRANCHISE_EMPLOYEE);
  const employeeName =
    hasEmployee && chatMeta
      ? employee?.name ||
        chatMeta.assignedToUser?.name ||
        chatEmployeeDisplayName(chatMeta) ||
        "—"
      : "";
  const partner = participantByType(participants, APP_USER_TYPE.PARTNER);
  const customer = participantByType(participants, APP_USER_TYPE.CUSTOMER);

  return (
    <div className="normal-chat-sidebar">
      {showTransfer && canTransfer && (
        <button
          type="button"
          className="btn custom-btn-primary w-100 mb-3"
          onClick={onTransferClick}
        >
          Transfer Chat
        </button>
      )}

      <div className="border rounded-3 bg-white p-3 normal-chat-sidebar-card">
        <h6 className="normal-chat-section-title">Transfer chats info</h6>
        <div className="mb-3 small">
          {transferHistory.length === 0 ? (
            <div className="text-muted">No transfer history yet.</div>
          ) : (
            <ul className="list-unstyled mb-2 ps-0">
              {transferHistory.map((entry, idx) => (
                <li key={`${entry.employeeName}-${idx}`} className="mb-2">
                  <span className="fw-semibold">{entry.employeeName}</span>
                  <span className="text-muted"> · {entry.date}</span>
                  {entry.note ? (
                    <span className="d-block text-muted">({entry.note})</span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          <div className="fw-semibold">
            {hasEmployee ? `Current employee — ${employeeName}` : "No employee assigned"}
          </div>
        </div>

        <h6 className="normal-chat-section-title">User Details</h6>
        {disputeSummary ? (
          <div className="small text-muted mb-2">{disputeSummary}</div>
        ) : null}
        <div className="row g-2 mb-3">
          <span className="col-4 normal-chat-detail-key">Name</span>
          <strong className="col-8 normal-chat-detail-value">{customerName}</strong>
          <span className="col-4 normal-chat-detail-key">Email</span>
          <strong className="col-8 normal-chat-detail-value">
            {customerEmail || "—"}
          </strong>
        </div>

        <h6 className="normal-chat-section-title">Employee Details</h6>
        {hasEmployee ? (
          <div className="row g-2 mb-3">
            <span className="col-4 normal-chat-detail-key">Name</span>
            <strong className="col-8 normal-chat-detail-value">{employeeName}</strong>
            <span className="col-4 normal-chat-detail-key">Email</span>
            <strong className="col-8 normal-chat-detail-value">
              {employeeEmail || "—"}
            </strong>
          </div>
        ) : (
          <div className="mb-3 normal-chat-detail-value">No Employee</div>
        )}

        {isGroup && (
          <>
            <h6 className="normal-chat-section-title">Participants</h6>
            <div className="small mb-3">
              <div className="mb-1">
                <span className="text-muted">Admin: </span>
                <span className="fw-semibold">{admin?.name || "—"}</span>
              </div>
              {hasEmployee ? (
                <div className="mb-1">
                  <span className="text-muted">Employee: </span>
                  <span className="fw-semibold">{employeeName}</span>
                </div>
              ) : null}
              <div className="mb-1">
                <span className="text-muted">Partner: </span>
                <span className="fw-semibold">{partner?.name || "—"}</span>
              </div>
              <div className="mb-1">
                <span className="text-muted">User: </span>
                <span className="fw-semibold">{customer?.name || customerName}</span>
              </div>
            </div>
          </>
        )}

        <h6 className="normal-chat-section-title">Attachments</h6>
        <div className="mb-0 normal-chat-sidebar-attachments">
          {attachments.length === 0 ? (
            <div className="normal-chat-attachment-row d-flex justify-content-between align-items-center gap-2">
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-paperclip" />
                <span>No attachments</span>
              </div>
            </div>
          ) : (
            <div className="row g-2">
              {attachments.map((att) => {
                const isPdf = /\.pdf(\?.*)?$/i.test(att.fileName);
                const canDownload = isPdf || att.isImage;

                const handleAttachmentDownload = async () => {
                  const ok = await downloadChatMediaFile(
                    att.mediaKey ?? att.url,
                    att.fileName
                  );
                  if (!ok) {
                    showErrorAlert("Could not download the file. Please try again.");
                  }
                };

                const card = (
                  <div className="normal-chat-attachment-card">
                    {att.isImage ? (
                      <img
                        src={att.url}
                        alt={att.fileName}
                        className="normal-chat-attachment-thumb"
                        loading="lazy"
                      />
                    ) : (
                      <div className="normal-chat-attachment-file-thumb d-flex align-items-center justify-content-center">
                        <i
                          className={`bi ${isPdf ? "bi-file-earmark-pdf" : "bi-file-earmark-text"} fs-4 text-danger`}
                        />
                      </div>
                    )}
                    <div className="p-2 d-flex align-items-start gap-2">
                      <div className="normal-chat-attachment-name flex-grow-1">{att.fileName}</div>
                      {canDownload && (
                        <i className="bi bi-download normal-chat-attachment-download-icon" aria-hidden />
                      )}
                    </div>
                  </div>
                );

                return (
                  <div key={att.id} className="col-6">
                    {canDownload ? (
                      <button
                        type="button"
                        className="normal-chat-attachment-download-btn text-decoration-none"
                        onClick={() => void handleAttachmentDownload()}
                        aria-label={`Download ${att.fileName}`}
                      >
                        {card}
                      </button>
                    ) : (
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-decoration-none"
                      >
                        {card}
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatConversationSidebar;
