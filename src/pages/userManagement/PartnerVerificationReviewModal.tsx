import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { Modal, Row, Col, Form, Button } from "react-bootstrap";
import CustomCloseButton from "../../components/CustomCloseButton";
import { UserModel } from "../../models/UserModel";
import { DocumentModel } from "../../models/DocumentModel";
import {
  fetchUserById,
  updatePartnerVerificationDecision,
} from "../../services/userService";
import {
  partnerVerificationLabel,
  normalizePartnerVerification,
  PARTNER_VERIFICATION,
} from "../../constant/partnerVerification";
import {
  DetailsRow,
  DetailsRowLinkDocument,
  formatDate,
} from "../../helper/utility";
import { CustomImagePreviewDialog } from "../../components/CustomImagePreview";
import { showErrorAlert, showSuccessAlert } from "../../helper/alertHelper";
import { openDialog } from "../../helper/DialogManager";
import editIcon from "../../assets/icons/edit_red.svg";
import deleteIcon from "../../assets/icons/delete_red.svg";
import { AppConstant } from "../../constant/AppConstant";
import CustomUploadDialog from "../../components/CustomUpload";
import { createOrUpdateDocument } from "../../services/documentUploadService";
import {
  updatePartnerDocument,
  deletePartnerDocument,
} from "../../services/partnerDocumentService";
import { openConfirmDialog } from "../../components/CustomConfirmDialog";
import { fetchCategoryDropDown } from "../../services/categoryService";
import { fetchService } from "../../services/servicesService";
import { buildViewCategoryServiceGroups } from "./partnerCategoryServiceView";
import type { ViewCategoryServicesGroup } from "./partnerCategoryServiceView";
import EditPartnerCategoriesServicesDialog from "./EditPartnerCategoriesServicesDialog";

type CatalogOption = { value: string; label: string };

type CatalogServiceLite = {
  _id: string;
  name: string;
  category_id: string;
  category_name?: string;
  desc?: string;
  price?: number | null;
};

/** Same fallback as partner details when catalogue rows are empty. */
const DUMMY_PARTNER_CATEGORY_SERVICE_GROUPS: ViewCategoryServicesGroup[] = [
  {
    categoryId: "dummy-cat-1",
    categoryLabel: "Home cleaning",
    rows: [
      {
        name: "Deep clean",
        description: "Full home sanitization, floors, walls, and fixtures.",
        price: `${AppConstant.currencySymbol}2499`,
      },
      {
        name: "Kitchen cleaning",
        description: "Degrease hob, cabinets exterior, sink, and tiles.",
        price: `${AppConstant.currencySymbol}899`,
      },
      {
        name: "Bathroom cleaning",
        description: "Tiles, fittings, glass, and disinfection.",
        price: `${AppConstant.currencySymbol}649`,
      },
    ],
  },
  {
    categoryId: "dummy-cat-2",
    categoryLabel: "Appliance repair",
    rows: [
      {
        name: "AC servicing",
        description:
          "Split / window unit gas check, filter wash, and test run.",
        price: `${AppConstant.currencySymbol}599`,
      },
      {
        name: "Washing machine repair",
        description: "Motor, drain, or board fault diagnosis and fix.",
        price: `${AppConstant.currencySymbol}450`,
      },
    ],
  },
];

type PartnerVerificationReviewModalProps = {
  userId: string;
  onClose: () => void;
  onSaved: () => void;
};

