import React, { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ROUTES } from "../../routes/Routes";
import { ChatThreadKind, normalChatConversations } from "./chatMockData";

const threadKindLabel = (k: ChatThreadKind) => (k === "order" ? "Order chat" : "General chat");

const NormalChatListPage = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [search, setSearch] = useState("");
    const filter = searchParams.get("filter") === "unread" ? "unread" : "all";

    const chats = useMemo(() => {
        const keyword = search.trim().toLowerCase();

        return normalChatConversations.filter((chat) => {
            const matchFilter = filter === "unread" ? chat.unreadCount > 0 : true;
            const matchSearch =
                keyword.length === 0 ||
                chat.userName.toLowerCase().includes(keyword) ||
                chat.userId.toLowerCase().includes(keyword) ||
                chat.lastMessage.toLowerCase().includes(keyword);

            return matchFilter && matchSearch;
        });
    }, [filter, search]);

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
                    <h4 className="m-0 p-0">Order Chats</h4>
                </div>
                <button
                    type="button"
                    className="btn p-0 border-0 bg-transparent"
                    aria-label="Notifications"
                >
                    <i className="bi bi-bell-fill text-danger fs-5" />
                </button>
            </div>

            <div className="d-flex align-items-center gap-2 mb-3" role="tablist" aria-label="Order chat filters">
                    <button
                        type="button"
                        className={`normal-chat-filter-tag ${filter === "all" ? "active" : ""}`}
                        onClick={() => setSearchParams({})}
                    >
                        All
                    </button>
                    <button
                        type="button"
                        className={`normal-chat-filter-tag ${filter === "unread" ? "active" : ""}`}
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
                            placeholder="Search by user name, user ID, or last message"
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
                        chats.map((chat) => (
                            <div
                                key={chat.id}
                                className="normal-chat-list-item d-flex"
                                role="button"
                                tabIndex={0}
                                onClick={() => navigate(`${ROUTES.TICKET_MANAGEMENT_NORMAL_CHAT_VIEW.path}?chatId=${chat.id}`)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        navigate(`${ROUTES.TICKET_MANAGEMENT_NORMAL_CHAT_VIEW.path}?chatId=${chat.id}`);
                                    }
                                }}
                            >
                                <div
                                    className="normal-chat-avatar d-inline-flex align-items-center justify-content-center position-relative flex-shrink-0"
                                    style={{ backgroundColor: chat.avatarColor }}
                                >
                                    {chat.userName.charAt(0)}
                                    {chat.online && <span className="normal-chat-online-dot" />}
                                </div>

                                <div className="w-100" style={{ minWidth: 0 }}>
                                    <div className="d-flex justify-content-between align-items-center gap-2">
                                        <div className="d-flex align-items-center gap-2 flex-wrap" style={{ minWidth: 0 }}>
                                            <h6 className="normal-chat-user-name mb-0">{chat.userName}</h6>
                                            <span className="normal-chat-user-pill">{chat.userId}</span>
                                            <span
                                                className="badge rounded-pill"
                                                style={{
                                                    fontSize: 11,
                                                    fontWeight: 600,
                                                    background:
                                                        chat.threadKind === "order"
                                                            ? "var(--btn-pending, #fd7e14)"
                                                            : "var(--lb-border, #dee2e6)",
                                                    color: chat.threadKind === "order" ? "#fff" : "var(--txt-color)",
                                                }}
                                            >
                                                {threadKindLabel(chat.threadKind)}
                                            </span>
                                        </div>
                                        <span className="normal-chat-time">{chat.lastMessageAt}</span>
                                    </div>
                                    <div className="d-flex justify-content-between align-items-center gap-2">
                                        <p className="normal-chat-last-message">{chat.lastMessage}</p>
                                        {chat.unreadCount > 0 && (
                                            <span className="normal-chat-unread-badge d-inline-flex align-items-center justify-content-center">
                                                {chat.unreadCount}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default NormalChatListPage;
