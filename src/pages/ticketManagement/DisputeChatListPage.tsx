import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import CustomUtilityBox from "../../components/CustomUtilityBox";
import CustomTable from "../../components/CustomTable";
import EditTicketDialog from "./EditTicketDialog";
import { TicketModel } from "../../lib/models/TicketModel";
import { fetchTicket, deleteTicket } from "../../services/ticketService";
import CustomActionColumn from "../../components/CustomActionColumn";
import { openConfirmDialog } from "../../components/CustomConfirmDialog";
import { ROUTES } from "../../routes/Routes";
import { formatDate } from "../../helper/utility";
import { showUserDetailsDialog } from "../../components/user";
import {
  contactTypeLabel,
  disputeStatusUiLabel,
  ticketToDisputeStatusUi,
} from "../../lib/ticket/ticketDisputeHelpers";

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
        Cell: ({ row }: { row: any }) =>
          (currentPage - 1) * pageSize + row.index + 1,
      },
      {
        Header: "User Name",
        accessor: "created_by_name",
        Cell: ({ row }: { row: any }) => (
          <span
            role="button"
            tabIndex={0}
            style={{
              color: "inherit",
              textDecoration: "underline",
              textDecorationThickness: "1px",
              cursor: "pointer",
            }}
            onClick={() =>
              showUserDetailsDialog(row.original.created_by_id, () =>
                fetchData({})
              )
            }
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                showUserDetailsDialog(row.original.created_by_id, () =>
                  fetchData({})
                );
              }
            }}
          >
            {row.original.created_by_name}
          </span>
        ),
      },
      {
        Header: "Description",
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
        Header: "Contact Type",
        accessor: "contact_type",
        Cell: ({ row }: { row: any }) => (
          <span>{contactTypeLabel(row.original.contact_type)}</span>
        ),
      },
      {
        Header: "Status",
        accessor: "status",
        Cell: ({ row }: { row: any }) => {
          const ui = ticketToDisputeStatusUi(row.original);
          const label = disputeStatusUiLabel(ui);
          const pendingStyle =
            ui === "pending" ? { color: "var(--btn-pending)" } : undefined;
          const tone =
            ui === "open" ? "active" : ui === "pending" ? "inactive" : "inactive";
          return (
            <span className={`custom-${tone}`} style={pendingStyle}>
              {label}
            </span>
          );
        },
      },
      {
        Header: "Created Date",
        accessor: "created_at",
        Cell: ({ row }: { row: any }) =>
          formatDate(row.original.created_at ? row.original.created_at : ""),
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
                    EditTicketDialog.show(true, row.original, () => {
                      fetchData({});
                    }, true);
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
        <button
          type="button"
          className="btn p-0 border-0 bg-transparent"
          aria-label="Notifications"
        >
          <i className="bi bi-bell-fill text-danger fs-5" />
        </button>
      </div>

      <CustomUtilityBox
        title=""
        searchHint="Search user name, description, etc."
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
