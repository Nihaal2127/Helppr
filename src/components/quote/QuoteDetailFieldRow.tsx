import React from "react";
import { Row, Col } from "react-bootstrap";

export type QuoteDetailFieldRowProps = {
  label: string;
  value: React.ReactNode;
};

function displayValue(value: React.ReactNode): React.ReactNode {
  if (value === undefined || value === null || value === "") return "-";
  return value;
}

export default function QuoteDetailFieldRow({
  label,
  value,
}: QuoteDetailFieldRowProps) {
  return (
    <Row className="mb-2 g-1">
      <Col xs={12} sm={4} className="fw-semibold text-secondary">
        {label}
      </Col>
      <Col xs={12} sm={8} className="text-break">
        {displayValue(value)}
      </Col>
    </Row>
  );
}
