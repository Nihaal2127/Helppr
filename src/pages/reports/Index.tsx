import React, { useState } from "react";
import { Button } from "react-bootstrap";
import CustomHeader from "../../components/CustomHeader";
import OrderReportsPage from "./OrderReports";
import QuotationReportsPage from "./QuotationReports";
import PartnerReportsPage from "./PartnerReports";

type ReportTabKey = "order_reports" | "quotation_reports" | "partner_reports";

const reportTabs: { key: ReportTabKey; label: string }[] = [
  { key: "order_reports", label: "Order Reports" },
  { key: "quotation_reports", label: "Quotation Reports" },
  { key: "partner_reports", label: "Partner Reports" },
];

const Reports = () => {
  const [selectedTab, setSelectedTab] = useState<ReportTabKey>("order_reports");
  // const [selectedtab, setSelectedTab] = useState<ReportTabKey>("quotation_reports");

  const renderTabContent = () => {
    switch (selectedTab) {
      case "order_reports":
        return <OrderReportsPage />;

      case "quotation_reports":
  return <QuotationReportsPage />;

      case "partner_reports":
        return <PartnerReportsPage />;
    
      default:
        return null;
    }
  };

  return (
    <div className="main-page-content">
      <CustomHeader title="Reports & Analytics" />

      <div className="d-flex gap-2 mb-3">
        {reportTabs.map((tab) => (
          <Button
            key={tab.key}
            className={
              selectedTab === tab.key
                ? "custom-btn-primary"
                : "custom-btn-secondary"
            }
            onClick={() => setSelectedTab(tab.key)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {renderTabContent()}
    </div>
  );
};

export default Reports;