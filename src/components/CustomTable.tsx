import {
  useTable,
  usePagination,
  TableState,
  UsePaginationState,
  UseTableOptions,
} from "react-table";

import classNames from "classnames";
import CustomPagination from "./CustomPagination";

interface CustomTableProps {
  columns: {
    Header: any;
    accessor: string;
    sort?: boolean;
    Cell?: any;
    className?: string;
  }[];
  data: any[];
  pageSize?: number;
  currentPage?: number;
  totalPages?: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  tableClass?: string;
  theadClass?: string;
  isPagination?: boolean;
  /** When false, alternating row background is not applied (use row-level CSS e.g. credit/debit). Default true. */
  dynamicRowBackground?: boolean;
  /** Adds classes to each `<tr>` (e.g. wallet credit/debit styling). */
  getRowClassName?: (row: any) => string | undefined;
}

const CustomTable = (props: CustomTableProps) => {
  const pageSize = props["pageSize"] || 0;
  const currentPage = props["currentPage"] || 0;
  const totalPages = props["totalPages"] || 0;
  const onPageChange = props["onPageChange"];
  const onLimitChange = props.onLimitChange;
  const isPagination = props.isPagination ?? true;
  const dynamicRowBackground = props.dynamicRowBackground !== false;

  const dataTable = useTable(
    {
      columns: props.columns,
      data: props.data,
      initialState: {
        pageSize: props.pageSize || 10,
        pageIndex: (props.currentPage || 1) - 1,
      } as Partial<TableState<object>> & Partial<UsePaginationState<object>>,
      manualPagination: true,
      pageCount: props.totalPages || Math.ceil(props.data.length / (props.pageSize || 10)),
    } as UseTableOptions<object>,
    usePagination
  );

  let rows = (dataTable as unknown as { page: any[] }).page;

  const needsHorizontalScroll = props.columns.length >= 10;

  return (
    <>
     <div
  style={{
    border: "1px solid var(--txtfld-border)",
    borderRadius: "8px",
    ...(needsHorizontalScroll
      ? {
          // maxHeight: "500px",
          // overflowY: "auto",
          overflowX: "auto",
        }
      : {}),
  }}
>
  <table
    {...dataTable.getTableProps()}
    className={classNames(
      "table table-centered react-table table-hover table-bordered mb-0",
      props["tableClass"]
    )}
    style={{
      borderCollapse: "collapse",
      width: "100%",
      ...(needsHorizontalScroll
        ? {
            minWidth: "1600px",
            tableLayout: "fixed" as const,
          }
        : { tableLayout: "auto" as const }),
    }}
  >
    <thead className={props.theadClass}>
      {(dataTable.headerGroups || []).map((headerGroup: any) => {
        const { key: groupKey, ...groupProps } = headerGroup.getHeaderGroupProps();
        return (
          <tr key={groupKey} {...groupProps}>
            {(headerGroup.headers || []).map((column: any) => {
              const headerProps = column.getHeaderProps(
                column.sort && column.getSortByToggleProps()
              );
              const { key: thKey, ...thProps } = headerProps;

              return (
                <th
                  key={thKey}
                  {...thProps}
                  className={classNames({
                    sorting_desc: column.isSortedDesc === true,
                    sorting_asc: column.isSortedDesc === false,
                    sortable: column.sort === true,
                  })}
                  style={{
                    backgroundColor: "var(--th-color)",
                    color: "var(--th-txt-color)",
                    fontFamily: "Inter",
                    fontSize: "12px",
                    fontWeight: 600,
                    textAlign: "center",
                    verticalAlign: "top",
                    whiteSpace: "normal",
                    wordBreak: "break-word",
                    lineHeight: "1.4",
                    padding: "12px 10px",
                    position: "sticky",
                    top: 0,
                    zIndex: 2,
                    minWidth: "120px",
                  }}
                >
                  {column.render("Header")}
                </th>
              );
            })}
          </tr>
        );
      })}
    </thead>

    <tbody {...dataTable.getTableBodyProps()} style={{ textAlign: "center" }}>
      {rows && rows.length > 0 ? (
        rows.map((row: any, i: number) => {
          dataTable.prepareRow(row);
          const { key, ...rowProps } = row.getRowProps();
          const rowExtraClass = props.getRowClassName?.(row);
          const { className: trClass, ...trRest } = rowProps as { className?: string; [k: string]: unknown };

          return (
            <tr key={key} {...trRest} className={classNames(trClass, rowExtraClass)}>
              {row.cells.map((cell: any) => {
                const { key: cellKey, ...cellProps } = cell.getCellProps([
                  { className: cell.column.className },
                ]);

                return (
                  <td
                    key={cellKey}
                    {...cellProps}
                    style={{
                      ...(dynamicRowBackground
                        ? {
                            backgroundColor:
                              i % 2 === 0
                                ? "var(--tr1-txt-color)"
                                : "var(--tr2-txt-color)",
                          }
                        : {}),
                      color: "var(--content-txt-color)",
                      fontFamily: "Inter",
                      fontSize: "12px",
                      fontWeight: "normal",
                      textAlign: "center",
                      verticalAlign: "middle",
                      whiteSpace: "normal",
                      wordBreak: "break-word",
                      lineHeight: "1.4",
                      padding: "10px",
                      minWidth: "120px",
                    }}
                  >
                    {cell.render("Cell")}
                  </td>
                );
              })}
            </tr>
          );
        })
      ) : (
        <tr>
          <td colSpan={props.columns.length} className="text-center">
            No records found
          </td>
        </tr>
      )}
    </tbody>
  </table>
</div>
      {(isPagination) && (<div id="pagination_container" style={{
        height: "40px",
        justifyContent: "center",
        display: "flex",
        flex: "0 0 auto",
        paddingTop: "20px",
        paddingBottom: "10px",
        boxShadow: "0 -5px 5px -5px rgba(0, 0, 0, 0.1)",
      }}>
        <CustomPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      </div>
      )
      }
      {/* {(isPagination) && (<Pagination
        tableProps={{
          state: {
            pageIndex: currentPage - 1,
            pageSize: pageSize,
          },
          pageCount: totalPages,
          gotoPage: (page: number) => onPageChange(page + 1),
          setPageSize: (size: number) => {
            onLimitChange?.(size);
          },
        }}
        sizePerPageList={[
          { text: "10", value: 10 },
          { text: "20", value: 20 },
          { text: "50", value: 50 },
          { text: "100", value: 100 },
        ]}
      />)
      } */}
    </>
  );
};

export default CustomTable;
