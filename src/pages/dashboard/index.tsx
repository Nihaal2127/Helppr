import { useState, useEffect, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { Row, Col } from "react-bootstrap";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    Tooltip,
    Legend,
} from "chart.js";
import { Bar, Pie } from "react-chartjs-2";
import CustomHeader from "../../components/CustomHeader";
import CustomFormSelect from "../../components/CustomFormSelect";
import { DashboardCard, formatDate } from "../../helper/utility";
import { DashboardModel } from "../../models/DashboardModel";
import { getDashboardData } from "../../services/dashboardService";
import CustomDatePicker from "../../components/CustomDatePicker";
import { AppConstant } from "../../constant/AppConstant";

type DateRangeType = "TODAY" | "THIS_WEEK" | "THIS_MONTH" | "THIS_YEAR" | "CUSTOM_RANGE";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const DEFAULT_DASHBOARD: DashboardModel = {
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
    customer_amount: 0,
    partner_amount: 0,
    commission_amount: 0,
};

const formatDashboardAmount = (value: number) =>
    `${AppConstant.currencySymbol}${Number(value || 0).toLocaleString()}`;

const Dashboard = () => {
    const { register, setValue } = useForm<any>();
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString());
    const [dateRangeType, setDateRangeType] = useState<DateRangeType>("TODAY");
    const currentYear = new Date().getFullYear();
    const [weekStartDate, setWeekStartDate] = useState<string>(new Date().toISOString());
    const [customFromDate, setCustomFromDate] = useState<string>("");
    const [customToDate, setCustomToDate] = useState<string>("");

    const [dashboardDetails, setDashboardDetails] = useState<DashboardModel>(DEFAULT_DASHBOARD);
    const fetchRef = useRef(false);

    const fetchDataFromApi = useCallback(async () => {
        if (fetchRef.current) return;
        fetchRef.current = true;
        try {
            const { response, dashboard } = await getDashboardData(selectedDate);
            if (response && dashboard) {
                setDashboardDetails({ ...DEFAULT_DASHBOARD, ...dashboard });
            }
        } finally {
            fetchRef.current = false;
        }
    }, [selectedDate]);

    useEffect(() => {
        void fetchDataFromApi();
    }, [fetchDataFromApi]);

    const handleDateRangeTypeChange = (value: DateRangeType) => {
        setDateRangeType(value);

        const today = new Date();

        if (value === "TODAY") {
            setSelectedDate(today.toISOString());
        }

        if (value === "THIS_WEEK") {
            const day = today.getDay();
            const diff = today.getDate() - day + (day === 0 ? -6 : 1);
            const start = new Date(today);
            start.setDate(diff);

            setWeekStartDate(start.toISOString());
            setSelectedDate(today.toISOString());
        }

        if (value === "THIS_MONTH") {
            setSelectedDate(today.toISOString());
        }

        if (value === "THIS_YEAR") {
            // API expects a single date; backend will infer the range (year) from this date.
            setSelectedDate(today.toISOString());
        }

        if (value === "CUSTOM_RANGE") {
            // No automatic change to selectedDate; user will pick custom range
        }
    };

    const dateRangeOptions = [
        { value: "TODAY", label: "Today" },
        { value: "THIS_WEEK", label: "This Week" },
        { value: "THIS_MONTH", label: "This Month" },
        { value: "THIS_YEAR", label: "This Year" },
        { value: "CUSTOM_RANGE", label: "Custom Range" },
    ];

    const customerPay = dashboardDetails.customer_amount;
    const partnerPay = dashboardDetails.partner_amount;
    const commissionPay = dashboardDetails.commission_amount;
    const totalPaymentsAmount = customerPay + partnerPay + commissionPay;

    /** When breakdown is all zero, show sample bars aligned with Customer / Partner / Commission / Total. */
    const PAYMENTS_CHART_DUMMY = { customer: 12000, partner: 6500, commission: 3500 } as const;
    const hasPaymentsBreakdown = totalPaymentsAmount > 0;
    const chartCustomer = hasPaymentsBreakdown ? customerPay : PAYMENTS_CHART_DUMMY.customer;
    const chartPartner = hasPaymentsBreakdown ? partnerPay : PAYMENTS_CHART_DUMMY.partner;
    const chartCommission = hasPaymentsBreakdown ? commissionPay : PAYMENTS_CHART_DUMMY.commission;
    const chartTotal = hasPaymentsBreakdown
        ? totalPaymentsAmount
        : PAYMENTS_CHART_DUMMY.customer + PAYMENTS_CHART_DUMMY.partner + PAYMENTS_CHART_DUMMY.commission;

    const maxPaymentAmount = Math.max(chartCustomer, chartPartner, chartCommission, chartTotal, 1);

    const paymentsChartData = {
        labels: ["Customer", "Partner", "Commission", "Total"],
        datasets: [
            {
                label: "Payments",
                data: [chartCustomer, chartPartner, chartCommission, chartTotal],
                backgroundColor: [
                    "rgba(27, 107, 172, 0.7)", // customer — --btn-info
                    "rgba(172, 154, 27, 0.7)", // partner — --btn-warning
                    "rgba(66, 172, 27, 0.7)", // commission — --btn-success
                    "rgba(241, 67, 9, 0.7)", // total — --btn-pending
                ],
                borderColor: ["#1B6BAC", "#AC9A1B", "#42AC1B", "#F14309"],
                borderWidth: 1,
                borderRadius: 4,
            },
        ],
    };

    const paymentChartSuggestedMax = Math.ceil(maxPaymentAmount / 1000) * 1000;

    const paymentsChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
        },
        scales: {
            x: {
                grid: {
                    display: false,
                },
            },
            y: {
                beginAtZero: true,
                suggestedMax: paymentChartSuggestedMax,
                ticks: {
                    stepSize: Math.max(1000, Math.ceil(paymentChartSuggestedMax / 5)),
                    callback: (value: string | number) =>
                        `${AppConstant.currencySymbol}${Number(value).toLocaleString()}`,
                },
                grid: {
                    color: "rgba(0, 0, 0, 0.05)",
                },
            },
        },
    } as const;

    const quotesTotalRaw =
        dashboardDetails.total_quote != null
            ? dashboardDetails.total_quote
            : dashboardDetails.pending_order;
    const ordersTotalRaw =
        dashboardDetails.total_order != null
            ? dashboardDetails.total_order
            : dashboardDetails.in_progress_order +
              dashboardDetails.completed_order +
              dashboardDetails.cancelled_order;

    /** Sample split when API returns no quote/order totals — keeps the pie usable for layout review. */
    const ORDERS_VS_QUOTES_DESIGN_DUMMY = { quotes: 42, orders: 118 } as const;
    const hasRealOrdersQuotesData = quotesTotalRaw + ordersTotalRaw > 0;
    const quotesTotal = hasRealOrdersQuotesData
        ? quotesTotalRaw
        : ORDERS_VS_QUOTES_DESIGN_DUMMY.quotes;
    const ordersTotal = hasRealOrdersQuotesData
        ? ordersTotalRaw
        : ORDERS_VS_QUOTES_DESIGN_DUMMY.orders;

    const ordersVsQuotesPieData = {
        labels: ["Quotes", "Orders"],
        datasets: [
            {
                data: [quotesTotal, ordersTotal],
                backgroundColor: ["rgba(27, 107, 172, 0.9)", "rgba(66, 172, 27, 0.9)"],
                borderColor: ["#1B6BAC", "#42AC1B"],
                borderWidth: 1,
            },
        ],
    };

    const ordersVsQuotesPieOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: "bottom" as const,
                labels: {
                    boxWidth: 12,
                    padding: 12,
                    font: { size: 12 },
                },
            },
            tooltip: {
                callbacks: {
                    label: (ctx: { label?: string; raw: unknown; dataset: { data: unknown[] } }) => {
                        const value = Number(ctx.raw) || 0;
                        const data = ctx.dataset.data as number[];
                        const total = data.reduce((a, b) => a + (Number(b) || 0), 0);
                        const pct = total > 0 ? Math.round((value / total) * 100) : 0;
                        return `${ctx.label ?? ""}: ${value} (${pct}%)`;
                    },
                },
            },
        },
    } as const;

    return (
        <>
            <div className="main-page-content">
                <CustomHeader
                    title="Dashboard"
                    register={register}
                    setValue={setValue}
                />
                
                <div className="custom-dashboard-card">
                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                        <div>
                            <h3 className="m-0 custom-dashboard-title">
                                {dateRangeType === "TODAY" && (
                                    <>Current Date is : {formatDate(selectedDate)}</>
                                )}
                                {dateRangeType === "THIS_WEEK" && (
                                    <>
                                        Current Week : {formatDate(weekStartDate)} to {formatDate(selectedDate)}
                                    </>
                                )}
                                {dateRangeType === "THIS_MONTH" && (
                                    <>
                                        Current Month : {new Date(selectedDate).toLocaleString("default", {
                                            month: "long",
                                            year: "numeric",
                                        })}
                                    </>
                                )}
                                {dateRangeType === "THIS_YEAR" && (
                                    <>
                                        Current Year : {currentYear}
                                    </>
                                )}
                                {dateRangeType === "CUSTOM_RANGE" && (
                                    <>
                                        Custom Range
                                        {customFromDate && customToDate && (
                                            <> : {formatDate(customFromDate)} to {formatDate(customToDate)}</>
                                        )}
                                    </>
                                )}
                            </h3>
                        </div>
                        <div className="d-flex flex-wrap align-items-center gap-2">
                            <div style={{ minWidth: 200, maxWidth: 260 }}>
                                <CustomFormSelect
                                    label=""
                                    controlId="Date Range"
                                    options={dateRangeOptions}
                                    register={register}
                                    fieldName="date_range_type"
                                    defaultValue={dateRangeType}
                                    onChange={(e) => handleDateRangeTypeChange(e.target.value as DateRangeType)}
                                    asCol={false}
                                    noBottomMargin
                                />
                            </div>
                            {/* Date picker hidden for now; API still uses selectedDate state */}
                            {/* <CustomDatePicker
                                label=""
                                controlId="service_date"
                                selectedDate={selectedDate}
                                onChange={(date) => {
                                    const newSelectedDate = date?.toISOString() || "";
                                    setSelectedDate(newSelectedDate);
                                }}
                                placeholderText="Select date"
                                register={register}
                                setValue={setValue}
                                asCol={true}
                                filterDate={() => true}
                            /> */}
                        </div>
                    </div>
                    {dateRangeType === "CUSTOM_RANGE" && (
                        <div className="d-flex flex-wrap gap-3">
                            <div style={{ minWidth: 180, maxWidth: 260 }}>
                                <CustomDatePicker
                                    controlId="service_date_from"
                                    selectedDate={customFromDate}
                                    onChange={(date) => {
                                        const iso = date?.toISOString() || "";
                                        setCustomFromDate(iso);
                                    }}
                                    placeholderText="From date"
                                    register={register}
                                    setValue={setValue}
                                    groupClassName="w-100 mb-0"
                                    asCol={false}
                                    filterDate={() => true}
                                />
                            </div>
                            <div style={{ minWidth: 180, maxWidth: 260 }}>
                                <CustomDatePicker
                                    controlId="service_date_to"
                                    selectedDate={customToDate}
                                    onChange={(date) => {
                                        const iso = date?.toISOString() || "";
                                        setCustomToDate(iso);
                                    }}
                                    placeholderText="To date"
                                    register={register}
                                    setValue={setValue}
                                    groupClassName="w-100 mb-0"
                                    asCol={false}
                                    filterDate={() => true}
                                />
                            </div>
                        </div>
                    )}
                </div>


                <div className="custom-dashboard-card">
                    {/* <h3 className="custom-dashboard-title">{formatDate(selectedDate)} Progress</h3> */}
                    <h3 className="custom-dashboard-title">Quotes</h3>
                    <div className="d-flex gap-2">
                        <DashboardCard title="Requests Received" count={dashboardDetails!.pending_order} color="var(--btn-info)" />
                        <DashboardCard title="In Progress" count={dashboardDetails!.in_progress_order} color="var(--btn-warning)" />
                        <DashboardCard title="Completed" count={dashboardDetails!.completed_order} color="var(--btn-success)" />
                        <DashboardCard title="Cancelled" count={dashboardDetails!.cancelled_order} color="var(--btn-danger)" />
                    </div>
                </div>

                <div className="custom-dashboard-card">
                    {/* <h3 className="custom-dashboard-title">{formatDate(selectedDate)} Payments</h3> */}
                    <h3 className="custom-dashboard-title">Orders</h3>
                    <div className="d-flex gap-2">
                        {/* <DashboardCard title="Requests Received" count={dashboardDetails!.pending_order} color="var(--btn-info)" /> */}
                        <DashboardCard title="In Progress" count={dashboardDetails!.in_progress_order} color="var(--btn-warning)" />
                        <DashboardCard title="Completed" count={dashboardDetails!.completed_order} color="var(--btn-success)" />
                        <DashboardCard title="Cancelled" count={dashboardDetails!.cancelled_order} color="var(--btn-danger)" />
                    </div>
                </div>

                <div className="custom-dashboard-card">
                    <h3 className="custom-dashboard-title">Payments</h3>
                    <div className="d-flex gap-2 flex-wrap">
                        <DashboardCard
                            title="Total Payments"
                            count={formatDashboardAmount(totalPaymentsAmount)}
                            color="var(--btn-pending)"
                        />
                        <DashboardCard
                            title="Customer"
                            count={formatDashboardAmount(dashboardDetails.customer_amount)}
                            color="var(--btn-info)"
                        />
                        <DashboardCard
                            title="Partner"
                            count={formatDashboardAmount(dashboardDetails.partner_amount)}
                            color="var(--btn-warning)"
                        />
                        <DashboardCard
                            title="Commission"
                            count={formatDashboardAmount(dashboardDetails.commission_amount)}
                            color="var(--btn-success)"
                        />
                    </div>
                </div>

                <Row>
                    <Col sm={6}>
                        <div className="custom-dashboard-card">
                            <h3 className="custom-dashboard-title">Services</h3>
                            <div className="d-flex gap-2">
                                <DashboardCard title="Total" count={dashboardDetails!.total_service} color="var(--btn-info)" />
                                <DashboardCard title="Active" count={dashboardDetails!.active_service} color="var(--btn-success)" />
                                <DashboardCard title="Inactive" count={dashboardDetails!.inactive_service} color="var(--btn-danger)" />
                            </div>
                        </div>
                    </Col>
                    <Col sm={6}>
                        <div className="custom-dashboard-card">
                            <h3 className="custom-dashboard-title">Partners</h3>
                            <div className="d-flex gap-2">
                                <DashboardCard title="Total" count={dashboardDetails!.total_partner} color="var(--btn-info)" />
                                <DashboardCard title="Active" count={dashboardDetails!.active_partner} color="var(--btn-success)" />
                                <DashboardCard title="Inactive" count={dashboardDetails!.inactive_partner} color="var(--btn-danger)" />
                            </div>
                        </div>
                    </Col>
                </Row>
                {/* <Row>
                    <Col sm={8}>
                        <div className="custom-dashboard-card">
                            <h3 className="custom-dashboard-title">Services</h3>
                            <div className="d-flex gap-2">
                                <DashboardCard title="Total" count={dashboardDetails!.total_service} color="var(--btn-info)" />
                                <DashboardCard title="Active" count={dashboardDetails!.active_service} color="var(--btn-success)" />
                                <DashboardCard title="Inactive" count={dashboardDetails!.inactive_service} color="var(--btn-danger)" />
                            </div>
                        </div>
                        <div className="custom-dashboard-card">
                            <h3 className="custom-dashboard-title">Partners</h3>
                            <div className="d-flex gap-2">
                                <DashboardCard title="Total" count={dashboardDetails!.total_partner} color="var(--btn-info)" />
                                <DashboardCard title="Active" count={dashboardDetails!.active_partner} color="var(--btn-success)" />
                                <DashboardCard title="Inactive" count={dashboardDetails!.inactive_partner} color="var(--btn-danger)" />
                            </div>
                        </div>
                    </Col>
                    <Col sm={4}>
                        <div className="custom-dashboard-card" style={{ borderRadius: "8px" }}>
                            <h3 className="custom-dashboard-title">Revenue</h3>
                            <label className="custom-dashboard-title-count">{AppConstant.currencySymbol}{dashboardDetails!.revenue}</label>
                            <img src={graphsImg} alt="graph" className="mt-4" />
                        </div>
                    </Col>
                </Row> */}

                <Row className="">
                    <Col sm={6}>
                        <div className="custom-dashboard-card">
                            <h3 className="custom-dashboard-title">Payments Overview</h3>
                            <div style={{ height: 220 }}>
                                <Bar data={paymentsChartData} options={paymentsChartOptions} />
                            </div>
                            {/* Legacy CSS-only bars kept for reference; Chart.js bar above replaces this */}
                            {/*
                            <div className="d-flex align-items-end justify-content-between" style={{ height: 180 }}>
                                ...
                            </div>
                            */}
                        </div>
                    </Col>
                    <Col sm={6}>
                        <div className="custom-dashboard-card">
                            <h3 className="custom-dashboard-title">Orders vs Quotes</h3>
                            <div
                                className="position-relative w-100"
                                style={{ height: 240, minHeight: 220 }}
                            >
                                <Pie
                                    key={`${selectedDate}-${hasRealOrdersQuotesData}`}
                                    data={ordersVsQuotesPieData}
                                    options={ordersVsQuotesPieOptions}
                                />
                            </div>
                        </div>
                    </Col>
                </Row>
            </div>
        </>
    );
}

export default Dashboard;