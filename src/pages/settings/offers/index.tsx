import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Col, Form, Modal, Row } from "react-bootstrap";
import { useForm } from "react-hook-form";
import CustomHeader from "../../../components/CustomHeader";
import SettingsNav from "../../../components/SettingsNav";
import CustomTable from "../../../components/CustomTable";
import CustomUtilityBox from "../../../components/CustomUtilityBox";
import CustomActionColumn from "../../../components/CustomActionColumn";
import CustomSummaryBox from "../../../components/CustomSummaryBox";
import { CustomFormInput } from "../../../components/CustomFormInput";
import CustomFormSelect from "../../../components/CustomFormSelect";
import CustomDatePicker from "../../../components/CustomDatePicker";
import { openConfirmDialog } from "../../../components/CustomConfirmDialog";
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

  const refresh = useCallback(() => setAllOffers(getOffers()), []);

  useEffect(() => {
    ensureSettingsSeedData();
    refresh();
  }, [refresh]);

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
              openConfirmDialog(
                "Are you sure you want to void this offer?",
                "Void",
                "Cancel",
                () => {
                  voidOffer(row.original.id);
                  refresh();
                }
              );
            }}
          />
        ),
      },
    ],
    [refresh]
  );

  const filterControls = (
    <Row className="row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 gx-3 gy-1 mt-2 mb-3 align-items-end">
      <Col>
        <CustomFormSelect
          label="Status"
          controlId="offers_status_filter"
          options={[
            { value: "all", label: "All" },
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
          ]}
          register={register}
          fieldName="offers_status_filter"
          asCol={false}
          noBottomMargin
          defaultValue={statusFilter}
          setValue={setValue}
          onChange={(e) =>
            setStatusFilter(e.target.value as "all" | "active" | "inactive")
          }
        />
      </Col>
      <Col>
        <CustomDatePicker
          label="Start Date"
          controlId="offers_start_date_filter"
          selectedDate={fromDate || null}
          onChange={(date) => {
            const next = date ? date.toISOString().slice(0, 10) : "";
            setFromDate(next);
          }}
          register={register}
          setValue={setValue}
          asCol={false}
          groupClassName="mb-0 w-100 fw-medium"
          placeholderText="Start Date"
          filterDate={() => true}
        />
      </Col>
      <Col>
        <CustomDatePicker
          label="End Date"
          controlId="offers_end_date_filter"
          selectedDate={toDate || null}
          onChange={(date) => {
            const next = date ? date.toISOString().slice(0, 10) : "";
            setToDate(next);
          }}
          register={register}
          setValue={setValue}
          asCol={false}
          groupClassName="mb-0 w-100 fw-medium"
          placeholderText="End Date"
          filterDate={() => true}
        />
      </Col>
      <Col xs="auto" className="d-flex align-items-end">
        <Button
          variant="outline-secondary"
          size="sm"
          className="custom-btn-secondary px-3"
          type="button"
          disabled={statusFilter === "all" && !fromDate && !toDate && !keyword.trim()}
          onClick={() => {
            setStatusFilter("all");
            setFromDate("");
            setToDate("");
            setKeyword("");
            setValue("offers_status_filter", "all", { shouldValidate: false });
            setValue("offers_start_date_filter", "", { shouldValidate: false });
            setValue("offers_end_date_filter", "", { shouldValidate: false });
          }}
        >
          Clear
        </Button>
      </Col>
    </Row>
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
        searchOnlyToolbar
        onSearch={(value) => setKeyword(value)}
        onSortClick={(value) => setSortDirection(value)}
        onDownloadClick={downloadCsv}
        onMoreClick={() => {}}
      />

      {filterControls}

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
              <div className="row gx-3 gy-2">
                <div className="col-md-12">
                  <CustomFormInput
                    label="Offer Name"
                    controlId="offer_name"
                    placeholder="Enter Offer Name"
                    register={register}
                    asCol={false}
                    value={form.offerName}
                    onChange={(value: string) => setForm((p) => ({ ...p, offerName: value }))}
                  />
                </div>
                <div className="col-md-6">
                  <CustomFormSelect
                    label="Offer Type"
                    controlId="offer_type"
                    options={[
                      { value: "percentage", label: "Percentage" },
                      { value: "fixed", label: "Fixed" },
                    ]}
                    register={register}
                    fieldName="offer_type"
                    asCol={false}
                    defaultValue={form.offerType}
                    setValue={setValue}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, offerType: e.target.value as "percentage" | "fixed" }))
                    }
                  />
                </div>
                <div className="col-md-6">
                  <CustomFormInput
                    label="Offer Value"
                    controlId="total_offer_value"
                    placeholder="Enter Offer Value"
                    register={register}
                    asCol={false}
                    inputType="number"
                    value={form.totalOfferValue}
                    onChange={(value: string) => setForm((p) => ({ ...p, totalOfferValue: value }))}
                  />
                </div>
                <div className="col-md-6">
                  <CustomFormInput
                    label="Admin Contribution"
                    controlId="admin_contribution"
                    placeholder="Enter Admin Contribution"
                    register={register}
                    asCol={false}
                    inputType="number"
                    value={form.adminContribution}
                    onChange={(value: string) => setForm((p) => ({ ...p, adminContribution: value }))}
                  />
                </div>
                <div className="col-md-6">
                  <CustomFormInput
                    label="Partner Contribution"
                    controlId="partner_contribution"
                    placeholder="Enter Partner Contribution"
                    register={register}
                    asCol={false}
                    inputType="number"
                    value={form.partnerContribution}
                    onChange={(value: string) => setForm((p) => ({ ...p, partnerContribution: value }))}
                  />
                </div>
                <div className="col-md-6">
                  <Form.Label className="mb-1 fw-medium">Start Date</Form.Label>
                  <CustomDatePicker
                    label=""
                    controlId="offer_start_date"
                    selectedDate={form.startDate || null}
                    onChange={(date) => {
                      const next = date ? date.toISOString().slice(0, 10) : "";
                      setForm((p) => ({ ...p, startDate: next }));
                    }}
                    register={register}
                    setValue={setValue}
                    asCol={false}
                    groupClassName="mb-0 w-100 "
                    placeholderText="Start Date"
                    filterDate={() => true}
                  />
                </div>
                <div className="col-md-6">
                  <Form.Label className="mb-1 fw-medium">End Date</Form.Label>
                  <CustomDatePicker
                    label=""
                    controlId="offer_end_date"
                    selectedDate={form.endDate || null}
                    onChange={(date) => {
                      const next = date ? date.toISOString().slice(0, 10) : "";
                      setForm((p) => ({ ...p, endDate: next }));
                    }}
                    register={register}
                    setValue={setValue}
                    asCol={false}
                    groupClassName="mb-0 w-100"
                    placeholderText="End Date"
                    filterDate={() => true}
                  />
                </div>
                <div className="col-md-6">
                  <CustomFormSelect
                    label="Applicable On"
                    controlId="applicable_on"
                    options={[
                      { value: "quotes", label: "Quotes" },
                      { value: "orders", label: "Orders" },
                    ]}
                    register={register}
                    fieldName="applicable_on"
                    asCol={false}
                    defaultValue={form.applicableOn}
                    setValue={setValue}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, applicableOn: e.target.value as "quotes" | "orders" }))
                    }
                  />
                </div>
                <div className="col-md-6">
                  <Form.Group style={{ marginTop: "10px" }}>
                    <Form.Label className="fw-medium mb-1">Status</Form.Label>
                    <div className="d-flex" style={{ flexDirection: "row", gap: "8px" }}>
                      <Form.Check
                        type="radio"
                        id="offer_status_active"
                        label={<span className="custom-radio-text">Active</span>}
                        value="active"
                        checked={form.status === "active"}
                        onChange={() => setForm((p) => ({ ...p, status: "active" }))}
                        className="custom-radio-check"
                      />
                      <Form.Check
                        type="radio"
                        id="offer_status_inactive"
                        label={<span className="custom-radio-text">Inactive</span>}
                        value="inactive"
                        checked={form.status === "inactive"}
                        onChange={() => setForm((p) => ({ ...p, status: "inactive" }))}
                        className="custom-radio-check"
                      />
                    </div>
                  </Form.Group>
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
