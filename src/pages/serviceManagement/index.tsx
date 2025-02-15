import React, { useState } from "react";
import { useForm } from "react-hook-form";
import CustomFormSelect from "../../components/CustomFormSelect";
import { Row, Col } from "react-bootstrap";
import CustomHeader from "../../components/CustomHeader";
import CustomSummaryBox from "../../components/CustomSummaryBox";
import CustomUtilityBox from "../../components/CustomUtilityBox";
import { capitalizeString } from "../../helper/utility";
import CustomTable from "../../components/CustomTable";
import Table from "../../components/Table";
import AddEditCategoryDialog from "./AddEditCategoryDialog";

const ServiceManagement = () => {
    const { register, setValue } = useForm();
    const [selectedLocation, setSelectedLocation] = useState<string>("");
    const data = { Total: 100, Active: 50, Inactive: 50 };
    const [selectedBox, setSelectedBox] = useState<string>("box-category");
    const [searchQuery, setSearchQuery] = useState("");

    const [dataList, setDataList] = useState([
        { id: "C1", name: "Category 1", description: "Description 1", services: 5, helpers: 10, status: "Active" },
        { id: "C2", name: "Category 2", description: "Description 2", services: 3, helpers: 15, status: "Inactive" },
    ]);

    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(0);

    const handleSelect = (divId: string) => {
        setSelectedBox(divId);
    };
    const handleSearch = (value: string) => {
        setSearchQuery(value);
        console.log("Searching for:", value);
    };

    const columns = React.useMemo(() => [
        {
            Header: "SR No",
            accessor: "serial_no",
            Cell: ({ row }: { row: any }) => (currentPage - 1) * pageSize + row.index + 1,
        },
        { Header: "Appointment No", accessor: "unique_id" },
        { Header: "Service", accessor: "service_name" },
        {
            Header: "Price",
            accessor: "price",
            Cell: ({ value }: { value: number }) => <span>${value}</span>,
        },

        { Header: "Customer", accessor: "customer_name" },
        { Header: "Phone Number", accessor: "customer_phone_number" },
        { Header: "Fitting Partner", accessor: "fitting_partner_name" },
        { Header: "Created By", accessor: "created_by_name" },
        { Header: "Description", accessor: "description" },
        { Header: "Vehicle rego", accessor: "vehicle_rego" },
    ], [currentPage, pageSize]);

    return (
        <>
            <div className="main-page-content">
                <CustomHeader
                    title="Service Management"
                    register={register}
                    setValue={setValue}
                    onLocationChange={setSelectedLocation}
                />

                <div className="box-container">
                    {["box-category", "box-services"].map((id) => (
                        <CustomSummaryBox
                            key={id}
                            divId={id}
                            title={capitalizeString(id.replace("box-", "").replace("-", " "))}
                            data={data}
                            onSelect={handleSelect}
                            isSelected={selectedBox === id}
                        />
                    ))}
                </div>

                <CustomUtilityBox
                    addButtonLable={
                        selectedBox === "box-category" ? "Add Category" : "Add Services"
                    }
                    onAddClick={() => {
                        selectedBox === "box-category"
                          ? AddEditCategoryDialog.show(false, null)
                          : AddEditCategoryDialog.show(true, null);
                      }}                                       
                    onDownloadClick={() => { }}
                    onSortClick={() => { }}
                    onMoreClick={() => { }}
                    onSearch={handleSearch}
                />

                {/* <CustomTable
                    data={dataList}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    pageSize={pageSize}
                    onPageChange={(page: number) => setCurrentPage(page)}
                    onLimitChange={(pageSize: number) => {
                        setPageSize(pageSize);
                        setCurrentPage(1);
                    }}
                    onEdit={(row) => console.log("Edit", row)}
                    onDelete={(row) => console.log("Delete", row)}
                /> */}

                <Table
                    columns={columns}
                    data={dataList}
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
            </div>
        </>
    );
}

export default ServiceManagement;