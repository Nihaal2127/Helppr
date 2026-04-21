import React, { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Modal, Button, Row, Col } from "react-bootstrap";
import CustomCloseButton from "../../components/CustomCloseButton";
import CustomTextFieldSelect from "../../components/CustomTextFieldSelect";
import { fetchUserDropDown } from "../../services/userService";
import type { UserModel } from "../../models/UserModel";
import { openDialog } from "../../helper/DialogManager";
import { showSuccessAlert } from "../../helper/alertHelper";

const EMPLOYEE_USER_TYPE = 2;

export type QuoteEmployeeSelectionPatch = {
  employee_id: string;
  employee_name: string;
  employee_phone?: string;
};

type QuoteSelectEmployeeDialogProps = {
  quoteId: string;
  defaultEmployeeId?: string;
  defaultEmployeeName?: string;
  defaultEmployeePhone?: string;
  onClose: () => void;
  onSaved: (patch: QuoteEmployeeSelectionPatch) => void;
};

type FormValues = { employee_id: string };

const QuoteSelectEmployeeDialog: React.FC<QuoteSelectEmployeeDialogProps> & {
  show: (
    quoteId: string,
    defaults: {
      employee_id?: string;
      employee_name?: string;
      employee_phone?: string;
    },
    onSaved: (patch: QuoteEmployeeSelectionPatch) => void
  ) => void;
} = ({
  quoteId,
  defaultEmployeeId,
  defaultEmployeeName,
  defaultEmployeePhone,
  onClose,
  onSaved,
}) => {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { employee_id: defaultEmployeeId ?? "" },
  });

  const [options, setOptions] = useState<{ value: string; label: string }[]>([]);
  const [records, setRecords] = useState<UserModel[]>([]);
  const fetchRef = useRef(false);

  const loadEmployees = useCallback(async () => {
    if (fetchRef.current) return;
    fetchRef.current = true;
    try {
      const { users } = await fetchUserDropDown(EMPLOYEE_USER_TYPE);
      const mapped = users.map((u) => ({
        value: u._id,
        label: (u.name && String(u.name).trim()) || u.user_id || "Unnamed",
      }));
      const currentId = defaultEmployeeId ?? "";
      if (currentId && !mapped.some((o) => o.value === currentId)) {
        mapped.unshift({
          value: currentId,
          label:
            (defaultEmployeeName && String(defaultEmployeeName).trim()) || "Current assignee",
        });
      }
      setRecords(users);
      setOptions(mapped);
    } finally {
      fetchRef.current = false;
    }
  }, [defaultEmployeeId, defaultEmployeeName]);

  useEffect(() => {
    void loadEmployees();
  }, [loadEmployees]);

  useEffect(() => {
    setValue("employee_id", defaultEmployeeId ?? "");
  }, [defaultEmployeeId, setValue]);

  const onSubmit = (data: FormValues) => {
    const id = (data.employee_id ?? "").trim();
    if (!id) return;
    const opt = options.find((o) => o.value === id);
    const fromApi = records.find((u) => u._id === id);
    const fromOpt = (opt?.label ?? "").trim();
    const fromApiName = fromApi?.name != null ? String(fromApi.name).trim() : "";
    const fromDefault = defaultEmployeeName != null ? String(defaultEmployeeName).trim() : "";
    const resolvedName = fromOpt || fromApiName || fromDefault || "";
    const phoneFromApi =
      fromApi?.phone_number != null ? String(fromApi.phone_number).trim() : "";
    const phoneFromDefault =
      defaultEmployeePhone != null ? String(defaultEmployeePhone).trim() : "";
    const phoneCombined = phoneFromApi || phoneFromDefault;
    const phone = phoneCombined.length > 0 ? phoneCombined : undefined;
    onSaved({
      employee_id: id,
      employee_name: resolvedName,
      employee_phone: phone,
    });
    showSuccessAlert("Employee updated successfully.");
    onClose();
  };

  return (
    <Modal show onHide={onClose} centered dialogClassName="custom-big-modal" enforceFocus={false}>
      <Modal.Header className="py-3 px-4 border-bottom-0">
        <Modal.Title as="h5" className="custom-modal-title">
          Change employee
        </Modal.Title>
        <CustomCloseButton onClose={onClose} />
      </Modal.Header>
      <Modal.Body className="px-4 pb-4 pt-0">
        <form noValidate onSubmit={handleSubmit(onSubmit)}>
          <Row>
            <CustomTextFieldSelect
              label="Employee"
              controlId="employee_id"
              options={options}
              register={register}
              fieldName="employee_id"
              error={errors.employee_id as unknown as string}
              requiredMessage="Please select an employee"
              defaultValue={defaultEmployeeId ?? ""}
              setValue={setValue as (name: string, value: any) => void}
              placeholder="Select employee"
              menuPortal
            />
          </Row>
          <Row className="mt-4">
            <Col xs={12} className="text-center d-flex justify-content-end gap-3">
              <Button type="submit" className="custom-btn-primary">
                Save
              </Button>
              <Button type="button" className="custom-btn-secondary" onClick={onClose}>
                Cancel
              </Button>
            </Col>
          </Row>
        </form>
      </Modal.Body>
    </Modal>
  );
};

QuoteSelectEmployeeDialog.show = (
  quoteId: string,
  defaults: {
    employee_id?: string;
    employee_name?: string;
    employee_phone?: string;
  },
  onSaved: (patch: QuoteEmployeeSelectionPatch) => void
) => {
  openDialog("quote-select-employee-modal", (close) => (
    <QuoteSelectEmployeeDialog
      quoteId={quoteId}
      defaultEmployeeId={defaults.employee_id}
      defaultEmployeeName={defaults.employee_name}
      defaultEmployeePhone={defaults.employee_phone}
      onClose={close}
      onSaved={onSaved}
    />
  ));
};

export default QuoteSelectEmployeeDialog;
