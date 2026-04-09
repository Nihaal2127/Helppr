import React from "react";
import { useForm } from "react-hook-form";
import { Modal, Button, Row, Col } from "react-bootstrap";
import CustomCloseButton from "../../components/CustomCloseButton";
import { TicketModel } from "../../models/TicketModel";
import CustomTextField from "../../components/CustomTextField";
import CustomTextFieldRadio from "../../components/CustomTextFieldRadio";
import { showErrorAlert } from "../../helper/alertHelper";
import { createOrUpdateTicket } from "../../services/ticketService";
import { getLocalStorage } from "../../helper/localStorageHelper";
import { AppConstant } from "../../constant/AppConstant";
import { openDialog} from "../../helper/DialogManager";

type EditTicketDialogProps = {
    isEditable: boolean;
    ticket: TicketModel | null;
    onClose: () => void;
    onRefreshData: () => void;
};

const EditTicketDialog: React.FC<EditTicketDialogProps> & {
    show: (isEditable: boolean, ticket: TicketModel | null, onRefreshData: () => void) => void;
} = ({ isEditable, ticket, onClose, onRefreshData }) => {
    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors },
    } = useForm<TicketModel>({
        defaultValues: {
            status: ticket?.status || 1,
            resolve_status: ticket?.resolve_status || 1,
            description: ticket?.description || "",
        },
    });

    const status = [
        { label: "Open", value: "1" },
        { label: "Close", value: "2" }
    ]
    const resolveStatus = [
        { label: "Pending", value: "1" },
        { label: "Resolve", value: "2" },
        { label: "Unresolve", value: "3" }
    ]

    const onSubmitEvent = async (data: TicketModel) => {

        const payload = {
            resolve_by_id: getLocalStorage(AppConstant.createdById),
            status: Number(data.status),
            resolve_status: Number(data.resolve_status),
            description: data.description,
        };

        let response;
        if (isEditable) {
            if (!ticket?._id) {
                showErrorAlert("Unable to update. ID is missing.");
                return;
            }

            response = await createOrUpdateTicket(payload, true, ticket?._id);
        } else {
            response = await createOrUpdateTicket(payload, false,);
        }

        if (response) {
            onClose && onClose();
            onRefreshData();
        }
    };

    return (
        <Modal show={true} onHide={onClose} centered dialogClassName="custom-big-modal">
            <Modal.Header className="py-3 px-4 border-bottom-0">
                <Modal.Title as="h5" className="custom-modal-title">
                    {isEditable ? "Update" : "Add"} Ticket
                </Modal.Title>
                <CustomCloseButton onClose={onClose} />
            </Modal.Header>
            <Modal.Body className="px-4 pb-4 pt-0">
                <form
                    noValidate
                    name="profile-form"
                    id="profile-form"
                    onSubmit={handleSubmit(onSubmitEvent)}
                >
                    <Row>
                        <CustomTextField
                            label="Description"
                            controlId="description"
                            placeholder="Enter Description"
                            as="textarea"
                            rows={5}
                            register={register}
                            error={errors.description}
                            validation={{ required: "Description is required" }}
                        />
                        <CustomTextFieldRadio
                            label="Status"
                            name="status"
                            options={status}
                            defaultValue={isEditable ? String(ticket?.status) : "1"}
                            isEditable={isEditable}
                            setValue={setValue}
                        />
                        <CustomTextFieldRadio
                            label="Resolve Status"
                            name="resolve_status"
                            options={resolveStatus}
                            defaultValue={isEditable ? String(ticket?.resolve_status) : "1"}
                            isEditable={isEditable}
                            setValue={setValue}
                        />
                    </Row>
                    <Row className="mt-4">
                        <Col xs={12} className="text-center d-flex justify-content-end gap-3">
                            <Button type="submit" className="custom-btn-primary">
                                {isEditable ? "Update" : "Add"}
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

EditTicketDialog.show = (isEditable: boolean, ticket: TicketModel | null, onRefreshData: () => void) => {
    openDialog("edit-ticket-modal", (close) => (
        <EditTicketDialog
            isEditable={isEditable}
            ticket={ticket}
            onClose={close}
            onRefreshData={onRefreshData}
        />
    ));
};

export default EditTicketDialog;
