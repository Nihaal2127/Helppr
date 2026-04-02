import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { UseFormRegister, UseFormSetValue } from "react-hook-form";
import { Modal, Button, Row, Col } from "react-bootstrap";
import CustomCloseButton from "../../components/CustomCloseButton";
import CustomDatePicker from "../../components/CustomDatePicker";
import CustomTimePicker from "../../components/CustomTimePicker";
import { openDialog } from "../../helper/DialogManager";
import { showErrorAlert, showSuccessAlert } from "../../helper/alertHelper";

export type QuoteScheduleDetailsPatch = {
  scheduled_date: string;
  scheduled_time_from: string;
  scheduled_time_to: string;
};

/** Flat shape so RHF does not recurse when wiring hidden fields for pickers. */
type SchedulePickerForm = {
  scheduled_date: string;
  scheduled_time_from: string;
  scheduled_time_to: string;
};

type QuoteEditScheduleDetailsDialogProps = {
  quoteId: string;
  defaults: {
    scheduled_date?: string;
    scheduled_time_from?: string;
    scheduled_time_to?: string;
  };
  onClose: () => void;
  onSaved: (patch: QuoteScheduleDetailsPatch) => void;
};

function toIsoCalendarDate(date: Date | null): string {
  if (!date) return "";
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function quoteScheduledDateToPickerString(iso: string | undefined): string | null {
  if (!iso?.trim()) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return toIsoCalendarDate(d);
}

function calendarDateToQuoteIso(yMd: string | null): string {
  if (!yMd?.trim()) return "";
  const [y, m, d] = yMd.split("-").map((x) => parseInt(x, 10));
  if (!y || !m || !d) return "";
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}T00:00:00.000Z`;
}

function parseTimeDisplay(str: string | undefined): Date | null {
  const t = (str ?? "").trim();
  if (!t || t === "-") return null;
  const match = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let h = parseInt(match[1], 10);
  const min = parseInt(match[2], 10);
  const ap = match[3].toUpperCase();
  if (ap === "PM" && h !== 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  return new Date(2000, 0, 1, h, min, 0, 0);
}

function formatTimeDisplay(d: Date | null): string {
  if (!d) return "";
  let h = d.getHours();
  const m = d.getMinutes();
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, "0")} ${ap}`;
}

