import React, { useEffect, useRef, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { Modal, Button, Row, Col } from "react-bootstrap";
import CustomCloseButton from "../../components/CustomCloseButton";
import CustomTextFieldSelect from "../../components/CustomTextFieldSelect";
import { OrderModel } from "../../models/OrderModel";
import { UserModel } from "../../models/UserModel";
import { createOrUpdateOrder } from "../../services/orderService";
import { fetchUserDropDown } from "../../services/userService";
import { openDialog } from "../../helper/DialogManager";

/** End-user / customer list (same as create order flow). */
const CUSTOMER_USER_TYPE = 4;

type EditOrderUserDialogProps = {
    orderDetails: OrderModel;
    onClose: () => void;
    onRefreshData: () => void;
};

const EditOrderUserDialog: React.FC<EditOrderUserDialogProps> & {
    show: (orderDetails: OrderModel, onRefreshData: () => void) => void;
} = ({ orderDetails, onClose, onRefreshData }) => {
    const currentUserId = orderDetails.user_info?._id ?? orderDetails.user_id ?? "";

    const { register, handleSubmit, setValue, formState: { errors } } = useForm<{ user_id: string }>({
        defaultValues: {
            user_id: currentUserId,
        },
    });
    const [users, setUsers] = useState<{ value: string; label: string }[]>([]);
    const [userRecords, setUserRecords] = useState<UserModel[]>([]);
    const fetchRef = useRef(false);

    const loadUsers = useCallback(async () => {
        if (fetchRef.current) return;
        fetchRef.current = true;
        try {
            const { users: list } = await fetchUserDropDown(CUSTOMER_USER_TYPE);
            const uid = orderDetails.user_info?._id ?? orderDetails.user_id ?? "";
            let records = [...list];
            if (uid && !list.some((u) => u._id === uid) && orderDetails.user_info) {
                records = [orderDetails.user_info as UserModel, ...list];
            }
            setUserRecords(records);
            const mapped = records.map((u) => ({
                value: u._id,
                label: (u.name && String(u.name).trim()) || u.user_id || "Unnamed user",
            }));
            setUsers(mapped);
        } finally {
            fetchRef.current = false;
        }
    }, [orderDetails.user_id, orderDetails.user_info]);

    useEffect(() => {
        void loadUsers();
    }, [loadUsers]);

    const onSubmit = async (data: { user_id: string }) => {
        const selected = userRecords.find((u) => u._id === data.user_id);
        if (!selected) {
            return;
        }
        const payload = {
            user_id: selected._id,
            user_unique_id: selected.user_id,
            order_status: orderDetails.order_status,
            is_paid: orderDetails.is_paid,
            payment_mode_id: Number(orderDetails.payment_mode_id ?? 2),
            address: selected.address ?? orderDetails.address,
            name: selected.name,
            email: selected.email,
            contact: selected.phone_number,
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
                    Change order user
                </Modal.Title>
                <CustomCloseButton onClose={onClose} />
            </Modal.Header>
            <Modal.Body className="px-4 pb-4 pt-0">
                <form noValidate onSubmit={handleSubmit(onSubmit)}>
                    <Row>
                        <CustomTextFieldSelect
                            label="User"
                            controlId="user_id"
                            options={users}
                            register={register}
                            fieldName="user_id"
                            error={errors.user_id as unknown as string}
                            requiredMessage="Please select a user"
                            defaultValue={currentUserId}
                            setValue={setValue as (name: string, value: any) => void}
                            placeholder="Select user"
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

EditOrderUserDialog.show = (orderDetails: OrderModel, onRefreshData: () => void) => {
    openDialog("edit-order-user-modal", (close) => (
        <EditOrderUserDialog orderDetails={orderDetails} onClose={close} onRefreshData={onRefreshData} />
    ));
};

export default EditOrderUserDialog;
