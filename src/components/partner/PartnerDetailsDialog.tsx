import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { Modal, Col, Row, Carousel } from "react-bootstrap";
import CustomCloseButton from "../CustomCloseButton";
import { UserModel } from "../../lib/models/UserModel";
import { BankAccountModel } from "../../lib/models/BankAccountModel";
import { fetchUserById } from "../../services/userService";
import editIcon from "../../assets/icons/edit_red.svg";
import addIcon from "../../assets/icons/add.svg";
import deleteIcon from "../../assets/icons/delete_red.svg";
import profileIcon from "../../assets/icons/profile.svg";
import {
  DetailsRow,
  DetailsRowLink,
  formatDate,
  DetailsRowLinkDocument,
} from "../../helper/utility";
import { formatGenderLabel } from "../../lib/user/genderOptions";
import AddEditBankAccountDialog from "../../pages/userManagement/AddEditBankAccountDialog";
import { DocumentModel } from "../../lib/models/DocumentModel";
import { AppConstant } from "../../lib/global/AppConstant";
import CustomUploadDialog from "../CustomUpload";
import { createOrUpdateDocument } from "../../services/documentUploadService";
import {
  updatePartnerDocument,
  deletePartnerDocument,
} from "../../services/partnerDocumentService";
import { showErrorAlert } from "../../lib/global/alertHelper";
import { openConfirmDialog } from "../CustomConfirmDialog";
import { CustomImagePreviewDialog } from "../CustomImagePreview";
import { ServiceDetailsDialog } from "../user";
import { openDialog } from "../../lib/global/DialogManager";
import { fetchCategoryDropDown } from "../../services/categoryService";
import { fetchService } from "../../services/servicesService";
import {
  buildViewCategoryServiceGroups,
  buildViewCategoryServiceGroupsFromPartnerServices,
} from "../../lib/partner/partnerCategoryServiceView";
import EditPartnerCategoriesServicesDialog from "../../pages/userManagement/EditPartnerCategoriesServicesDialog";
import { partnerBankAccountsFromUser } from "../../lib/partner/partnerFormDocuments";

type PartnerDetailsDialogProps = {
  userId: string;
  onClose: () => void;
  onRefreshData: () => void;
};

type CatalogOption = { value: string; label: string };

type CatalogServiceLite = {
  _id: string;
  name: string;
  category_id: string;
  category_name?: string;
  desc?: string;
  price?: number | null;
};

