import React, { useMemo, useState } from "react";
import CustomHeader from "../../../components/CustomHeader";
import CustomSummaryBox from "../../../components/CustomSummaryBox";
import CustomUtilityBox from "../../../components/CustomUtilityBox";
import CustomTable from "../../../components/CustomTable";
import AddEditPostManagementDialog, {
  PostModel,
} from "./AddEditPostManagementDialog";

const PostManagement = () => {
  const [selectedStatus, setSelectedStatus] = useState<
    "all" | "pending" | "approved" | "rejected"
  >("all");
  const [searchText, setSearchText] = useState("");
  const [sortValue, setSortValue] = useState<"1" | "-1">("-1");

  const [postList] = useState<PostModel[]>([
    {
      id: 1,
      partner_id: "P001",
      partner_name: "Rahul",
      description: "Wedding shoot and outdoor photography session.",
      media_type: "image",
      location: "Hyderabad",
      uploaded_date: "2026-03-20",
      status: "pending",
    },
    {
      id: 2,
      partner_id: "P002",
      partner_name: "Kiran",
      description: "Food reel with cinematic highlights.",
      media_type: "video",
      location: "Bangalore",
      uploaded_date: "2026-03-19",
      status: "approved",
    },
    {
      id: 3,
      partner_id: "P003",
      partner_name: "Teja",
      description: "Product ad campaign image set.",
      media_type: "image",
      location: "Chennai",
      uploaded_date: "2026-03-18",
      status: "rejected",
    },
    {
      id: 4,
      partner_id: "P004",
      partner_name: "Arjun",
      description: "Pre wedding teaser video shoot.",
      media_type: "video",
      location: "Hyderabad",
      uploaded_date: "2026-03-17",
      status: "pending",
    },
  ]);

  const summaryData = useMemo(() => {
    return {
      Total: postList.length,
      Approved: postList.filter((item) => item.status === "approved").length,
      Pending: postList.filter((item) => item.status === "pending").length,
      Rejected: postList.filter((item) => item.status === "rejected").length,
    };
  }, [postList]);

  const filteredData = useMemo(() => {
    let data = [...postList];

    if (selectedStatus !== "all") {
      data = data.filter((item) => item.status === selectedStatus);
    }

    if (searchText.trim()) {
      const value = searchText.toLowerCase();
      data = data.filter(
        (item) =>
          item.partner_id.toLowerCase().includes(value) ||
          item.partner_name.toLowerCase().includes(value) ||
          item.description.toLowerCase().includes(value) ||
          item.location.toLowerCase().includes(value)
      );
    }

    data.sort((a, b) => {
      const first = new Date(a.uploaded_date).getTime();
      const second = new Date(b.uploaded_date).getTime();
      return sortValue === "1" ? first - second : second - first;
    });

    return data;
  }, [postList, selectedStatus, searchText, sortValue]);

  const handleSummaryClick = (key: string) => {
    const value = key.toLowerCase();

    if (value === "total") {
      setSelectedStatus("all");
      return;
    }

    if (value === "approved" || value === "pending" || value === "rejected") {
      setSelectedStatus(value);
      return;
    }

    setSelectedStatus("all");
  };

  const handleView = (post: PostModel): void => {
    AddEditPostManagementDialog.show(false, post, () => {
      console.log("refresh");
    });
  };

  const handleEdit = (post: PostModel): void => {
    AddEditPostManagementDialog.show(true, post, () => {
      console.log("edit refresh");
    });
  };

  const columns = [
    {
      Header: "SR No",
      accessor: "sr_no",
      Cell: ({ row }: { row: any }) => row.index + 1,
    },
    {
      Header: "Partner ID",
      accessor: "partner_id",
    },
    {
      Header: "Partner Name",
      accessor: "partner_name",
    },
    {
      Header: "Description",
      accessor: "description",
      Cell: ({ value }: { value: string }) => (
        <div
          style={{
            maxWidth: "240px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
          title={value}
        >
          {value}
        </div>
      ),
    },
    {
      Header: "No of Images",
      accessor: "no_of_images",
      Cell: ({ row }: { row: any }) => {
        const post = row.original as PostModel;
        return <span>{post.media_type === "image" ? 1 : 0}</span>;
      },
    },
    {
      Header: "No of Videos",
      accessor: "no_of_videos",
      Cell: ({ row }: { row: any }) => {
        const post = row.original as PostModel;
        return <span>{post.media_type === "video" ? 1 : 0}</span>;
      },
    },
    {
      Header: "Location",
      accessor: "location",
    },
    {
      Header: "Uploaded Date",
      accessor: "uploaded_date",
    },
    {
      Header: "Status",
      accessor: "status",
      Cell: ({ value }: { value: string }) => (
        <span
          className={
            value === "approved"
              ? "text-success fw-bold text-capitalize"
              : value === "pending"
              ? "text-warning fw-bold text-capitalize"
              : "text-danger fw-bold text-capitalize"
          }
        >
          {value}
        </span>
      ),
    },
    {
      Header: "Action",
      accessor: "action",
      Cell: ({ row }: { row: any }) => {
        const post = row.original as PostModel;
        return (
          <div className="d-flex justify-content-center gap-3">
            
            {/* EDIT */}
            <i
              className="bi bi-pencil-fill "
              role="button"
              onClick={() => handleEdit(post)}
              style={{ cursor: "pointer" }}
            />
          </div>
        );
      },
    },
  ];

  return (
    <div className="main-page-content">
      <CustomHeader title="Post Management" />

      <CustomSummaryBox
        divId="box-post-management"
        title="Post Management"
        data={summaryData}
        onSelect={() => setSelectedStatus("all")}
        isSelected={true}
        onFilterChange={() => {}}
        onItemClick={handleSummaryClick}
      />

      <CustomUtilityBox
        title="Post Management"
        searchHint="Search Partner Name / Description"
        onDownloadClick={async () => {
          console.log("Download clicked");
        }}
        onSortClick={(value: "1" | "-1") => {
          setSortValue(value);
        }}
        onMoreClick={() => {}}
        onSearch={(value: string) => {
          setSearchText(value);
        }}
      />

      <CustomTable
        columns={columns}
        data={filteredData}
        pageSize={10}
        currentPage={1}
        totalPages={1}
        onPageChange={() => {}}
        onLimitChange={() => {}}
        theadClass="table-light"
      />
    </div>
  );
};

export default PostManagement;