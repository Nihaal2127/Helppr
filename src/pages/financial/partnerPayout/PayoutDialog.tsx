import React from "react";
import { useForm } from 'react-hook-form';
import { Modal, Button, Row, Col } from "react-bootstrap";
import CustomCloseButton from "../../../components/CustomCloseButton";
import { openDialog} from "../../../helper/DialogManager";
import { AppConstant } from "../../../constant/AppConstant";

type PayoutDialogProps = {
    totalCommision: number,
    onClose: () => void;
    onHandleOrderPayment: () => void;
};

const PayoutDialog: React.FC<PayoutDialogProps> & {
    show: (totalCommision: number, onHandleOrderPayment: () => void) => void;
} = ({ totalCommision, onClose, onHandleOrderPayment }) => {
    const { handleSubmit } = useForm();

    const onSubmit = (data: any) => {
        onClose && onClose();
        onHandleOrderPayment();
    };

    return (
        <Modal show={true} onHide={onClose} centered>
            <div >
                <Modal.Header className="py-3 px-4 border-bottom-0">
                    <Modal.Title as="h5" className="custom-modal-title">
                        Partner Payout
                    </Modal.Title>
                    <CustomCloseButton onClose={onClose} />
                </Modal.Header>
                <Modal.Body className="px-4 pb-4 pt-0" style={{ maxHeight: "70vh", overflowY: "auto" }}>
                    <form
                        noValidate
                        name="payout-commision-form"
                        id="payout-commision-form"
                        onSubmit={handleSubmit(onSubmit)}
                    >
                        <Row className="mt-4">
                            <strong>Total partner payout: {AppConstant.currencySymbol}{totalCommision}</strong>

                            <Col xs={6} className="text-center mt-4" onClick={onClose}>
                                <Button className="custom-btn-secondary">
                                    Close
                                </Button>
                            </Col>
                            <Col xs={6} className="text-center mt-4">
                                <Button type="submit" className="custom-btn-primary">
                                    Submit
                                </Button>
                            </Col>
                        </Row>
                    </form>
                </Modal.Body>
            </div>
        </Modal>
    );
};

PayoutDialog.show = (totalCommision: number, onHandleOrderPayment: () => void) => {
   openDialog("order-modal", (close) => (
        <PayoutDialog
            totalCommision={totalCommision}
            onClose={close}
            onHandleOrderPayment={onHandleOrderPayment}
        />
    ));
};

export default PayoutDialog;