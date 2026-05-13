import React, { useMemo } from "react";
import { Form } from "react-bootstrap";
import Select from "react-select";
import type { SingleValue } from "react-select";

export type PartnerSelectOption = { value: string; label: string };

export type PartnerCatalogServiceLite = {
  _id: string;
  name: string;
  category_id: string;
};

export type PartnerServiceRow = {
  id: string;
  serviceId: string;
  description: string;
  price: string;
};

export type PartnerCategoryBlock = {
  id: string;
  categoryId: string;
  serviceRows: PartnerServiceRow[];
};

export function newPartnerCatalogRowId(): string {
  return `pcl-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function emptyPartnerServiceRow(): PartnerServiceRow {
  return {
    id: newPartnerCatalogRowId(),
    serviceId: "",
    description: "",
    price: "",
  };
}

export function emptyPartnerCatalogBlock(
  initialCategoryId: string
): PartnerCategoryBlock {
  return {
    id: newPartnerCatalogRowId(),
    categoryId: initialCategoryId,
    serviceRows: [emptyPartnerServiceRow()],
  };
}

const partnerModalSelectStyles = {
  control: (provided: Record<string, unknown>) => ({
    ...provided,
    borderColor: "var(--primary-color)",
    boxShadow: "none",
    borderRadius: "8px",
    fontSize: "14px",
    minHeight: "38px",
    height: "38px",
    backgroundColor: "var(--bg-color)",
    fontFamily: "'Inter', sans-serif",
    color: "var(--content-txt-color)",
    marginBottom: 0,
    cursor: "pointer",
    "&:hover": { borderColor: "var(--primary-color)" },
  }),
  valueContainer: (provided: Record<string, unknown>) => ({
    ...provided,
    paddingTop: 2,
    paddingBottom: 2,
  }),
  option: (
    provided: Record<string, unknown>,
    state: { isSelected: boolean; isFocused: boolean }
  ) => ({
    ...provided,
    backgroundColor: state.isSelected
      ? "var(--txtfld-border)"
      : state.isFocused
      ? "var(--primary-color)"
      : "",
    color:
      state.isSelected || state.isFocused
        ? "var(--bg-color)"
        : "var(--primary-color)",
    cursor: "pointer",
    fontSize: "14px",
  }),
  singleValue: (provided: Record<string, unknown>) => ({
    ...provided,
    color: "var(--content-txt-color)",
  }),
  placeholder: (provided: Record<string, unknown>) => ({
    ...provided,
    fontSize: "14px",
    color: "var(--placeholder-txt)",
    fontFamily: "Inter, sans-serif",
  }),
  menuPortal: (provided: Record<string, unknown>) => ({
    ...provided,
    zIndex: 9999,
  }),
  menu: (provided: Record<string, unknown>) => ({ ...provided, zIndex: 9999 }),
  indicatorsContainer: (provided: Record<string, unknown>) => ({
    ...provided,
    height: "36px",
  }),
};

type PartnerSingleSelectProps = {
  instanceId: string;
  label: string;
  options: PartnerSelectOption[];
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
};

export function PartnerSingleSelect({
  instanceId,
  label,
  options,
  value,
  onChange,
  placeholder,
}: PartnerSingleSelectProps) {
  const selected = useMemo(
    () => options.find((o) => String(o.value) === String(value)) ?? null,
    [options, value]
  );

  return (
    <Form.Group controlId={instanceId}>
      {label ? (
        <Form.Label className="fw-medium mb-1">{label}</Form.Label>
      ) : null}
      <Select<PartnerSelectOption, false>
        instanceId={instanceId}
        inputId={`${instanceId}-input`}
        className="react-select react-select-container"
        classNamePrefix="react-select"
        isMulti={false}
        isClearable={false}
        isSearchable
        options={options}
        value={selected}
        placeholder={placeholder}
        onChange={(opt: SingleValue<PartnerSelectOption>) => {
          const v = opt?.value;
          onChange(v !== undefined && v !== null ? String(v) : "");
        }}
        menuPortalTarget={
          typeof document !== "undefined" ? document.body : null
        }
        menuPosition="fixed"
        styles={partnerModalSelectStyles}
      />
    </Form.Group>
  );
}

type FlatRow = {
  categoryId: string;
  serviceId: string;
  description: string;
  price: string;
};

export type PartnerServiceCreateRow = {
  category_id: string;
  service_id: string;
  description: string;
  price: number;
};

export type PartnerCatalogFlattenOk = {
  ok: true;
  category_ids: string[];
  service_ids: string[];
  service_names: string[];
  service_descriptions: string[];
  service_prices: string[];
  /** `POST /user/create` (multipart) — Postman-style `partner_services` JSON array. */
  partner_services: PartnerServiceCreateRow[];
};

export type PartnerCatalogFlattenErr = { ok: false; message: string };

export function flattenPartnerBlocksForSave(
  blocks: PartnerCategoryBlock[],
  allServices: PartnerCatalogServiceLite[]
): PartnerCatalogFlattenOk | PartnerCatalogFlattenErr {
  const flat: FlatRow[] = [];
  for (const b of blocks) {
    for (const r of b.serviceRows) {
      flat.push({
        categoryId: b.categoryId,
        serviceId: r.serviceId,
        description: r.description,
        price: r.price,
      });
    }
  }

  const meaningful = flat.filter(
    (x) =>
      x.categoryId ||
      x.serviceId ||
      x.description.trim() !== "" ||
      x.price.trim() !== ""
  );

  for (const x of meaningful) {
    if (!x.categoryId || !x.serviceId) {
      return {
        ok: false,
        message:
          "Each filled row needs a category and a service (check every block).",
      };
    }
  }

  if (meaningful.length === 0) {
    return {
      ok: false,
      message:
        "Add at least one category with a service, description, and price.",
    };
  }

  const category_ids: string[] = [];
  for (const x of meaningful) {
    if (!category_ids.includes(x.categoryId)) {
      category_ids.push(x.categoryId);
    }
  }

  const service_ids = meaningful.map((x) => x.serviceId);
  const service_descriptions = meaningful.map((x) => x.description.trim());
  const service_prices = meaningful.map((x) => x.price.trim());
  const service_names = meaningful.map(
    (x) => allServices.find((s) => String(s._id) === x.serviceId)?.name ?? ""
  );

  const partner_services: PartnerServiceCreateRow[] = meaningful.map((x) => ({
    category_id: x.categoryId,
    service_id: x.serviceId,
    description: x.description.trim(),
    price:
      Number(String(x.price ?? "").replace(/[^\d.]/g, "")) ||
      0,
  }));

  return {
    ok: true,
    category_ids,
    service_ids,
    service_names,
    service_descriptions,
    service_prices,
    partner_services,
  };
}

export const partnerCatalogControlStyle: React.CSSProperties = {
  borderRadius: "8px",
  borderColor: "var(--primary-color)",
  fontSize: "14px",
  backgroundColor: "var(--bg-color)",
  color: "var(--content-txt-color)",
  minHeight: "38px",
};

export const partnerCatalogOutlineAddBtn: React.CSSProperties = {
  width: "24px",
  height: "24px",
  borderRadius: "50%",
  border: "1px solid green",
  backgroundColor: "transparent",
  color: "green",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  boxShadow: "none",
  padding: 0,
  transition: "background-color 0.15s ease, filter 0.15s ease",
};

export const partnerCatalogOutlineDeleteBtn: React.CSSProperties = {
  width: "24px",
  height: "24px",
  borderRadius: "50%",
  border: "1px solid red",
  backgroundColor: "transparent",
  color: "red",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  boxShadow: "none",
  padding: 0,
  transition: "background-color 0.15s ease, filter 0.15s ease",
};
