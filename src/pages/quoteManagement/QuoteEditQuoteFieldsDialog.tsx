import React, { useEffect } from "react";
import { Modal, Button, Row, Col } from "react-bootstrap";
import { Controller, useForm } from "react-hook-form";
import CustomCloseButton from "../../components/CustomCloseButton";
import CustomTextField from "../../components/CustomTextField";
import CustomFormSelect from "../../components/CustomFormSelect";
import { openDialog } from "../../helper/DialogManager";
import { showSuccessAlert } from "../../helper/alertHelper";
import { AppConstant } from "../../constant/AppConstant";

export type QuoteQuoteFieldsPatch = {
  service_price?: number;
  status?: string;
};

type QuoteEditQuoteFieldsDialogProps = {
  defaultPrice: number;
  defaultStatus: string;
  showPrice: boolean;
  showStatus: boolean;
  onClose: () => void;
  onSaved: (patch: QuoteQuoteFieldsPatch) => void;
};

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "new", label: "New" },
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "success", label: "Success" },
  { value: "failed", label: "Failed" },
];

const normalizeStatus = (value: string): string => value.trim().toLowerCase();

/** Digits and at most one decimal point; strips letters and other symbols. */
function sanitizePriceInput(raw: string): string {
  let out = "";
  let dotSeen = false;
  for (const ch of raw) {
    if (ch >= "0" && ch <= "9") out += ch;
    else if (ch === "." && !dotSeen) {
      out += ".";
      dotSeen = true;
    }
  }
  return out;
}

type FormValues = {
  service_price: string;
  status: string;
};

const QuoteEditQuoteFieldsDialog: React.FC<QuoteEditQuoteFieldsDialogProps> & {
  show: (
    defaults: {
      defaultPrice: number;
      defaultStatus: string;
      showPrice: boolean;
      showStatus: boolean;
    },
    onSaved: (patch: QuoteQuoteFieldsPatch) => void
  ) => void;
} = ({ defaultPrice, defaultStatus, showPrice, showStatus, onClose, onSaved }) => {
  const { register, setValue, control, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: {
      service_price: String(defaultPrice ?? 0),
      status: normalizeStatus(defaultStatus) || "new",
    },
  });

  useEffect(() => {
    reset({
      service_price: String(defaultPrice ?? 0),
      status: normalizeStatus(defaultStatus) || "new",
    });
  }, [defaultPrice, defaultStatus, reset]);

  const onSubmit = (data: FormValues) => {
    const patch: QuoteQuoteFieldsPatch = {};

    if (showPrice) {
      const n = Number.parseFloat(String(data.service_price).trim());
      if (Number.isNaN(n) || n < 0) {
        return;
      }
      patch.service_price = n;
    }

    if (showStatus) {
      const key = normalizeStatus(data.status);
      if (!key) return;
      const opt = STATUS_OPTIONS.find((o) => o.value === key);
      patch.status = opt?.label ?? data.status;
    }

    if (Object.keys(patch).length === 0) {
      onClose();
      return;
    }

    onSaved(patch);
    showSuccessAlert("Quote updated successfully.");
    onClose();
  };

  return (
    <Modal show={true} onHide={onClose} centered dialogClassName="custom-big-modal">
      <Modal.Header className="py-3 px-4 border-bottom-0">
        <Modal.Title as="h5" className="custom-modal-title">
          Edit quote
        </Modal.Title>
        <CustomCloseButton onClose={onClose} />
      </Modal.Header>
      <Modal.Body className="px-4 pb-4 pt-0">
        <form noValidate name="quote-edit-quote-fields-form" onSubmit={handleSubmit(onSubmit)}>
          {showPrice && (
            <Controller
              name="service_price"
              control={control}
              rules={{
                required: "Please enter service price",
                validate: (v) => {
                  const n = Number.parseFloat(String(v ?? "").trim());
                  if (Number.isNaN(n)) return "Enter a valid number";
                  if (n < 0) return "Price cannot be negative";
                  return true;
                },
              }}
              render={({ field, fieldState }) => (
                <CustomTextField
                  label={`Service price (${AppConstant.currencySymbol})`}
                  controlId="service_price"
                  placeholder="0"
                  register={
                    ((_name: string, _validation?: unknown) => ({
                      name: field.name,
                      onBlur: field.onBlur,
                      ref: field.ref,
                    })) as any
                  }
                  error={fieldState.error}
                  validation={undefined}
                  asCol={false}
                  inputType="text"
                  value={field.value ?? ""}
                  onChange={(v) => field.onChange(sanitizePriceInput(v))}
                />
              )}
            />
          )}

          {showStatus && (
            <Row className="align-items-center mt-3">
              <Col sm={4} className="d-flex align-items-center">
                <label className="custom-profile-lable">Quote status</label>
              </Col>
              <Col>
                <CustomFormSelect
                  label=""
                  controlId="quote_status"
                  options={STATUS_OPTIONS}
                  register={register as any}
                  fieldName="status"
                  asCol={false}
                  defaultValue={normalizeStatus(defaultStatus) || "new"}
                  setValue={setValue as any}
                  placeholder="Select status"
                />
              </Col>
            </Row>
          )}

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

QuoteEditQuoteFieldsDialog.show = (
  defaults: {
    defaultPrice: number;
    defaultStatus: string;
    showPrice: boolean;
    showStatus: boolean;
  },
  onSaved: (patch: QuoteQuoteFieldsPatch) => void
) => {
  openDialog("quote-edit-quote-fields-modal", (close) => (
    <QuoteEditQuoteFieldsDialog
      defaultPrice={defaults.defaultPrice}
      defaultStatus={defaults.defaultStatus}
      showPrice={defaults.showPrice}
      showStatus={defaults.showStatus}
      onClose={close}
      onSaved={onSaved}
    />
  ));
};

export default QuoteEditQuoteFieldsDialog;
