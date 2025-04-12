import React, { useState, useEffect, useRef, useCallback } from "react";
import { Row, Col, Button } from "react-bootstrap";
import { useLocation } from "react-router-dom";
import CustomTable from "../../../components/CustomTable";
import { FinancialModel } from "../../../models/FinancialModel";
import CheckboxColumn from "../../../components/CheckboxColumn";
import { formatDate } from "../../../helper/utility";
import { payComission } from "../../../services/orderService";
import { fetchFinancial } from "../../../services/financialService";
import PayoutDialog from "./PayoutDialog";

const ShowPartnerPayout = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const partnerId = queryParams.get("id");
  const [financialList, setFinancialList] = useState<FinancialModel[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [activeTab, setActiveTab] = useState<string>("partner");
  const [selectedOrders, setSelectedOrderIds] = useState<string[]>([]);
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const fetchTabRef = useRef(false);

  const fetchTabData = useCallback(async () => {
    if (fetchTabRef.current) return;
    fetchTabRef.current = true;
    try {
      setSelectedOrderIds([]);
      const filter: any = {
        partner_id: partnerId!,
        partner_paid_status: 1,
        service_status: "3",
      };
      const { response, financials, totalPages } = await fetchFinancial(currentPage, pageSize, { ...filter });
      if (response) {
        setFinancialList(financials);
        setTotalPages(totalPages);
      }
    } catch (error) {
      console.error("Error fetching stock purchase:", error);
    } finally {
      fetchTabRef.current = false;
    }
  }, [activeTab, currentPage, pageSize]);

  useEffect(() => {
    fetchTabData();
  }, [activeTab, fetchTabData,]);

  const financialColumns = React.useMemo(() => [
    {
      Header: "SR No",
      accessor: "serial_no",
      Cell: ({ row }: { row: any }) => row.index + 1,
    },
    CheckboxColumn(financialList, selectedOrders, setSelectedOrderIds, setTotalPrice),
    { Header: "Order No", accessor: "order_unique_id" },
    { Header: "Service Name", accessor: "service_name" },
    {
      Header: "Service Date",
      accessor: "service_date",
      Cell: ({ value }: { value: string }) => {
        return formatDate(value);
      }
    },
    {
      Header: "Total Price",
      accessor: "total_price",
      Cell: ({ value }: { value: number }) => <span>${value}</span>,
    },
    {
      Header: "Partner Earning",
      accessor: "partner_earning",
      Cell: ({ value }: { value: number }) => <span>${value}</span>,
    },
  ], [selectedOrders, totalPrice, currentPage, pageSize]);

  const handleOrderPayment = async () => {
    const payload = {
      partner_paid_status: 2,
      order_service_ids: selectedOrders
    };
    const response = await payComission(payload);
    if (response) {
      setSelectedOrderIds([]);
      await fetchTabData();
    }
  };

  return (
    <>

      <div className="main-page-content">
        <Row className="mb-4">
          <Col sm={4} className="p-0 m-0">
            <h4 className="m-0 p-0">Financial - Partner Payout Details</h4>
          </Col>
          <Col sm={8} className="text-end">
            <Button
              className="custom-btn-secondary"
              style={{ maxWidth: "100px", backgroundColor: "#000000" }}
              onClick={() => {
                PayoutDialog.show(totalPrice, handleOrderPayment);
              }}>
              Pay Now</Button>
          </Col>
        </Row>

        <CustomTable
          columns={financialColumns}
          data={financialList}
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
};

export default ShowPartnerPayout;
