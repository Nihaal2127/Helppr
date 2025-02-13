import { useNavigate } from "react-router-dom";
import { useForm, } from "react-hook-form";
import loginBGLogo from "../../assets/icons/login_bg_logo.svg";
import loginLogo from "../../assets/icons/login_logo.svg";
import { Card, Col, Button } from 'react-bootstrap';
import { CustomFormInput } from '../../components/CustomFormInput';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../routes/Routes';
import { login } from "../../services/adminService";
import { setLocalStorage } from "../../helper/localStorageHelper";
import { AppConstant } from '../../constant/AppConstant';

const Login = () => {
    const navigate = useNavigate();
    const { register, handleSubmit,formState: { errors } } = useForm();

    const onSubmitEvent = async (data: any) => {
        const payload = {
            email: data.email,
            password: data.password,
            type: 1,
        };
        let { admin, response } = await login(payload);
        if (response) {
            setLocalStorage(AppConstant.authToken, admin?.auth_token);
            setLocalStorage(AppConstant.isAdmin, true);
            setLocalStorage(AppConstant.adminId, admin?._id);
            setLocalStorage(AppConstant.createdById, admin?._id);
            navigate(ROUTES.DASHBOARD.path, { replace: true });
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