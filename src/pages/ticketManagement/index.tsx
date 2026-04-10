import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import CustomHeader from "../../components/CustomHeader";
import CustomUtilityBox from "../../components/CustomUtilityBox";
import { formatDate, textUnderlineCell } from "../../helper/utility";
import CustomTable from "../../components/CustomTable"; 
import CustomSummaryBox from "../../components/CustomSummaryBox";
import EditTicketDialog from "./EditTicketDialog";
import { TicketModel } from "../../models/TicketModel";
import { fetchTicket, deleteTicket } from "../../services/ticketService";
import CustomActionColumn from "../../components/CustomActionColumn";
import { openConfirmDialog } from "../../components/CustomConfirmDialog";
import TicketDetailsDialog from "./TicketDetailsDialog";
import UserDetailsDialog from "../userManagement/UserDetailsDialog";
import { exportData } from "../../services/exportService";
import { ApiPaths } from "../../remote/apiPaths";
import { ROUTES } from "../../routes/Routes";
import { normalChatConversations } from "./chatMockData";
import { groupChatConversations, quoteChatConversations } from "./quoteChatMockData";

type ChatCardType = "normal" | "dispute" | "quote" | "group";

const TicketManagement = () => {
    const navigate = useNavigate();
    const [ticketList, setTicketList] = useState<TicketModel[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    // Keep cards inactive by default; clicking opens their respective pages.
    const [selectedChatCard, setSelectedChatCard] = useState<ChatCardType | "">("");
    const fetchRef = useRef(false);

    const fetchData = useCallback(async (filters: {
        keyword?: string;
        status?: string;
        sort?: string;
    }) => {
        if (fetchRef.current) return;
        fetchRef.current = true;
        const { response, tickets, totalPages } = await fetchTicket(currentPage, pageSize, { ...filters, });
        if (response) {
            setTicketList(tickets);
            setTotalPages(totalPages);
        }
        fetchRef.current = false;
    }, [currentPage, pageSize]);

    const refreshData = useCallback(async () => {
        await fetchData({});
    }, [fetchData]);

    useEffect(() => {
        void refreshData();
    }, [pageSize, currentPage, refreshData]);

    const handleFilterChange = async (filters: {
        keyword?: string;
        status?: string;
        sort?: string;
    }) => {
        setCurrentPage(1);
        setTotalPages(0);
        if (Object.keys(filters).length === 0) {
            fetchRef.current = false;
        } else {
            await fetchData(filters);
        }
    };

    const orderAllCount = normalChatConversations.length;
    const orderUnreadThreads = normalChatConversations.filter((c) => c.unreadCount > 0).length;
    const disputeUnreadCount = ticketList.filter(
        (ticket: any) => Number(ticket?.status) === 1 && Number(ticket?.resolve_status) === 1
    ).length;
    const quoteAllCount = quoteChatConversations.length;
    const quoteUnreadThreads = quoteChatConversations.filter((c) => c.unreadCount > 0).length;
    const groupAllCount = groupChatConversations.length;
    const groupUnreadThreads = groupChatConversations.filter((c) => c.unreadCount > 0).length;

    const chatCards: { id: ChatCardType; title: string; data: Record<string, number> }[] = [
        { id: "normal", title: "Order Chats", data: { All: orderAllCount, Unread: orderUnreadThreads } },
        { id: "dispute", title: "Dispute Chats", data: { Open: disputeUnreadCount, Pending: 0, Closed: 0 } },
        { id: "quote", title: "Quote Chats", data: { All: quoteAllCount, Unread: quoteUnreadThreads } },
        { id: "group", title: "Group Chats", data: { All: groupAllCount, Unread: groupUnreadThreads } },
    ];

    const columns = React.useMemo(() => [
        {
            Header: "SR No",
            accessor: "serial_no",
            Cell: ({ row }: { row: any }) => (currentPage - 1) * pageSize + row.index + 1,
        },
        {
            Header: "Ticket ID", accessor: "unique_id",
            Cell: textUnderlineCell("unique_id", (row) => { TicketDetailsDialog.show(row._id, () => refreshData()) }),
        },
        {
            Header: "Query",
            accessor: "query",
            Cell: ({ row }) => (
                <div style={{
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: "200px"
                }}>
                    {row.original.query}
                </div>
            ),
        },
        {
            Header: "User ID", accessor: "user_unique_id",
            Cell: textUnderlineCell("user_unique_id", (row) => { UserDetailsDialog.show(row.created_by_id, () => refreshData()) }),
        },
        { Header: "Created Name", accessor: "created_by_name" },
        { Header: "Resolved Name", accessor: "resolved_by_name", Cell: ({ row }) => (row.original.resolved_by_name ? row.original.resolved_by_name : "-"), },
        {
            Header: "Close Date", accessor: "close_date",
            Cell: ({ row }) => formatDate(row.original.close_date ? row.original.close_date : ""),
        },
        {
            Header: "Resolve Status", accessor: "resolve_status",
            Cell: ({ row }) => {
                const value = row.original.resolve_status;
                let text = "-";
                let className = "";
                let color = "";
                if (value === 1) {
                    text = "Pending";
                    className = "custom-inactive";
                    color = "var(--btn-pending)";
                } else if (value === 2) {
                    text = "Resolved";
                    className = "custom-active";
                } else if (value === 3) {
                    text = "Unresolved";
                    className = "custom-inactive";
                }

                return (
                    <span className={className} style={{ color }}>
                        {text}
                    </span>
                );
            }
        },
        {
            Header: "Contact Type", accessor: "contact_type",
            Cell: ({ row }: { row: any }) => (
                <span>
                    {row.original.contact_type === 1 ? "Mail" : "Call"}
                </span>
            ),
        },
        {
            Header: "Status", accessor: "status",
            Cell: ({ row }: { row: any }) => (
                <span className={`custom-${row.original.status === 1 ? "active" : "inactive"}`}>
                    {row.original.status === 1 ? "Open" : "Close"}
                </span>
            ),
        },
        {
            Header: "Created Date", accessor: "created_at",
            Cell: ({ row }) => formatDate(row.original.created_at ? row.original.created_at : ""),
        },
        {
            Header: "Action",
            accessor: "action",
            Cell: ({ row }: { row: any }) => (
                <CustomActionColumn
                    row={row}
                    onChat={() => {
                        navigate(
                            `${ROUTES.TICKET_MANAGEMENT_DISPUTE_CHAT_VIEW.path}?ticketId=${row.original._id}`
                        );
                    }}
                    onEdit={
                        row.original.status === 1
                            ? () => {
                                EditTicketDialog.show(true, row.original, () => refreshData());
                            }
                            : undefined
                    }
                    onDelete={async () => {
                        openConfirmDialog(
                            "Are you sure you want to void this ticket? ",
                            "Void",
                            "Cancel",
                            async () => {
                                let response = await deleteTicket(row.original._id);
                                if (response) {
                                    refreshData();
                                }
                            });
                    }}
                />
            ),
        },
    ], [currentPage, pageSize, navigate, refreshData]);

    return (
        <>
            <div className="main-page-content">
                <CustomHeader
                    title="Ticket Management"
                />

                <div className="box-container my-franchise-box-container mb-3">
                    {chatCards.map((card) => (
                        <CustomSummaryBox
                            key={card.id}
                            divId={card.id}
                            title={card.title}
                            data={card.data}
                            onSelect={(divId) => {
                                const cardId = divId as ChatCardType;
                                if (cardId === "normal") {
                                    setSelectedChatCard(cardId);
                                    navigate(ROUTES.TICKET_MANAGEMENT_NORMAL_CHAT.path);
                                    return;
                                }
                                if (cardId === "dispute") {
                                    setSelectedChatCard(cardId);
                                    navigate(ROUTES.TICKET_MANAGEMENT_DISPUTE_CHAT.path);
                                    return;
                                }
                                if (cardId === "quote") {
                                    setSelectedChatCard(cardId);
                                    navigate(ROUTES.TICKET_MANAGEMENT_QUOTE_CHAT.path);
                                    return;
                                }
                                if (cardId === "group") {
                                    setSelectedChatCard(cardId);
                                    navigate(ROUTES.TICKET_MANAGEMENT_GROUP_CHAT.path);
                                    return;
                                }
                                setSelectedChatCard(cardId);
                            }}
                            isSelected={selectedChatCard === card.id}
                            onFilterChange={() => { }}
                            onItemClick={(key) => {
                                if (card.id === "normal") {
                                    if (key === "Unread") {
                                        navigate(`${ROUTES.TICKET_MANAGEMENT_NORMAL_CHAT.path}?filter=unread`);
                                    } else {
                                        navigate(ROUTES.TICKET_MANAGEMENT_NORMAL_CHAT.path);
                                    }
                                }
                                if (card.id === "quote") {
                                    if (key === "Unread") {
                                        navigate(`${ROUTES.TICKET_MANAGEMENT_QUOTE_CHAT.path}?filter=unread`);
                                    } else {
                                        navigate(ROUTES.TICKET_MANAGEMENT_QUOTE_CHAT.path);
                                    }
                                }
                                if (card.id === "group") {
                                    if (key === "Unread") {
                                        navigate(`${ROUTES.TICKET_MANAGEMENT_GROUP_CHAT.path}?filter=unread`);
                                    } else {
                                        navigate(ROUTES.TICKET_MANAGEMENT_GROUP_CHAT.path);
                                    }
                                }
                                if (card.id === "dispute") {
                                    navigate(ROUTES.TICKET_MANAGEMENT_DISPUTE_CHAT.path);
                                }
                            }}
                        />
                    ))}
                </div>

                {false && (
                    <>
                        <CustomUtilityBox
                            title=""
                            searchHint="Search ticket name, ID, created name etc."
                            onDownloadClick={async () => {
                                await exportData(ApiPaths.EXPORT_TICKET)
                            }}
                            onSortClick={(value) => { handleFilterChange({ sort: value }) }}
                            onMoreClick={() => { }}
                            onSearch={(value) => handleFilterChange({ keyword: value })}
                        />

                        <CustomTable
                            columns={columns}
                            data={ticketList}
                            pageSize={pageSize}
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={(page: number) => setCurrentPage(page)}
                            onLimitChange={(pageSize: number) => {
                                setPageSize(pageSize);
                                setCurrentPage(1);
                            }}
                            theadClass="table-light"
                        />
                    </>
                )}

                {false && (
                    <div className="custom-profile-box">
                        <div
                            style={{
                                minHeight: 180,
                                border: "1px dashed var(--lb1-border)",
                                borderRadius: 12,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "var(--txt-color)",
                                fontSize: 14,
                            }}
                        >
                            Quote chat section will be added here.
                        </div>
                    </div>
                )}

            </div>
        </>
    );
}

export default TicketManagement;