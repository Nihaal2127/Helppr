import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import classNames from "classnames";

interface PaginationProps {
  tableProps: any;
  sizePerPageList: {
    text: string;
    value: number;
  }[];
}

const Pagination = ({ tableProps, sizePerPageList }: PaginationProps) => {
  const [visiblePages, setVisiblePages] = useState<number[]>([]);

  const activePage = tableProps.state.pageIndex + 1;
  const totalPages = tableProps.pageCount;

  const getVisiblePages = useCallback((current: number, total: number) => {
    const pages: number[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      if (current > 3) pages.push(1, -1); 
      for (let i = Math.max(current - 2, 2); i <= Math.min(current + 2, total - 1); i++) {
        pages.push(i);
      }
      if (current < total - 2) pages.push(-1, total);
    }

    return pages;
  }, []);

  useEffect(() => {
    setVisiblePages(getVisiblePages(activePage, totalPages));
  }, [activePage, totalPages, getVisiblePages]);

  const changePage = (page: number) => {
    if (page > 0 && page <= totalPages) {
      tableProps.gotoPage(page - 1);
    }
  };

  return (
    <div className="d-lg-flex align-items-center text-center pb-1">
      {sizePerPageList.length > 0 && (
        <div className="d-inline-block me-3">
          <label className="me-1">Display:</label>
          <select
            value={tableProps.state.pageSize}
            onChange={(e) => tableProps.setPageSize(Number(e.target.value))}
            className="form-select d-inline-block w-auto"
          >
            {sizePerPageList.map((pageSize, index) => (
              <option key={index} value={pageSize.value}>
                {pageSize.text}
              </option>
            ))}
          </select>
        </div>
      )}

      <span className="me-3">
        Page <strong>{activePage} of {totalPages}</strong>
      </span>

      <ul className="pagination pagination-rounded d-inline-flex ms-auto mb-0">
        <li
          className={classNames("page-item", {
            disabled: activePage === 1,
          })}
          onClick={() => changePage(activePage - 1)}
        >
          <Link to="#" className="page-link">
            <i className="mdi mdi-chevron-left"></i>
          </Link>
        </li>

        {visiblePages.map((page, index) =>
          page === -1 ? (
            <li key={index} className="page-item disabled">
              <Link to="#" className="page-link">...</Link>
            </li>
          ) : (
            <li
              key={page}
              className={classNames("page-item", {
                active: activePage === page,
              })}
              onClick={() => changePage(page)}
            >
              <Link to="#" className="page-link">{page}</Link>
            </li>
          )
        )}

        <li
          className={classNames("page-item", {
            disabled: activePage === totalPages,
          })}
          onClick={() => changePage(activePage + 1)}
        >
          <Link to="#" className="page-link">
            <i className="mdi mdi-chevron-right"></i>
          </Link>
        </li>
      </ul>
    </div>
  );
};

export default Pagination;
