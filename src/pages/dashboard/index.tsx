import { Row, Col, Card } from "react-bootstrap";
import CustomHeader from "../../components/CustomHeader";
import { DashboardCard } from "../../helper/utility";
import graphsImg from "../../assets/icons/Graph.svg";

const Dashboard = () => {
    return (
        <>
            <div className="main-page-content">
                <CustomHeader
                    title="Dashboard"
                />

                <div className="custom-dashboard-card">
                    <h3 className="custom-dashboard-title">Today’s Progress</h3>
                    <div className="d-flex gap-2">
                        <DashboardCard title="Requests Received" count={300} color="var(--btn-info" />
                        <DashboardCard title="In Progress" count={300} color="var(--btn-warning)" />
                        <DashboardCard title="Completed" count={300} color="var(--btn-success)" />
                        <DashboardCard title="Cancelled" count={300} color="var(--btn-danger)" />

                    </div>
                </div>

                <div className="custom-dashboard-card">
                    <h3 className="custom-dashboard-title">Today’s Payments</h3>
                    <div className="d-flex gap-2">
                        <DashboardCard title="Received" count={300} color="var(--btn-success)" />
                        <DashboardCard title="Pending" count={300} color="var(--btn-warning)" />
                    </div>
                </div>

                <Row>
                    <Col sm={8}>
                        <div className="custom-dashboard-card">
                            <h3 className="custom-dashboard-title">Services</h3>
                            <div className="d-flex gap-2">
                                <DashboardCard title="Total" count={300} color="var(--btn-info)" />
                                <DashboardCard title="Active" count={300} color="var(--btn-success)" />
                                <DashboardCard title="Inactive" count={300} color="var(--btn-danger)" />
                            </div>
                        </div>
                        <div className="custom-dashboard-card">
                            <h3 className="custom-dashboard-title">Partners</h3>
                            <div className="d-flex gap-2">
                                <DashboardCard title="Total" count={300} color="var(--btn-info)" />
                                <DashboardCard title="Active" count={300} color="var(--btn-success)" />
                                <DashboardCard title="Inactive" count={300} color="var(--btn-danger)" />
                            </div>
                        </div>
                    </Col>
                    <Col sm={4}>
                        <div className="custom-dashboard-card" style={{ borderRadius: "8px" }}>
                            <h3 className="custom-dashboard-title">Revenue</h3>
                            <label className="custom-dashboard-title-count">₹{50000}</label>
                            <img src={graphsImg} alt="graph" className="mt-4" />
                        </div>
                    </Col>
                </Row>
            </div>
        </>
    );
}

export default Dashboard;