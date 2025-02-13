import { useState, useEffect, useCallback, useRef } from "react";
import { Row, Col, Button } from "react-bootstrap";
import { Link } from 'react-router-dom';
import circleEdit from "../../assets/icons/circle_edit.svg"
import loginLogo from "../../assets/icons/login_logo.svg"
import EditProfile from "./editProfile";
import { UserModel } from "../../models/UserModel";
import { getCreatedById } from "../../helper/localStorageHelper";
import { fetchById, createOrUpdateUser } from "../../services/adminService"
import CustomPhotoUpload from "../../components/CustomPhotoUpload";
import { createOrUpdateDocument } from "../../services/documentUploadService";
import { showErrorAlert } from "../../helper/alertHelper";
import { AppConstant } from "../../constant/AppConstant";

const Profile = () => {

    const [fileInputs, setFileInputs] = useState<File[]>([]);
    const [replaceUrls, setReplaceUrl] = useState<string[]>([]);
    const [show, setShow] = useState(false);
    const [uploadShow, setUploadShow] = useState(false);
    const [isChangePassword, setIsChangePassword] = useState(false);
    const [userDetails, setUserDetails] = useState<UserModel | null>(null);
    const fetchRef = useRef(false);

    const fetchData = useCallback(async () => {
        if (fetchRef.current) return;
        fetchRef.current = true;
        const details = await fetchById(getCreatedById());
        setUserDetails(details);
        fetchRef.current = false;
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const onCloseModal = () => {
        setShow(false);
        setIsChangePassword(false);
        fetchData();
    };

    const onOpenModal = () => setShow(true);

    const editProfile = (changePassword: boolean) => {
        setIsChangePassword(changePassword);
        onOpenModal();
    };

    const onUploadCloseModal = () => {
        setUploadShow(false);
        fetchData();
    };

    const onUploadSave = async () => {
        if (userDetails?.profile_url && (fileInputs.length > 0 && replaceUrls.length > 0)) {
            //edit profile
            console.log("Update Profile Photo");
            uploadProfile(true);
        } else if (userDetails?.profile_url && (fileInputs.length === 0 && replaceUrls.length === 0)) {
            //delete profile
            console.log("Remove Profile");
        } else {
            // add profile   
            if (fileInputs.length > 0) {
                console.log("Add Profile Photo");
                uploadProfile(false);
            } else {
                console.log("No Profile Photo choose");
            }
        }

    };

    const uploadProfile = async (isEditable: boolean) => {
        const formData = new FormData();
        formData.append("type", "2");
        fileInputs.forEach((file) => formData.append("files", file));
        if (isEditable) {
            if (replaceUrls.length > 0) {
                formData.append("update_file_urls", JSON.stringify(replaceUrls));
            }
        }

        let { response, fileList } = await createOrUpdateDocument(formData, isEditable);

        if (response) {
            const payload = {
                profile_url: fileList[0],
            };
            if (!userDetails?._id) {
                showErrorAlert("Unable to update. ID is missing.");
                return;
            }

            let responseUpdate = await createOrUpdateUser(payload, true, userDetails?._id);
            if (responseUpdate) {
                onUploadCloseModal();
            }
        }
    }
    return (
        <>
            <div className="main-page-content">
                <h4>Profile</h4>
                <Row className="d-flex justify-content-center align-items-center w-100 h-90 m-0 p-0">

                    <Col sm={4}>
                        <div style={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            width: "100%",
                            margin: "0px",
                            padding: "0px",
                            marginBottom: "20px",
                        }}>
                            <div style={{ position: "relative", display: "inline-block" }}>
                                <img
                                    src={userDetails?.profile_url ? `${AppConstant.IMAGE_BASE_URL}${userDetails?.profile_url}?t=${Date.now()}` : loginLogo}
                                    alt="Profile"
                                    style={{
                                        width: "200px",
                                        height: "200px",
                                        borderRadius: "50%",
                                        objectFit: "cover",
                                        border: "2px solid var(--sb-border)",
                                    }}
                                />
                                <img
                                    src={circleEdit}
                                    alt="Edit"
                                    style={{
                                        position: "absolute",
                                        bottom: "15px",
                                        right: "15px",
                                        width: "30px",
                                        height: "30px",
                                        cursor: "pointer",
                                    }}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setUploadShow(true);
                                    }}
                                />
                            </div>
                        </div>

                        <div className="custom-profile-box">
                            <Row>
                                <Col>
                                    <label className="custom-title-lable">Name:</label>
                                    <label className="custom-subtitle-lable">{userDetails?.name}</label>
                                </Col>
                            </Row>
                            <Row>
                                <Col>
                                    <label className="custom-title-lable">Email:</label>
                                    <label className="custom-subtitle-lable">{userDetails?.email}</label>
                                </Col>
                            </Row>
                            <Row>
                                <Col>
                                    <label className="custom-title-lable">Password:</label>
                                    <label className="custom-subtitle-lable">***************</label>
                                </Col>
                            </Row>
                            <Button type="submit"
                                style={{
                                    width: "100%",
                                    height: "32px",
                                    fontSize: "20px",
                                    fontWeight: "normal",
                                    backgroundColor: "var(--secondary-btn)",
                                    color: "var(--bg-color)",
                                    borderRadius: "8px",
                                    border: "none",
                                    margin: "0px",
                                    padding: "0px",
                                }}
                                onClick={(e) => {
                                    e.preventDefault();
                                    editProfile(false);
                                }}
                            >
                                Edit
                            </Button>

                            <Button type="submit"
                                style={{
                                    width: "100%",
                                    height: "32px",
                                    fontSize: "20px",
                                    fontWeight: "normal",
                                    backgroundColor: "var(--secondary-btn)",
                                    color: "var(--bg-color)",
                                    borderRadius: "8px",
                                    border: "none",
                                    margin: "0px",
                                    padding: "0px",
                                    marginTop: "10px",
                                }}
                                onClick={(e) => {
                                    e.preventDefault();
                                    editProfile(true);
                                }}
                            >
                                Change Password
                            </Button>
                        </div>

                        <div className="custom-profile-box">
                            <span style={{
                                fontSize: "16px",
                                fontWeight: 600,
                                color: "var(--secondary-btn)",
                            }}>Policies</span>
                            <Link to="#" className="custom-profile-link">
                                Terms & Conditions
                            </Link>
                            <Link to="#" className="custom-profile-link">
                                Privacy Policy
                            </Link>
                            <Link to="#" className="custom-profile-link">
                                Cookies Policy
                            </Link>
                        </div>
                        <Row>
                            <Col sm={6}>
                                <Button type="submit"
                                    style={{
                                        width: "100%",
                                        height: "36px",
                                        fontSize: "16px",
                                        fontWeight: 600,
                                        backgroundColor: "var(--bg-color)",
                                        color: "var(--secondary-btn)",
                                        border: "1px solid var(--sb-border)",
                                        borderRadius: "16px",
                                        margin: "0px",
                                        padding: "0px",
                                    }}
                                >
                                    Help
                                </Button>
                            </Col>
                            <Col sm={6}>
                                <Button type="submit"
                                    style={{
                                        width: "100%",
                                        height: "36px",
                                        fontSize: "16px",
                                        fontWeight: 600,
                                        backgroundColor: "var(--bg-color)",
                                        color: "var(--secondary-btn)",
                                        border: "1px solid var(--sb-border)",
                                        borderRadius: "16px",
                                        margin: "0px",
                                        padding: "0px",
                                    }}
                                >
                                    Report a problem
                                </Button>
                            </Col>
                        </Row>
                    </Col>
                </Row>
            </div>

            {show && (
                <EditProfile
                    isOpen={show}
                    isChangePassword={isChangePassword}
                    onClose={onCloseModal}
                    user={userDetails}
                />
            )}

            {uploadShow && (
                <CustomPhotoUpload
                    isOpen={uploadShow}
                    onClose={onUploadCloseModal}
                    onUploadSave={onUploadSave}
                    {...(userDetails?.profile_url ? { existingImages: [userDetails.profile_url] } : [])}
                    onFileChange={(files, replaceUrls) => {
                        setFileInputs(files);
                        setReplaceUrl(replaceUrls);
                        console.log("files:", files)
                        console.log("replaceUrls:", replaceUrls)
                    }}
                />
            )}
        </>
    );
}

export default Profile;