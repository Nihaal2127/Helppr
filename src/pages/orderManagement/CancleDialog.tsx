import React from "react";
import ReactDOM from "react-dom/client";
import { useForm } from 'react-hook-form';
import { Modal, Button, Row, Col } from "react-bootstrap";
import CustomCloseButton from "../../components/CustomCloseButton";
import CustomTextField from "../../components/CustomTextField";

type CancleDialogProps = {
    title: string,
    onClose: () => void;
    onCancleOrder: (reason: string) => void;
};

const CancleDialog: React.FC<CancleDialogProps> & {
    show: (title: string, onCancleOrder: (reason: string) => void) => void;
} = ({ title, onClose, onCancleOrder }) => {
    const { register, handleSubmit } = useForm();

    const onSubmit = (data: any) => {
        onClose && onClose();
        onCancleOrder(data.cancellation_reason); 
    };

    return (
        <Modal show={true} onHide={onClose} centered>
            <div >
                <Modal.Header className="py-3 px-4 border-bottom-0">
                    <Modal.Title as="h5" className="custom-modal-title">
                        Cancle {title}
                    </Modal.Title>
                    <CustomCloseButton onClose={onClose} />
                </Modal.Header>
                <Modal.Body className="px-4 pb-4 pt-0" style={{ maxHeight: "70vh", overflowY: "auto" }}>
                    <form
                        noValidate
                        name="cancle-form"
                        id="cancle-form"
                        onSubmit={handleSubmit(onSubmit)}
                        >

                        <Row className="mt-4">
                            <CustomTextField
                                label="Cancellation Reason"
                                controlId="cancellation_reason"
                                placeholder="Enter Cancellation Reason"
                                register={register}
                            />
                            <Col xs={6} className="text-center mt-4">
                                <Button type="submit" className="custom-btn-primary">
                                    Yes
                                </Button>
                            </Col>
                            <Col xs={6} className="text-center mt-4" onClick={onClose}>
                                <Button className="custom-btn-secondary">
                                    No
                                </Button>
                            </Col>
                        </Row>
                    </form>
                </Modal.Body>
            </div>
        </Modal>
    );
};

CancleDialog.show = (title: string, onCancleOrder: (reason: string) => void) => {
    const existingModal = document.getElementById("order-modal");
    if (existingModal) {
        return;
    }
    const modalContainer = document.createElement("div");
    modalContainer.id = "order-modal";
    document.body.appendChild(modalContainer);
    const root = ReactDOM.createRoot(modalContainer);

    const closeModal = () => {
        root.unmount();
        document.body.removeChild(modalContainer);
    };

    root.render(
        <CancleDialog
            title={title}
            onClose={closeModal}
            onCancleOrder={onCancleOrder}
        />
    );
};

export default CancleDialog;