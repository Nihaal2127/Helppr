import React, { useMemo, useState } from "react";
import { Modal, Row, Col, Form, Button, Card } from "react-bootstrap";
import CustomCloseButton from "../../../components/CustomCloseButton";
import { DetailsRow } from "../../../helper/utility";
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

const AddEditPostManagementDialog: React.FC<AddEditPostManagementDialogProps> & {
    show: (
        isEditable: boolean,
        post: PostModel | null,
        onRefreshData: () => void
    ) => void;
} = ({ isEditable, post, onClose, onRefreshData }) => {
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

    return (
        <>
            <Modal show={true} onHide={onClose} centered size="lg">
                <Modal.Header className="py-3 px-4 border-bottom-0">
                    <Modal.Title as="h5" className="custom-modal-title">
                        {isEditable ? "Edit Post" : "Post Information"}
                    </Modal.Title>
                    <CustomCloseButton onClose={onClose} />
                </Modal.Header>

                <Modal.Body className="px-4 pb-4 pt-0" style={{ maxHeight: "70vh", overflowY: "auto" }}>
                    <div className="custom-other-details" style={{ padding: "10px" }}>
                        <Row className="align-items-center mb-2">
                            <Col>
                                <h3 className="mb-0">
                                    Post
                                </h3>
                            </Col>
                        </Row>

                        <div className="mb-3">
                            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
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
                                    size="sm"
                                    onClick={handleDeleteSelected}
                                    disabled={selectedMediaIds.length === 0}
                                >
                                    Delete Selected
                                </Button>
                            </div>

                            <Row className="g-2">
                                {filteredMedia.length > 0 ? (
                                    filteredMedia.map((media) => (
                                        <Col md={6} lg={4} key={media.id}>
                                            <Card className="h-100 shadow-sm">
                                                <Card.Body className="p-2">
                                                    <div className="d-flex justify-content-between align-items-center mb-1">
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
                                                                height: "170px",
                                                                objectFit: "cover",
                                                            }}
                                                        />
                                                    ) : (
                                                        <video
                                                            controls
                                                            className="w-100 rounded"
                                                            style={{
                                                                height: "170px",
                                                                objectFit: "cover",
                                                            }}
                                                        >
                                                            <source src={media.url} type="video/mp4" />
                                                        </video>
                                                    )}

                                                    <div className="mt-1 fw-semibold">
                                                        {media.title}
                                                    </div>
                                                </Card.Body>
                                            </Card>
                                        </Col>
                                    ))
                                ) : (
                                    <Col md={12}>
                                        <div className="text-center py-3 border rounded bg-light">
                                            No {activeMediaTab === "image" ? "images" : "videos"} available
                                        </div>
                                    </Col>
                                )}
                            </Row>
                        </div>

                        <div className="pt-2 border-top">
                            <div className="row">
                                <div className="col-md-6 custom-helper-column">
                                    <DetailsRow title="Post ID" value={String(formData.id ?? "-")} />
                                    <DetailsRow title="Partner ID" value={formData.partner_id || "-"} />
                                    <DetailsRow title="Partner Name" value={formData.partner_name || "-"} />
                                    <DetailsRow title="Media Type" value={formData.media_type || "-"} />
                                </div>
                                <div className="col-md-6 custom-helper-column">
                                    <DetailsRow title="Location" value={formData.location || "-"} />
                                    <DetailsRow title="Uploaded Date" value={formData.uploaded_date || "-"} />
                                    <DetailsRow title="Post Status" value={formData.status || "-"} />
                                </div>
                            </div>
                            <div className="mt-2 p-2 border rounded">
                                <div className="custom-personal-row-title mb-1">Description</div>
                                <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", color: "var(--txt-color)" }}>
                                    {formData.description || "-"}
                                </div>
                            </div>
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