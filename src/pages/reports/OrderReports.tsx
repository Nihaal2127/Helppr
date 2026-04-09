import React, { useState } from "react";
import { Row, Col, Button, Form } from "react-bootstrap";
import CustomMultiSelect from "../../components/CustomMultiSelect";
import CustomDatePicker from "../../components/CustomDatePicker";
import { useForm, UseFormRegister } from "react-hook-form";

type OptionType = {
  value: string;
  label: string;
};

const allOption: OptionType = { value: "all", label: "All" };

const toIsoCalendarDate = (date: Date | null): string => {
  if (!date) return "";
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const OrderReportsPage = () => {
  const [orderFromDate, setOrderFromDate] = useState("");
  const [orderToDate, setOrderToDate] = useState("");
  const { register: reportFilterRegister, setValue: setReportFilterValue } = useForm<{
    order_from_date: string;
    order_to_date: string;
  }>({
    defaultValues: {
      order_from_date: "",
      order_to_date: "",
    },
  });

  const [orderStatus, setOrderStatus] = useState<OptionType[]>([]);
  const [paymentStatus, setPaymentStatus] = useState<OptionType[]>([]);
  const [paymentMode, setPaymentMode] = useState<OptionType[]>([]);
  const [services, setServices] = useState<OptionType[]>([]);
  const [categories, setCategories] = useState<OptionType[]>([]);
  const [partners, setPartners] = useState<OptionType[]>([]);
  const [states, setStates] = useState<OptionType[]>([]);
  const [cities, setCities] = useState<OptionType[]>([]);
  const [areas, setAreas] = useState<OptionType[]>([]);

  const handleSelectWithAll = (
    selected: OptionType[],
    setter: (val: OptionType[]) => void
  ) => {
    const hasAll = selected.some((item) => item.value === "all");
    if (hasAll) {
      setter([allOption]);
    } else {
      setter(selected.filter((item) => item.value !== "all"));
    }
  };

  const commonOptions = [
    allOption,
    { value: "1", label: "Option 1" },
    { value: "2", label: "Option 2" },
  ];

  const handleReset = () => {
    setOrderFromDate("");
    setOrderToDate("");
    setOrderStatus([]);
    setPaymentStatus([]);
    setPaymentMode([]);
    setServices([]);
    setCategories([]);
    setPartners([]);
    setStates([]);
    setCities([]);
    setAreas([]);
  };

  return (
    <div className="mt-4">
      <div className="card border-0 shadow-sm rounded-3">
        <div className="card-body p-3 p-md-4">
          <div className="mb-3">
            <h5 className="custom-utilty-box-title mb-1">
              Order Reports
            </h5>
            <small className="text-muted">
              Used to generate reports related to orders, payments, and services.
            </small>
          </div>

          <div className="border rounded-3 p-3 bg-light">
            <Row className="g-3">
              <Col md={6}>
                <Form.Label className="small fw-semibold mb-1">From Date</Form.Label>
                <CustomDatePicker
                  label=""
                  controlId="order_from_date"
                  selectedDate={orderFromDate || null}
                  onChange={(date) => setOrderFromDate(toIsoCalendarDate(date))}
                  register={reportFilterRegister as unknown as UseFormRegister<any>}
                  setValue={setReportFilterValue as (name: string, value: any) => void}
                  asCol={false}
                  groupClassName="mb-0 w-100"
                  filterDate={() => true}
                />
              </Col>

              <Col md={6}>
                <Form.Label className="small fw-semibold mb-1">To Date</Form.Label>
                <CustomDatePicker
                  label=""
                  controlId="order_to_date"
                  selectedDate={orderToDate || null}
                  onChange={(date) => setOrderToDate(toIsoCalendarDate(date))}
                  register={reportFilterRegister as unknown as UseFormRegister<any>}
                  setValue={setReportFilterValue as (name: string, value: any) => void}
                  asCol={false}
                  groupClassName="mb-0 w-100"
                  filterDate={() => true}
                />
              </Col>

              <Col md={6}>
                <Form.Label className="small fw-semibold mb-1">Order Status</Form.Label>
                <CustomMultiSelect
                  label=""
                  controlId="Order Status"
                  options={commonOptions}
                  value={orderStatus}
                  onChange={(selectedOptions) =>
                    handleSelectWithAll(selectedOptions as OptionType[], setOrderStatus)
                  }
                  asCol={false}
                />
              </Col>

              <Col md={6}>
                <Form.Label className="small fw-semibold mb-1">Payment Status</Form.Label>
                <CustomMultiSelect
                  label=""
                  controlId="Payment Status"
                  options={commonOptions}
                  value={paymentStatus}
                  onChange={(selectedOptions) =>
                    handleSelectWithAll(selectedOptions as OptionType[], setPaymentStatus)
                  }
                  asCol={false}
                />
              </Col>

              <Col md={6}>
                <Form.Label className="small fw-semibold mb-1">Payment Mode</Form.Label>
                <CustomMultiSelect
                  label=""
                  controlId="Payment Mode"
                  options={commonOptions}
                  value={paymentMode}
                  onChange={(selectedOptions) =>
                    handleSelectWithAll(selectedOptions as OptionType[], setPaymentMode)
                  }
                  asCol={false}
                />
              </Col>

              <Col md={6}>
                <Form.Label className="small fw-semibold mb-1">Service</Form.Label>
                <CustomMultiSelect
                  label=""
                  controlId="Service"
                  options={commonOptions}
                  value={services}
                  onChange={(selectedOptions) =>
                    handleSelectWithAll(selectedOptions as OptionType[], setServices)
                  }
                  asCol={false}
                />
              </Col>

              <Col md={6}>
                <Form.Label className="small fw-semibold mb-1">Category</Form.Label>
                <CustomMultiSelect
                  label=""
                  controlId="Category"
                  options={commonOptions}
                  value={categories}
                  onChange={(selectedOptions) =>
                    handleSelectWithAll(selectedOptions as OptionType[], setCategories)
                  }
                  asCol={false}
                />
              </Col>

              <Col md={6}>
                <Form.Label className="small fw-semibold mb-1">Partner</Form.Label>
                <CustomMultiSelect
                  label=""
                  controlId="Partner"
                  options={commonOptions}
                  value={partners}
                  onChange={(selectedOptions) =>
                    handleSelectWithAll(selectedOptions as OptionType[], setPartners)
                  }
                  asCol={false}
                />
              </Col>

              <Col md={6}>
                <Form.Label className="small fw-semibold mb-1">State</Form.Label>
                <CustomMultiSelect
                  label=""
                  controlId="State"
                  options={commonOptions}
                  value={states}
                  onChange={(selectedOptions) =>
                    handleSelectWithAll(selectedOptions as OptionType[], setStates)
                  }
                  asCol={false}
                />
              </Col>

              <Col md={6}>
                <Form.Label className="small fw-semibold mb-1">City</Form.Label>
                <CustomMultiSelect
                  label=""
                  controlId="City"
                  options={commonOptions}
                  value={cities}
                  onChange={(selectedOptions) =>
                    handleSelectWithAll(selectedOptions as OptionType[], setCities)
                  }
                  asCol={false}
                />
              </Col>

              <Col md={6}>
                <Form.Label className="small fw-semibold mb-1">Area</Form.Label>
                <CustomMultiSelect
                  label=""
                  controlId="Area"
                  options={commonOptions}
                  value={areas}
                  onChange={(selectedOptions) =>
                    handleSelectWithAll(selectedOptions as OptionType[], setAreas)
                  }
                  asCol={false}
                />
              </Col>
            </Row>

            <Row className="mt-4 justify-content-end">
              <Col xs={6}>
                <div className="d-flex justify-content-end gap-2 mt-2">
                  <Button
                    size="sm"
                    className="custom-btn-secondary px-3"
                    onClick={handleReset}
                    style={{ minWidth: "30px" }}
                  >
                    Reset
                  </Button>

                  <Button
                    size="sm"
                    className="custom-btn-primary px-3"
                    style={{ width: "50px" }}
                  >
                    Export
                  </Button>
                </div>
              </Col>
            </Row>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderReportsPage;