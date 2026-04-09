import React, { useState } from "react";
import { Button, Form } from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import CustomHeader from "../../components/CustomHeader";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { useForm } from "react-hook-form";

const AddEditContent = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { register, setValue } = useForm<any>();
    const contentData = (location.state as any)?.contentData;

    const [title, setTitle] = useState(contentData?.title || "");
    const [content, setContent] = useState("");

    const handleSave = () => {
        console.log({ title, content });
        navigate("/content-management");
    };

    const quillModules = {
        toolbar: [
            [{ header: [1, 2, 3, false] }],
            ["bold", "italic", "underline"],
            [{ list: "ordered" }, { list: "bullet" }],
            [{ align: [] }],
            ["link","image"], 
            ["clean"],
        ],
    };

    return (
        <div className="main-page-content d-flex flex-column vh-100">
            <CustomHeader title="Content Management" register={register} setValue={setValue} />

            <div className="card shadow-sm border-0 flex-grow-1 d-flex flex-column">
                <div className="card-body p-4 d-flex flex-column h-100">

                    {/* Heading + More */}
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <div className="d-flex align-items-center gap-2">
                            <button
                                type="button"
                                className="financial-subpage-back text-danger"
                                onClick={() => navigate("/content-management")}
                                aria-label="Back to content list"
                            >
                                <i className="bi bi-chevron-left" aria-hidden="true" />
                            </button>
                            <h5 className="fw-bold text-uppercase mb-0 text-danger">
                                Edit Content
                            </h5>
                        </div>
                    </div>

                    {/* Title Input (no label) */}
                    <div className="mb-4">
                        <Form.Control
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Enter title"
                            className="py-2 "
                        />
                    </div>

                    {/* Editor */}
                    <div>
                        <ReactQuill
                            className="quill-editor"
                            theme="snow"
                            value={content}
                            onChange={setContent}
                            modules={quillModules}
                        />
                    </div>

                    {/* Buttons */}
                    <div className="d-flex justify-content-end gap-2 mt-3">
                        <Button
                            variant="outline-danger"
                            onClick={() => navigate("/content-management")}
                        >
                            Cancel
                        </Button>

                        <Button
                            variant="danger"
                            onClick={handleSave}
                        >
                            Save
                        </Button>
                    </div>



                </div>
            </div>

        </div>
    );
};

export default AddEditContent;