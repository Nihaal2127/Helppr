import React from "react";
import { Row, Col, Button } from "react-bootstrap";
import CustomHeader from "../../components/CustomHeader";
import { useForm } from "react-hook-form";
import MyCalendar from "../../components/MyCalendar";

const CalendarPage: React.FC = () => {
  const { register, setValue } = useForm<any>();

  return (
    <div className="main-page-content">
      
      <CustomHeader title="Calendar" register={register} setValue={setValue} />

      <div className="custom-dashboard-card d-flex justify-content-between align-items-center">
        <h3 className="custom-dashboard-title">Appointment Calender Schedule</h3>

        <div className="d-flex gap-2">
        <Button
        className="btn-danger custom-btn"
        onClick={() => {
            document.getElementById("openScheduleModalBtn")?.click();
        }}
        >
        + Schedule
        </Button>
        </div>
      </div>

      <Row>
        <Col md={12}>
          <div className="custom-dashboard-card calendar-wrapper">
            <MyCalendar />
          </div>
        </Col>
      </Row>

    </div>
  );
};

export default CalendarPage;
