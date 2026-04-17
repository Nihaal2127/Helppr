import React, { useEffect, useRef, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { Modal, Button, Row, Col } from "react-bootstrap";
import CustomCloseButton from "../../components/CustomCloseButton";
import CustomTextFieldSelect from "../../components/CustomTextFieldSelect";
import { OrderModel } from "../../models/OrderModel";
import { createOrUpdateOrder } from "../../services/orderService";
import { fetchUserDropDown } from "../../services/userService";
import { openDialog } from "../../helper/DialogManager";

const EMPLOYEE_USER_TYPE = 2;

type EditOrderEmployeeDialogProps = {
    orderDetails: OrderModel;
    onClose: () => void;
    onRefreshData: () => void;
};

const EditOrderEmployeeDialog: React.FC<EditOrderEmployeeDialogProps> & {
    show: (orderDetails: OrderModel, onRefreshData: () => void) => void;
} = ({ orderDetails, onClose, onRefreshData }) => {
    const { register, handleSubmit, setValue, formState: { errors } } = useForm<{ created_by_id: string }>({
        defaultValues: {
            created_by_id: orderDetails.created_by_id ?? "",
        },
    });
    const [employees, setEmployees] = useState<{ value: string; label: string }[]>([]);
    const fetchRef = useRef(false);

    const loadEmployees = useCallback(async () => {
        if (fetchRef.current) return;
        fetchRef.current = true;
        try {
            const { users } = await fetchUserDropDown(EMPLOYEE_USER_TYPE);
            const mapped = users.map((u) => ({
                value: u._id,
                label: (u.name && String(u.name).trim()) || u.user_id || "Unnamed",
            }));
            const currentId = orderDetails.created_by_id ?? "";
            if (currentId && !mapped.some((o) => o.value === currentId)) {
                mapped.unshift({
                    value: currentId,
                    label:
                        (orderDetails.created_by_name && String(orderDetails.created_by_name).trim()) ||
                        "Current assignee",
                });
            }
            setEmployees(mapped);
        } finally {
            fetchRef.current = false;
        }
    }, [orderDetails.created_by_id, orderDetails.created_by_name]);

    useEffect(() => {
        void loadEmployees();
    }, [loadEmployees]);

    const onSubmit = async (data: { created_by_id: string }) => {
        const payload = {
            order_status: orderDetails.order_status,
            is_paid: orderDetails.is_paid,
            payment_mode_id: Number(orderDetails.payment_mode_id ?? 2),
            created_by_id: data.created_by_id,
        };
        const ok = await createOrUpdateOrder(payload, true, orderDetails._id);
        if (ok) {
            onClose?.();
            onRefreshData();
        }
    };

    return (
        <Modal show onHide={onClose} centered dialogClassName="custom-big-modal" enforceFocus={false}>
            <Modal.Header className="py-3 px-4 border-bottom-0">
                <Modal.Title as="h5" className="custom-modal-title">
                    Change employee
                </Modal.Title>
                <CustomCloseButton onClose={onClose} />
            </Modal.Header>
            <Modal.Body className="px-4 pb-4 pt-0">
                <form noValidate onSubmit={handleSubmit(onSubmit)}>
                    <Row>
                        <CustomTextFieldSelect
                            label="Employee"
                            controlId="created_by_id"
                            options={employees}
                            register={register}
                            fieldName="created_by_id"
                            error={errors.created_by_id as unknown as string}
                            requiredMessage="Please select an employee"
                            defaultValue={orderDetails.created_by_id ?? ""}
                            setValue={setValue as (name: string, value: any) => void}
                            placeholder="Select employee"
                            menuPortal
                        />
                    </Row>
                    <Row className="mt-4">
                        <Col xs={12} className="text-center d-flex justify-content-end gap-3">
                            <Button type="submit" className="custom-btn-primary">
                                Save
                            </Button>
                            <Button type="button" className="custom-btn-secondary" onClick={onClose}>
                                Cancel
                            </Button>
                        </Col>
                    </Row>
                </form>
            </Modal.Body>
        </Modal>
    );
};

EditOrderEmployeeDialog.show = (orderDetails: OrderModel, onRefreshData: () => void) => {
    openDialog("edit-order-employee-modal", (close) => (
        <EditOrderEmployeeDialog orderDetails={orderDetails} onClose={close} onRefreshData={onRefreshData} />
    ));
};

export default EditOrderEmployeeDialog;
