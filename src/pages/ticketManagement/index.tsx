import React, { useState, useEffect, useCallback, useRef } from "react";
import CustomHeader from "../../components/CustomHeader";
import CustomUtilityBox from "../../components/CustomUtilityBox";
import { formatDate, textUnderlineCell } from "../../helper/utility";
import CustomTable from "../../components/CustomTable";
import EditTicketDialog from "./EditTicketDialog";
import { TicketModel } from "../../models/TicketModel";
import { fetchTicket, deleteTicket } from "../../services/ticketService";
import CustomActionColumn from "../../components/CustomActionColumn";
import { openConfirmDialog } from "../../components/CustomConfirmDialog";
import TicketDetailsDialog from "./TicketDetailsDialog";
import UserDetailsDialog from "../userManagement/UserDetailsDialog";
import { exportData } from "../../services/exportService";
import { ApiPaths } from "../../remote/apiPaths";

const TicketManagement = () => {
    const [ticketList, setTicketList] = useState<TicketModel[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
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

    useEffect(() => {
        refreshData();
    }, [pageSize, currentPage]);

    const refreshData = async () => {
        await fetchData({});
    };

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
                    {row.original.status === 1 ? "Mail" : "Call"}
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
                    onEdit={
                        row.original.status === 1
                            ? () => {
                                EditTicketDialog.show(true, row.original, () => refreshData());
                            }
                            : undefined
                    }
                    onDelete={async () => {
                        openConfirmDialog(
                            "Are you sure you want to delete? ",
                            "Delete",
                            "Cancle",
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
    ], [currentPage, pageSize]);

    return (
        <>
            <div className="main-page-content">
                <CustomHeader
                    title="Ticket Management"
                />

                <CustomUtilityBox
                    title=""
                    searchHint="Search ticket name, ID, created name etc."
                    onDownloadClick={async () => {
                        await exportData(ApiPaths.EXPORT_TICKET())
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

            </div>
        </>
    );
}

export default TicketManagement;