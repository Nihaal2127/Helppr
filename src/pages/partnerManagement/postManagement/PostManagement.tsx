import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import CustomHeader from "../../../components/CustomHeader";
import CustomSummaryBox from "../../../components/CustomSummaryBox";
import CustomUtilityBox from "../../../components/CustomUtilityBox";
import CustomTable from "../../../components/CustomTable";
import AddEditPostManagementDialog from "./AddEditPostManagementDialog";
import type { PostModel } from "../../../lib/types/partnerManagementTypes";
import { fetchPosts } from "../../../services/partnerManagementService";

type PostManagementProps = {
  onBack?: () => void;
};

const PostManagement = ({ onBack }: PostManagementProps) => {
  const { register, setValue } = useForm<any>();
  const [selectedStatus, setSelectedStatus] = useState<
    "all" | "pending" | "approved" | "rejected"
  >("all");
  const [searchText, setSearchText] = useState("");
  const [sortValue, setSortValue] = useState<"1" | "-1">("-1");

  const [postList, setPostList] = useState<PostModel[]>([]);

  const refreshPosts = useCallback(async () => {
    const res = await fetchPosts();
    setPostList(res.response ? res.records : []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetchPosts();
      if (cancelled) return;
      setPostList(res.response ? res.records : []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
      data = data.filter((item) =>
        item.partner_name.toLowerCase().includes(value)
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
      void refreshPosts();
    });
  };

  const columns = [
    {
      Header: "SR No",
      accessor: "sr_no",
      Cell: ({ row }: { row: any }) => row.index + 1,
    },
    {
      Header: "Partner Name",
      accessor: "partner_name",
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
            {/* <i
              className="bi bi-pencil-fill "
              role="button"
              onClick={() => handleEdit(post)}
              style={{ cursor: "pointer" }}
            /> */}
            <i
              className="bi bi-eye-fill"
              role="button"
              title="View"
              onClick={() => handleView(post)}
              style={{ cursor: "pointer" }}
            />
          </div>
        );
      },
    },
  ];

  return (
    <div className="main-page-content">
      <CustomHeader
        title="Post Management"
        register={register}
        setValue={setValue}
        titlePrefix={
          <button
            type="button"
            className="financial-subpage-back"
            onClick={() => onBack?.()}
            aria-label="Go to Partner Management"
          >
            <i className="bi bi-chevron-left text-danger"></i>
          </button>
        }
      />

      <CustomSummaryBox
        divId="box-post-management"
        title="Post Management"
        data={summaryData}
        onSelect={() => setSelectedStatus("all")}
        isSelected={true}
        onFilterChange={() => {}}
        onItemClick={handleSummaryClick}
        isAddShow={true}
        addButtonLable="Add post"
        onAddClick={() =>
          AddEditPostManagementDialog.show(true, null, () => {
            void refreshPosts();
          })
        }
      />

      <CustomUtilityBox
        title="Post Management"
        searchHint="Search Partner Name"
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
        syncKeyword={searchText}
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
