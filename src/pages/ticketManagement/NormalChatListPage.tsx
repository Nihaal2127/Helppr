import React, { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ROUTES } from "../../routes/Routes";
import { useChatContext } from "../../lib/chat/ChatProvider";
import {
  chatCustomerDisplayName,
  chatEmployeeDisplayName,
  chatLastMessagePreview,
  chatLastMessageAtIso,
} from "../../lib/models/ChatModel";
import { formatChatInboxListTime } from "../../lib/chat/chatDisplayHelpers";
import { filterChatsByType } from "../../services/chatService";
import ChatInboxListItem from "../../components/chat/ChatInboxListItem";

const NormalChatListPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const { inbox, inboxLoading, socketConnected, socketError, typingByChatId, isChatParticipantOnline } = useChatContext();
  const filter = searchParams.get("filter") === "unread" ? "unread" : "all";

  const chats = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return filterChatsByType(inbox, "support").filter((chat) => {
      const matchFilter = filter === "unread" ? (chat.unreadCount ?? 0) > 0 : true;
      const customer = chatCustomerDisplayName(chat).toLowerCase();
      const employee = chatEmployeeDisplayName(chat).toLowerCase();
      const preview = chatLastMessagePreview(chat).toLowerCase();
      const matchSearch =
        keyword.length === 0 ||
        customer.includes(keyword) ||
        employee.includes(keyword) ||
        preview.includes(keyword) ||
        chat._id.toLowerCase().includes(keyword);
      return matchFilter && matchSearch;
    });
  }, [filter, inbox, search]);

  return (
    <div className="main-page-content">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="financial-subpage-back text-danger"
            onClick={() => navigate(ROUTES.TICKET_MANAGEMENT.path)}
            aria-label="Back to ticket management"
          >
            <i className="bi bi-chevron-left" />
          </button>
          <h4 className="m-0 p-0">General Chats</h4>
          {socketConnected ? (
            <span className="badge bg-success-subtle text-success border border-success-subtle">
              Live
            </span>
          ) : (
            <span className="badge bg-warning-subtle text-warning border border-warning-subtle">
              {socketError ? "Offline" : "Connecting…"}
            </span>
          )}
        </div>
      </div>

      <div className="d-flex align-items-center gap-2 mb-3" role="tablist">
        <button
          type="button"
          className={`normal-chat-filter-tag ${filter === "all" ? "active" : ""}`}
          onClick={() => navigate(ROUTES.TICKET_MANAGEMENT_NORMAL_CHAT.path)}
        >
          All
        </button>
        <button
          type="button"
          className={`normal-chat-filter-tag ${filter === "unread" ? "active" : ""}`}
          onClick={() =>
            navigate(`${ROUTES.TICKET_MANAGEMENT_NORMAL_CHAT.path}?filter=unread`)
          }
        >
          Unread
        </button>
      </div>

      <div className="normal-chat-page">
        <div className="normal-chat-search-wrap">
          <div className="normal-chat-search-input-wrap">
            <input
              className="normal-chat-search-input"
              type="text"
              placeholder="Search by user name or last message"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <i className="bi bi-search normal-chat-search-icon" />
          </div>
        </div>

        <div className="normal-chat-list-wrap">
          {inboxLoading && chats.length === 0 ? (
            <div className="normal-chat-empty-state d-flex align-items-center justify-content-center">
              Loading chats…
            </div>
          ) : chats.length === 0 ? (
            <div className="normal-chat-empty-state d-flex align-items-center justify-content-center">
              No chats found for this filter.
            </div>
          ) : (
            chats.map((chat) => {
              const name = chatCustomerDisplayName(chat);
              const typingLabel = typingByChatId[chat._id];
              const preview = typingLabel
                ? typingLabel === "typing"
                  ? "typing…"
                  : `${typingLabel} typing…`
                : chatLastMessagePreview(chat);
              const customerUser =
                (chat.participantUsers ?? []).find((u) => Number(u.type) === 4) ??
                chat.participantUsers?.[0];
              return (
                <ChatInboxListItem
                  key={chat._id}
                  name={name}
                  preview={preview}
                  avatarName={name}
                  avatarImageUrl={customerUser?.profile_url}
                  unreadCount={chat.unreadCount}
                  lastMessageTime={formatChatInboxListTime(chatLastMessageAtIso(chat))}
                  isOnline={isChatParticipantOnline(chat)}
                  subtitle={
                    chatEmployeeDisplayName(chat)
                      ? `Handler: ${chatEmployeeDisplayName(chat)}`
                      : "No employee assigned"
                  }
                  onClick={() =>
                    navigate(
                      `${ROUTES.TICKET_MANAGEMENT_NORMAL_CHAT_VIEW.path}?chatId=${chat._id}`
                    )
                  }
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default NormalChatListPage;
