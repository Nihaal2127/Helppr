import { useState } from "react";
import { useForm } from "react-hook-form";
import CustomFormSelect from "../../components/CustomFormSelect";
import { Row, Col } from "react-bootstrap";
import CustomHeader from "../../components/CustomHeader";
import CustomSummaryBox from "../../components/CustomSummaryBox";
import CustomUtilityBox from "../../components/CustomUtilityBox";
import { capitalizeString } from "../../helper/utility";
import CustomTable from "../../components/CustomTableProps";

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

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const totalPages = Math.ceil(dataList.length / pageSize);

    const handleSelect = (divId: string) => {
        setSelectedBox(divId);
    };
    const handleSearch = (value: string) => {
        setSearchQuery(value);
        console.log("Searching for:", value);
    };
    return (
        <>
            <div className="main-page-content">
            <h4>Service Management</h4>
                {/* <CustomHeader
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
                    onAddClick={() => { }}
                    onDownloadClick={() => { }}
                    onSortClick={() => { }}
                    onMoreClick={() => { }}
                    onSearch={handleSearch}
                />

                <CustomTable
                    data={dataList}
                    currentPage={page}
                    totalPages={totalPages}
                    pageSize={pageSize}
                    onPageChange={setPage}
                    onLimitChange={setPageSize}
                    onEdit={(row) => console.log("Edit", row)}
                    onDelete={(row) => console.log("Delete", row)}
                />*/}
            </div> 
        </>
    );
}

export default ServiceManagement;