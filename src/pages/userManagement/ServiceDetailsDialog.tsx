import React, { useEffect, useState, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import ReactDOM from "react-dom/client";
import { Modal } from "react-bootstrap";
import CustomCloseButton from "../../components/CustomCloseButton";
import { ServiceStatusEnum } from "../../constant/ServiceStatusEnum";
import CustomServiceUtilityBox from "../../components/CustomServiceUtilityBox";
import CustomServiceTable from "../../components/CustomServiceTable";
import { ServiceModel } from "../../models/ServiceModel";
import { fetchService } from "../../services/servicesService";
import { formatDate } from "../../helper/utility";

type ServiceDetailsDialogProps = {
    status: number | null;
    onClose: () => void;
    onRefreshData: () => void;
};

const ServiceDetailsDialog: React.FC<ServiceDetailsDialogProps> & {
    show: (status: number | null, onRefreshData: () => void) => void;
} = ({ status, onClose, onRefreshData }) => {
    const { register } = useForm();
    const statusLabel = status ? `${ServiceStatusEnum.get(status)?.label} Services` : "Total Services";

    const [serviceList, setServiceList] = useState<ServiceModel[]>([]);
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
        const { response, services, totalPages } = await fetchService(currentPage, pageSize, { ...filters, });
        if (response) {
            setServiceList(services);
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
        { Header: "Service Name", accessor: "name" },
        { Header: "Category", accessor: "category_name" },
        {
            Header: "Date",
            accessor: "order_date",
            Cell: ({ row }) => formatDate(row.original.order_date ? row.original.order_date : "")
        },
        { Header: "Amount", accessor: "amount" },
        { Header: "Pay Status", accessor: "pay_status" },
        { Header: "Pay Mode", accessor: "pay_mode" },
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

ServiceDetailsDialog.show = (status: number | null, onRefreshData: () => void) => {
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
            status={status}
            onClose={closeModal}
            onRefreshData={onRefreshData}
        />
    );
};

export default ServiceDetailsDialog;
