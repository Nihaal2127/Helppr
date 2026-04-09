import React, { useState } from "react";
import { Row, Col, Card, Button } from "react-bootstrap";
import { useForm } from "react-hook-form";
import CustomHeader from "../../../components/CustomHeader";
import SettingsNav from "../../../components/SettingsNav";
import AddEditGeneralSettingsDialog from "./AddEditGeneralSettingsDialog";

export type GeneralSettingsModel = {
  free_quotes_per_user: number;
  no_of_quotes: number;
  price: string;
};

const GeneralSettings = () => {
  const { register, setValue } = useForm<any>();
  const [settingsData, setSettingsData] = useState<GeneralSettingsModel>({
    free_quotes_per_user: 10,
    no_of_quotes: 5,
    price: "$10 ",
  });

  const handleUpdateClick = () => {
    AddEditGeneralSettingsDialog.show(settingsData, (updatedData) => {
      setSettingsData(updatedData);
    });
  };

  return (
    <div className="main-page-content">
      <CustomHeader
        title="General Settings"
        titlePrefix={<SettingsNav />}
        register={register}
        setValue={setValue}
      />

      <div>
        <Card className="border rounded shadow-sm" style={{ width: "400px" }}>
          <Card.Body className="p-3">
            {/* Free Quote */}
            <div className="mb-3">
              <h6 className="text-danger fw-medium mb-2">Free Quote Limit</h6>

              <Row className="align-items-center">
                <Col xs={7}>
                  <span className="fw-medium">Free Quotes per User</span>
                </Col>
                <Col xs={5} className="text-end">
                  <span className="text-muted">
                    {settingsData.free_quotes_per_user}
                  </span>
                </Col>
              </Row>
            </div>

            {/* Paid Quotes */}
            <div className="mb-3">
              <h6 className="text-danger fw-medium mb-2">Paid Quotes</h6>

              <Row className="align-items-center mb-2">
                <Col xs={7}>
                  <span className="fw-medium">No of Quotes</span>
                </Col>
                <Col xs={5} className="text-end">
                  <span className="text-muted">{settingsData.no_of_quotes}</span>
                </Col>
              </Row>

              <Row className="align-items-center">
                <Col xs={7}>
                  <span className="fw-medium">Price</span>
                </Col>
                <Col xs={5} className="text-end">
                  <span className="text-muted">{settingsData.price}</span>
                </Col>
              </Row>
            </div>

            <div className="text-end">
              <Button className="custom-btn-primary" onClick={handleUpdateClick}>
                Update
              </Button>
            </div>
          </Card.Body>
        </Card>
      </div>
    </div>
  );
};

export default GeneralSettings;