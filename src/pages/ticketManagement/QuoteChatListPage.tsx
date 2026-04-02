import React, { useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ROUTES } from "../../routes/Routes";
import {
  groupChatConversations,
  quoteChatConversations,
  GroupChatConversation,
  QuoteChatConversation,
} from "./quoteChatMockData";

type ChatItem = QuoteChatConversation | GroupChatConversation;

const QuoteChatListPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");

  const isGroupList = location.pathname.includes("/group-chats");
  const unreadOnly = searchParams.get("filter") === "unread";

  const chats: ChatItem[] = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    const list = (isGroupList ? groupChatConversations : quoteChatConversations) as unknown as ChatItem[];
    return list.filter((chat: any) => {
      if (unreadOnly && !(chat.unreadCount > 0)) return false;
      if (keyword.length === 0) return true;
      const name = (isGroupList ? chat.groupName : chat.userName) as string;
      const id = (isGroupList ? chat.groupId : chat.userId) as string;
      return (
        name.toLowerCase().includes(keyword) ||
        id.toLowerCase().includes(keyword) ||
        chat.lastMessage.toLowerCase().includes(keyword)
      );
    });
  }, [isGroupList, unreadOnly, search]);

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
          <h4 className="m-0 p-0">{isGroupList ? "Group Chats" : "Quote Chats"}</h4>
        </div>
        <button type="button" className="btn p-0 border-0 bg-transparent" aria-label="Notifications">
          <i className="bi bi-bell-fill text-danger fs-5" />
        </button>
      </div>

      <div className="d-flex align-items-center gap-2 mb-3" role="tablist" aria-label="Chat list filters">
        <button
          type="button"
          className={`normal-chat-filter-tag ${!unreadOnly ? "active" : ""}`}
          onClick={() => setSearchParams({})}
        >
          All
        </button>
        <button
          type="button"
          className={`normal-chat-filter-tag ${unreadOnly ? "active" : ""}`}
          onClick={() => setSearchParams({ filter: "unread" })}
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
              placeholder={
                isGroupList
                  ? "Search by group name, group ID, or last message"
                  : "Search by user name, user ID, or last message"
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <i className="bi bi-search normal-chat-search-icon" />
          </div>
        </div>

        <div className="normal-chat-list-wrap">
          {chats.length === 0 ? (
            <div className="normal-chat-empty-state d-flex align-items-center justify-content-center">
              No chats found for this filter.
            </div>
          ) : (
            chats.map((chat) => {
              const isGroup = isGroupList;
              const title = isGroup ? (chat as any).groupName : (chat as any).userName;
              const id = isGroup ? (chat as any).groupId : (chat as any).userId;
              const online = (chat as any).online as boolean | undefined;

              return (
                <div
                  key={(chat as any).id}
                  className="normal-chat-list-item d-flex"
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    const idParam = (chat as any).id as string;
                    navigate(
                      `${isGroup ? ROUTES.TICKET_MANAGEMENT_GROUP_CHAT_VIEW.path : ROUTES.TICKET_MANAGEMENT_QUOTE_CHAT_VIEW.path
                      }?chatId=${idParam}`
                    );
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      const idParam = (chat as any).id as string;
                      navigate(
                        `${isGroup ? ROUTES.TICKET_MANAGEMENT_GROUP_CHAT_VIEW.path : ROUTES.TICKET_MANAGEMENT_QUOTE_CHAT_VIEW.path
                        }?chatId=${idParam}`
                      );
                    }
                  }}
                >
                  <div
                    className="normal-chat-avatar d-inline-flex align-items-center justify-content-center position-relative flex-shrink-0"
                    style={{ backgroundColor: (chat as any).avatarColor }}
                  >
                    {title.charAt(0)}
                    {online && <span className="normal-chat-online-dot" />}
                  </div>

                  <div className="w-100" style={{ minWidth: 0 }}>
                    <div className="d-flex justify-content-between align-items-center gap-2">
                      <div className="d-flex align-items-center gap-2" style={{ minWidth: 0 }}>
                        <h6 className="normal-chat-user-name">{title}</h6>
                        <span className="normal-chat-user-pill">{id}</span>
                      </div>
                      <span className="normal-chat-time">{(chat as any).lastMessageAt}</span>
                    </div>

                    <div className="d-flex justify-content-between align-items-center gap-2">
                      <p className="normal-chat-last-message">{(chat as any).lastMessage}</p>
                      {(chat as any).unreadCount > 0 && (
                        <span className="normal-chat-unread-badge d-inline-flex align-items-center justify-content-center">
                          {(chat as any).unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default QuoteChatListPage;

