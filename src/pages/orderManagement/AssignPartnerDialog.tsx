import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";
import { useForm } from "react-hook-form";
import { Modal, Button, Row, Col } from "react-bootstrap";
import CustomCloseButton from "../../components/CustomCloseButton";
import { createOrUpdateOrder } from "../../services/orderService";
import { fetchUserDropDown } from "../../services/userService";
import CustomTextFieldSelect from "../../components/CustomTextFieldSelect";


type AssignPartnerDialogProps = {
    serviceId: string;
    onClose: () => void;
    onRefreshData: () => void;
};

const AssignPartnerDialog: React.FC<AssignPartnerDialogProps> & {
    show: (serviceId: string, onRefreshData: () => void) => void;
} = ({ serviceId, onClose, onRefreshData }) => {
    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors },
    } = useForm();

    const [partners, setPartner] = useState<{ value: string; label: string }[]>([]);
    const fetchRef = useRef(false);

    const fetchPartnerFromApi = async () => {
        if (fetchRef.current) return;
        fetchRef.current = true;
        try {
            const { users } = await fetchUserDropDown(4, serviceId);
            setPartner(users.map((partner: any) => ({ value: partner._id, label: partner.name })));
        } finally {
            fetchRef.current = false;
        }
    };

    useEffect(() => {
        fetchPartnerFromApi();
    }, [serviceId]);

    const onSubmitEvent = async (data: any) => {

        const payload = {
            partner_id: data.partner_id,
        };

        const responseUser = await createOrUpdateOrder(payload, false,);

        if (responseUser) {
            onClose && onClose();
            onRefreshData();
        }
    };

    return (
        <>
            <Modal show={true} onHide={onClose} centered dialogClassName="custom-big-modal">
                <Modal.Header className="py-3 px-4 border-bottom-0">
                    <Modal.Title as="h5" className="custom-modal-title">
                        Reassign Partner
                    </Modal.Title>
                    <CustomCloseButton onClose={onClose} />
                </Modal.Header>
                <Modal.Body className="px-4 pb-4 pt-0">
                    <form
                        noValidate
                        name="assign-partner-form"
                        id="assign-partner-form"
                        onSubmit={handleSubmit(onSubmitEvent)}
                    >
                        <Row>
                            <CustomTextFieldSelect
                                label="Partner"
                                controlId="Partner"
                                options={partners}
                                register={register}
                                fieldName="partner_id"
                                error={errors.partner_id}
                                requiredMessage="Please select partner"
                                setValue={setValue as (name: string, value: any) => void}
                            />
                        </Row>
                        <Row className="mt-4">
                            <Col xs={6} className="text-center">
                                <Button type="submit" className="custom-btn-primary" >
                                    Assign
                                </Button>
                            </Col>
                            <Col xs={6} className="text-center" onClick={onClose}>
                                <Button className="custom-btn-secondary">
                                    Cancel
                                </Button>
                            </Col>
                        </Row>
                    </form>
                </Modal.Body>
            </Modal>
        </>
    );
};

AssignPartnerDialog.show = (serviceId: string, onRefreshData: () => void) => {
    const existingModal = document.getElementById("assign-partner-modal");
    if (existingModal) {
        return;
    }
    const modalContainer = document.createElement("div");
    modalContainer.id = "assign-partner-modal";
    document.body.appendChild(modalContainer);
    const root = ReactDOM.createRoot(modalContainer);

    const closeModal = () => {
        root.unmount();
        document.body.removeChild(modalContainer);
    };

    root.render(
        <AssignPartnerDialog
            serviceId={serviceId}
            onClose={closeModal}
            onRefreshData={onRefreshData}
        />
    );
};

export default AssignPartnerDialog;
