import React, { useEffect, useMemo, useState } from "react";
import { Button, Form } from "react-bootstrap";
import CustomHeader from "../../components/CustomHeader";
import CustomTable from "../../components/CustomTable";
import {
  fetchNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  seedNotificationData,
} from "../../services/notificationService";
import {
  NotificationFilters,
  NotificationModel,
  NotificationModule,
} from "../../models/NotificationModel";
import { formatDate } from "../../helper/utility";

const moduleOptions: { value: NotificationModule | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "order", label: "Order" },
  { value: "quote", label: "Quote" },
  { value: "payment", label: "Payment" },
  { value: "user", label: "User" },
  { value: "partner", label: "Partner" },
  { value: "ticket", label: "Dispute / Ticket" },
  { value: "chat", label: "Chat" },
];

const statusOptions = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "read", label: "Read" },
] as const;

const NotificationsPage: React.FC = () => {
  const [items, setItems] = useState<NotificationModel[]>([]);
  const [filters, setFilters] = useState<NotificationFilters>({
    keyword: "",
    module: "all",
    status: "all",
  });

  const refresh = () => {
    setItems(fetchNotifications(filters));
  };

  useEffect(() => {
    seedNotificationData();
    refresh();
  }, []);

  useEffect(() => {
    refresh();
  }, [filters.keyword, filters.module, filters.status]);

  const unreadCount = useMemo(
    () => items.filter((item) => item.status === "unread").length,
    [items]
  );

  const columns = React.useMemo(
    () => [
      {
        Header: "Title",
        accessor: "title",
      },
      {
        Header: "Message",
        accessor: "message",
      },
      {
        Header: "Module",
        accessor: "module",
        Cell: ({ row }: any) => row.original.module.toUpperCase(),
      },
      {
        Header: "Status",
        accessor: "status",
        Cell: ({ row }: any) => (
          <span
            className={
              row.original.status === "unread"
                ? "custom-pending"
                : "custom-active"
            }
          >
            {row.original.status === "read" ? "Read" : "Unread"}
          </span>
        ),
      },
      {
        Header: "Created At",
        accessor: "createdAt",
        Cell: ({ row }: any) => formatDate(row.original.createdAt),
      },
      {
        Header: "Action",
        accessor: "action",
        Cell: ({ row }: any) =>
          row.original.status === "read" ? (
            <Button
              size="sm"
              style={{
                backgroundColor: "var(--btn-success)",
                borderColor: "var(--btn-success)",
                color: "#fff",
                cursor: "default",
              }}
              disabled
            >
              Read
            </Button>
          ) : (
            <Button
              size="sm"
              className="btn-danger"
              onClick={() => {
                markNotificationAsRead(row.original.id);
                refresh();
              }}
            >
              Mark Read
            </Button>
          ),
      },
    ],
    [items]
  );

  return (
    <div className="main-page-content">
      <CustomHeader title="Notifications" />

      <div className="custom-dashboard-card">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <h3 className="custom-dashboard-title mb-0">
            Notification Center ({unreadCount} unread)
          </h3>
          <Button
            className="btn-danger custom-btn"
            onClick={() => {
              markAllNotificationsAsRead();
              refresh();
            }}
          >
            Mark All as Read
          </Button>
        </div>
      </div>

      <div className="custom-dashboard-card">
        <div className="row g-2">
          <div className="col-md-5">
            <Form.Label>Search</Form.Label>
            <Form.Control
              placeholder="Search title / message / reference"
              value={filters.keyword || ""}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, keyword: e.target.value }))
              }
            />
          </div>
          <div className="col-md-4">
            <Form.Label>Type</Form.Label>
            <Form.Select
              value={filters.module || "all"}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  module: e.target.value as NotificationModule | "all",
                }))
              }
            >
              {moduleOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Form.Select>
          </div>
          <div className="col-md-3">
            <Form.Label>Status</Form.Label>
            <Form.Select
              value={filters.status || "all"}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  status: e.target.value as "all" | "read" | "unread",
                }))
              }
            >
              {statusOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Form.Select>
          </div>
        </div>
      </div>

      <CustomTable
        columns={columns}
        data={items}
        pageSize={items.length || 10}
        currentPage={1}
        totalPages={1}
        onPageChange={() => {}}
        isPagination={false}
      />
    </div>
  );
};

export default NotificationsPage;
