import React, { useEffect, useState } from "react";
import CustomHeader from "../../../components/CustomHeader";
import CustomSummaryBox from "../../../components/CustomSummaryBox";
import CustomUtilityBox from "../../../components/CustomUtilityBox";
import CustomTable from "../../../components/CustomTable";
import ViewPortfolioManagementDialog from "./ViewPortfolioManagementDialog";

const PortfolioManagement = () => {
    const [portfolioData] = useState({
        Total: 4,
        Active: 3,
        Inactive: 1,
    });

    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const [portfolioList] = useState([
        {
            _id: "1",
            partner_id: "PT001",
            partner_name: "Teja Partner",
            category: "Photography",
            service: "Wedding Shoot",
            total_posts: "24",
            total_images: "180",
            total_videos: "15",
            likes_count: "1200",
            comments_count: "245",
            saves_count: "310",
            ratings: "4.8",
            location: "Hyderabad",
            is_active: true,
        },
        {
            _id: "2",
            partner_id: "PT002",
            partner_name: "Rock Studio",
            category: "Beauty",
            service: "Makeup Service",
            total_posts: "18",
            total_images: "95",
            total_videos: "10",
            likes_count: "840",
            comments_count: "120",
            saves_count: "190",
            ratings: "4.5",
            location: "Vijayawada",
            is_active: true,
        },
        {
            _id: "3",
            partner_id: "PT003",
            partner_name: "Alpha Events",
            category: "Events",
            service: "Decoration",
            total_posts: "30",
            total_images: "220",
            total_videos: "20",
            likes_count: "1600",
            comments_count: "340",
            saves_count: "420",
            ratings: "4.9",
            location: "Visakhapatnam",
            is_active: true,
        },
        {
            _id: "4",
            partner_id: "PT004",
            partner_name: "Prime Services",
            category: "Food",
            service: "Catering",
            total_posts: "12",
            total_images: "60",
            total_videos: "6",
            likes_count: "530",
            comments_count: "80",
            saves_count: "110",
            ratings: "4.3",
            location: "Warangal",
            is_active: false,
        },
    ]);

    const [filteredPortfolioList, setFilteredPortfolioList] = useState(portfolioList);

    useEffect(() => {
        setFilteredPortfolioList(portfolioList);
    }, [portfolioList]);

    const refreshData = () => {
        setFilteredPortfolioList(portfolioList);
    };

    const handleFilterChange = (filters: {
        name?: string;
        status?: string;
        sort?: string;
    }) => {
        setCurrentPage(1);

        let data = [...portfolioList];

        if (filters.status === "Active" || filters.status === "true") {
            data = data.filter((item) => item.is_active === true);
        } else if (filters.status === "Inactive" || filters.status === "false") {
            data = data.filter((item) => item.is_active === false);
        } else if (filters.status === "Total") {
            data = [...portfolioList];
        }

        if (filters.name) {
            const search = filters.name.toLowerCase();
            data = data.filter((item) =>
                item.partner_name.toLowerCase().includes(search) ||
                item.partner_id.toLowerCase().includes(search) ||
                item.category.toLowerCase().includes(search) ||
                item.service.toLowerCase().includes(search) ||
                item.location.toLowerCase().includes(search)
            );
        }

        if (filters.sort === "asc" || filters.sort === "1") {
            data.sort((a, b) => a.partner_name.localeCompare(b.partner_name));
        } else if (filters.sort === "desc" || filters.sort === "-1") {
            data.sort((a, b) => b.partner_name.localeCompare(a.partner_name));
        }

        setFilteredPortfolioList(data);
    };

    const portfolioColumns = React.useMemo(
        () => [
            {
                Header: "SR No",
                accessor: "serial_no",
                Cell: ({ row }: { row: any }) =>
                    (currentPage - 1) * pageSize + row.index + 1,
            },
            {
                Header: "Partner ID",
                accessor: "partner_id",
                Cell: ({ row }: { row: any }) => (
                    <span
                        className="fw-semibold text-dark text-decoration-underline"
                        role="button"
                        onClick={() => {
                            ViewPortfolioManagementDialog.show(
                                row.original,
                                () => refreshData()
                            );
                        }}
                    >
                        {row.original.partner_id}
                    </span>
                ),
            },
            { Header: "Partner Name", accessor: "partner_name" },
            { Header: "Category", accessor: "category" },
            { Header: "Service", accessor: "service" },
            { Header: "Total Posts", accessor: "total_posts" },
            { Header: "Total Images", accessor: "total_images" },
            { Header: "Total Videos", accessor: "total_videos" },
            { Header: "Likes Count", accessor: "likes_count" },
            { Header: "Comments Count", accessor: "comments_count" },
            { Header: "Saves Count", accessor: "saves_count" },
            { Header: "Ratings", accessor: "ratings" },
            { Header: "Location", accessor: "location" },
        ],
        [currentPage, pageSize]
    );

    return (
        <div className="main-page-content">
            <CustomHeader title="Portfolio Management" />

            <div className="box-container">
                <CustomSummaryBox
                    divId="box-portfolio-management"
                    title="Portfolio Management"
                    data={portfolioData}
                    onSelect={() => {
                        handleFilterChange({ status: "Total" });
                    }}
                    isSelected={true}
                    onFilterChange={(filter) => {
                        handleFilterChange(filter);
                    }}
                />
            </div>

            <CustomUtilityBox
                title="Portfolio Management"
                searchHint="Search Partner Name / Partner ID"
                onDownloadClick={async () => {
                    console.log("Download clicked");
                }}
                onSortClick={(value) => {
                    handleFilterChange({ sort: value });
                }}
                onMoreClick={() => { }}
                onSearch={(value) => handleFilterChange({ name: value })}
            />

            <CustomTable
                columns={portfolioColumns}
                data={filteredPortfolioList}
                pageSize={pageSize}
                currentPage={currentPage}
                totalPages={1}
                onPageChange={(page: number) => setCurrentPage(page)}
                onLimitChange={(limit: number) => {
                    setCurrentPage(1);
                    setPageSize(limit);
                }}
                theadClass="table-light"
            />
        </div>
    );
};

export default PortfolioManagement;