function PartnerVerificationReviewModalView({
  userId,
  onClose,
  onSaved,
}: PartnerVerificationReviewModalProps) {
  const [userDetails, setUserDetails] = useState<UserModel>();
  const [catalogServices, setCatalogServices] = useState<CatalogServiceLite[]>(
    []
  );
  const [catalogCategoryOptions, setCatalogCategoryOptions] = useState<
    CatalogOption[]
  >([]);
  const fetchRef = useRef(false);
  const [verificationDecision, setVerificationDecision] = useState<
    "approve" | "reject"
  >("approve");
  const [verificationRejectionReason, setVerificationRejectionReason] =
    useState("");
  const [verificationSubmitting, setVerificationSubmitting] = useState(false);

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
    onSaved();
  }, [fetchDataFromApi, onSaved]);

  useEffect(() => {
    void fetchDataFromApi();
  }, [fetchDataFromApi]);

  useEffect(() => {
    setVerificationDecision("approve");
    setVerificationRejectionReason("");
    setVerificationSubmitting(false);
  }, [userId, userDetails?._id]);

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
    const built = buildViewCategoryServiceGroups(
      {
        category_ids: userDetails.category_ids ?? undefined,
        service_ids: userDetails.service_ids ?? undefined,
        category_names: userDetails.category_names ?? undefined,
        service_names: userDetails.service_names ?? undefined,
      },
      catalogServices,
      catalogCategoryOptions
    );
    return built.length > 0 ? built : DUMMY_PARTNER_CATEGORY_SERVICE_GROUPS;
  }, [userDetails, catalogServices, catalogCategoryOptions]);

  const addDocument = (document: DocumentModel) => {
    CustomUploadDialog.show(async (files, _replaceUrls) => {
      const formData = new FormData();
      formData.append("type", "1");
      files.forEach((file) => formData.append("files", file));

      const { response, fileList } = await createOrUpdateDocument(
        formData,
        false
      );

      if (response) {
        const payload = { image_url: fileList[0] };
        if (!document?._id) {
          showErrorAlert("Unable to update. ID is missing.");
          return;
        }

        const responseUpdate = await updatePartnerDocument(
          payload,
          document._id
        );
        if (responseUpdate) {
          void onRefreshuser();
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
          void onRefreshuser();
        }
      },
      deleteIcon
    );
  };

  const submitVerificationDecision = useCallback(async () => {
    if (!userDetails) return;
    if (
      normalizePartnerVerification(userDetails.is_verified) ===
      PARTNER_VERIFICATION.APPROVED
    ) {
      return;
    }
    if (
      verificationDecision === "reject" &&
      !verificationRejectionReason.trim()
    ) {
      showErrorAlert("Please enter a rejection reason.");
      return;
    }
    setVerificationSubmitting(true);
    try {
      const ok = await updatePartnerVerificationDecision(userId, {
        approved: verificationDecision === "approve",
        ...(verificationDecision === "reject"
          ? {
              verification_rejection_reason:
                verificationRejectionReason.trim(),
            }
          : {}),
      });
      if (ok) {
        showSuccessAlert(
          verificationDecision === "approve"
            ? "Partner verified successfully."
            : "Partner verification rejected."
        );
        onSaved();
        onClose();
      }
    } finally {
      setVerificationSubmitting(false);
    }
  }, [
    userDetails,
    verificationDecision,
    verificationRejectionReason,
    userId,
    onSaved,
    onClose,
  ]);

  const pendingOrRejected =
    userDetails &&
    normalizePartnerVerification(userDetails.is_verified) !==
      PARTNER_VERIFICATION.APPROVED;

  return (
    <Modal
      show
      centered
      onHide={onClose}
      size="xl"
      scrollable
      dialogClassName="custom-big-modal partner-details-dialog"
    >
      <Modal.Header className="py-3 px-4 border-bottom-0">
        <Modal.Title as="h5" className="custom-modal-title">
          Review partner verification
        </Modal.Title>
        <CustomCloseButton onClose={onClose} />
      </Modal.Header>
      <Modal.Body className="px-4 pb-4 pt-0">
        <section
          className="custom-other-details mb-3"
          style={{ marginLeft: "0px", marginRight: "0px" }}
        >
          <h3>Partner</h3>
          <DetailsRow title="Name" value={userDetails?.name ?? "—"} />
          <DetailsRow title="Email" value={userDetails?.email ?? "—"} />
          <DetailsRow title="Phone" value={userDetails?.phone_number ?? "—"} />
        </section>

        <Row className="custom-helper-row">
          <Col xs={12}>
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
                        width: "15px",
                        height: "15px",
                        cursor: "pointer",
                        zIndex: 1,
                      }}
                      onClick={() => {
                        openDialog(
                          "edit-partner-categories-services-ver",
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
                        <tr style={{ borderColor: "var(--lb1-border)" }}>
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
                            className="fw-semibold py-2 ps-3 pe-0"
                            style={{ color: "var(--primary-txt-color)" }}
                          >
                            Services offered
                          </th>
                          <th
                            scope="col"
                            className="fw-semibold py-2 ps-3 pe-0"
                            style={{ color: "var(--primary-txt-color)" }}
                          >
                            Description
                          </th>
                          <th
                            scope="col"
                            className="fw-semibold py-2 ps-3 pe-0"
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
                                    borderRight: "1px solid var(--lb1-border)",
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

        <Row className="custom-helper-row mt-2">
          <Col xs={12}>
            <section
              className="custom-other-details"
              style={{ marginLeft: "0px", marginRight: "0px" }}
            >
              <h3>Verification &amp; Documents</h3>
              {pendingOrRejected ? (
                <DetailsRow
                  title="Verification Status"
                  value={
                    <div>
                      <Form>
                        <Form.Check
                          type="radio"
                          id={`pvr-approve-${userId}`}
                          name={`pvr-decision-${userId}`}
                          label="Approve"
                          checked={verificationDecision === "approve"}
                          onChange={() => setVerificationDecision("approve")}
                        />
                        <Form.Check
                          type="radio"
                          id={`pvr-reject-${userId}`}
                          name={`pvr-decision-${userId}`}
                          label="Reject"
                          checked={verificationDecision === "reject"}
                          onChange={() => setVerificationDecision("reject")}
                        />
                      </Form>
                      {verificationDecision === "reject" ? (
                        <Form.Control
                          as="textarea"
                          rows={3}
                          className="mt-2"
                          placeholder="Rejection reason"
                          value={verificationRejectionReason}
                          onChange={(e) =>
                            setVerificationRejectionReason(e.target.value)
                          }
                        />
                      ) : null}
                      <Button
                        type="button"
                        className="custom-btn-primary mt-3"
                        disabled={verificationSubmitting}
                        onClick={() => void submitVerificationDecision()}
                      >
                        {verificationSubmitting ? "Updating..." : "Update"}
                      </Button>
                    </div>
                  }
                />
              ) : (
                <DetailsRow
                  title="Verification Status"
                  value={partnerVerificationLabel(userDetails?.is_verified)}
                />
              )}
              <DetailsRow
                title="Verified Date"
                value={
                  userDetails?.verified_at
                    ? formatDate(String(userDetails.verified_at))
                    : userDetails?.last_paid_date
                    ? formatDate(String(userDetails.last_paid_date))
                    : "—"
                }
              />
              {userDetails?.verification_rejection_reason &&
              normalizePartnerVerification(userDetails?.is_verified) ===
                PARTNER_VERIFICATION.REJECTED ? (
                <DetailsRow
                  title="Rejection reason"
                  value={userDetails.verification_rejection_reason}
                />
              ) : null}
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
                  onDeleteClick={() => deleteDocument(document)}
                />
              ))}
            </section>
          </Col>
        </Row>
      </Modal.Body>
    </Modal>
  );
}

const PartnerVerificationReviewModal = Object.assign(
  PartnerVerificationReviewModalView,
  {
    show(userId: string, onSaved: () => void) {
      const id = `partner-verification-review-${String(userId).trim()}`;
      openDialog(id, (close) => (
        <PartnerVerificationReviewModalView
          userId={userId}
          onClose={close}
          onSaved={onSaved}
        />
      ));
    },
  }
) as typeof PartnerVerificationReviewModalView & {
  show: (userId: string, onSaved: () => void) => void;
};

export default PartnerVerificationReviewModal;
