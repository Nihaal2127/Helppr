import ReactDOM from "react-dom/client";
import { Modal, Button, Row, Col } from "react-bootstrap";
import CustomCloseButton from "./CustomCloseButton";
import Logo from "../assets/icons/login_logo.svg";

export const openConfirmDialog = (
    title: string,
    confirmButtonText: string,
    cancleButtonText: string,
    onConfirm: () => void,
    iconName?: string,
) => {
    const modalContainer = document.createElement("div");
    document.body.appendChild(modalContainer);
    const root = ReactDOM.createRoot(modalContainer);

    const closeModal = () => {
        root.unmount();
        document.body.removeChild(modalContainer);
    };

    const onConfirmClick = () => {
        closeModal();
        onConfirm();
    };

    root.render(
        <Modal show={true}
            onHide={closeModal}
            centered
            dialogClassName="custom-big-modal"
        >
            <Modal.Header className="py-3 px-4 border-bottom-0">
                <CustomCloseButton onClose={closeModal} />
            </Modal.Header>
            <Modal.Body className="px-4 pb-4 pt-0 mt-5">
                <img
                    src={iconName ? iconName : Logo}
                    alt="logo"
                    width="40px"
                    height="40px"
                    style={{ display: "block", margin: "0 auto" }}
                />
                <label className="custom-dialog-title mt-6">{title}</label>
                <Row className="mt-5">
                    <Col xs={6} className="text-center">
                        <Button type="submit" className="custom-fill-btn" onClick={onConfirmClick}>
                            {confirmButtonText}
                        </Button>
                    </Col>
                    <Col xs={6} className="text-center" onClick={closeModal}>
                        <Button className="custom-outline-btn">
                            {cancleButtonText}
                        </Button>
                    </Col>
                </Row>
            </Modal.Body>
        </Modal>
    );
};
