import { useNavigate } from "react-router-dom";
import { useForm, } from "react-hook-form";
import { useState } from "react";
import loginBGLogo from "../../assets/icons/login_bg_logo.svg";
import loginLogo from "../../assets/icons/login_logo.svg";
import { Card, Col, Button, Form } from 'react-bootstrap';
import { CustomFormInput } from '../../components/CustomFormInput';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../routes/Routes';
import { login } from "../../services/adminService";
import {
    mock_auth_login,
    mockAdminLogin,
    mockFranchiseAdminLogin,
    mockEmployeeLogin,
    MOCK_ADMIN_CREDENTIALS,
    MOCK_FRANCHISE_CREDENTIALS,
    MOCK_EMPLOYEE_CREDENTIALS,
} from "../../services/mockAuthService";
import { getLocalStorage, setLocalStorage } from "../../helper/localStorageHelper";
import { showErrorAlert } from "../../helper/alertHelper";
import { AppConstant, UserRole } from '../../constant/AppConstant';

type LoginRole = typeof UserRole.ADMIN | typeof UserRole.FRANCHISE_ADMIN | typeof UserRole.EMPLOYEE;

const Login = () => {
    const navigate = useNavigate();
    const { register, handleSubmit,formState: { errors } } = useForm();
    const [loginRole, setLoginRole] = useState<LoginRole>(UserRole.ADMIN);

    const persistSession = (admin: { auth_token: string | null; _id: string | null }, role: LoginRole) => {
        setLocalStorage(AppConstant.authToken, admin?.auth_token);
        setLocalStorage(AppConstant.isAdmin, true);
        setLocalStorage(AppConstant.adminId, admin?._id);
        setLocalStorage(AppConstant.createdById, admin?._id);
        setLocalStorage(AppConstant.userRole, role);
        navigate(ROUTES.DASHBOARD.path, { replace: true });
    };

    const onSubmitEvent = async (data: any) => {
        const device_token = getLocalStorage(AppConstant.deviceToken);

        if (loginRole === UserRole.ADMIN) {
            if (mock_auth_login) {
                const { admin, response } = await mockAdminLogin({
                    email: data.email,
                    password: data.password,
                    device_token,
                });
                if (response && admin) {
                    persistSession(admin, UserRole.ADMIN);
                } else {
                    showErrorAlert("Invalid mock credentials. Use the email and password shown above.");
                }
                return;
            }
            const payload = {
                email: data.email,
                password: data.password,
                type: 1,
                device_token,
            };
            const { admin, response } = await login(payload);
            if (response && admin) {
                persistSession(admin, UserRole.ADMIN);
            }
            return;
        }

        if (loginRole === UserRole.FRANCHISE_ADMIN) {
            const { admin, response } = await mockFranchiseAdminLogin({
                email: data.email,
                password: data.password,
                device_token,
            });
            if (response && admin) {
                persistSession(admin, UserRole.FRANCHISE_ADMIN);
            } else {
                showErrorAlert("Invalid mock credentials. Use the email and password shown above.");
            }
            return;
        }

        const { admin, response } = await mockEmployeeLogin({
            email: data.email,
            password: data.password,
            device_token,
        });
        if (response && admin) {
            persistSession(admin, UserRole.EMPLOYEE);
        } else {
            showErrorAlert("Invalid mock credentials. Use the email and password shown above.");
        }
    };

    return (

        <div style={{height: "100vh", display: "flex", alignItems: "center", justifyContent: "space-between" }}>

            <Col>
                <img src={loginBGLogo} className="img-fluid" alt="Background Logo" />
            </Col>

            <Col className="d-flex justify-content-end pe-5">
                <Card
                    className="ms-auto"
                    style={{
                        width: "30vw",
                        aspectRatio: "528 / 491",
                        padding: "20px",
                        borderRadius: "16px",
                        backgroundColor: "var(--bg-color)",
                        boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: "50px"
                    }}
                >
                    <Card.Body className="d-flex flex-column align-items-center justify-content-center w-100">
                        <img src={loginLogo} alt="Logo" />
                        <h2 className="mb-4 title">helper!</h2>
                        <form
                            noValidate
                            name="login-form"
                            id="login-form"
                            className="w-100"
                            onSubmit={handleSubmit(onSubmitEvent)}>
                            <Form.Group className="mb-3 w-100">
                                <Form.Label className="small text-muted mb-1">Sign in as</Form.Label>
                                <Form.Select
                                    value={loginRole}
                                    onChange={(e) => setLoginRole(e.target.value as LoginRole)}
                                    aria-label="Login role"
                                >
                                    <option value={UserRole.ADMIN}>Admin</option>
                                    <option value={UserRole.FRANCHISE_ADMIN}>Franchise admin</option>
                                    <option value={UserRole.EMPLOYEE}>Employee</option>
                                </Form.Select>
                            </Form.Group>
                            {mock_auth_login && loginRole === UserRole.ADMIN && (
                                <p className="small text-muted mb-3">
                                    Mock: {MOCK_ADMIN_CREDENTIALS.email} / {MOCK_ADMIN_CREDENTIALS.password}
                                </p>
                            )}
                            {loginRole === UserRole.FRANCHISE_ADMIN && (
                                <p className="small text-muted mb-3">
                                    Mock: {MOCK_FRANCHISE_CREDENTIALS.email} / {MOCK_FRANCHISE_CREDENTIALS.password}
                                </p>
                            )}
                            {loginRole === UserRole.EMPLOYEE && (
                                <p className="small text-muted mb-3">
                                    Mock: {MOCK_EMPLOYEE_CREDENTIALS.email} / {MOCK_EMPLOYEE_CREDENTIALS.password}
                                </p>
                            )}
                            <CustomFormInput
                                label=""
                                controlId="email"
                                placeholder="Enter Email"
                                register={register}
                                error={errors.email}
                                asCol={false}
                                validation={{ required: "Email is required" }}
                            />
                            <CustomFormInput
                                label=""
                                inputType="password"
                                controlId="password"
                                placeholder="Enter Password"
                                register={register}
                                error={errors.password}
                                asCol={false}
                                validation={{ required: "Password is required" }}
                            />
                            <Button type="submit" className="custom-button">
                                Login
                            </Button>
                        </form>
                        <Link to={ROUTES.FORGOT_PASSWORD.path} className="custom-link">
                            Forgot Password?
                        </Link>
                    </Card.Body>
                </Card>
            </Col>
        </div>
    );
}

export default Login;