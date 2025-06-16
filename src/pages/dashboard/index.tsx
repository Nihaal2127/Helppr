import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { Row, Col } from "react-bootstrap";
import CustomHeader from "../../components/CustomHeader";
import { DashboardCard, formatDate } from "../../helper/utility";
import graphsImg from "../../assets/icons/Graph.svg";
import { DashboardModel } from "../../models/DashboardModel";
import { getDashboardData } from "../../services/dashboardService";
import CustomDatePicker from "../../components/CustomDatePicker";
import { AppConstant } from "../../constant/AppConstant";

const Dashboard = () => {
    const { register, setValue } = useForm<any>();
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString());

    const [dashboardDetails, setDashboardDetails] = useState<DashboardModel>({
        total_service: 0,
        inactive_service: 0,
        active_service: 0,
        total_partner: 0,
        inactive_partner: 0,
        active_partner: 0,
        pending_order: 0,
        in_progress_order: 0,
        completed_order: 0,
        cancelled_order: 0,
        received_amount: 0,
        pending_amount: 0,
        revenue: 0,
    });
    const fetchRef = useRef(false);

    const fetchDataFromApi = async () => {
        if (fetchRef.current) return;
        fetchRef.current = true;
        try {
            const { response, dashboard } = await getDashboardData(selectedDate);
            if (response) {
                setDashboardDetails(dashboard!!);
            }
        } finally {
            fetchRef.current = false;
        }
    };

    useEffect(() => {
        fetchDataFromApi();
    }, [selectedDate]);

    return (
        <>
            <div className="main-page-content">
                <CustomHeader
                    title="Dashboard"
                />
                <div className="custom-dashboard-card">
                    <h3 className="custom-dashboard-title">Current Date is : {formatDate(selectedDate)}</h3>
                    <CustomDatePicker
                        label=""
                        controlId="service_date"
                        selectedDate={selectedDate}
                        onChange={(date) => {
                            const selectedDate = date?.toISOString() || "";
                            setSelectedDate(selectedDate);
                        }}
                        placeholderText="Select date"
                        register={register}
                        setValue={setValue}
                        asCol={true}
                        filterDate={() => true}
                    />
                </div>


                <div className="custom-dashboard-card">
                    <h3 className="custom-dashboard-title">{formatDate(selectedDate)} Progress</h3>
                    <div className="d-flex gap-2">
                        <DashboardCard title="Requests Received" count={dashboardDetails!.pending_order} color="var(--btn-info)" />
                        <DashboardCard title="In Progress" count={dashboardDetails!.in_progress_order} color="var(--btn-warning)" />
                        <DashboardCard title="Completed" count={dashboardDetails!.completed_order} color="var(--btn-success)" />
                        <DashboardCard title="Cancelled" count={dashboardDetails!.cancelled_order} color="var(--btn-danger)" />

                    </div>
                </div>

                <div className="custom-dashboard-card">
                    <h3 className="custom-dashboard-title">{formatDate(selectedDate)} Payments</h3>
                    <div className="d-flex gap-2">
                        <DashboardCard title="Received" count={`${AppConstant.currencySymbol}${dashboardDetails!.received_amount}`} color="var(--btn-success)" />
                        <DashboardCard title="Pending" count={`${AppConstant.currencySymbol}${dashboardDetails!.pending_amount}`} color="var(--btn-warning)" />
                    </div>
                </div>

                <Row>
                    <Col sm={8}>
                        <div className="custom-dashboard-card">
                            <h3 className="custom-dashboard-title">{formatDate(selectedDate)} Services</h3>
                            <div className="d-flex gap-2">
                                <DashboardCard title="Total" count={dashboardDetails!.total_service} color="var(--btn-info)" />
                                <DashboardCard title="Active" count={dashboardDetails!.active_service} color="var(--btn-success)" />
                                <DashboardCard title="Inactive" count={dashboardDetails!.inactive_service} color="var(--btn-danger)" />
                            </div>
                        </div>
                        <div className="custom-dashboard-card">
                            <h3 className="custom-dashboard-title">{formatDate(selectedDate)} Partners</h3>
                            <div className="d-flex gap-2">
                                <DashboardCard title="Total" count={dashboardDetails!.total_partner} color="var(--btn-info)" />
                                <DashboardCard title="Active" count={dashboardDetails!.active_partner} color="var(--btn-success)" />
                                <DashboardCard title="Inactive" count={dashboardDetails!.inactive_partner} color="var(--btn-danger)" />
                            </div>
                        </div>
                    </Col>
                    <Col sm={4}>
                        <div className="custom-dashboard-card" style={{ borderRadius: "8px" }}>
                            <h3 className="custom-dashboard-title">{formatDate(selectedDate)} Revenue</h3>
                            <label className="custom-dashboard-title-count">{AppConstant.currencySymbol}{dashboardDetails!.revenue}</label>
                            <img src={graphsImg} alt="graph" className="mt-4" />
                        </div>
                    </Col>
                </Row>
            </div>
        </>
    );
}

export default Dashboard;