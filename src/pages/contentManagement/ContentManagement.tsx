import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { UseFormRegister } from "react-hook-form";
import CustomHeader from "../../components/CustomHeader";
import CustomTable from "../../components/CustomTable";
import CustomActionColumn from "../../components/CustomActionColumn";
import { fetchContentList } from "../../services/contentManagementService";
import type { ContentItem } from "../../services/contentManagementService";

type ContentModel = ContentItem;

type ContentManagementProps = {
  register?: UseFormRegister<any>;
  setValue?: (name: string, value: any, options?: { shouldValidate?: boolean }) => void;
};

const ContentManagement = ({ register, setValue }: ContentManagementProps) => {
  const navigate = useNavigate();
  const [data, setData] = useState<ContentModel[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const pageSize = 10;

  const formatDateForDisplay = (value?: string) => {
    const raw = String(value ?? "").trim();
    if (!raw) return "-";
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return "-";
    const dd = String(parsed.getDate()).padStart(2, "0");
    const mm = String(parsed.getMonth() + 1).padStart(2, "0");
    const yyyy = String(parsed.getFullYear());
    let hours = parsed.getHours();
    const minutes = String(parsed.getMinutes()).padStart(2, "0");
    const amPm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    const hh = String(hours).padStart(2, "0");
    return `${dd}-${mm}-${yyyy} ${hh}:${minutes} ${amPm}`;
  };

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const result = await fetchContentList(currentPage, pageSize);
      setIsLoading(false);
      if (!result) return;
      setData(
        result.items.map((item) => ({
          ...item,
          last_updated: formatDateForDisplay(item.last_updated),
        }))
      );
      setTotalPages(result.totalPages || 1);
      setCurrentPage(result.currentPage || currentPage);
    };
    load();
  }, [currentPage]);

  const handleEdit = (item: ContentModel) => {
    navigate(`/content-management/edit/${item.id}`, {
      state: { contentData: item },
    });
  };

  const columns = [
    {
      Header: "S.No",
      accessor: "serialNumber",
      Cell: ({ row }: any) => row.index + 1,
      className: "text-center",
    },
    {
      Header: "Title",
      accessor: "title",
    },
    // {
    //   Header: "Description",
    //   accessor: "description",
    // },
    {
      Header: "Last Updated",
      accessor: "last_updated",
    },
    {
      Header: "Action",
      accessor: "action",
      Cell: ({ row }: any) => (
        <CustomActionColumn
          row={row.original}
          onEdit={() => handleEdit(row.original)}
        />
      ),
      className: "text-center",
    },
  ];

  return (
    <div className="main-page-content">
      <CustomHeader title="Content Management" register={register} setValue={setValue} />

     

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <h6 className="fw-bold text-danger mb-3">Content List</h6>

          <CustomTable
            columns={columns}
            data={data}
            currentPage={currentPage}
            totalPages={totalPages}
            isLoading={isLoading}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>
    </div>
  );
};

export default ContentManagement;