import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import CustomUtilityBox from "../../components/CustomUtilityBox";
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
import { ROUTES } from "../../routes/Routes";
import { formatDate, textUnderlineCell } from "../../helper/utility";

const DisputeChatListPage = () => {
  const navigate = useNavigate();

  const [ticketList, setTicketList] = useState<TicketModel[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);

  const fetchRef = useRef(false);

  const fetchData = useCallback(
    async (filters: { keyword?: string; status?: string; sort?: string }) => {
      if (fetchRef.current) return;
      fetchRef.current = true;
      try {
        const { response, tickets, totalPages } = await fetchTicket(
          currentPage,
          pageSize,
          { ...filters }
        );

        if (response) {
          setTicketList(Array.isArray(tickets) ? tickets : []);
          setTotalPages(typeof totalPages === "number" ? totalPages : 0);
        } else {
          setTicketList([]);
          setTotalPages(0);
        }
      } finally {
        fetchRef.current = false;
      }
    },
    [currentPage, pageSize]
  );

  useEffect(() => {
    fetchData({});
  }, [fetchData]);

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

  const columns = useMemo(
    () => [
      {
        Header: "SR No",
        accessor: "serial_no",
        Cell: ({ row }: { row: any }) => (currentPage - 1) * pageSize + row.index + 1,
      },
      {
        Header: "Ticket ID",
        accessor: "unique_id",
        Cell: textUnderlineCell("unique_id", (row) => {
          TicketDetailsDialog.show(row._id, () => fetchData({}));
        }),
      },
      {
        Header: "Query",
        accessor: "query",
        Cell: ({ row }: { row: any }) => (
          <div
            style={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: "200px",
            }}
          >
            {row.original.query}
          </div>
        ),
      },
      {
        Header: "User ID",
        accessor: "user_unique_id",
        Cell: textUnderlineCell("user_unique_id", (row) => {
          UserDetailsDialog.show(row.created_by_id, () => fetchData({}));
        }),
      },
      { Header: "Created Name", accessor: "created_by_name" },
      {
        Header: "Resolved Name",
        accessor: "resolved_by_name",
        Cell: ({ row }: { row: any }) => (row.original.resolved_by_name ? row.original.resolved_by_name : "-"),
      },
      {
        Header: "Close Date",
        accessor: "close_date",
        Cell: ({ row }: { row: any }) => formatDate(row.original.close_date ? row.original.close_date : ""),
      },
      {
        Header: "Resolve Status",
        accessor: "resolve_status",
        Cell: ({ row }: { row: any }) => {
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
        },
      },
      {
        Header: "Contact Type",
        accessor: "contact_type",
        Cell: ({ row }: { row: any }) => (
          <span>{row.original.contact_type === 1 ? "Mail" : "Call"}</span>
        ),
      },
      {
        Header: "Status",
        accessor: "status",
        Cell: ({ row }: { row: any }) => (
          <span className={`custom-${row.original.status === 1 ? "active" : "inactive"}`}>
            {row.original.status === 1 ? "Open" : "Close"}
          </span>
        ),
      },
      {
        Header: "Created Date",
        accessor: "created_at",
        Cell: ({ row }: { row: any }) => formatDate(row.original.created_at ? row.original.created_at : ""),
      },
      {
        Header: "Action",
        accessor: "action",
        Cell: ({ row }: { row: any }) => (
          <CustomActionColumn
            row={row}
            onChat={() => {
              navigate(`${ROUTES.TICKET_MANAGEMENT_DISPUTE_CHAT_VIEW.path}?ticketId=${row.original._id}`);
            }}
            onEdit={
              row.original.status === 1
                ? () => {
                    EditTicketDialog.show(true, row.original, () => fetchData({}));
                  }
                : undefined
            }
            onDelete={async () => {
              openConfirmDialog(
                "Are you sure you want to void this ticket? ",
                "Void",
                "Cancel",
                async () => {
                  const response = await deleteTicket(row.original._id);
                  if (response) {
                    fetchData({});
                  }
                }
              );
            }}
          />
        ),
      },
    ],
    [currentPage, pageSize, navigate, fetchData]
  );

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
          <h4 className="m-0 p-0">Dispute Chats</h4>
        </div>
        <button type="button" className="btn p-0 border-0 bg-transparent" aria-label="Notifications">
          <i className="bi bi-bell-fill text-danger fs-5" />
        </button>
      </div>

      <CustomUtilityBox
        title=""
        searchHint="Search ticket name, ID, created name etc."
        onDownloadClick={async () => {
          await exportData(ApiPaths.EXPORT_TICKET);
        }}
        onSortClick={(value) => {
          handleFilterChange({ sort: value });
        }}
        onMoreClick={() => {}}
        onSearch={(value) => handleFilterChange({ keyword: value })}
      />

      <CustomTable
        columns={columns as any}
        data={ticketList}
        pageSize={pageSize}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={(page: number) => setCurrentPage(page)}
        onLimitChange={(size: number) => {
          setPageSize(size);
          setCurrentPage(1);
        }}
        theadClass="table-light"
      />
    </div>
  );
};

export default DisputeChatListPage;

