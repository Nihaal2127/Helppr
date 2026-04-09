import React from "react";
import { Modal, Row, Col, Button, Badge } from "react-bootstrap";
import { useForm } from "react-hook-form";
import CustomCloseButton from "./CustomCloseButton";
import CustomFormSelect from "./CustomFormSelect";
import { CustomFormInput } from "./CustomFormInput";

type TransferChatFormValues = {
    transfer_assignee: string;
    transfer_note: string;
};

type TransferChatModalProps = {
    show: boolean;
    onClose: () => void;
    onTransfer?: (values: TransferChatFormValues) => void;
    assigneeOptions: { value: string; label: string }[];
    isSubmitting?: boolean;
};

const TransferChatModal: React.FC<TransferChatModalProps> = ({
    show,
    onClose,
    onTransfer,
    assigneeOptions,
    isSubmitting = false,
}) => {
    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors },
    } = useForm<TransferChatFormValues>({
        defaultValues: {
            transfer_assignee: "",
            transfer_note: "",
        },
    });

    const handleFormSubmit = (values: TransferChatFormValues) => {
        if (onTransfer) {
            onTransfer(values);
        }
        onClose();
    };

    return (
        <Modal show={show} onHide={onClose} centered dialogClassName="custom-big-modal">
            <Modal.Header className="py-3 px-4 border-bottom-0">
                <Modal.Title as="h5" className="custom-modal-title">
                    Transfer Chat
                </Modal.Title>
                <CustomCloseButton onClose={onClose} />
            </Modal.Header>
            <Modal.Body className="px-4 pb-4 pt-0">
                <form noValidate onSubmit={handleSubmit(handleFormSubmit)}>
                    <Row>
                        <Col xs={12}>
                            <div className="mb-2 d-flex align-items-center justify-content-between">
                                <label className="fw-medium mb-0">Select Assignee</label>
                            </div>
                            <CustomFormSelect
                                label=""
                                controlId="transfer assignee"
                                options={assigneeOptions}
                                register={register as any}
                                fieldName="transfer_assignee"
                                error={errors.transfer_assignee as any}
                                requiredMessage="Please select transfer assignee"
                                setValue={setValue as any}
                                asCol={false}
                                menuPortal
                            />
                        </Col>
                    </Row>

                    <Row className="mt-2">
                        <CustomFormInput
                            label="Description"
                            controlId="transfer_note"
                            placeholder="Enter description"
                            register={register}
                            validation={{ required: "Please enter description" }}
                            error={errors.transfer_note}
                            asCol={false}
                            inputType="text"
                            as="textarea"
                            rows={4}
                        />
                    </Row>

                    <Row className="mt-4">
                        <Col xs={12} className="d-flex justify-content-end gap-3">
                            <Button type="button" className="custom-btn-secondary" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button type="submit" className="custom-btn-primary" disabled={isSubmitting}>
                                Transfer
                            </Button>
                        </Col>
                    </Row>
                </form>
            </Modal.Body>
        </Modal>
    );
};

export default TransferChatModal;