function timeDisplayToPickerStr(display: string | undefined): string | null {
  const d = parseTimeDisplay(display);
  if (!d) return null;
  const h = d.getHours();
  const m = d.getMinutes();
  return `2000-01-01T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
}

function pickerStrToTimeDisplay(s: string | null): string {
  if (!s?.trim()) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  return formatTimeDisplay(d);
}

const QuoteEditScheduleDetailsDialog: React.FC<QuoteEditScheduleDetailsDialogProps> & {
  show: (
    quoteId: string,
    defaults: QuoteEditScheduleDetailsDialogProps["defaults"],
    onSaved: (patch: QuoteScheduleDetailsPatch) => void
  ) => void;
} = ({ quoteId, defaults, onClose, onSaved }) => {
  const { register, setValue } = useForm<SchedulePickerForm>({
    defaultValues: {
      scheduled_date: "",
      scheduled_time_from: "",
      scheduled_time_to: "",
    },
  });

  const registerPicker = register as unknown as UseFormRegister<any>;
  const setValuePicker = setValue as unknown as UseFormSetValue<any>;

  const [scheduledDateStr, setScheduledDateStr] = useState<string | null>(() =>
    quoteScheduledDateToPickerString(defaults.scheduled_date)
  );
  const [timeFromStr, setTimeFromStr] = useState<string | null>(() =>
    timeDisplayToPickerStr(defaults.scheduled_time_from)
  );
  const [timeToStr, setTimeToStr] = useState<string | null>(() =>
    timeDisplayToPickerStr(defaults.scheduled_time_to)
  );

  useEffect(() => {
    setScheduledDateStr(quoteScheduledDateToPickerString(defaults.scheduled_date));
    setTimeFromStr(timeDisplayToPickerStr(defaults.scheduled_time_from));
    setTimeToStr(timeDisplayToPickerStr(defaults.scheduled_time_to));
  }, [defaults.scheduled_date, defaults.scheduled_time_from, defaults.scheduled_time_to]);

  const runSave = () => {
    if (!scheduledDateStr?.trim()) {
      showErrorAlert("Please select a scheduled date.");
      return;
    }
    const fromLabel = pickerStrToTimeDisplay(timeFromStr);
    const toLabel = pickerStrToTimeDisplay(timeToStr);
    if (!fromLabel) {
      showErrorAlert("Please select a start time.");
      return;
    }
    if (!toLabel) {
      showErrorAlert("Please select an end time.");
      return;
    }
    const fromD = timeFromStr ? new Date(timeFromStr) : null;
    const toD = timeToStr ? new Date(timeToStr) : null;
    if (fromD && toD && fromD.getTime() >= toD.getTime()) {
      showErrorAlert("End time must be after start time.");
      return;
    }
    onSaved({
      scheduled_date: calendarDateToQuoteIso(scheduledDateStr),
      scheduled_time_from: fromLabel,
      scheduled_time_to: toLabel,
    });
    showSuccessAlert("Schedule updated successfully.");
    onClose();
  };

  return (
    <Modal show={true} onHide={onClose} centered dialogClassName="custom-big-modal">
      <Modal.Header className="py-3 px-4 border-bottom-0">
        <Modal.Title as="h5" className="custom-modal-title">
          Edit schedule
        </Modal.Title>
        <CustomCloseButton onClose={onClose} />
      </Modal.Header>
      <Modal.Body className="px-4 pb-4 pt-0">
        <p className="text-muted small mb-3">Quote ID: {quoteId}</p>
        <form
          noValidate
          name="quote-edit-schedule-form"
          onSubmit={(e) => {
            e.preventDefault();
            runSave();
          }}
        >
          <Row className="align-items-center mt-2">
            <Col sm={4} className="d-flex align-items-center">
              <label className="custom-profile-lable">Scheduled date</label>
            </Col>
            <Col>
              <CustomDatePicker
                label=""
                controlId="scheduled_date"
                selectedDate={scheduledDateStr}
                onChange={(date) => setScheduledDateStr(date ? toIsoCalendarDate(date) : null)}
                register={registerPicker}
                setValue={setValuePicker}
                asCol={false}
                groupClassName="mb-0 w-100"
                filterDate={() => true}
              />
            </Col>
          </Row>

          <Row className="align-items-center mt-3">
            <Col sm={4} className="d-flex align-items-center">
              <label className="custom-profile-lable">Time from</label>
            </Col>
            <Col>
              <CustomTimePicker
                label=""
                controlId="scheduled_time_from"
                selectedTime={timeFromStr}
                onChange={(date) =>
                  setTimeFromStr(
                    date
                      ? `2000-01-01T${String(date.getHours()).padStart(2, "0")}:${String(
                          date.getMinutes()
                        ).padStart(2, "0")}:00`
                      : null
                  )
                }
                register={registerPicker}
                setValue={setValuePicker}
                timeIntervals={15}
                asCol={false}
                groupClassName="mb-0 w-100"
              />
            </Col>
          </Row>

          <Row className="align-items-center mt-3">
            <Col sm={4} className="d-flex align-items-center">
              <label className="custom-profile-lable">Time to</label>
            </Col>
            <Col>
              <CustomTimePicker
                label=""
                controlId="scheduled_time_to"
                selectedTime={timeToStr}
                onChange={(date) =>
                  setTimeToStr(
                    date
                      ? `2000-01-01T${String(date.getHours()).padStart(2, "0")}:${String(
                          date.getMinutes()
                        ).padStart(2, "0")}:00`
                      : null
                  )
                }
                register={registerPicker}
                setValue={setValuePicker}
                timeIntervals={15}
                asCol={false}
                groupClassName="mb-0 w-100"
              />
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

QuoteEditScheduleDetailsDialog.show = (
  quoteId: string,
  defaults: QuoteEditScheduleDetailsDialogProps["defaults"],
  onSaved: (patch: QuoteScheduleDetailsPatch) => void
) => {
  openDialog("quote-edit-schedule-details-modal", (close) => (
    <QuoteEditScheduleDetailsDialog
      quoteId={quoteId}
      defaults={defaults}
      onClose={close}
      onSaved={onSaved}
    />
  ));
};

export default QuoteEditScheduleDetailsDialog;
