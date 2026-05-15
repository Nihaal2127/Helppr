import React, { useEffect } from "react";
import { Modal, Button, Row, Col } from "react-bootstrap";
import { useForm } from "react-hook-form";
import CustomCloseButton from "../../components/CustomCloseButton";
import { CustomFormInput } from "../../components/CustomFormInput";
import { CustomFormIndiaMobile } from "../../components/CustomFormIndiaMobile";
import {
  fullPhoneFromIndiaNational,
  isValidE164StylePhone,
  nationalDigitsWithoutIndia91,
  sanitizeIndiaNationalPhoneInput,
} from "../../lib/user/userFormValidation";
import { openDialog } from "../../lib/global/DialogManager";
import { showErrorAlert, showSuccessAlert } from "../../lib/global/alertHelper";

export type QuoteEmployeePatch = {
  employee_name: string;
  employee_phone?: string;
};

type QuoteEditEmployeeDialogProps = {
  quoteId: string;
  defaults: Partial<QuoteEmployeePatch>;
  onClose: () => void;
  onSaved: (patch: QuoteEmployeePatch) => void;
};

type FormValues = QuoteEmployeePatch;

const QuoteEditEmployeeDialog: React.FC<QuoteEditEmployeeDialogProps> & {
  show: (
    quoteId: string,
    defaults: Partial<QuoteEmployeePatch>,
    onSaved: (patch: QuoteEmployeePatch) => void
  ) => void;
} = ({ quoteId, defaults, onClose, onSaved }) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      employee_name: defaults.employee_name ?? "",
      employee_phone: nationalDigitsWithoutIndia91(
        defaults.employee_phone ?? ""
      ),
    },
  });

  useEffect(() => {
    reset({
      employee_name: defaults.employee_name ?? "",
      employee_phone: nationalDigitsWithoutIndia91(
        defaults.employee_phone ?? ""
      ),
    });
  }, [defaults, reset]);

  const onSubmit = (data: FormValues) => {
    const name = (data.employee_name ?? "").trim();
    if (!name) {
      showErrorAlert("Employee name is required.");
      return;
    }

    const national = sanitizeIndiaNationalPhoneInput(
      (data.employee_phone ?? "").trim()
    );
    const employee_phone =
      national.length > 0
        ? fullPhoneFromIndiaNational(national)
        : undefined;
    onSaved({
      employee_name: name,
      employee_phone,
    });
    showSuccessAlert("Employee updated successfully.");
    onClose();
  };

  return (
    <Modal
      show={true}
      onHide={onClose}
      centered
      dialogClassName="custom-big-modal"
    >
      <Modal.Header className="py-3 px-4 border-bottom-0">
        <Modal.Title as="h5" className="custom-modal-title">
          Edit employee
        </Modal.Title>
        <CustomCloseButton onClose={onClose} />
      </Modal.Header>
      <Modal.Body className="px-4 pb-4 pt-0">
        <p className="text-muted small mb-3">Quote ID: {quoteId}</p>
        <form
          noValidate
          name="quote-edit-employee-form"
          onSubmit={handleSubmit(onSubmit)}
        >
          <Row className="align-items-center mt-2">
            <Col sm={4} className="d-flex align-items-center">
              <label className="custom-profile-lable">Employee name</label>
            </Col>
            <Col>
              <CustomFormInput
                label=""
                controlId="employee_name"
                placeholder="Enter employee name"
                register={register}
                error={errors.employee_name}
                asCol={false}
                validation={{ required: "Employee name is required" }}
              />
            </Col>
          </Row>

          <Row className="align-items-center mt-3">
            <Col sm={4} className="d-flex align-items-center">
              <label className="custom-profile-lable">Phone number</label>
            </Col>
            <Col>
              <CustomFormIndiaMobile
                label=""
                controlId="employee_phone"
                placeholder="Mobile number"
                register={register}
                error={errors.employee_phone}
                asCol={false}
                validation={{
                  validate: (v: string) => {
                    const n = sanitizeIndiaNationalPhoneInput(v ?? "");
                    if (!n) return true;
                    return (
                      isValidE164StylePhone(fullPhoneFromIndiaNational(n)) ||
                      "Enter a valid mobile number"
                    );
                  },
                }}
              />
            </Col>
          </Row>

          <Row className="mt-4">
            <Col
              xs={12}
              className="text-center d-flex justify-content-end gap-3"
            >
              <Button type="submit" className="custom-btn-primary">
                Save
              </Button>

              <Button
                type="button"
                className="custom-btn-secondary"
                onClick={onClose}
              >
                Cancel
              </Button>
            </Col>
          </Row>
        </form>
      </Modal.Body>
    </Modal>
  );
};

QuoteEditEmployeeDialog.show = (
  quoteId: string,
  defaults: Partial<QuoteEmployeePatch>,
  onSaved: (patch: QuoteEmployeePatch) => void
) => {
  openDialog("quote-edit-employee-modal", (close) => (
    <QuoteEditEmployeeDialog
      quoteId={quoteId}
      defaults={defaults}
      onClose={close}
      onSaved={onSaved}
    />
  ));
};

export default QuoteEditEmployeeDialog;
