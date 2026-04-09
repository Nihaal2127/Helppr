import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Modal, Button, Row, Col, Form, InputGroup } from "react-bootstrap";
import CustomCloseButton from "../../components/CustomCloseButton";
import { openDialog } from "../../helper/DialogManager";
import { showSuccessAlert } from "../../helper/alertHelper";
import { AppConstant } from "../../constant/AppConstant";

type QuoteEditServicePriceDialogProps = {
  quoteId: string;
  defaultPrice: number;
  onClose: () => void;
  onSaved: (price: number) => void;
};

type FormValues = {
  service_price: string;
};

const QuoteEditServicePriceDialog: React.FC<QuoteEditServicePriceDialogProps> & {
  show: (quoteId: string, defaultPrice: number, onSaved: (price: number) => void) => void;
} = ({ quoteId, defaultPrice, onClose, onSaved }) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      service_price: String(defaultPrice ?? 0),
    },
  });

  useEffect(() => {
    reset({ service_price: String(defaultPrice ?? 0) });
  }, [defaultPrice, reset]);

  const onSubmit = (data: FormValues) => {
    const n = Number.parseFloat(String(data.service_price).trim());
    if (Number.isNaN(n) || n < 0) {
      return;
    }
    onSaved(n);
    showSuccessAlert("Service price updated successfully.");
    onClose();
  };

  return (
    <Modal show={true} onHide={onClose} centered>
      <Modal.Header className="py-3 px-4 border-bottom-0">
        <Modal.Title as="h5" className="custom-modal-title">
          Edit service price
        </Modal.Title>
        <CustomCloseButton onClose={onClose} />
      </Modal.Header>
      <Modal.Body className="px-4 pb-4 pt-0">
        <p className="text-muted small mb-3 mb-md-4">Quote ID: {quoteId}</p>
        <form noValidate name="quote-edit-service-price-form" onSubmit={handleSubmit(onSubmit)}>
          <Row className="align-items-center mt-2">
            <Col sm={4} className="d-flex align-items-center">
              <label className="custom-profile-lable">Service price</label>
            </Col>
            <Col>
              <Form.Group controlId="service_price" className="mb-0 w-100">
                <InputGroup>
                  <InputGroup.Text
                    style={{
                      borderColor: "var(--primary-color)",
                      backgroundColor: "var(--bg-color)",
                      fontFamily: "'Inter'",
                    }}
                  >
                    {AppConstant.currencySymbol}
                  </InputGroup.Text>
                  <Form.Control
                    className="custom-form-input"
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min={0}
                    placeholder="0"
                    isInvalid={!!errors.service_price}
                    style={{
                      boxShadow: "none",
                      borderRadius: "0 8px 8px 0",
                      borderColor: "var(--primary-color)",
                      fontSize: "14px",
                      backgroundColor: "var(--bg-color)",
                      fontFamily: "'Inter'",
                      color: "var(--content-txt-color)",
                    }}
                    {...register("service_price", {
                      required: "Please enter service price",
                      validate: (v) => {
                        const n = Number.parseFloat(String(v).trim());
                        if (Number.isNaN(n)) return "Enter a valid number";
                        if (n < 0) return "Price cannot be negative";
                        return true;
                      },
                    })}
                  />
                </InputGroup>
                {errors.service_price?.message && (
                  <div className="text-danger small mt-1">{errors.service_price.message}</div>
                )}
              </Form.Group>
            </Col>
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

QuoteEditServicePriceDialog.show = (
  quoteId: string,
  defaultPrice: number,
  onSaved: (price: number) => void
) => {
  openDialog("quote-edit-service-price-modal", (close) => (
    <QuoteEditServicePriceDialog
      quoteId={quoteId}
      defaultPrice={defaultPrice}
      onClose={close}
      onSaved={onSaved}
    />
  ));
};

export default QuoteEditServicePriceDialog;
