import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import CustomHeader from "../../../components/CustomHeader";
import CustomUtilityBox from "../../../components/CustomUtilityBox";
import CustomTable from "../../../components/CustomTable";
import { fetchUser } from "../../../services/userService";
import { UserModel } from "../../../models/UserModel";
import CustomActionColumn from "../../../components/CustomActionColumn";
import { ROUTES } from "../../../routes/Routes";
import { textUnderlineCell } from "../../../helper/utility";
import PartnerDetailsDialog from "../../userManagement/PartnerDetailsDialog";
import { exportData } from "../../../services/exportService";
import { ApiPaths } from "../../../remote/apiPaths";

const PartnerPayout = () => {
    const navigate = useNavigate();
    const [partnerList, setPartnerList] = useState<UserModel[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const fetchRef = useRef(false);

    const fetchData = useCallback(async (filters: {
        keyword?: string;
        status?: string;
        sort?: string;
    }) => {
        if (fetchRef.current) return;
        fetchRef.current = true;
        filters.status = "true";
        const { response, users, totalPages } = await fetchUser(false, 2, currentPage, pageSize, { ...filters, });
        if (response) {
            setPartnerList(users);
            setTotalPages(totalPages);
        }
        fetchRef.current = false;
    }, [currentPage, pageSize]);

    useEffect(() => {
        fetchData({});
    }, []);

    const handleFilterChange = async (filters: {
        keyword?: string;
        status?: string;
        sort?: string;
    }) => {
        setCurrentPage(1);
        setTotalPages(0);
        if (Object.keys(filters).length === 0) {
            fetchRef.current = false;
        } else {
            await fetchData(filters);
        }
    };

    const partnerColumns = React.useMemo(() => [
        {
            Header: "SR No",
            accessor: "serial_no",
            Cell: ({ row }: { row: any }) => (currentPage - 1) * pageSize + row.index + 1,
        },
        {
            Header: "Partner ID", accessor: "user_id",
            Cell: textUnderlineCell("user_id", (row) => { PartnerDetailsDialog.show(row._id, () => { }) }),
        },
        { Header: "Partner Name", accessor: "name", },
        { Header: "No. of services", accessor: "no_of_services" },
        { Header: "Service Provided", accessor: "completed_service" },
        { Header: "Total Earnings", accessor: "total_earnings" },
        { Header: "Bal Payment", accessor: "bal_payment" },
        {
            Header: "Action",
            accessor: "action",
            Cell: ({ row }: { row: any }) => (
                <CustomActionColumn
                    row={row}
                    onView={() => navigate(`${ROUTES.PARTNER_PAYOUT_SHOW.path}?id=${row.original._id}`)}
                />
            ),
        },
    ], [currentPage, pageSize]);

    return (
        <>
            <div className="main-page-content">
                <CustomHeader
                    title="Financial - Partner Payout"
                />

                <CustomUtilityBox
                    title="Partner Payout"
                    searchHint={"Search name, ID, Description etc."}
                    onDownloadClick={async () => {
                        await exportData(ApiPaths.EXPORT_FINANCIAL())
                    }}
                    onSortClick={(value) => { handleFilterChange({ sort: value }) }}
                    onMoreClick={() => { }}
                    onSearch={(value) => handleFilterChange({ keyword: value })}
                />

                <CustomTable
                    columns={partnerColumns}
                    data={partnerList}
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

export default PartnerPayout;