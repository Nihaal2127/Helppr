import React, { useMemo } from "react";
import editIcon from "../assets/icons/Edit.svg";
import deleteIcon from "../assets/icons/delete.svg";

type CustomTableProps = {
  data: any[];
  pageSize?: number;
  currentPage?: number;
  totalPages?: number;
  isPagination?: boolean;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  onEdit?: (row: any) => void;
  onDelete?: (row: any) => void;
};

const CustomTable: React.FC<CustomTableProps> = ({
  data,
  pageSize = 10,
  currentPage = 1,
  totalPages = 1,
  isPagination = true,
  onPageChange,
  onLimitChange,
  onEdit,
  onDelete,
}) => {

  const columns = useMemo(() => {
    if (data.length === 0) return [];
    return Object.keys(data[0]);
  }, [data]);

  return (
    <div className="table-container">
      <table className="table table-striped table-bordered display nowrap">
        <thead>
          <tr className="custom-tbl-row">
            <th>#</th>
            {columns.map((col) => (
              <th key={col}>{col}</th>
            ))}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={index}>
              <td>{index + 1}</td>
              {columns.map((col) => (
                <td key={col}>{row[col]}</td>
              ))}
              <td>
                {onEdit && (
                  <img
                    src={editIcon}
                    alt="edit"
                    className="custom-table-action-edit"
                    onClick={() => onEdit(row)}
                  />
                )}
                {onDelete && (
                  <img
                    src={deleteIcon}
                    alt="delete"
                    className="custom-table-action-delete"
                    onClick={() => onDelete(row)}
                  />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      {isPagination && totalPages > 1 && (
        <div className="pagination-container">
          <button disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)}>
            Prev
          </button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <button disabled={currentPage === totalPages} onClick={() => onPageChange(currentPage + 1)}>
            Next
          </button>
          {onLimitChange && (
            <select onChange={(e) => onLimitChange(Number(e.target.value))} defaultValue={pageSize}>
              {[10, 20, 50].map((limit) => (
                <option key={limit} value={limit}>
                  {limit} per page
                </option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomTable;
