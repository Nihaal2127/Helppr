import React, { useEffect, useMemo, useState } from "react";
import { Button, Form, Modal } from "react-bootstrap";
import { useForm } from "react-hook-form";
import CustomHeader from "../../../components/CustomHeader";
import SettingsNav from "../../../components/SettingsNav";
import CustomTable from "../../../components/CustomTable";
import CustomUtilityBox from "../../../components/CustomUtilityBox";
import CustomActionColumn from "../../../components/CustomActionColumn";
import CustomSummaryBox from "../../../components/CustomSummaryBox";
import { capitalizeString, DetailsRow, formatDate, textUnderlineCell } from "../../../helper/utility";
import { OfferModel } from "../../../models/SettingsModel";
import { ensureSettingsSeedData, getOffers, saveOffer, voidOffer } from "../../../services/settingsService";
import CustomCloseButton from "../../../components/CustomCloseButton";

const emptyForm = {
  offerName: "",
  offerType: "percentage" as "percentage" | "fixed",
  totalOfferValue: "",
  adminContribution: "",
  partnerContribution: "",
  applicableOn: "orders" as "orders" | "quotes",
  startDate: "",
  endDate: "",
  status: "active" as "active" | "inactive",
};

const OffersManagement = () => {
  const { register, setValue } = useForm<any>();
  const [allOffers, setAllOffers] = useState<OfferModel[]>([]);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sortDirection, setSortDirection] = useState<"-1" | "1">("-1");

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<OfferModel | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isViewMode, setIsViewMode] = useState(false);
  const [selectedBox, setSelectedBox] = useState("box-offers");

  const openFormWithData = (item?: OfferModel, viewMode = false) => {
    if (!item) {
      setEditing(null);
      setForm(emptyForm);
      setIsViewMode(false);
      setShowForm(true);
      return;
    }
    setEditing(item);
    setIsViewMode(viewMode);
    setForm({
      offerName: item.offerName,
      offerType: item.offerType,
      totalOfferValue: String(item.totalOfferValue),
      adminContribution: String(item.adminContribution),
      partnerContribution: String(item.partnerContribution),
      applicableOn: item.applicableOn,
      startDate: item.startDate.split("T")[0],
      endDate: item.endDate.split("T")[0],
      status: item.status,
    });
    setShowForm(true);
  };

  const refresh = () => setAllOffers(getOffers());

  useEffect(() => {
    ensureSettingsSeedData();
    refresh();
  }, []);

  const filtered = useMemo(() => {
    const filteredData = allOffers.filter((item) => {
      const k = keyword.trim().toLowerCase();
      const matchesKeyword =
        !k ||
        item.offerName.toLowerCase().includes(k) ||
        item.offerId.toLowerCase().includes(k);
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const start = new Date(item.startDate).getTime();
      const from = fromDate ? new Date(fromDate).getTime() : null;
      const to = toDate ? new Date(toDate).getTime() : null;
      const matchesDate = (from === null || start >= from) && (to === null || start <= to);
      return matchesKeyword && matchesStatus && matchesDate;
    });

    filteredData.sort((a, b) =>
      sortDirection === "1"
        ? a.offerName.localeCompare(b.offerName)
        : b.offerName.localeCompare(a.offerName)
    );

    return filteredData;
  }, [allOffers, keyword, statusFilter, fromDate, toDate, sortDirection]);

  const downloadCsv = () => {
    const header = [
      "Offer ID",
      "Offer Name",
      "Offer Type",
      "Total Offer Value",
      "Admin Contribution",
      "Partner Contribution",
      "Start Date",
      "End Date",
      "Status",
    ];
    const rows = filtered.map((item) => [
      item.offerId,
      item.offerName,
      item.offerType,
      item.totalOfferValue,
      item.adminContribution,
      item.partnerContribution,
      item.startDate,
      item.endDate,
      item.status,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "offers.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const offerSummaryData = useMemo(
    () => ({
      Total: allOffers.length,
      Active: allOffers.filter((item) => item.status === "active").length,
      Inactive: allOffers.filter((item) => item.status === "inactive").length,
    }),
    [allOffers]
  );

  const columns = React.useMemo(
    () => [
      { Header: "SR No", accessor: "sr", Cell: ({ row }: any) => row.index + 1 },
      {
        Header: "Offer ID",
        accessor: "offerId",
        Cell: textUnderlineCell("offerId", (row) => openFormWithData(row, true)),
      },
      { Header: "Offer Name", accessor: "offerName" },
      {
        Header: "Offer Type",
        accessor: "offerType",
        Cell: ({ row }: any) => (row.original.offerType === "percentage" ? "Percentage (%)" : "Fixed Amount (Rs)"),
      },
      { Header: "Total Offer Value", accessor: "totalOfferValue" },
      { Header: "Admin Contribution", accessor: "adminContribution" },
      { Header: "Partner Contribution", accessor: "partnerContribution" },
      { Header: "Applicable On", accessor: "applicableOn" },
      { Header: "Start Date", accessor: "startDate", Cell: ({ row }: any) => formatDate(row.original.startDate) },
      { Header: "End Date", accessor: "endDate", Cell: ({ row }: any) => formatDate(row.original.endDate) },
      {
        Header: "Status",
        accessor: "status",
        Cell: ({ row }: any) => (
          <span className={row.original.status === "active" ? "custom-active" : "custom-inactive"}>
            {row.original.status === "active" ? "Active" : "Inactive"}
          </span>
        ),
      },
      {
        Header: "Action",
        accessor: "action",
        Cell: ({ row }: any) => (
          <CustomActionColumn
            row={row}
            onDelete={() => {
              voidOffer(row.original.id);
              refresh();
            }}
          />
        ),
      },
    ],
    [allOffers]
  );

  return (
    <div className="main-page-content">
      <CustomHeader
        title="Offers Management"
        titlePrefix={<SettingsNav />}
        register={register}
        setValue={setValue}
      />

      <div className="box-container">
        <CustomSummaryBox
          divId="box-offers"
          title={capitalizeString("offers")}
          data={offerSummaryData}
          onSelect={(divId) => setSelectedBox(divId)}
          isSelected={selectedBox === "box-offers"}
          onFilterChange={(filter) => {
            if (filter.status === "true") setStatusFilter("active");
            else if (filter.status === "false") setStatusFilter("inactive");
            else setStatusFilter("all");
          }}
          isAddShow={true}
          addButtonLable="Add Offer"
          onAddClick={() => openFormWithData()}
        />
      </div>

      <CustomUtilityBox
        title="Offers"
        searchHint="Search Offer Name / Offer ID"
        onSearch={(value) => setKeyword(value)}
        onSortClick={(value) => setSortDirection(value)}
        onDownloadClick={downloadCsv}
        onMoreClick={() => {}}
        hideMoreIcon={true}
      />

      <div className="custom-dashboard-card">
        <div className="d-flex align-items-end gap-3 flex-wrap">
          <div style={{ width: "180px" }}>
            <Form.Label className="mb-1">Status</Form.Label>
            <Form.Select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as "all" | "active" | "inactive")
              }
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Form.Select>
          </div>
          <div style={{ width: "170px" }}>
            <Form.Label className="mb-1">Start Date</Form.Label>
            <Form.Control type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div style={{ width: "170px" }}>
            <Form.Label className="mb-1">End Date</Form.Label>
            <Form.Control type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
        </div>
      </div>

      <CustomTable columns={columns} data={filtered} currentPage={1} totalPages={1} pageSize={filtered.length || 10} onPageChange={() => {}} isPagination={false} />

      <Modal show={showForm} onHide={() => setShowForm(false)} centered size="lg">
          <Modal.Header className="py-3 px-4 border-bottom-0">
            <Modal.Title as="h5" className="custom-modal-title">
              {editing ? (isViewMode ? "Offer Information" : "Edit Offer") : "Add Offer"}
            </Modal.Title>
            <CustomCloseButton onClose={() => setShowForm(false)} />
          </Modal.Header>
          <Modal.Body className="px-4 pb-4 pt-0" style={{ maxHeight: "70vh", overflowY: "auto" }}>
            {isViewMode && editing ? (
              <section className="custom-other-details" style={{ padding: "10px" }}>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h3 className="mb-0">Offer</h3>
                  <i
                    className="bi bi-pencil-fill fs-6 text-danger"
                    style={{ cursor: "pointer" }}
                    onClick={() => setIsViewMode(false)}
                  />
                </div>
                <div className="row">
                  <div className="col-md-6 custom-helper-column">
                    <DetailsRow title="Offer ID" value={editing.offerId} />
                    <DetailsRow title="Offer Name" value={editing.offerName} />
                    <DetailsRow title="Offer Type" value={editing.offerType === "percentage" ? "Percentage (%)" : "Fixed Amount (Rs)"} />
                    <DetailsRow title="Applicable On" value={editing.applicableOn} />
                    <DetailsRow title="Start Date" value={formatDate(editing.startDate)} />
                  </div>
                  <div className="col-md-6 custom-helper-column">
                    <DetailsRow title="Total Offer Value" value={String(editing.totalOfferValue)} />
                    <DetailsRow title="Admin Contribution" value={String(editing.adminContribution)} />
                    <DetailsRow title="Partner Contribution" value={String(editing.partnerContribution)} />
                    <DetailsRow title="Status" value={editing.status === "active" ? "Active" : "Inactive"} />
                    <DetailsRow title="End Date" value={formatDate(editing.endDate)} />
                  </div>
                </div>
              </section>
            ) : (
              <div className="row g-2">
                <div className="col-md-12">
                  <Form.Label>Offer Name</Form.Label>
                  <Form.Control value={form.offerName} onChange={(e) => setForm((p) => ({ ...p, offerName: e.target.value }))} />
                </div>
            <div className="col-md-6">
              <Form.Label>Offer Type</Form.Label>
              <Form.Select value={form.offerType} onChange={(e) => setForm((p) => ({ ...p, offerType: e.target.value as any }))}>
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed</option>
              </Form.Select>
            </div>
            <div className="col-md-6">
              <Form.Label>Offer Value</Form.Label>
              <Form.Control type="number" value={form.totalOfferValue} onChange={(e) => setForm((p) => ({ ...p, totalOfferValue: e.target.value }))} />
            </div>
            <div className="col-md-6">
              <Form.Label>Admin Contribution</Form.Label>
              <Form.Control type="number" value={form.adminContribution} onChange={(e) => setForm((p) => ({ ...p, adminContribution: e.target.value }))} />
            </div>
            <div className="col-md-6">
              <Form.Label>Partner Contribution</Form.Label>
              <Form.Control type="number" value={form.partnerContribution} onChange={(e) => setForm((p) => ({ ...p, partnerContribution: e.target.value }))} />
            </div>
            <div className="col-md-6">
              <Form.Label>Applicable On</Form.Label>
              <Form.Select value={form.applicableOn} onChange={(e) => setForm((p) => ({ ...p, applicableOn: e.target.value as any }))}>
                <option value="quotes">Quotes</option>
                <option value="orders">Orders</option>
              </Form.Select>
            </div>
            <div className="col-md-6">
              <Form.Label>Status</Form.Label>
              <Form.Select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as any }))}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Form.Select>
            </div>
            <div className="col-md-6">
              <Form.Label>Start Date</Form.Label>
              <Form.Control type="date" value={form.startDate} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} />
            </div>
            <div className="col-md-6">
              <Form.Label>End Date</Form.Label>
              <Form.Control type="date" value={form.endDate} onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))} />
            </div>
              </div>
            )}
          </Modal.Body>
          {!isViewMode && (
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button
                className="btn-danger"
                onClick={() => {
                  if (!form.offerName.trim()) return;
                  saveOffer(
                    {
                      offerId: editing?.offerId || `OFF-${String(allOffers.length + 1).padStart(3, "0")}`,
                      offerName: form.offerName,
                      offerType: form.offerType,
                      totalOfferValue: Number(form.totalOfferValue || 0),
                      adminContribution: Number(form.adminContribution || 0),
                      partnerContribution: Number(form.partnerContribution || 0),
                      applicableOn: form.applicableOn,
                      startDate: form.startDate || new Date().toISOString(),
                      endDate: form.endDate || new Date().toISOString(),
                      status: form.status,
                    },
                    editing?.id
                  );
                  setShowForm(false);
                  refresh();
                }}
              >
                {editing ? "Update" : "Save"}
              </Button>
            </Modal.Footer>
          )}
      </Modal>
    </div>
  );
};

export default OffersManagement;
