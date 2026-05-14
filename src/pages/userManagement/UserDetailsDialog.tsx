import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { Modal, Col, Row } from "react-bootstrap";
import CustomCloseButton from "../../components/CustomCloseButton";
import { UserModel } from "../../models/UserModel";
import { createOrUpdateUser, fetchUserById } from "../../services/userService";
import { fetchCityDropDown } from "../../services/cityService";
import { fetchStateDropDown } from "../../services/stateService";
import { fetchAreaDropDown } from "../../services/areaService";
import editIcon from "../../assets/icons/edit_red.svg";
import profileIcon from "../../assets/icons/profile.svg";
import { DetailsRow, formatDate } from "../../helper/utility";
import ServiceDetailsDialog from "./ServiceDetailsDialog";
import UserAddressReadOnlyCards from "./UserAddressReadOnlyCards";
import UserViewAddressModal from "./UserViewAddressModal";
import type { UserViewAddressFormValues } from "./UserViewAddressModal";
import { AppConstant } from "../../constant/AppConstant";
import { getLocalStorage } from "../../helper/localStorageHelper";
import { openDialog } from "../../helper/DialogManager";
import { sanitizeIndianPincodeInput } from "../../helper/pincodeValidation";
import { showErrorAlert, showSuccessAlert } from "../../helper/alertHelper";

type UserDetailsDialogProps = {
  userId: string;
  onClose: () => void;
  onRefreshData: () => void;
};

type UserAddressEntry = {
  _id?: string;
  state_id: string;
  city_id: string;
  area_id?: string;
  pincode: string;
  address: string;
  address_status: "true" | "false";
};

const UserDetailsDialog: React.FC<UserDetailsDialogProps> & {
  show: (userId: string, onRefreshData: () => void) => void;
} = ({ userId, onClose, onRefreshData }) => {
  const [userDetails, setUserDetails] = useState<UserModel>();
  const fetchRef = useRef(false);

  const [viewAddrModalOpen, setViewAddrModalOpen] = useState(false);
  const [viewAddrMode, setViewAddrMode] = useState<"edit" | "add">("edit");
  const [viewStates, setViewStates] = useState<
    { value: string; label: string }[]
  >([]);
  const [viewCities, setViewCities] = useState<
    { value: string; label: string }[]
  >([]);
  const [viewAreas, setViewAreas] = useState<
    { value: string; label: string; pincodes?: string[]; pincode?: string }[]
  >([]);
  const [editingAddressIndex, setEditingAddressIndex] = useState<number | null>(
    null
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

  useEffect(() => {
    void fetchDataFromApi();
  }, [fetchDataFromApi]);

  useEffect(() => {
    if (!userDetails || Number(userDetails.type) !== 4) return;
    let cancelled = false;

    const loadAddressNameOptions = async () => {
      const addresses = getNormalizedAddresses(userDetails);
      const stateIds = Array.from(
        new Set(addresses.map((a) => a.state_id).filter(Boolean))
      );
      const cityIds = Array.from(
        new Set(addresses.map((a) => a.city_id).filter(Boolean))
      );

      const stateOpts = await fetchStateDropDown();
      if (!cancelled) setViewStates(stateOpts);

      if (stateIds.length > 0) {
        const cityOpts = await fetchCityDropDown(stateIds);
        if (!cancelled) setViewCities(cityOpts);
      }

      if (cityIds.length > 0) {
        const allAreas = await Promise.all(
          cityIds.map(async (cityId) => {
            const stateId =
              addresses.find((x) => x.city_id === cityId)?.state_id ?? "";
            return fetchAreaDropDown(cityId, stateId);
          })
        );
        if (!cancelled) {
          const merged = allAreas.flat();
          const unique = Array.from(
            new Map(merged.map((x) => [x.value, x])).values()
          );
          setViewAreas(unique);
        }
      }
    };

    void loadAddressNameOptions();
    return () => {
      cancelled = true;
    };
  }, [userDetails]);

  const openServices = (status: number | null) => {
    ServiceDetailsDialog.show(userId, false, status, onRefreshuser);
  };

  const onRefreshuser = async () => {
    await fetchDataFromApi();
    onRefreshData();
  };

  const loadViewCities = useCallback(async (stateId: string) => {
    if (!stateId) {
      setViewCities([]);
      return;
    }
    const opts = await fetchCityDropDown([stateId]);
    setViewCities(opts);
  }, []);
  const loadViewAreas = useCallback(async (cityId: string, stateId?: string) => {
    if (!cityId) {
      setViewAreas([]);
      return;
    }
    const opts = await fetchAreaDropDown(cityId, stateId);
    setViewAreas(opts);
  }, []);

  /** Stable ref so `UserViewAddressModal` effects do not re-run every parent render (was causing a fetch/setState loop). */
  const onViewModalFetchCities = useCallback(
    (stateId: string) => {
      void loadViewCities(stateId);
    },
    [loadViewCities]
  );
  const onViewModalFetchAreas = useCallback(
    (cityId: string, stateId?: string) => {
      void loadViewAreas(cityId, stateId);
    },
    [loadViewAreas]
  );

  const openViewAddressModal = useCallback(
    async (mode: "edit" | "add", addressIndex?: number) => {
      if (viewStates.length === 0) {
        const s = await fetchStateDropDown();
        setViewStates(s);
      }
      if (mode === "add") {
        setViewCities([]);
        setViewAreas([]);
        setEditingAddressIndex(null);
      } else {
        const indexToEdit =
          typeof addressIndex === "number" ? addressIndex : 0;
        const addresses = getNormalizedAddresses(userDetails);
        const selected = addresses[indexToEdit];
        setEditingAddressIndex(indexToEdit);
        if (selected?.state_id) {
          await loadViewCities(selected.state_id);
        } else {
          setViewCities([]);
        }
        if (selected?.city_id) {
          await loadViewAreas(selected.city_id, selected.state_id);
        } else {
          setViewAreas([]);
        }
      }
      setViewAddrMode(mode);
      setViewAddrModalOpen(true);
    },
    [viewStates.length, userDetails, loadViewCities, loadViewAreas]
  );

  const handleViewAddressSave = useCallback(
    async (values: UserViewAddressFormValues): Promise<boolean> => {
      if (!userDetails?._id) {
        showErrorAlert("Unable to save. User data is missing.");
        return false;
      }
      const pin = sanitizeIndianPincodeInput(values.postal);
      const common: Record<string, unknown> = {
        type: userDetails.type,
        is_from_web: userDetails.is_from_web,
        registration_type: 1,
        created_by_id: getLocalStorage(AppConstant.createdById),
        name: userDetails.name ?? "",
        email: userDetails.email ?? "",
        phone_number: userDetails.phone_number ?? "",
        is_active: userDetails.is_active,
        ...(userDetails.profile_url
          ? { profile_url: userDetails.profile_url }
          : {}),
        contact_name: userDetails.name ?? "",
        contact_number: userDetails.phone_number ?? "",
      };

      let payload: Record<string, unknown>;
      const existingAddresses = getNormalizedAddresses(userDetails);
      if (viewAddrMode === "edit") {
        const editIndex =
          typeof editingAddressIndex === "number" ? editingAddressIndex : 0;
        const nextAddresses = existingAddresses.map((x, idx) => {
          const isEdited = idx === editIndex;
          return {
            ...x,
            state_id: isEdited ? values.stateId : x.state_id,
            city_id: isEdited ? values.cityId : x.city_id,
            area_id: isEdited ? values.areaId : x.area_id,
            pincode: isEdited ? pin : x.pincode,
            address: isEdited ? values.line.trim() : x.address,
            address_status: isEdited ? values.addressStatus : x.address_status,
          };
        });
        const normalized = enforceSingleActiveAddress(nextAddresses, editIndex);

        payload = {
          ...common,
          add_new_address: "false",
          // Keep root block aligned with `normalized[0]` (same row as address / city / area / pincode).
          address_status: normalized[0]?.address_status ?? "false",
          address: normalized[0]?.address ?? "",
          state_id: normalized[0]?.state_id ?? "",
          city_id: normalized[0]?.city_id ?? "",
          area_id: normalized[0]?.area_id ?? "",
          pincode: normalized[0]?.pincode ?? "",
          extra_addresses: normalized.slice(1).map((x) => ({
            _id: x._id,
            state_id: x.state_id,
            city_id: x.city_id,
            area_id: x.area_id,
            pincode: x.pincode,
            address: x.address,
            address_status: x.address_status,
          })),
        };
      } else {
        const nextAddresses = [
          ...existingAddresses,
          {
            state_id: values.stateId,
            city_id: values.cityId,
            area_id: values.areaId,
            pincode: pin,
            address: values.line.trim(),
            address_status: values.addressStatus,
          } as UserAddressEntry,
        ];
        const normalized = enforceSingleActiveAddress(
          nextAddresses,
          nextAddresses.length - 1
        );

        payload = {
          ...common,
          add_new_address: "true",
          address_status: values.addressStatus,
          address: values.line.trim(),
          state_id: values.stateId,
          city_id: values.cityId,
          area_id: values.areaId,
          pincode: pin,
          contact_name: userDetails.name ?? "",
          contact_number: userDetails.phone_number ?? "",
          // Compatibility for environments where UI still expects merged address list after save.
          extra_addresses: normalized.slice(1).map((x) => ({
            _id: x._id,
            state_id: x.state_id,
            city_id: x.city_id,
            area_id: x.area_id,
            pincode: x.pincode,
            address: x.address,
            address_status: x.address_status,
          })),
        };
      }

      const ok = await createOrUpdateUser(payload, true, userDetails._id);
      if (ok) {
        showSuccessAlert(
          viewAddrMode === "edit" ? "Address updated." : "Address added."
        );
        const refreshed = await fetchUserById(userId);
        if (refreshed.response && refreshed.user) {
          setUserDetails(refreshed.user);
        }
        onRefreshData();
        return true;
      }
      showErrorAlert("Could not save address. Please try again.");
      return false;
    },
    [userDetails, viewAddrMode, editingAddressIndex, userId, onRefreshData]
  );

  const viewAddressInitial = useMemo((): UserViewAddressFormValues | null => {
    if (!userDetails) return null;
    if (viewAddrMode === "add") {
      return {
        stateId: "",
        cityId: "",
        areaId: "",
        postal: "",
        line: "",
        addressStatus: "true",
      };
    }
    const addresses = getNormalizedAddresses(userDetails);
    const selected =
      addresses[
        typeof editingAddressIndex === "number" ? editingAddressIndex : 0
      ] ?? addresses[0];
    return {
      stateId: selected?.state_id ?? "",
      cityId: selected?.city_id ?? "",
      areaId: selected?.area_id ?? "",
      postal: selected?.pincode ?? "",
      line: selected?.address ?? "",
      addressStatus: selected?.address_status ?? "true",
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- field-level deps avoid remounting on unrelated userDetails churn
  }, [
    viewAddrMode,
    editingAddressIndex,
    userDetails?._id,
    userDetails?.address,
    userDetails?.state_id,
    userDetails?.city_id,
    userDetails?.area_id,
    userDetails?.pincode,
    userDetails?.extra_addresses,
  ]);

  return (
    <>
      <Modal
        dialogClassName="custom-big-modal modal-vh-90"
        size="xl"
        show={true}
        onHide={onClose}
        centered
      >
        <Modal.Header className="py-3 px-4 border-bottom-0">
          <Modal.Title as="h5" className="custom-modal-title">
            User Information
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
                <DetailsRow title="User Name" value={userDetails?.name} />
                <DetailsRow
                  title="Phone No"
                  value={userDetails?.phone_number}
                />
                <DetailsRow
                  title="Registered Date"
                  value={formatDate(
                    userDetails?.created_at ? userDetails?.created_at : ""
                  )}
                />
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
                </div>
              </Col>
            </div>
            <img
              src={editIcon}
              alt="edit"
              onClick={() => {
                void import("./AddEditUserDialog").then(
                  ({ default: AddEditUserDialog }) => {
                    AddEditUserDialog.show(
                      4,
                      true,
                      userDetails!!,
                      onRefreshuser
                    );
                  }
                );
              }}
            />
          </div>
          {userDetails && Number(userDetails.type) === 4 ? (
            <section
              className="custom-other-details mt-3"
              style={{ padding: "10px" }}
            >
              <h3 className="mb-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
                <span>Address</span>
                <button
                  type="button"
                  className="btn btn-link p-0 text-decoration-none fw-semibold"
                  style={{ color: "var(--primary-color)", fontSize: "15px" }}
                  onClick={() => void openViewAddressModal("add")}
                >
                  + Add address
                </button>
              </h3>
              <UserAddressReadOnlyCards
                user={userDetails}
                stateOptions={viewStates}
                cityOptions={viewCities}
                areaOptions={viewAreas}
                onEdit={(index) => void openViewAddressModal("edit", index)}
              />
            </section>
          ) : null}
          <Row className="custom-helper-row">
            <section
              className="custom-other-details"
              style={{ paddingBottom: "30px" }}
            >
              <h3 className="mb-3">Services</h3>
              <div className="user-details-service-stats">
                {(
                  [
                    {
                      label: "Total Services",
                      node: (
                        <button
                          type="button"
                          className="btn btn-link p-0 m-0 align-baseline text-decoration-underline"
                          style={{
                            fontFamily: "Inter",
                            fontSize: "16px",
                            color: "var(--primary-color)",
                          }}
                          onClick={() => openServices(null)}
                        >
                          {userDetails?.total_service == null
                            ? "0"
                            : userDetails.total_service}
                        </button>
                      ),
                    },
                    {
                      label: "Completed",
                      node: (
                        <span>{userDetails?.completed_service ?? "-"}</span>
                      ),
                    },
                    {
                      label: "In Progress",
                      node: (
                        <span>{userDetails?.in_progress_service ?? "-"}</span>
                      ),
                    },
                    {
                      label: "Cancelled",
                      node: (
                        <span>{userDetails?.cancelled_service ?? "-"}</span>
                      ),
                    },
                  ] as const
                ).map(({ label, node }) => (
                  <div
                    key={label}
                    className="d-flex align-items-baseline justify-content-between gap-3"
                    style={{ minHeight: "36px" }}
                  >
                    <span
                      className="custom-personal-row-title"
                      style={{
                        flex: "1 1 auto",
                        minWidth: 0,
                        fontSize: "16px",
                        fontWeight: 600,
                      }}
                    >
                      {label}
                    </span>
                    <span
                      className="custom-personal-row-value text-center"
                      style={{
                        flex: "0 0 8.5rem",
                        fontFamily: "Inter",
                        fontSize: "16px",
                        fontWeight: "normal",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {node}
                    </span>
                  </div>
                ))}
              </div>
            </section>
            <section className="custom-other-details">
              <h3>Payment</h3>
              <DetailsRow
                title="Total Payment"
                value={`${AppConstant.currencySymbol}${
                  userDetails?.total_amount ? userDetails?.total_amount : 0
                }`}
              />
              <DetailsRow
                title="Balance Amount"
                value={`${AppConstant.currencySymbol}${
                  userDetails?.balance_amount ? userDetails?.balance_amount : 0
                }`}
              />
              <DetailsRow
                title="Refund"
                value={`${AppConstant.currencySymbol}${
                  userDetails?.refund_payment ? userDetails?.refund_payment : 0
                }`}
              />
            </section>
          </Row>
        </Modal.Body>
      </Modal>
      {userDetails ? (
        <UserViewAddressModal
          show={viewAddrModalOpen}
          title={viewAddrMode === "edit" ? "Edit address" : "Add address"}
          states={viewStates}
          cities={viewCities}
          areas={viewAreas}
          onFetchCities={onViewModalFetchCities}
          onFetchAreas={onViewModalFetchAreas}
          initial={viewAddressInitial}
          onHide={() => setViewAddrModalOpen(false)}
          onSave={handleViewAddressSave}
        />
      ) : null}
    </>
  );
};

UserDetailsDialog.show = (userId: string, onRefreshData: () => void) => {
  openDialog("user-details-modal", (close) => (
    <UserDetailsDialog
      userId={userId}
      onClose={close}
      onRefreshData={onRefreshData}
    />
  ));
};

export default UserDetailsDialog;

function getNormalizedAddresses(user: UserModel | undefined): UserAddressEntry[] {
  if (!user) return [];

  const toText = (value: unknown) => String(value ?? "").trim();
  const normalizeAddressStatus = (value: unknown): "true" | "false" =>
    value === true || String(value ?? "").toLowerCase() === "true"
      ? "true"
      : "false";

  const rootAddressFromFields: UserAddressEntry = {
    state_id: toText(user.state_id),
    city_id: toText(user.city_id),
    area_id: toText((user as { area_id?: unknown }).area_id),
    pincode: sanitizeIndianPincodeInput(toText(user.pincode)),
    address: toText(user.address),
    address_status: "true",
  };

  const rawAddress = (user as unknown as { address?: unknown }).address;
  const addressArrayFromApi: unknown[] = Array.isArray(rawAddress)
    ? rawAddress
    : [];
  const addressRowsFromApi = addressArrayFromApi
    .map((item) => {
      const row = item as Record<string, unknown>;
      return {
        _id: toText(row?._id),
        state_id: toText(row?.state_id),
        city_id: toText(row?.city_id),
        area_id: toText(row?.area_id),
        pincode: sanitizeIndianPincodeInput(toText(row?.pincode)),
        address: toText(row?.address),
        address_status: normalizeAddressStatus(row?.address_status),
      } as UserAddressEntry;
    })
    .filter((x) => x.state_id || x.city_id || x.pincode || x.address);

  const extraRows = (user.extra_addresses ?? [])
    .map((row) => ({
      _id: String(row?._id ?? ""),
      state_id: toText(row?.state_id),
      city_id: toText(row?.city_id),
      area_id: toText((row as { area_id?: unknown })?.area_id),
      pincode: sanitizeIndianPincodeInput(toText(row?.pincode)),
      address: toText(row?.address),
      address_status: normalizeAddressStatus(
        (row as { address_status?: unknown })?.address_status
      ),
    }))
    .filter((x) => x.state_id || x.city_id || x.pincode || x.address);

  const combined: UserAddressEntry[] = (
    addressRowsFromApi.length
      ? addressRowsFromApi
      : [
          rootAddressFromFields,
          ...extraRows,
        ].filter((x) => x.state_id || x.city_id || x.pincode || x.address)
  ).map((x) => ({
    ...x,
    address_status: x.address_status === "true" ? "true" : "false",
  }));

  const hasActive = combined.some((x) => x.address_status === "true");
  const normalized: UserAddressEntry[] = combined.map((x, idx) => ({
    ...x,
    address_status: hasActive ? x.address_status : idx === 0 ? "true" : "false",
  }));
  return enforceSingleActiveAddress(normalized);
}

function enforceSingleActiveAddress(
  addresses: UserAddressEntry[],
  preferredIndex?: number
): UserAddressEntry[] {
  if (!addresses.length) return addresses;

  const safePreferred =
    typeof preferredIndex === "number" &&
    preferredIndex >= 0 &&
    preferredIndex < addresses.length
      ? preferredIndex
      : -1;

  let activeIndex = -1;
  if (
    safePreferred >= 0 &&
    String(addresses[safePreferred]?.address_status) === "true"
  ) {
    activeIndex = safePreferred;
  } else {
    activeIndex = addresses.findIndex(
      (item) => String(item.address_status) === "true"
    );
  }
  if (activeIndex < 0) activeIndex = 0;

  return addresses.map((item, index) => ({
    ...item,
    address_status: index === activeIndex ? "true" : "false",
  }));
}
