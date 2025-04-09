import React, { useEffect, useState, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import ReactDOM from "react-dom/client";
import { Modal } from "react-bootstrap";
import CustomCloseButton from "../../components/CustomCloseButton";
import { ServiceStatusEnum } from "../../constant/ServiceStatusEnum";
import CustomServiceUtilityBox from "../../components/CustomServiceUtilityBox";
import CustomServiceTable from "../../components/CustomServiceTable";
import { FinancialModel } from "../../models/FinancialModel";
import { fetchFinancial } from "../../services/financialService";
import { formatDate, priceCell } from "../../helper/utility";
import { PaymentEnum } from "../../constant/PaymentEnum";

type ServiceDetailsDialogProps = {
    user_id: string;
    status: number | null;
    onClose: () => void;
    onRefreshData: () => void;
};

const ServiceDetailsDialog: React.FC<ServiceDetailsDialogProps> & {
    show: (user_id: string, status: number | null, onRefreshData: () => void) => void;
} = ({ user_id, status, onClose, onRefreshData }) => {
    const { register } = useForm();
    const statusLabel = status ? `${ServiceStatusEnum.get(status)?.label} Services` : "Total Services";

    const [serviceList, setServiceList] = useState<FinancialModel[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const fetchRef = useRef(false);

    const fetchData = useCallback(async (filters: {
        keyword?: string;
        status?: string
    }) => {
        if (fetchRef.current) return;
        fetchRef.current = true;
        const { response, financials, totalPages } = await fetchFinancial(currentPage, pageSize, { ...filters, });
        if (response) {
            setServiceList(financials);
            setTotalPages(totalPages);
        }
        fetchRef.current = false;
    }, [currentPage, pageSize]);

    useEffect(() => {
        fetchData({});
    }, [pageSize, currentPage]);

    const handleFilterChange = async (filters: {
        keyword?: string;
        status?: string
    }) => {
        setCurrentPage(1);
        setTotalPages(0);
        if (Object.keys(filters).length === 0) {
            fetchRef.current = false;
        } else {
            await fetchData(filters);
        }
    };

    const serviceColumns = React.useMemo(() => [
        {
            Header: "SR No",
            accessor: "serial_no",
            Cell: ({ row }: { row: any }) => (currentPage - 1) * pageSize + row.index + 1,
        },
        { Header: "Order ID", accessor: "order_id" },
        { Header: "Service ID", accessor: "service_id" },
        { Header: "Service Name", accessor: "service_name" },
        { Header: "Category", accessor: "category_name" },
        {
            Header: "Service Date",
            accessor: "service_date",
            Cell: ({ row }) => formatDate(row.original.service_date ? row.original.service_date : "")
        },
        { Header: "Amount", accessor: "total_price", Cell: priceCell("total_price"), },
        { Header: "Pay Status", accessor: "is_paid" },
        {
            Header: "Pay Mode",
            accessor: "payment_mode_id",
            Cell: ({ row }) => PaymentEnum.get(Number(row.original.payment_mode_id))?.label || "-",
        },
        { Header: "Transaction ID", accessor: "transaction_id" },
    ], [currentPage, pageSize]);

    return (
        <>
            <Modal
                show={true}
                onHide={onClose}
                centered
            >
                <div className="custom-model-detail">
                    <Modal.Header className="py-3 px-4 border-bottom-0">
                        <Modal.Title as="h5" className="custom-modal-title">
                            {statusLabel}
                        </Modal.Title>
                        <CustomCloseButton onClose={onClose} />
                    </Modal.Header>
                    <Modal.Body className="px-4 pb-4 pt-0">
                        <CustomServiceUtilityBox
                            searchHint={"Search name, ID, Description etc."}
                            onDownloadClick={() => { }}
                            onSortClick={() => { }}
                            onMoreClick={() => { }}
                            onSearch={(value) => handleFilterChange({ keyword: value })}
                            register={register}
                        />
                        <CustomServiceTable
                            columns={serviceColumns}
                            data={serviceList}
                            pageSize={pageSize}
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={(page: number) => setCurrentPage(page)}
                            onLimitChange={(pageSize: number) => {
                                setPageSize(pageSize);
                                setCurrentPage(1);
                            }}
                            theadClass="table-light"
                        />

                    </Modal.Body>
                </div>
            </Modal>
        </>
    );
};

ServiceDetailsDialog.show = (user_id: string, status: number | null, onRefreshData: () => void) => {
    const existingModal = document.getElementById("service-details-modal");
    if (existingModal) {
        return;
    }
    const modalContainer = document.createElement("div");
    modalContainer.id = "service-details-modal";

    document.body.appendChild(modalContainer);
    const root = ReactDOM.createRoot(modalContainer);

    const closeModal = () => {
        root.unmount();
        document.body.removeChild(modalContainer);
    };

    root.render(
        <ServiceDetailsDialog
            user_id={user_id}
            status={status}
            onClose={closeModal}
            onRefreshData={onRefreshData}
        />
    );
};

export default ServiceDetailsDialog;