function PartnerDetailsDialogView({
  userId,
  onClose,
  onRefreshData,
}: PartnerDetailsDialogProps) {
  const [userDetails, setUserDetails] = useState<UserModel>();
  const [catalogServices, setCatalogServices] = useState<CatalogServiceLite[]>(
    []
  );
  const [catalogCategoryOptions, setCatalogCategoryOptions] = useState<
    CatalogOption[]
  >([]);
  const fetchRef = useRef(false);

  const partnerBankAccounts = useMemo(
    () => partnerBankAccountsFromUser(userDetails),
    [userDetails]
  );

  const fetchDataFromApi = useCallback(async () => {
    if (fetchRef.current) return;
    fetchRef.current = true;
    try {
      const { response, user } = await fetchUserById(userId);
      if (response) {
        setUserDetails(user!!);
      }
    } finally {
      fetchRef.current = false;
    }
  }, [userId]);

  const onRefreshuser = useCallback(async () => {
    await fetchDataFromApi();
    onRefreshData();
  }, [fetchDataFromApi, onRefreshData]);

  useEffect(() => {
    void fetchDataFromApi();
  }, [fetchDataFromApi]);

  useEffect(() => {
    if (!userDetails?.city_id) {
      setCatalogServices([]);
      setCatalogCategoryOptions([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const [cats, svcRes] = await Promise.all([
          fetchCategoryDropDown(userDetails.city_id ?? undefined),
          fetchService(1, 500, {}),
        ]);
        if (cancelled) return;
        const catList = Array.isArray(cats)
          ? cats.filter((c: CatalogOption) => c?.value)
          : [];
        setCatalogCategoryOptions([
          { value: "select-all", label: "Select All" },
          ...catList,
        ]);
        const list =
          svcRes?.response && Array.isArray(svcRes.services)
            ? svcRes.services
            : [];
        setCatalogServices(
          list.map((s) => ({
            _id: String((s as { _id?: string })._id ?? ""),
            name: String((s as { name?: string }).name ?? ""),
            category_id: String(
              (s as { category_id?: string }).category_id ?? ""
            ),
            category_name: (s as { category_name?: string }).category_name
              ? String((s as { category_name?: string }).category_name)
              : undefined,
            desc: String((s as { desc?: string }).desc ?? ""),
            price:
              (s as { price?: number | null }).price !== undefined &&
              (s as { price?: number | null }).price !== null
                ? Number((s as { price?: number }).price)
                : undefined,
          }))
        );
      } catch {
        if (!cancelled) {
          setCatalogCategoryOptions([
            { value: "select-all", label: "Select All" },
          ]);
          setCatalogServices([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userDetails?.city_id, userDetails?._id]);

  const viewCategoryServiceGroups = useMemo(() => {
    if (!userDetails) return [];
    const fromPartnerServices =
      buildViewCategoryServiceGroupsFromPartnerServices(
        userDetails.partner_services
      );
    if (fromPartnerServices.length > 0) return fromPartnerServices;
    return buildViewCategoryServiceGroups(
      {
        category_ids: userDetails.category_ids ?? undefined,
        service_ids: userDetails.service_ids ?? undefined,
        category_names: userDetails.category_names ?? undefined,
        service_names: userDetails.service_names ?? undefined,
      },
      catalogServices,
      catalogCategoryOptions
    );
  }, [userDetails, catalogServices, catalogCategoryOptions]);

  const openServices = (status: number | null) => {
    // `order_service/getAll?partner_id=` expects the partner document `_id` (ObjectId). Passing display id (e.g. P1029) can trigger a 500 from the API.
    ServiceDetailsDialog.show(userId, true, status, onRefreshuser);
  };

  const addDocument = (document: DocumentModel) => {
    CustomUploadDialog.show(async (files, replaceUrls) => {
      const formData = new FormData();
      formData.append("type", "1");
      files.forEach((file) => formData.append("files", file));

      let { response, fileList } = await createOrUpdateDocument(
        formData,
        false
      );

      if (response) {
        const payload = {
          image_url: fileList[0],
        };
        if (!document?._id) {
          showErrorAlert("Unable to update. ID is missing.");
          return;
        }

        let responseUpdate = await updatePartnerDocument(payload, document._id);
        if (responseUpdate) {
          onRefreshuser();
        }
      }
    });
  };

  const deleteDocument = async (document: DocumentModel) => {
    openConfirmDialog(
      "Are you sure you want to delete document?",
      "Delete",
      "Cancel",
      async () => {
        const response = await deletePartnerDocument(document._id);
        if (response) {
          onRefreshuser();
        }
      },
      deleteIcon
    );
  };

  return (
    <>
      <Modal
        show={true}
        onHide={onClose}
        centered
        scrollable
        size="xl"
        dialogClassName="custom-big-modal partner-details-dialog"
      >
        <Modal.Header className="py-3 px-4 border-bottom-0">
          <Modal.Title as="h5" className="custom-modal-title">
            Partner Information
          </Modal.Title>
          <CustomCloseButton onClose={onClose} />
        </Modal.Header>
        <Modal.Body className="px-4 pb-4 pt-0">
          <div className="custom-info">
            <div>
              <p>Personal</p>
              <img
                src={
                  userDetails?.profile_url
                    ? `${AppConstant.IMAGE_BASE_URL}${
                        userDetails?.profile_url
                      }?t=${Date.now()}`
                    : profileIcon
                }
                alt="User profile"
                width="160px"
                height="160px"
              />
            </div>

            <div
              className="custom-personal-details"
              style={{ flexWrap: "wrap" }}
            >
              <Col className="custom-helper-column">
                <DetailsRow title="Partner Name" value={userDetails?.name} />
                <DetailsRow
                  title="Gender"
                  value={formatGenderLabel(userDetails?.gender)}
                />
                <DetailsRow
                  title="Date of Birth"
                  value={
                    userDetails?.date_of_birth
                      ? formatDate(String(userDetails.date_of_birth))
                      : "—"
                  }
                />
                <DetailsRow
                  title="Experience"
                  value={
                    userDetails?.experience !== undefined &&
                    userDetails?.experience !== null &&
                    String(userDetails.experience).trim() !== ""
                      ? String(userDetails.experience)
                      : "—"
                  }
                />
                <DetailsRow
                  title="Phone No"
                  value={userDetails?.phone_number}
                />
                <DetailsRow title="State" value={userDetails?.state_name} />
              </Col>
              <Col className="custom-helper-column">
                <div>
                  <Row className="row custom-personal-row gx-0 align-items-start">
                    <div className="col-md-4 custom-personal-row-title">
                      Email ID
                    </div>
                    <div
                      className="col-md-8"
                      style={{
                        fontSize: "16px",
                        fontWeight: "normal",
                        fontFamily: "Inter",
                        color: "var(--txt-color)",
                        wordBreak: "break-word",
                      }}
                    >
                      {userDetails?.email === undefined ||
                      userDetails?.email === "" ||
                      userDetails?.email === null
                        ? "-"
                        : userDetails.email}
                    </div>
                  </Row>
                  <Row className="row custom-personal-row gx-0 align-items-start">
                    <div className="col-md-4 custom-personal-row-title">
                      City
                    </div>
                    <div
                      className="col-md-8"
                      style={{
                        fontSize: "16px",
                        fontWeight: "normal",
                        fontFamily: "Inter",
                        color: "var(--txt-color)",
                        wordBreak: "break-word",
                      }}
                    >
                      {userDetails?.city_name === undefined ||
                      userDetails?.city_name === "" ||
                      userDetails?.city_name === null
                        ? "-"
                        : userDetails.city_name}
                    </div>
                  </Row>
                  <Row className="row custom-personal-row gx-0 align-items-start">
                    <div className="col-md-4 custom-personal-row-title">
                      Postal Code
                    </div>
                    <div
                      className="col-md-8"
                      style={{
                        fontSize: "16px",
                        fontWeight: "normal",
                        fontFamily: "Inter",
                        color: "var(--txt-color)",
                        wordBreak: "break-word",
                      }}
                    >
                      {userDetails?.pincode === undefined ||
                      userDetails?.pincode === "" ||
                      userDetails?.pincode === null
                        ? "-"
                        : userDetails.pincode}
                    </div>
                  </Row>
                  <Row className="row custom-personal-row gx-0 align-items-start">
                    <div className="col-md-4 custom-personal-row-title">
                      Last Service Date
                    </div>
                    <div
                      className="col-md-8"
                      style={{
                        fontSize: "16px",
                        fontWeight: "normal",
                        fontFamily: "Inter",
                        color: "var(--txt-color)",
                        wordBreak: "break-word",
                      }}
                    >
                      {formatDate(
                        userDetails?.last_service_date
                          ? userDetails.last_service_date
                          : ""
                      )}
                    </div>
                  </Row>
                  <Row className="row custom-personal-row gx-0 align-items-start">
                    <div className="col-md-4 custom-personal-row-title">
                      Registered Date
                    </div>
                    <div
                      className="col-md-8"
                      style={{
                        fontSize: "16px",
                        fontWeight: "normal",
                        fontFamily: "Inter",
                        color: "var(--txt-color)",
                        wordBreak: "break-word",
                      }}
                    >
                      {formatDate(
                        userDetails?.created_at ? userDetails.created_at : ""
                      )}
                    </div>
                  </Row>
                  <Row className="row custom-personal-row gx-0 align-items-start">
                    <div className="col-md-4 custom-personal-row-title">
                      Status
                    </div>
                    <div
                      className="col-md-8"
                      style={{
                        fontSize: "16px",
                        fontWeight: "normal",
                        fontFamily: "Inter",
                        wordBreak: "break-word",
                      }}
                    >
                      <span
                        className={
                          userDetails?.is_active
                            ? "custom-active"
                            : "custom-inactive"
                        }
                      >
                        {userDetails?.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </Row>
                </div>
              </Col>
              <div
                className="w-100"
                style={{ flex: "1 1 100%", minWidth: "100%" }}
              >
                <Row
                  className="row custom-personal-row gx-0 align-items-start"
                  style={{ gap: "9rem" }}
                >
                  <Col
                    xs={12}
                    sm="auto"
                    className="custom-personal-row-title pe-sm-3 mb-1 mb-sm-0"
                  >
                    Address
                  </Col>
                  <Col xs={12} sm style={{ minWidth: 0 }}>
                    <div
                      className="text-wrap"
                      style={{
                        fontSize: "16px",
                        fontWeight: "normal",
                        fontFamily: "Inter",
                        color: "var(--txt-color)",
                        whiteSpace: "normal",
                        wordBreak: "break-word",
                      }}
                    >
                      {userDetails?.address?.trim() ? userDetails.address : "-"}
                    </div>
                  </Col>
                </Row>
              </div>
            </div>
            <img
              src={editIcon}
              alt="edit"
              onClick={() => {
                void import("../../pages/userManagement/AddEditUserDialog").then(
                  ({ default: AddEditUserDialog }) => {
                    AddEditUserDialog.show(
                      2,
                      true,
                      userDetails!!,
                      onRefreshuser
                    );
                  }
                );
              }}
            />
          </div>
          <Row className="custom-helper-row">
            <Col>
              <section
                className="custom-other-details "
                style={{ marginLeft: "0px", marginRight: "0px" }}
              >
                <h3>Serviced</h3>
                <DetailsRowLink
                  title="No of Services"
                  value={
                    userDetails?.no_of_services ?? userDetails?.total_service
                  }
                  onClick={() => openServices(null)}
                />
                <DetailsRowLink
                  title="Completed"
                  value={userDetails?.completed_service}
                  onClick={() => openServices(3)}
                />
                <DetailsRowLink
                  title="In Progress"
                  value={userDetails?.in_progress_service}
                  onClick={() => openServices(2)}
                />
                <DetailsRowLink
                  title="Cancelled"
                  value={userDetails?.cancelled_service}
                  onClick={() => openServices(4)}
                />
              </section>
            </Col>

            <Col>
              <section
                className="custom-other-details"
                style={{ marginLeft: "0px", marginRight: "0px" }}
              >
                <h3>Payment</h3>
                <DetailsRow
                  title="Total Payment"
                  value={`${AppConstant.currencySymbol}${
                    userDetails?.total_amount ? userDetails?.total_amount : 0
                  }`}
                />
                <DetailsRow
                  title="Paid Amount"
                  value={`${AppConstant.currencySymbol}${
                    userDetails?.paid_amount ? userDetails?.paid_amount : 0
                  }`}
                />
                <DetailsRow
                  title="Balance Amount"
                  value={`${AppConstant.currencySymbol}${
                    userDetails?.balance_amount
                      ? userDetails?.balance_amount
                      : 0
                  }`}
                />
                <DetailsRow
                  title="Refund"
                  value={`${AppConstant.currencySymbol}${
                    userDetails?.refund_payment
                      ? userDetails?.refund_payment
                      : 0
                  }`}
                />
              </section>
            </Col>
            <Col xs={12} md={12}>
              <section
                className="custom-other-details"
                style={{ marginLeft: "0px", marginRight: "0px" }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "10px",
                    paddingRight: "20px",
                    paddingBottom: "15px",
                  }}
                >
                  <div>
                    <h3 style={{ margin: 0 }}>Categories &amp; services</h3>
                  </div>
                  <div>
                    {userDetails ? (
                      <img
                        src={editIcon}
                        alt="Edit categories and services"
                        title="Edit categories and services"
                        className="position-absolute"
                        style={{
                          // top: "0.75rem",
                          // right: "0.75rem",
                          width: "15px",
                          height: "15px",
                          cursor: "pointer",
                          zIndex: 1,
                        }}
                        onClick={() => {
                          openDialog(
                            "edit-partner-categories-services",
                            (close) => (
                              <EditPartnerCategoriesServicesDialog
                                key={`${userDetails._id}-cat-svc-${Date.now()}`}
                                user={userDetails}
                                initialCategoryIds={(
                                  userDetails.category_ids ?? []
                                ).map(String)}
                                initialServiceIds={(
                                  userDetails.service_ids ?? []
                                ).map(String)}
                                onClose={close}
                                onSaved={() => {
                                  void onRefreshuser();
                                  close();
                                }}
                              />
                            )
                          );
                        }}
                      />
                    ) : null}
                  </div>
                </div>
                <div
                  className="rounded position-relative"
                  style={{
                    borderColor: "var(--lb1-border)",
                    background: "var(--bg-color)",
                  }}
                >
                  {viewCategoryServiceGroups.length === 0 ? (
                    <div className="text-muted small py-1">-</div>
                  ) : (
                    <div className="table-responsive">
                      <table
                        className="table table-sm table-bordered mb-0 align-middle"
                        style={{
                          fontSize: "13px",
                          color: "var(--content-txt-color)",
                          borderColor: "var(--lb1-border)",
                        }}
                      >
                        <thead>
                          <tr
                            className=""
                            style={{ borderColor: "var(--lb1-border)" }}
                          >
                            <th
                              scope="col"
                              className="fw-semibold py-1 ps-3 pe-0"
                              style={{
                                width: "22%",
                                minWidth: "120px",
                                color: "var(--primary-txt-color)",
                              }}
                            >
                              Category
                            </th>
                            <th
                              scope="col"
                              className="fw-semibold  py-2 ps-3 pe-0"
                              style={{ color: "var(--primary-txt-color)" }}
                            >
                              Services offered
                            </th>
                            <th
                              scope="col"
                              className="fw-semibold  py-2 ps-3 pe-0"
                              style={{ color: "var(--primary-txt-color)" }}
                            >
                              Description
                            </th>
                            <th
                              scope="col"
                              className="fw-semibold  py-2 ps-3 pe-0"
                              style={{ color: "var(--primary-txt-color)" }}
                            >
                              Price
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {viewCategoryServiceGroups.flatMap((g) => {
                            const rows =
                              g.rows.length > 0
                                ? g.rows
                                : [
                                    {
                                      name: "—",
                                      description: "—",
                                      price: "—",
                                    },
                                  ];
                            const rowSpan = rows.length;
                            return rows.map((row, idx) => (
                              <tr
                                key={`${g.categoryId}-${
                                  row.serviceId ?? row.name
                                }-${idx}`}
                                style={{ borderColor: "var(--lb1-border)" }}
                              >
                                {idx === 0 ? (
                                  <td
                                    className="align-middle py-2 ps-3 text-wrap fw-medium fs-6"
                                    rowSpan={rowSpan}
                                    style={{
                                      color: "#101010",
                                      verticalAlign: "middle",
                                      borderRight:
                                        "1px solid var(--lb1-border)",
                                    }}
                                  >
                                    {g.categoryLabel}
                                  </td>
                                ) : null}
                                <td className="align-top py-2 ps-3 pe-2 text-wrap fs-6">
                                  {row.name}
                                </td>
                                <td className="align-top py-2 ps-2 pe-2 text-wrap small fs-6">
                                  {row.description}
                                </td>
                                <td className="align-top py-2 ps-2 pe-3 text-nowrap fw-semibold fs-6">
                                  {row.price}
                                </td>
                              </tr>
                            ));
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </section>
            </Col>
          </Row>
          <Row>
            <Col className="custom-helper-row">
              <section
                className="custom-other-details"
                style={{ marginLeft: "0px", marginRight: "0px" }}
              >
                <h3>Verification & Documents</h3>
                {userDetails?.documents?.map((document) => (
                  <DetailsRowLinkDocument
                    key={
                      document._id ??
                      document.document_id ??
                      document.name ??
                      ""
                    }
                    title={document.name || ""}
                    isEditable={
                      document.document_image === "" ? false : true
                    }
                    onViewClick={() => CustomImagePreviewDialog(document)}
                    onAddClick={() => addDocument(document)}
                    onDeleteClick={() => addDocument(document)}
                  />
                ))}
              </section>
            </Col>

            <Col className="custom-helper-row">
              <section
                className="custom-other-details"
                style={{ marginLeft: "0px", marginRight: "0px" }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "10px",
                  }}
                >
                  <h3 style={{ margin: 0 }}>Accounts</h3>
                  <div
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      AddEditBankAccountDialog.show(
                        userId,
                        false,
                        null,
                        onRefreshuser
                      );
                    }}
                  >
                    <img
                      src={addIcon}
                      alt="Add bank account"
                      title="Add bank account"
                      style={{ width: "18px", height: "18px" }}
                    />
                    <span
                      style={{
                        textDecoration: "underline",
                        color: "var(--primary-txt-color)",
                      }}
                    >
                      Add
                    </span>
                  </div>
                </div>
                {/*
                                    <DetailsRow title="Account Name" value={userDetails?.bank_account?.account_holder_name} />
                                    <DetailsRow title="Account Number" value={userDetails?.bank_account?.account_number} />
                                    <DetailsRow title="IFSC Code" value={userDetails?.bank_account?.ifsc_code} />
                                    <DetailsRow title="Bank Name" value={userDetails?.bank_account?.bank_name} />
                                    */}
                {partnerBankAccounts.length === 0 ? (
                  <div className="text-muted small py-2">—</div>
                ) : (
                <Carousel
                  key={partnerBankAccounts.map((a) => a._id).join("-")}
                  className="partner-accounts-carousel"
                  interval={null}
                  controls={partnerBankAccounts.length > 1}
                  style={{ marginTop: "1.25rem" }}
                  indicators={partnerBankAccounts.length > 1}
                  prevIcon={
                    <i
                      className="bi bi-chevron-left fs-4 text-danger "
                      aria-hidden
                    />
                  }
                  nextIcon={
                    <i
                      className="bi bi-chevron-right fs-4 text-danger"
                      aria-hidden
                    />
                  }
                >
                  {partnerBankAccounts.map((acc) => (
                    <Carousel.Item key={acc._id || acc.account_number}>
                      <div
                        className="rounded border px-3 py-3 mx-3 mb-4 position-relative"
                        style={{
                          borderColor: "var(--lb1-border)",
                          background: "var(--bg-color)",
                        }}
                      >
                        <img
                          src={editIcon}
                          alt="Edit bank account"
                          title="Edit bank account"
                          className="position-absolute"
                          style={{
                            top: "0.75rem",
                            right: "0.75rem",
                            width: "15px",
                            height: "15px",
                            cursor: "pointer",
                            zIndex: 1,
                          }}
                          onClick={() => {
                            AddEditBankAccountDialog.show(
                              userId,
                              Boolean(acc._id),
                              acc,
                              onRefreshuser
                            );
                          }}
                        />
                        <DetailsRow
                          title="Account Name"
                          value={acc.account_holder_name}
                        />
                        <DetailsRow
                          title="Account Number"
                          value={acc.account_number}
                        />
                        <DetailsRow title="IFSC Code" value={acc.ifsc_code} />
                        <DetailsRow title="Bank Name" value={acc.bank_name} />
                        <DetailsRow
                          title="Branch"
                          value={acc.branch_name || "—"}
                        />
                        <DetailsRow
                          title="Account Status"
                          value={
                            <span
                              className={
                                acc.is_active !== false
                                  ? "custom-active"
                                  : "custom-inactive"
                              }
                            >
                              {acc.is_active !== false ? "Active" : "Inactive"}
                            </span>
                          }
                        />
                      </div>
                    </Carousel.Item>
                  ))}
                </Carousel>
                )}
              </section>
            </Col>
          </Row>
          {/* <Row className="custom-helper-row">
                            <Col xs={12} md={12}>
                                <section
                                    className="custom-other-details"
                                    style={{ marginLeft: "0px", marginRight: "0px" }}
                                >
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            marginBottom: "10px",
                                        }}
                                    >
                                        <h3 style={{ margin: 0 }}>Categories &amp; services</h3>
                                    </div>
                                    <div
                                        className="rounded border px-3 py-3 position-relative"
                                        style={{
                                            borderColor: "var(--lb1-border)",
                                            background: "var(--bg-color)",
                                        }}
                                    >
                                        {userDetails ? (
                                            <img
                                                src={editIcon}
                                                alt="Edit categories and services"
                                                title="Edit categories and services"
                                                className="position-absolute"
                                                style={{
                                                    top: "0.75rem",
                                                    right: "0.75rem",
                                                    width: "15px",
                                                    height: "15px",
                                                    cursor: "pointer",
                                                    zIndex: 1,
                                                }}
                                                onClick={() => {
                                                    openDialog("edit-partner-categories-services", (close) => (
                                                        <EditPartnerCategoriesServicesDialog
                                                            key={`${userDetails._id}-cat-svc-${Date.now()}`}
                                                            user={userDetails}
                                                            initialCategoryIds={(userDetails.category_ids ?? []).map(String)}
                                                            initialServiceIds={(userDetails.service_ids ?? []).map(String)}
                                                            onClose={close}
                                                            onSaved={() => {
                                                                void onRefreshuser();
                                                                close();
                                                            }}
                                                        />
                                                    ));
                                                }}
                                            />
                                        ) : null}
                                        {viewCategoryServiceGroups.length === 0 ? (
                                            <div className="text-muted small py-1">-</div>
                                        ) : (
                                            viewCategoryServiceGroups.map((g) => (
                                                <DetailsRow
                                                    key={g.categoryId}
                                                    title={g.categoryLabel}
                                                    value={
                                                        g.services.length > 0 ? g.services.join(", ") : "—"
                                                    }
                                                />
                                            ))
                                        )}
                                    </div>
                                </section>
                            </Col>
                        </Row> */}
        </Modal.Body>
      </Modal>
    </>
  );
}

const PartnerDetailsDialog = Object.assign(PartnerDetailsDialogView, {
  show(userId: string, onRefreshData: () => void) {
    openDialog("partner-details-modal", (close) => (
      <PartnerDetailsDialogView
        userId={userId}
        onClose={close}
        onRefreshData={onRefreshData}
      />
    ));
  },
}) as typeof PartnerDetailsDialogView & {
  show: (userId: string, onRefreshData: () => void) => void;
};

export default PartnerDetailsDialog;
