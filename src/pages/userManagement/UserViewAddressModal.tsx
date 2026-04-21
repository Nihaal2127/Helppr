import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Modal, Button, Row, Col } from "react-bootstrap";
import CustomCloseButton from "../../components/CustomCloseButton";
import CustomTextFieldSelect from "../../components/CustomTextFieldSelect";
import CustomTextField from "../../components/CustomTextField";
import { indianPincodeRequiredRules, sanitizeIndianPincodeInput } from "../../helper/pincodeValidation";

export type UserViewAddressFormValues = {
    stateId: string;
    cityId: string;
    postal: string;
    line: string;
};

type FormShape = {
    va_state: string;
    va_city: string;
    va_pin: string;
    va_line: string;
};

type UserViewAddressModalProps = {
    show: boolean;
    title: string;
    states: { value: string; label: string }[];
    cities: { value: string; label: string }[];
    onFetchCities: (stateId: string) => void | Promise<void>;
    initial: UserViewAddressFormValues | null;
    onHide: () => void;
    /** Return true when save succeeded so the modal can close. */
    onSave: (values: UserViewAddressFormValues) => Promise<boolean>;
};

const UserViewAddressModal: React.FC<UserViewAddressModalProps> = ({
    show,
    title,
    states,
    cities,
    onFetchCities,
    initial,
    onHide,
    onSave,
}) => {
    const {
        register,
        handleSubmit,
        setValue,
        reset,
        watch,
        formState: { errors },
    } = useForm<FormShape>({
        defaultValues: { va_state: "", va_city: "", va_pin: "", va_line: "" },
    });

    const pinWatch = watch("va_pin");

    useEffect(() => {
        if (!show) return;
        reset({
            va_state: initial?.stateId ?? "",
            va_city: initial?.cityId ?? "",
            va_pin: initial?.postal ?? "",
            va_line: initial?.line ?? "",
        });
        if (initial?.stateId) void onFetchCities(initial.stateId);
        // Primitives only: parent used to pass an inline `onFetchCities` that changed every render and
        // retriggered this effect → setViewCities loop while the modal was open.
    }, [show, initial?.stateId, initial?.cityId, initial?.postal, initial?.line, reset, onFetchCities]);

    const submit = handleSubmit(async (data) => {
        const ok = await onSave({
            stateId: data.va_state,
            cityId: data.va_city,
            postal: sanitizeIndianPincodeInput(data.va_pin ?? ""),
            line: (data.va_line ?? "").trim(),
        });
        if (ok) onHide();
    });

    return (
        <Modal show={show} onHide={onHide} centered enforceFocus={false}>
            <Modal.Header className="py-3 px-4 border-bottom-0">
                <Modal.Title as="h5" className="custom-modal-title">
                    {title}
                </Modal.Title>
                <CustomCloseButton onClose={onHide} />
            </Modal.Header>
            <Modal.Body className="px-4 pb-4 pt-0">
                <form noValidate onSubmit={submit}>
                    <Row>
                        <Col xs={12}>
                            <CustomTextFieldSelect
                                label="State"
                                controlId="va_state"
                                options={states}
                                register={register}
                                fieldName="va_state"
                                error={errors.va_state}
                                requiredMessage="Please select state"
                                defaultValue={initial?.stateId ?? ""}
                                setValue={setValue as (name: string, value: unknown) => void}
                                menuPortal
                                onChange={(e) => {
                                    const v = e.target.value;
                                    void onFetchCities(v);
                                    setValue("va_city", "");
                                }}
                            />
                        </Col>
                        <Col xs={12}>
                            <CustomTextFieldSelect
                                label="City"
                                controlId="va_city"
                                options={cities}
                                register={register}
                                fieldName="va_city"
                                error={errors.va_city}
                                requiredMessage="Please select city"
                                defaultValue={initial?.cityId ?? ""}
                                setValue={setValue as (name: string, value: unknown) => void}
                                menuPortal
                            />
                        </Col>
                        <Col xs={12}>
                            <CustomTextField
                                label="Pin code"
                                controlId="va_pin"
                                placeholder="6-digit PIN"
                                register={register}
                                error={errors.va_pin}
                                validation={indianPincodeRequiredRules()}
                                isIndianPincodeField
                                maxLength={6}
                                value={pinWatch ?? ""}
                                onChange={(raw) =>
                                    setValue("va_pin", sanitizeIndianPincodeInput(raw), {
                                        shouldValidate: true,
                                        shouldDirty: true,
                                    })
                                }
                            />
                        </Col>
                        <Col xs={12}>
                            <CustomTextField
                                label="Address"
                                controlId="va_line"
                                placeholder="Street, building, etc."
                                register={register}
                                error={errors.va_line}
                                validation={{ required: "Address is required" }}
                                as="textarea"
                                rows={3}
                            />
                        </Col>
                    </Row>
                    <Row className="mt-4">
                        <Col className="d-flex justify-content-end gap-2">
                            <Button type="button" className="custom-btn-secondary" onClick={onHide}>
                                Cancel
                            </Button>
                            <Button type="submit" className="custom-btn-primary">
                                Save
                            </Button>
                        </Col>
                    </Row>
                </form>
            </Modal.Body>
        </Modal>
    );
};

export default UserViewAddressModal;
