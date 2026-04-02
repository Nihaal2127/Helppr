import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { EventClickArg } from "@fullcalendar/core";
import { Modal, Button, Form } from "react-bootstrap";
import { apiRequest } from "../remote/apiHelper";
import { ApiPaths } from "../remote/apiPaths";

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  orderId: string;
  partner: string;
  serviceName: string;
  serviceDate: string;
  status: "Scheduled" | "In progress" | "Completed" | "Canceled";
}

interface OrderOption {
  id: string;
  label: string;
  order?: any;
}

const MyCalendar: React.FC = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [orders, setOrders] = useState<OrderOption[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");

  const [eventTitle, setEventTitle] = useState("");
  const [orderId, setOrderId] = useState("");
  const [partner, setPartner] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [serviceDate, setServiceDate] = useState("");
  const [fromTime, setFromTime] = useState("");
  const [toTime, setToTime] = useState("");
  const [status, setStatus] = useState<CalendarEvent["status"]>("Scheduled");
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [errors, setErrors] = useState({
    title: "",
    orderId: "",
    serviceDate: "",
    fromTime: "",
    toTime: "",
  });
  const [searchKeyword, setSearchKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | CalendarEvent["status"]>("All");
  const calendarWrapperRef = useRef<HTMLDivElement | null>(null);
  const calendarRef = useRef<FullCalendar | null>(null);
  const scrollTopRef = useRef<number | null>(null);
  const focusedDateRef = useRef<Date | null>(null);
  const generateEventId = () =>
    `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  useEffect(() => {
    const bootstrapData = async () => {
      const orderRes = await apiRequest(
        `${ApiPaths.GET_ORDER()}?page=1&limit=200`,
        "GET",
        undefined,
        false,
        true
      );
      if (orderRes?.success) {
        const orderRecords = orderRes.data?.data?.records || [];
        const mapped = orderRecords.map((order: any) => ({
          id: order._id,
          label: order.unique_id || order._id,
          order,
        }));
        setOrders(mapped);
      }
    };
    bootstrapData();
  }, []);

  const getMainCalendarScroller = () => {
    const scrollers = Array.from(
      calendarWrapperRef.current?.querySelectorAll(".fc-scroller") || []
    ) as HTMLElement[];
    return (
      scrollers.find((item) => item.scrollHeight > item.clientHeight) || null
    );
  };

  const preserveScrollPosition = () => {
    const scroller = getMainCalendarScroller();
    if (scroller) {
      scrollTopRef.current = scroller.scrollTop;
    }
    const api = calendarRef.current?.getApi?.();
    if (api) {
      focusedDateRef.current = api.getDate();
    }
  };

  useLayoutEffect(() => {
    if (scrollTopRef.current === null) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const api = calendarRef.current?.getApi?.();
        if (api && focusedDateRef.current) {
          api.gotoDate(focusedDateRef.current);
        }
        const scroller = getMainCalendarScroller();
        if (scroller && scrollTopRef.current !== null) {
          scroller.scrollTop = scrollTopRef.current;
        }
        scrollTopRef.current = null;
        focusedDateRef.current = null;
      });
    });
  }, [events]);

  // 👉 Open modal from calendar click
  const handleDateClick = (info: any) => {
    setEditingEventId(null);
    setEventTitle("");
    setOrderId("");
    setPartner("");
    setServiceName("");
    setServiceDate(info.dateStr);
    setFromTime("");
    setToTime("");
    setStatus("Scheduled");
    setErrors({ title: "", orderId: "", serviceDate: "", fromTime: "", toTime: "" });
    setSelectedDate(info.dateStr);
    setShowModal(true);
  };

  // 👉 Expose function for Schedule button
  const openScheduleModal = () => {
    const today = new Date().toISOString().split("T")[0];
    setEditingEventId(null);
    setEventTitle("");
    setOrderId("");
    setPartner("");
    setServiceName("");
    setServiceDate(today);
    setFromTime("");
    setToTime("");
    setStatus("Scheduled");
    setErrors({ title: "", orderId: "", serviceDate: "", fromTime: "", toTime: "" });
    setSelectedDate(today);
    setShowModal(true);
  };

  const applyOrderDetails = async (selectedOrderText: string) => {
    setOrderId(selectedOrderText);
    const selected = orders.find((item) => item.label === selectedOrderText);
    if (!selected) return;

    const detailsRes = await apiRequest(
      `${ApiPaths.GET_ORDER_BY_ID()}/${selected.id}`,
      "GET",
      undefined,
      false,
      true
    );
    const order = detailsRes?.success
      ? detailsRes.data?.data?.record || selected.order
      : selected.order;
    if (!order) return;

    const firstService = order.service_items?.[0];
    const resolvedPartner =
      firstService?.partner_info?.name ||
      order.created_by_name ||
      "";
    const resolvedServiceName =
      firstService?.service_info?.name || "Service";
    const resolvedDate = firstService?.service_date?.split("T")[0] || selectedDate;
    const resolvedFromTime = (firstService?.service_from_time || "").slice(0, 5);
    const resolvedToTime = (firstService?.service_to_time || "").slice(0, 5);

    setPartner(resolvedPartner);
    setServiceName(resolvedServiceName);
    if (resolvedDate) {
      setServiceDate(resolvedDate);
      setSelectedDate(resolvedDate);
    }
    if (resolvedFromTime) setFromTime(resolvedFromTime);
    if (resolvedToTime) setToTime(resolvedToTime);
  };

  // 👉 Save event with time
  const handleSave = () => {
    const nextErrors = {
      title: eventTitle ? "" : "Title is required",
      orderId: orderId ? "" : "Order ID is required",
      serviceDate: serviceDate ? "" : "Service date is required",
      fromTime: fromTime ? "" : "From time is required",
      toTime: toTime ? "" : "To time is required",
    };
    setErrors(nextErrors);

    if (nextErrors.title || nextErrors.orderId || nextErrors.serviceDate || nextErrors.fromTime || nextErrors.toTime) return;

    if (fromTime >= toTime) {
      setErrors((prev) => ({
        ...prev,
        toTime: "To time must be greater than From time",
      }));
      return;
    }

    const start = `${serviceDate}T${fromTime}`;
    const end = `${serviceDate}T${toTime}`;
    preserveScrollPosition();

    if (editingEventId) {
      setEvents((prev) =>
        prev.map((event) =>
          event.id === editingEventId
            ? {
                ...event,
                title: eventTitle,
                start,
                end,
                orderId,
                partner,
                serviceName,
                serviceDate,
                status,
              }
            : event
        )
      );
    } else {
      setEvents((prev) => [
        ...prev,
        {
          id: generateEventId(),
          title: eventTitle,
          start,
          end,
          orderId,
          partner,
          serviceName,
          serviceDate,
          status,
        },
      ]);
    }

    setShowModal(false);
    setEditingEventId(null);
    setEventTitle("");
    setOrderId("");
    setPartner("");
    setServiceName("");
    setServiceDate("");
    setFromTime("");
    setToTime("");
    setStatus("Scheduled");
    setErrors({ title: "", orderId: "", serviceDate: "", fromTime: "", toTime: "" });
  };

  const handleEditEvent = (eventId: string) => {
    const event = events.find((item) => item.id === eventId);
    if (!event) return;

    setEditingEventId(event.id);
    setEventTitle(event.title);
    setOrderId(event.orderId || "");
    setPartner(event.partner || "");
    setServiceName(event.serviceName || "");
    setServiceDate(event.serviceDate || event.start.split("T")[0]);
    setSelectedDate(event.start.split("T")[0]);
    setFromTime(event.start.split("T")[1] || "");
    setToTime(event.end.split("T")[1] || "");
    setStatus(event.status || "Scheduled");
    setErrors({ title: "", orderId: "", serviceDate: "", fromTime: "", toTime: "" });
    setShowModal(true);
  };

  const handleDeleteEvent = (eventId: string) => {
    if (!window.confirm("Delete this event?")) return;
    preserveScrollPosition();
    setEvents((prev) => prev.filter((event) => event.id !== eventId));
  };

  // Prevent default delete on event click; icons control actions
  const handleEventClick = (_info: EventClickArg) => {
    return;
  };

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const keyword = searchKeyword.trim().toLowerCase();
      const matchesKeyword =
        !keyword ||
        event.orderId.toLowerCase().includes(keyword) ||
        event.partner.toLowerCase().includes(keyword);
      const matchesStatus = statusFilter === "All" || event.status === statusFilter;
      return matchesKeyword && matchesStatus;
    });
  }, [events, searchKeyword, statusFilter]);

  const buildEventTooltip = (event: any) => {
    const formatTime = (value?: string) => (value || "").slice(0, 5);
    const { extendedProps } = event;
    const startDate = (extendedProps?.serviceDate || event.startStr || "").split("T")[0];
    const startTime = formatTime((event.startStr || "").split("T")[1]);
    const endTime = formatTime((event.endStr || "").split("T")[1]);

    return [
      `Title: ${event.title || "-"}`,
      `Order ID: ${extendedProps?.orderId || "-"}`,
      `Partner: ${extendedProps?.partner || "-"}`,
      `Service: ${extendedProps?.serviceName || "-"}`,
      `Service Date: ${startDate || "-"}`,
      `Start Time: ${startTime || "-"}`,
      `End Time: ${endTime || "-"}`,
      `Status: ${extendedProps?.status || "-"}`,
    ].join("\n");
  };

  return (
    <div ref={calendarWrapperRef}>
      <div className="custom-dashboard-card mb-3">
        <div className="row g-2">
          <div className="col-md-4">
            <Form.Label>Search (Order ID / Partner)</Form.Label>
            <Form.Control
              value={searchKeyword}
              placeholder="Search by Order ID or Partner"
              onChange={(e) => setSearchKeyword(e.target.value)}
            />
          </div>
          <div className="col-md-4">
            <Form.Label>Status</Form.Label>
            <Form.Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "All" | CalendarEvent["status"])}
            >
              <option value="All">All</option>
              <option value="Scheduled">Scheduled</option>
              <option value="In progress">In progress</option>
              <option value="Completed">Completed</option>
              <option value="Canceled">Canceled</option>
            </Form.Select>
          </div>
        </div>
      </div>

      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"   // 🔥 important for time slots
        selectable
        editable
        scrollTimeReset={false}
        dateClick={handleDateClick}
        eventClick={handleEventClick}
        events={filteredEvents}
        eventDidMount={(info) => {
          info.el.setAttribute("title", buildEventTooltip(info.event));
        }}
        eventContent={(eventInfo) => (
          <div className="calendar-event-content w-100">
            <div className="calendar-event-actions-row d-flex justify-content-end">
              <div className="d-flex gap-2 calendar-event-actions">
                <i
                  className="bi bi-pencil-square calendar-event-action-icon"
                  role="button"
                  title="Edit"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditEvent(eventInfo.event.id);
                  }}
                />
                <i
                  className="bi bi-trash calendar-event-action-icon calendar-event-delete-icon"
                  role="button"
                  title="Delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteEvent(eventInfo.event.id);
                  }}
                />
              </div>
            </div>

            <div className="d-flex flex-column calendar-event-left">
              <span className="calendar-event-title">{eventInfo.event.title}</span>
              <div className="calendar-event-meta calendar-event-meta-lines">
                <small><span className="calendar-event-label">Order ID:</span> <span className="calendar-event-value">{eventInfo.event.extendedProps.orderId || "-"}</span></small>
                <small><span className="calendar-event-label">Status:</span> <span className="calendar-event-value">{eventInfo.event.extendedProps.status || "-"}</span></small>
                <small><span className="calendar-event-label">Partner:</span> <span className="calendar-event-value">{eventInfo.event.extendedProps.partner || "-"}</span></small>
              </div>
            </div>
          </div>
        )}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay"
        }}
        height="auto"
      />

      {/* Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            {editingEventId ? "Edit Appointment" : "Schedule Appointment"}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Form.Group className="mb-2">
            <Form.Label>Title</Form.Label>
            <Form.Control
              type="text"
              value={eventTitle}
              onChange={(e) => {
                setEventTitle(e.target.value);
                if (errors.title) {
                  setErrors((prev) => ({ ...prev, title: "" }));
                }
              }}
              isInvalid={!!errors.title}
            />
            <Form.Control.Feedback type="invalid">
              {errors.title}
            </Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-2">
            <Form.Label>
              Order ID <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              list="order-id-options"
              value={orderId}
              placeholder="Select/Search Order ID"
              onChange={(e) => {
                setOrderId(e.target.value);
                if (errors.orderId) {
                  setErrors((prev) => ({ ...prev, orderId: "" }));
                }
                applyOrderDetails(e.target.value);
              }}
              isInvalid={!!errors.orderId}
            />
            <datalist id="order-id-options">
              {orders.map((item) => (
                <option key={item.id} value={item.label} />
              ))}
            </datalist>
            <Form.Control.Feedback type="invalid">
              {errors.orderId}
            </Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-2">
            <Form.Label>Partner</Form.Label>
            <Form.Control
              type="text"
              value={partner}
              onChange={(e) => {
                setPartner(e.target.value);
              }}
              placeholder="Partner name"
            />
          </Form.Group>

          <Form.Group className="mb-2">
            <Form.Label>Service Name</Form.Label>
            <Form.Control
              type="text"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              placeholder="Service name"
            />
          </Form.Group>

          <Form.Group className="mb-2">
            <Form.Label>
              Service Date <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              type="date"
              value={serviceDate}
              onChange={(e) => {
                setServiceDate(e.target.value);
                setSelectedDate(e.target.value);
                if (errors.serviceDate) {
                  setErrors((prev) => ({ ...prev, serviceDate: "" }));
                }
              }}
              isInvalid={!!errors.serviceDate}
            />
            <Form.Control.Feedback type="invalid">
              {errors.serviceDate}
            </Form.Control.Feedback>
          </Form.Group>

          <div className="row g-2">
            <div className="col-md-6">
              <Form.Group className="mb-2">
                <Form.Label>Start Time <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  type="time"
                  value={fromTime}
                  onChange={(e) => {
                    setFromTime(e.target.value);
                    if (errors.fromTime) {
                      setErrors((prev) => ({ ...prev, fromTime: "" }));
                    }
                    if (errors.toTime === "To time must be greater than From time") {
                      setErrors((prev) => ({ ...prev, toTime: "" }));
                    }
                  }}
                  isInvalid={!!errors.fromTime}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.fromTime}
                </Form.Control.Feedback>
              </Form.Group>
            </div>
            <div className="col-md-6">
              <Form.Group className="mb-2">
                <Form.Label>End Time <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  type="time"
                  value={toTime}
                  onChange={(e) => {
                    setToTime(e.target.value);
                    if (errors.toTime) {
                      setErrors((prev) => ({ ...prev, toTime: "" }));
                    }
                  }}
                  isInvalid={!!errors.toTime}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.toTime}
                </Form.Control.Feedback>
              </Form.Group>
            </div>
          </div>

          <div className="row g-2">
            <div className="col-md-6">
              <Form.Group className="mb-2">
                <Form.Label>Status</Form.Label>
                <Form.Select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as CalendarEvent["status"])}
                >
                  <option value="Scheduled">Scheduled</option>
                  <option value="In progress">In progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Canceled">Canceled</option>
                </Form.Select>
              </Form.Group>
            </div>
          </div>

        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button className="btn-danger" onClick={handleSave}>
            {editingEventId ? "Update" : "Save"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Hidden trigger for parent */}
      <button style={{ display: "none" }} onClick={openScheduleModal} id="openScheduleModalBtn" />
    </div>
  );
};

export default MyCalendar;