import React, { useState, useEffect, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { Modal, Button, Row, Col } from "react-bootstrap";
import CustomCloseButton from "../../components/CustomCloseButton";
import { updateOrderService } from "../../services/orderService";
import { fetchPartnerDropDown } from "../../services/userService";
import CustomTextFieldSelect from "../../components/CustomTextFieldSelect";
import { openDialog,} from "../../helper/DialogManager";

type AssignPartnerDialogProps = {
    serviceId: string;
    selectedServiceId: string;
    onClose: () => void;
    onRefreshData: () => void;
};

const AssignPartnerDialog: React.FC<AssignPartnerDialogProps> & {
    show: (serviceId: string, selectedServiceId: string, onRefreshData: () => void) => void;
} = ({ serviceId, selectedServiceId, onClose, onRefreshData }) => {
    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors },
    } = useForm();

    const [partners, setPartner] = useState<{ value: string; label: string }[]>([]);
    const fetchRef = useRef(false);

    const fetchPartnerFromApi = useCallback(async () => {
        if (fetchRef.current) return;
        fetchRef.current = true;
        try {
            const { partners } = await fetchPartnerDropDown(serviceId);
            setPartner(partners.map((partner: any) => ({ value: partner.partner_id, label: partner.partner_name })));
        } finally {
            fetchRef.current = false;
        }
    }, [serviceId]);

    useEffect(() => {
        void fetchPartnerFromApi();
    }, [fetchPartnerFromApi]);

    const onSubmitEvent = async (data: any) => {

        const payload = {
            partner_id: data.partner_id,
        };

        const responseUser = await updateOrderService(payload, selectedServiceId);

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
                            <Col xs={12} className="text-center d-flex justify-content-end gap-3">
                                <Button type="submit" className="custom-btn-primary">
                                    Assign
                                </Button>
                                <Button type="button" className="custom-btn-secondary" onClick={onClose}>
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

AssignPartnerDialog.show = (serviceId: string, selectedServiceId: string, onRefreshData: () => void) => {
    openDialog("assign-partner-modal", (close) => (
        <AssignPartnerDialog
            serviceId={serviceId}
            selectedServiceId={selectedServiceId}
            onClose={close}
            onRefreshData={onRefreshData}
        />
    ));
};

export default AssignPartnerDialog;
