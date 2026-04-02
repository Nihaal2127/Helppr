import React, { useState } from "react";
import { Row, Col, Button, Form } from "react-bootstrap";
import CustomMultiSelect from "../../components/CustomMultiSelect";
import CustomDatePicker from "../../components/CustomDatePicker";
import { CustomFormInput } from "../../components/CustomFormInput";
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

const QuotationReportsPage = () => {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [quoteStatus, setQuoteStatus] = useState<OptionType[]>([]);
  const [services, setServices] = useState<OptionType[]>([]);
  const [categories, setCategories] = useState<OptionType[]>([]);
  const [partners, setPartners] = useState<OptionType[]>([]);
  const [states, setStates] = useState<OptionType[]>([]);
  const [cities, setCities] = useState<OptionType[]>([]);
  const [areas, setAreas] = useState<OptionType[]>([]);
  const [user, setUser] = useState("");
  const { register: reportFilterRegister, setValue: setReportFilterValue } = useForm<{
    quote_from_date: string;
    quote_to_date: string;
    quote_user: string;
  }>({
    defaultValues: {
      quote_from_date: "",
      quote_to_date: "",
      quote_user: "",
    },
  });

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

  const quoteStatusOptions = [
    allOption,
    { value: "new", label: "New" },
    { value: "pending", label: "Pending" },
    { value: "accepted", label: "Accepted" },
    { value: "success", label: "Success" },
    { value: "failed", label: "Fail" },
  ];

  const handleReset = () => {
    setFromDate("");
    setToDate("");
    setQuoteStatus([]);
    setServices([]);
    setCategories([]);
    setPartners([]);
    setStates([]);
    setCities([]);
    setAreas([]);
    setUser("");
  };

  return (
    <div className="mt-4">
      <div className="card border-0 shadow-sm rounded-3">
        <div className="card-body p-3 p-md-4">
          <div className="mb-3">
            <h5 className="custom-utilty-box-title mb-1">
                Quotation Reports
            </h5>
            <small className="text-muted">
              Used to generate reports related to quote requests and conversions.
            </small>
          </div>

          <div className="border rounded-3 p-3 bg-light">
            <Row className="g-3">
              <Col md={6}>
                <Form.Label className="small fw-semibold mb-1 ">From Date</Form.Label>
                <CustomDatePicker
                  label=""
                  controlId="quote_from_date"
                  selectedDate={fromDate || null}
                  onChange={(date) => setFromDate(toIsoCalendarDate(date))}
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
                  controlId="quote_to_date"
                  selectedDate={toDate || null}
                  onChange={(date) => setToDate(toIsoCalendarDate(date))}
                  register={reportFilterRegister as unknown as UseFormRegister<any>}
                  setValue={setReportFilterValue as (name: string, value: any) => void}
                  asCol={false}
                  groupClassName="mb-0 w-100"
                  filterDate={() => true}
                />
              </Col>

              <Col md={6}>
                <Form.Label className="small fw-semibold mb-1">Quote Status</Form.Label>
                <CustomMultiSelect
                  label=""
                  controlId="Quote Status"
                  options={quoteStatusOptions}
                  value={quoteStatus}
                  onChange={(selectedOptions) =>
                    handleSelectWithAll(selectedOptions as OptionType[], setQuoteStatus)
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
                <Form.Label className="small fw-semibold mb-1">User</Form.Label>
                <CustomFormInput
                  label=""
                  controlId="quote_user"
                  placeholder="Search user"
                  register={reportFilterRegister as unknown as any}
                  asCol={false}
                  onChange={(value) => setUser(value)}
                  value={user}
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
                    style={{ width: "80px" }}
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

export default QuotationReportsPage;