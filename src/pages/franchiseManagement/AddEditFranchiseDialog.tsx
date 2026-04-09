import React, { useEffect, useMemo, useState } from "react";
import { useForm, UseFormRegister } from "react-hook-form";
import { Modal, Button, Row, Col } from "react-bootstrap";
import CustomCloseButton from "../../components/CustomCloseButton";
import { FranchiseModel } from "../../models/FranchiseModels";
import { CustomFormInput } from "../../components/CustomFormInput";
import { CustomRadioSelection } from "../../components/CustomRadioSelection";
import CustomFormSelect from "../../components/CustomFormSelect";
import CustomMultiSelect from "../../components/CustomMultiSelect";
import { DetailsRow, getStatusOptions } from "../../helper/utility";
import { showErrorAlert } from "../../helper/alertHelper";
import { createOrUpdateFranchise } from "../../services/franchiseService";
import { openDialog } from "../../helper/DialogManager";

type AddEditFranchiseDialogProps = {
    isEditable: boolean;
    isViewMode?: boolean;
    franchise: FranchiseModel | null;
    onClose: () => void;
    onRefreshData: () => void;
};

type OptionType = {
    value: string;
    label: string;
};

type FranchiseFormValues = Omit<FranchiseModel, "area_id"> & {
    area_id: string[];
    desc: string;
    desc2: string;
};

const stateOptions: OptionType[] = [
    { value: "andhra_pradesh", label: "Andhra Pradesh" },
    { value: "telangana", label: "Telangana" },
];

const cityOptionsMap: Record<string, OptionType[]> = {
    andhra_pradesh: [
        { value: "vijayawada", label: "Vijayawada" },
        { value: "visakhapatnam", label: "Visakhapatnam" },
        { value: "guntur", label: "Guntur" },
    ],
    telangana: [
        { value: "hyderabad", label: "Hyderabad" },
        { value: "warangal", label: "Warangal" },
        { value: "karimnagar", label: "Karimnagar" },
    ],
};

const areaOptionsMap: Record<string, OptionType[]> = {
    vijayawada: [
        { value: "benz_circle", label: "Benz Circle" },
        { value: "patamata", label: "Patamata" },
        { value: "governorpet", label: "Governorpet" },
        { value: "kanuru", label: "Kanuru" },
        { value: "poranki", label: "Poranki" },
        { value: "penamaluru", label: "Penamaluru" },
        { value: "one_town", label: "One Town" },
        { value: "satyanarayanapuram", label: "Satyanarayanapuram" },
        { value: "moghalrajpuram", label: "Moghalrajpuram" },
        { value: "gunadala", label: "Gunadala" },
    ],
    visakhapatnam: [
        { value: "mvp_colony", label: "MVP Colony" },
        { value: "gajuwaka", label: "Gajuwaka" },
        { value: "dwarka_nagar", label: "Dwarka Nagar" },
        { value: "maddilapalem", label: "Maddilapalem" },
        { value: "nad_junction", label: "NAD Junction" },
        { value: "seethammadhara", label: "Seethammadhara" },
        { value: "akkayyapalem", label: "Akkayyapalem" },
        { value: "rushikonda", label: "Rushikonda" },
        { value: "beach_road", label: "Beach Road" },
        { value: "kancharapalem", label: "Kancharapalem" },
    ],
    guntur: [
        { value: "brodipet", label: "Brodipet" },
        { value: "arundelpet", label: "Arundelpet" },
        { value: "lakshmipuram", label: "Lakshmipuram" },
        { value: "nallapadu", label: "Nallapadu" },
        { value: "vidyanagar", label: "Vidyanagar" },
        { value: "kothapet", label: "Kothapet" },
        { value: "gujjanagundla", label: "Gujjanagundla" },
        { value: "svn_colony", label: "SVN Colony" },
        { value: "ashok_nagar", label: "Ashok Nagar" },
        { value: "pattabhipuram", label: "Pattabhipuram" },
    ],
    hyderabad: [
        { value: "ameerpet", label: "Ameerpet" },
        { value: "madhapur", label: "Madhapur" },
        { value: "kukatpally", label: "Kukatpally" },
        { value: "gachibowli", label: "Gachibowli" },
        { value: "hitech_city", label: "Hitech City" },
        { value: "begumpet", label: "Begumpet" },
        { value: "sr_nagar", label: "SR Nagar" },
        { value: "jubilee_hills", label: "Jubilee Hills" },
        { value: "banjara_hills", label: "Banjara Hills" },
        { value: "mehdipatnam", label: "Mehdipatnam" },
        { value: "dilsukhnagar", label: "Dilsukhnagar" },
        { value: "lb_nagar", label: "LB Nagar" },
    ],
    warangal: [
        { value: "hanamkonda", label: "Hanamkonda" },
        { value: "kazipet", label: "Kazipet" },
        { value: "enumamula", label: "Enumamula" },
        { value: "subedari", label: "Subedari" },
        { value: "balasamudram", label: "Balasamudram" },
        { value: "waddepally", label: "Waddepally" },
        { value: "kakaji_colony", label: "Kakaji Colony" },
        { value: "mattwada", label: "Mattwada" },
    ],
    karimnagar: [
        { value: "mankammathota", label: "Mankammathota" },
        { value: "rekurthi", label: "Rekurthi" },
        { value: "kothirampur", label: "Kothirampur" },
        { value: "mukarampura", label: "Mukarampura" },
        { value: "ramnagar", label: "Ramnagar" },
        { value: "vidyanagar", label: "Vidyanagar" },
        { value: "saptagiri_colony", label: "Saptagiri Colony" },
        { value: "algunur", label: "Algunur" },
    ],
};

