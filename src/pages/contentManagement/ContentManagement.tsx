import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { UseFormRegister } from "react-hook-form";
import CustomHeader from "../../components/CustomHeader";
import CustomTable from "../../components/CustomTable";
import CustomActionColumn from "../../components/CustomActionColumn";

type ContentModel = {
  id: number;
  title: string;
  description: string;
  last_updated: string;
};

type ContentManagementProps = {
  register?: UseFormRegister<any>;
  setValue?: (name: string, value: any, options?: { shouldValidate?: boolean }) => void;
};

const ContentManagement = ({ register, setValue }: ContentManagementProps) => {
  const navigate = useNavigate();

  const [data] = useState<ContentModel[]>([
    {
      id: 1,
      title: "Terms & Conditions",
      description: "Manage application terms and conditions",
      last_updated: "12 Mar 2026",
    },
    {
      id: 2,
      title: "Payment Policy",
      description: "Manage payment related policies",
      last_updated: "10 Mar 2026",
    },
  ]);

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
    {
      Header: "Description",
      accessor: "description",
    },
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
            onPageChange={() => {}}
          />
        </div>
      </div>
    </div>
  );
};

export default ContentManagement;