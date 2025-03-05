import React from "react";
import { useForm } from "react-hook-form";
import ReactDOM from "react-dom/client";
import { Modal } from "react-bootstrap";
import CustomCloseButton from "../../components/CustomCloseButton";
import { ServiceStatusEnum } from "../../constant/ServiceStatusEnum";
import CustomServiceUtilityBox from "../../components/CustomServiceUtilityBox";

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

    const handleFilterChange = async (filters: {
        keyword?: string;
        status?: string
    }) => {
        // setCurrentPage(1);
        // setTotalPages(0);
        // if (Object.keys(filters).length === 0) {
        //     fetchRef.current = false;
        // } else {
        //     await fetchData(selectedBox, filters);
        // }
    };

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