const AddEditFranchiseDialog: React.FC<AddEditFranchiseDialogProps> & {
    show: (isEditable: boolean, franchise: FranchiseModel | null, onRefreshData: () => void, isViewMode?: boolean) => void;
} = ({ isEditable, isViewMode = false, franchise, onClose, onRefreshData }) => {
    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
    } = useForm<FranchiseFormValues>({
        defaultValues: {
            name: franchise?.name || "",
            desc: (franchise as any)?.desc || "",
            desc2: (franchise as any)?.desc2 || "",
            state_id: franchise?.state_id || "",
            city_id: franchise?.city_id || "",
            area_id: franchise?.area_id
                ? Array.isArray(franchise.area_id)
                    ? franchise.area_id
                    : [franchise.area_id]
                : [],
            admin_id: franchise?.admin_id || "",
            is_active: franchise?.is_active ?? true,
        },
    });

    const [areaIds, setAreaIds] = useState<string[]>(
        franchise?.area_id
            ? Array.isArray(franchise.area_id)
                ? franchise.area_id
                : [franchise.area_id]
            : []
    );

    const [adminOptions, setAdminOptions] = useState<OptionType[]>([
        { value: "admin_1", label: "Admin 1" },
        { value: "admin_2", label: "Admin 2" },
        { value: "admin_3", label: "Admin 3" },
        { value: "add_new_admin", label: "+ Add New Admin" },
    ]);
    const [localViewMode, setLocalViewMode] = useState(isViewMode);

    const selectedState = watch("state_id");
    const selectedCity = watch("city_id");
    const selectedAdmin = watch("admin_id");

    const cityOptions = useMemo(() => {
        return cityOptionsMap[selectedState] || [];
    }, [selectedState]);

    const areaOptions = useMemo(() => {
        return areaOptionsMap[selectedCity] || [];
    }, [selectedCity]);

    useEffect(() => {
        if (isEditable && franchise) {
            setValue("name", franchise.name || "");
            setValue("desc", (franchise as any)?.desc || "");
            setValue("desc2", (franchise as any)?.desc2 || "");
            setValue("state_id", franchise.state_id || "");
            setValue("city_id", franchise.city_id || "");
            setValue("admin_id", franchise.admin_id || "");
            setValue("is_active", franchise.is_active ?? true);

            const editAreaIds = franchise.area_id
                ? Array.isArray(franchise.area_id)
                    ? franchise.area_id
                    : [franchise.area_id]
                : [];

            setAreaIds(editAreaIds);
            setValue("area_id", editAreaIds);
        }
    }, [isEditable, franchise, setValue]);

    useEffect(() => {
        if (isEditable) return;
        setValue("city_id", "");
        setAreaIds([]);
        setValue("area_id", []);
    }, [selectedState, isEditable, setValue]);

    useEffect(() => {
        if (isEditable) return;
        setAreaIds([]);
        setValue("area_id", []);
    }, [selectedCity, isEditable, setValue]);

    useEffect(() => {
        if (selectedAdmin === "add_new_admin") {
            handleAddAdmin();
        }
    }, [selectedAdmin]);

    const handleAreaSelection = (selectedOptions: OptionType[]) => {
        const selectedIds = selectedOptions.map((option) => option.value);
        setAreaIds(selectedIds);
        setValue("area_id", selectedIds, { shouldValidate: true });
    };

    const handleAddAdmin = () => {
        const adminName = window.prompt("Enter new admin name");
        if (!adminName || !adminName.trim()) {
            setValue("admin_id", "", { shouldValidate: true });
            return;
        }

        const trimmedName = adminName.trim();
        const adminValue = trimmedName.toLowerCase().replace(/\s+/g, "_");

        const exists = adminOptions.some(
            (item) =>
                item.label.toLowerCase() === trimmedName.toLowerCase() ||
                item.value.toLowerCase() === adminValue.toLowerCase()
        );

        if (exists) {
            showErrorAlert("Admin already exists");
            setValue("admin_id", "", { shouldValidate: true });
            return;
        }

        const newAdmin = {
            value: adminValue,
            label: trimmedName,
        };

        setAdminOptions((prev) => {
            const filtered = prev.filter((item) => item.value !== "add_new_admin");
            return [...filtered, newAdmin, { value: "add_new_admin", label: "+ Add New Admin" }];
        });

        setValue("admin_id", newAdmin.value, { shouldValidate: true });
    };

    const onSubmitEvent = async (data: FranchiseFormValues) => {
        if (areaIds.length === 0) {
            showErrorAlert("Please select area");
            return;
        }

        const selectedStateLabel =
            stateOptions.find((item) => item.value === data.state_id)?.label || "";

        const selectedCityLabel =
            cityOptions.find((item) => item.value === data.city_id)?.label || "";

        const selectedAreaLabels = areaOptions
            .filter((item) => areaIds.includes(item.value))
            .map((item) => item.label);

        const selectedAdminLabel =
            adminOptions.find(
                (item) =>
                    item.value === data.admin_id && item.value !== "add_new_admin"
            )?.label || "";

        const payload = {
            name: data.name,
            desc: data.desc,
            state_id: data.state_id,
            state_name: selectedStateLabel,
            city_id: data.city_id,
            city_name: selectedCityLabel,
            area_id: areaIds,
            area_name: selectedAreaLabels,
            admin_id: data.admin_id,
            admin_name: selectedAdminLabel,
            is_active: data.is_active,
        };

        let response;

        if (isEditable) {
            if (!franchise?._id) {
                showErrorAlert("Unable to update. ID is missing.");
                return;
            }

            response = await createOrUpdateFranchise(payload, true, franchise._id);
        } else {
            response = await createOrUpdateFranchise(payload, false);
        }

        if (response) {
            onClose && onClose();
            onRefreshData();
        }
    };

    return (
        <Modal show={true} onHide={onClose} centered size="lg">
            <Modal.Header className="py-3 px-4 border-bottom-0">
                <Modal.Title as="h5" className="custom-modal-title">
                    {localViewMode ? "Franchise Details" : isEditable ? "Edit Franchise" : "Add Franchise"}
                </Modal.Title>
                <CustomCloseButton onClose={onClose} />
            </Modal.Header>

            <Modal.Body className="px-4 pb-4 pt-0">
                {localViewMode && franchise ? (
                    <section className="custom-other-details" style={{ padding: "10px" }}>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <h3 className="mb-0">Franchise Information</h3>
                            <i
                                className="bi bi-pencil-fill fs-6 text-danger"
                                style={{ cursor: "pointer" }}
                                onClick={() => setLocalViewMode(false)}
                            ></i>
                        </div>

                        <div className="row">
                            <div className="col-md-6 custom-helper-column">
                                <DetailsRow title="Franchise ID" value={franchise._id} />
                                <DetailsRow title="Franchise Name" value={franchise.name} />
                                <DetailsRow title="State" value={franchise.state_name ?? franchise.state_id} />
                                <DetailsRow title="City" value={franchise.city_name ?? franchise.city_id} />
                            </div>

                            <div className="col-md-6 custom-helper-column">
                                <DetailsRow
                                    title="Area"
                                    value={
                                        Array.isArray((franchise as any).area_name)
                                            ? (franchise as any).area_name.join(", ")
                                            : (franchise as any).area_name ?? franchise.area_id
                                    }
                                />
                                <DetailsRow title="Admin" value={franchise.admin_name ?? franchise.admin_id} />
                                <DetailsRow title="Status" value={franchise.is_active ? "Active" : "Inactive"} />
                                <DetailsRow title="Contact" value={(franchise as any).contact ?? "-"} />
                            </div>
                        </div>

                        <div className="mt-3 p-3 border rounded">
                            <div className="custom-personal-row-title mb-2">Description / Notes</div>
                            <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", color: "var(--txt-color)" }}>
                                {(franchise as any).description ?? (franchise as any).desc ?? "-"}
                            </div>
                        </div>
                    </section>
                ) : (
                    <form
                        noValidate
                        name="franchise-form"
                        id="franchise-form"
                        onSubmit={handleSubmit(onSubmitEvent)}
                    >
                        <Row>
                            <Col md={6}>
                                <CustomFormInput
                                    label="Franchise Name"
                                    controlId="name"
                                    placeholder="Enter Franchise Name"
                                    register={register}
                                    error={errors.name}
                                    asCol={false}
                                    validation={{ required: "Franchise name is required" }}
                                />
                            </Col>

                            <Col md={6}>
                                <CustomFormSelect
                                    label="State"
                                    controlId="State"
                                    options={stateOptions}
                                    register={register as unknown as UseFormRegister<any>}
                                    fieldName="state_id"
                                    error={errors.state_id}
                                    asCol={false}
                                    requiredMessage="Please select state"
                                    defaultValue={isEditable ? franchise?.state_id : ""}
                                    setValue={setValue as (name: string, value: any) => void}
                                />
                            </Col>

                            <Col md={6}>
                                <CustomFormSelect
                                    label="City"
                                    controlId="City"
                                    options={cityOptions}
                                    register={register as unknown as UseFormRegister<any>}
                                    fieldName="city_id"
                                    error={errors.city_id}
                                    asCol={false}
                                    requiredMessage="Please select city"
                                    defaultValue={isEditable ? franchise?.city_id : ""}
                                    setValue={setValue as (name: string, value: any) => void}
                                />
                            </Col>

                            <Col md={6}>
                                <CustomMultiSelect
                                    label="Area"
                                    controlId="Area"
                                    options={areaOptions}
                                    value={areaOptions.filter((area) => areaIds.includes(area.value))}
                                    onChange={(selectedOptions) => {
                                        handleAreaSelection(selectedOptions as OptionType[]);
                                    }}
                                    asCol={false}
                                />
                            </Col>

                            <Col md={6}>
                                <CustomFormSelect
                                    label="Admin"
                                    controlId="Admin"
                                    options={adminOptions}
                                    register={register as unknown as UseFormRegister<any>}
                                    fieldName="admin_id"
                                    error={errors.admin_id}
                                    asCol={false}
                                    requiredMessage="Please select admin"
                                    defaultValue={isEditable ? franchise?.admin_id : ""}
                                    setValue={setValue as (name: string, value: any) => void}
                                />
                            </Col>
                            <Col md={6}>
                                <CustomRadioSelection
                                    label="Status"
                                    name="is_active"
                                    options={getStatusOptions()}
                                    defaultValue={isEditable ? franchise?.is_active?.toString() : "true"}
                                    isEditable={isEditable}
                                    setValue={setValue}
                                />
                            </Col>
                            <Col md={12}>
                                <CustomFormInput
                                    label="Description"
                                    controlId="desc"
                                    placeholder="Enter Description"
                                    register={register}
                                    error={errors.desc as any}
                                    asCol={false}
                                    validation={{ required: "Description is required" }}
                                    as="textarea"
                                    rows={3}
                                />
                            </Col>

                            
                        </Row>
                    </form>
                )}
            </Modal.Body>

            {!localViewMode && (
                <Modal.Footer>
                    <Button
                        className="btn-danger"
                        type="submit"
                        form="franchise-form"
                    >
                        {isEditable ? "Update" : "Add"}
                    </Button>
                    <Button variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                </Modal.Footer>
            )}
        </Modal>
    );
};

AddEditFranchiseDialog.show = (
    isEditable: boolean,
    franchise: FranchiseModel | null,
    onRefreshData: () => void,
    isViewMode: boolean = false
) => {
    openDialog("details-modal", (close) => (
        <AddEditFranchiseDialog
            isEditable={isEditable}
            isViewMode={isViewMode}
            franchise={franchise}
            onClose={close}
            onRefreshData={onRefreshData}
        />
    ));
};

export default AddEditFranchiseDialog;