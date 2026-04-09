import React from "react";
import { Modal, Row, Col } from "react-bootstrap";
import CustomCloseButton from "../../../components/CustomCloseButton";
import { openDialog } from "../../../helper/DialogManager";
import { DetailsRow } from "../../../helper/utility";

type PortfolioModel = {
    _id?: string;
    partner_id: string;
    partner_name: string;
    category: string;
    service: string;
    total_posts: string;
    total_images: string;
    total_videos: string;
    likes_count: string;
    comments_count: string;
    saves_count: string;
    ratings: string;
    location: string;
};

type ViewPortfolioManagementDialogProps = {
    portfolio: PortfolioModel | null;
    onClose: () => void;
    onRefreshData: () => void;
};

const ViewPortfolioManagementDialog: React.FC<ViewPortfolioManagementDialogProps> & {
    show: (portfolio: PortfolioModel | null, onRefreshData: () => void) => void;
} = ({ portfolio, onClose }) => {
    return (
        <Modal show={true} onHide={onClose} centered>
            <div className="custom-order-model-detail">
                <Modal.Header className="py-3 px-4 border-bottom-0">
                    <Modal.Title as="h5" className="custom-modal-title">
                        Portfolio Information
                    </Modal.Title>
                    <CustomCloseButton onClose={onClose} />
                </Modal.Header>

                <Modal.Body
                    className="px-4 pb-4 pt-0"
                    style={{ maxHeight: "70vh", overflowY: "auto" }}
                >
                    <section className="custom-other-details" style={{ padding: "10px" }}>
                        <Row className="mb-2">
                            <Col>
                                <h3 className="mb-0">Portfolio Details</h3>
                            </Col>
                        </Row>

                        {/* 🔥 3 PER ROW */}
                        <Row className="mb-2">
                            {/* <Col md={4} className="custom-helper-column">
                                <DetailsRow title="Partner ID" value={portfolio?.partner_id} />
                            </Col> */}
                            <Col md={4} className="custom-helper-column">
                                <DetailsRow title="Partner Name" value={portfolio?.partner_name} />
                            </Col>
                            <Col md={4} className="custom-helper-column">
                                <DetailsRow title="Category" value={portfolio?.category} />
                            </Col>
                            <Col md={4} className="custom-helper-column">
                                <DetailsRow title="Location" value={portfolio?.location} />
                            </Col>
                        </Row>

                        <Row className="mb-2">
                            <Col md={4} className="custom-helper-column">
                                <DetailsRow title="Service" value={portfolio?.service} />
                            </Col>
                            <Col md={4} className="custom-helper-column">
                                <DetailsRow title="Total Posts" value={portfolio?.total_posts} />
                            </Col>
                            <Col md={4} className="custom-helper-column">
                                <DetailsRow title="Total Images" value={portfolio?.total_images} />
                            </Col>
                        </Row>

                        <Row className="mb-2">
                            <Col md={4} className="custom-helper-column">
                                <DetailsRow title="Total Videos" value={portfolio?.total_videos} />
                            </Col>
                            <Col md={4} className="custom-helper-column">
                                <DetailsRow title="Likes Count" value={portfolio?.likes_count} />
                            </Col>
                            <Col md={4} className="custom-helper-column">
                                <DetailsRow title="Comments Count" value={portfolio?.comments_count} />
                            </Col>
                        </Row>

                        <Row className="mb-2">
                            <Col md={4} className="custom-helper-column">
                                <DetailsRow title="Saves Count" value={portfolio?.saves_count} />
                            </Col>
                            <Col md={4} className="custom-helper-column">
                                <DetailsRow title="Ratings" value={portfolio?.ratings} />
                            </Col>
                        </Row>

                    </section>
                </Modal.Body>
            </div>
        </Modal>
    );
};

ViewPortfolioManagementDialog.show = (
    portfolio: PortfolioModel | null,
    onRefreshData: () => void
) => {
    openDialog("portfolio-details-modal", (close: () => void) => (
        <ViewPortfolioManagementDialog
            portfolio={portfolio}
            onClose={close}
            onRefreshData={onRefreshData}
        />
    ));
};

export default ViewPortfolioManagementDialog;