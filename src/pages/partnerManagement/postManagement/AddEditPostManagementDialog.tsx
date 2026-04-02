import React, { useMemo, useState } from "react";
import { Modal, Row, Col, Form, Button, Card } from "react-bootstrap";
import CustomCloseButton from "../../../components/CustomCloseButton";
import { openDialog } from "../../../helper/DialogManager";

export type PostModel = {
    id?: number;
    partner_id: string;
    partner_name: string;
    description: string;
    media_type: "image" | "video";
    location: string;
    uploaded_date: string;
    status: "pending" | "approved" | "rejected";
};

type AddEditPostManagementDialogProps = {
    isEditable: boolean;
    post: PostModel | null;
    onClose: () => void;
    onRefreshData: () => void;
};

type MediaItem = {
    id: number;
    type: "image" | "video";
    url: string;
    title: string;
};

const labelStyle: React.CSSProperties = {
    fontWeight: 600,
    color: "#2b2b2b",
    fontSize: "15px",
    marginBottom: "6px",
};

const valueStyle: React.CSSProperties = {
    color: "#555",
    fontSize: "15px",
    lineHeight: "22px",
    wordBreak: "break-word",
};

const AddEditPostManagementDialog: React.FC<AddEditPostManagementDialogProps> & {
    show: (
        isEditable: boolean,
        post: PostModel | null,
        onRefreshData: () => void
    ) => void;
} = ({ post, onClose, onRefreshData }) => {
    const formData: PostModel = useMemo(
        () =>
            post || {
                id: 1,
                partner_id: "P001",
                partner_name: "Rahul",
                description: "Wedding shoot and outdoor photography session.",
                media_type: "image",
                location: "Hyderabad",
                uploaded_date: "2026-03-20",
                status: "pending",
            },
        [post]
    );

    const [activeMediaTab, setActiveMediaTab] = useState<"image" | "video">("image");
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const [mediaItems, setMediaItems] = useState<MediaItem[]>([
        {
            id: 1,
            type: "image",
            url: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=900&q=80",
            title: "Wedding Image 1",
        },
        {
            id: 2,
            type: "image",
            url: "https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=900&q=80",
            title: "Wedding Image 2",
        },
        {
            id: 3,
            type: "video",
            url: "https://www.w3schools.com/html/mov_bbb.mp4",
            title: "Teaser Video 1",
        },
        {
            id: 4,
            type: "video",
            url: "https://www.w3schools.com/html/movie.mp4",
            title: "Teaser Video 2",
        },
    ]);

    const [selectedMediaIds, setSelectedMediaIds] = useState<number[]>([]);

    const toggleMediaSelection = (id: number): void => {
        setSelectedMediaIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    const handleDeleteSelected = (): void => {
        if (selectedMediaIds.length === 0) return;
        setShowDeleteDialog(true);
    };

    const confirmDeleteSelected = (): void => {
        setMediaItems((prev) => prev.filter((item) => !selectedMediaIds.includes(item.id)));
        setSelectedMediaIds([]);
        setShowDeleteDialog(false);
        onRefreshData();
    };

    const filteredMedia = mediaItems.filter((item) => item.type === activeMediaTab);

    const statusClass =
        formData.status === "approved"
            ? "text-success fw-semibold text-capitalize"
            : formData.status === "pending"
              ? "text-warning fw-semibold text-capitalize"
              : "text-danger fw-semibold text-capitalize";

    return (
        <>
            <Modal show={true} onHide={onClose} centered size="xl">
                <Modal.Header className="py-3 px-4 border-bottom-0">
                    <Modal.Title as="h5" className="custom-modal-title">
                        Post Information
                    </Modal.Title>
                    <CustomCloseButton onClose={onClose} />
                </Modal.Header>

                <Modal.Body className="px-4 pb-4 pt-0">
                    <div className="custom-other-details" style={{ padding: "16px" }}>
                        <Row className="align-items-center mb-4">
                            <Col>
                                <h3 className="mb-0" style={{ color: "#000" }}>
                                    Partner
                                </h3>
                            </Col>
                        </Row>

                        <div className="mb-4">
                            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                                <div className="d-flex gap-2">
                                    <Button
                                        variant={activeMediaTab === "image" ? "dark" : "light"}
                                        onClick={() => setActiveMediaTab("image")}
                                    >
                                        Images
                                    </Button>
                                    <Button
                                        variant={activeMediaTab === "video" ? "dark" : "light"}
                                        onClick={() => setActiveMediaTab("video")}
                                    >
                                        Videos
                                    </Button>
                                </div>

                                <Button
                                    variant="danger"
                                    onClick={handleDeleteSelected}
                                    disabled={selectedMediaIds.length === 0}
                                >
                                    Delete Selected
                                </Button>
                            </div>

                            <Row className="g-3">
                                {filteredMedia.length > 0 ? (
                                    filteredMedia.map((media) => (
                                        <Col md={6} lg={4} key={media.id}>
                                            <Card className="h-100 shadow-sm">
                                                <Card.Body>
                                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                                        <Form.Check
                                                            type="checkbox"
                                                            checked={selectedMediaIds.includes(media.id)}
                                                            onChange={() => toggleMediaSelection(media.id)}
                                                            label="Select"
                                                        />
                                                    </div>

                                                    {media.type === "image" ? (
                                                        <img
                                                            src={media.url}
                                                            alt={media.title}
                                                            className="img-fluid rounded"
                                                            style={{
                                                                width: "100%",
                                                                height: "220px",
                                                                objectFit: "cover",
                                                            }}
                                                        />
                                                    ) : (
                                                        <video
                                                            controls
                                                            className="w-100 rounded"
                                                            style={{
                                                                height: "220px",
                                                                objectFit: "cover",
                                                            }}
                                                        >
                                                            <source src={media.url} type="video/mp4" />
                                                        </video>
                                                    )}

                                                    <div className="mt-2 fw-semibold">
                                                        {media.title}
                                                    </div>
                                                </Card.Body>
                                            </Card>
                                        </Col>
                                    ))
                                ) : (
                                    <Col md={12}>
                                        <div className="text-center py-5 border rounded bg-light">
                                            No {activeMediaTab === "image" ? "images" : "videos"} available
                                        </div>
                                    </Col>
                                )}
                            </Row>
                        </div>

                        <div className="pt-3 border-top">
                            <Row className="g-4">
                                <Col md={6}>
                                    <div style={labelStyle}>Post ID</div>
                                    <div style={valueStyle}>{formData.id ?? "-"}</div>
                                </Col>

                                <Col md={6}>
                                    <div style={labelStyle}>Partner ID</div>
                                    <div style={valueStyle}>{formData.partner_id}</div>
                                </Col>

                                <Col md={6}>
                                    <div style={labelStyle}>Partner Name</div>
                                    <div style={valueStyle}>{formData.partner_name}</div>
                                </Col>

                                <Col md={6}>
                                    <div style={labelStyle}>Media Type</div>
                                    <div style={valueStyle} className="text-capitalize">
                                        {formData.media_type}
                                    </div>
                                </Col>

                                <Col md={6}>
                                    <div style={labelStyle}>Location</div>
                                    <div style={valueStyle}>{formData.location}</div>
                                </Col>

                                <Col md={6}>
                                    <div style={labelStyle}>Uploaded Date</div>
                                    <div style={valueStyle}>{formData.uploaded_date}</div>
                                </Col>

                                <Col md={6}>
                                    <div style={labelStyle}>Post Status</div>
                                    <div style={valueStyle} className={statusClass}>
                                        {formData.status}
                                    </div>
                                </Col>

                                <Col md={12}>
                                    <div style={labelStyle}>Description</div>
                                    <div style={valueStyle}>{formData.description}</div>
                                </Col>
                            </Row>
                        </div>
                    </div>
                </Modal.Body>
            </Modal>

            <Modal show={showDeleteDialog} onHide={() => setShowDeleteDialog(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Confirm Delete</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    Are you sure you want to delete selected{" "}
                    {activeMediaTab === "image" ? "images" : "videos"}?
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="light" onClick={() => setShowDeleteDialog(false)}>
                        Cancel
                    </Button>
                    <Button variant="danger" onClick={confirmDeleteSelected}>
                        Delete
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

AddEditPostManagementDialog.show = (
    isEditable: boolean,
    post: PostModel | null,
    onRefreshData: () => void
) => {
    openDialog("post-management-info-dialog", (close) => (
        <AddEditPostManagementDialog
            isEditable={isEditable}
            post={post}
            onClose={close}
            onRefreshData={onRefreshData}
        />
    ));
};

export default AddEditPostManagementDialog;