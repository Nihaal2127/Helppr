import React from "react";
import ReactDOM from "react-dom/client";
import { useForm } from "react-hook-form";
import { Modal, Button, Row, Col } from "react-bootstrap";
import CustomCloseButton from "../../components/CustomCloseButton";
import { CategoryModel } from "../../models/CategoryModel";
import { CustomFormInput } from "../../components/CustomFormInput";

type AddEditCategoryDialogProps = {
    isEditable: boolean;
    category: CategoryModel | null;
    onClose: () => void;
};

const AddEditCategoryDialog: React.FC<AddEditCategoryDialogProps> & {
    show: (isEditable: boolean, category: CategoryModel | null) => void;
} = ({ isEditable, category, onClose }) => {
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<CategoryModel>({
        defaultValues: {
            name: category?.name || "",
            email: category?.email || "",
        },
    });

    const onSubmitEvent = async (data: CategoryModel) => {
        console.log("Submitted Data:", data);
        onClose?.();
    };

    return (
        <Modal show={true} onHide={onClose} centered dialogClassName="custom-big-modal">
            <Modal.Header className="py-3 px-4 border-bottom-0">
                <Modal.Title as="h5" className="custom-modal-title">
                    {isEditable ? "Edit" : "Add"} Category
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

                        <Row className="align-items-center m-0 p-0" >
                            <Col sm={4} className="mt-3 ms-2" >
                                <label className="custom-profile-lable">Name</label>
                            </Col>
                            <Col sm={7}>
                                <CustomFormInput
                                    label=""
                                    controlId="name"
                                    placeholder="Enter Username"
                                    register={register}
                                    error={errors.name}
                                    asCol={false}
                                    validation={{ required: "Username is required" }}
                                />
                            </Col>
                        </Row>

                        <Row className="align-items-center m-0 p-0" >
                            <Col sm={4} className="mt-3 ms-2" >
                                <label className="custom-profile-lable">Email</label>
                            </Col>
                            <Col sm={7}>
                                <CustomFormInput
                                    label=""
                                    controlId="email"
                                    placeholder="Enter Email"
                                    register={register}
                                    error={errors.email}
                                    asCol={false}
                                    isEditable={false}
                                    validation={{ required: "Email is required" }}
                                />
                            </Col>
                        </Row>

                    </Row>
                    <Row className="mt-4">
                        <Col xs={6} className="text-center">
                            <Button type="submit" className="custom-btn-primary" >
                                Add
                            </Button>
                        </Col>
                        <Col xs={6} className="text-center" onClick={onClose}>
                            <Button className="custom-btn-secondary">
                                Cancel
                            </Button>
                        </Col>
                    </Row>
                </form>
            </Modal.Body>
        </Modal>
    );
};

// Static method to show the modal
AddEditCategoryDialog.show = (isEditable: boolean, category: CategoryModel | null) => {
    const modalContainer = document.createElement("div");
    document.body.appendChild(modalContainer);
    const root = ReactDOM.createRoot(modalContainer);

    const closeModal = () => {
        root.unmount();
        document.body.removeChild(modalContainer);
    };

    root.render(
        <AddEditCategoryDialog
            isEditable={isEditable}
            category={category}
            onClose={closeModal}
        />
    );
};

export default AddEditCategoryDialog;
