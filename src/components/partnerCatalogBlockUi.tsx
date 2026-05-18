import React, { useMemo } from "react";
import { Form } from "react-bootstrap";
import Select from "react-select";
import type { SingleValue } from "react-select";

export type PartnerSelectOption = { value: string; label: string };

export type PartnerCatalogServiceLite = {
  _id: string;
  name: string;
  category_id: string;
  /** From franchise/global catalog when loading options for Add Partner. */
  price?: number;
  payment_type?: string;
};

export type PartnerServiceRow = {
  id: string;
  serviceId: string;
  description: string;
  price: string;
  is_active: boolean;
};

export type PartnerCategoryBlock = {
  id: string;
  categoryId: string;
  is_active: boolean;
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
    is_active: true,
  };
}

export function emptyPartnerCatalogBlock(
  initialCategoryId: string
): PartnerCategoryBlock {
  return {
    id: newPartnerCatalogRowId(),
    categoryId: initialCategoryId,
    is_active: true,
    serviceRows: [emptyPartnerServiceRow()],
  };
}

type PartnerCatalogStatusToggleProps = {
  instanceId: string;
  value: boolean;
  onChange: (active: boolean) => void;
  label?: string;
  disabled?: boolean;
};

export function PartnerCatalogStatusToggle({
  instanceId,
  value,
  onChange,
  label = "Status",
  disabled = false,
}: PartnerCatalogStatusToggleProps) {
  return (
    <Form.Group controlId={instanceId}>
      <Form.Label className="fw-medium mb-1">{label}</Form.Label>
      <div className="d-flex flex-wrap gap-3">
        <Form.Check
          type="radio"
          id={`${instanceId}-active`}
          name={instanceId}
          label="Active"
          checked={value}
          disabled={disabled}
          onChange={() => onChange(true)}
        />
        <Form.Check
          type="radio"
          id={`${instanceId}-inactive`}
          name={instanceId}
          label="Inactive"
          checked={!value}
          disabled={disabled}
          onChange={() => onChange(false)}
        />
      </div>
    </Form.Group>
  );
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
  /** e.g. lazy-load category options when the menu opens (Add Partner). */
  onMenuOpen?: () => void;
  isDisabled?: boolean;
};

export function PartnerSingleSelect({
  instanceId,
  label,
  options,
  value,
  onChange,
  placeholder,
  onMenuOpen,
  isDisabled,
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
        isDisabled={Boolean(isDisabled)}
        hideSelectedOptions={false}
        isSearchable
        options={options}
        value={selected}
        placeholder={placeholder}
        onChange={(opt: SingleValue<PartnerSelectOption>) => {
          const v = opt?.value;
          onChange(v !== undefined && v !== null ? String(v) : "");
        }}
        onMenuOpen={onMenuOpen}
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

/** Coerce ids for API JSON: plain integer strings → number; ObjectIds / non-numeric stay strings. */
export function partnerApiJsonId(id: string): string | number {
  const t = String(id ?? "").trim();
  if (!t) return "";
  if (/^\d+$/.test(t)) {
    const n = Number(t);
    if (Number.isSafeInteger(n)) return n;
  }
  return t;
}

export type PartnerServiceNestedItem = {
  service_id: string | number;
  description: string;
  price: number;
  is_active: boolean;
};

/** One category block in `partner_services` (multipart JSON string). */
export type PartnerServicesCategoryPayload = {
  category_id: string | number;
  is_active: boolean;
  services: PartnerServiceNestedItem[];
};

export type PartnerCatalogFlattenOk = {
  ok: true;
  category_ids: string[];
  service_ids: string[];
  service_names: string[];
  service_descriptions: string[];
  service_prices: string[];
  /** Parallel to `category_ids` — category active flags for API. */
  category_is_active: boolean[];
  /** Parallel to `service_ids` — service active flags for API. */
  service_is_active: boolean[];
  /** Grouped by `category_id`; sent as JSON in multipart `partner_services`. */
  partner_services: PartnerServicesCategoryPayload[];
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

  const blockByCategoryId = new Map<string, PartnerCategoryBlock>();
  for (const b of blocks) {
    const cid = String(b.categoryId ?? "").trim();
    if (cid) blockByCategoryId.set(cid, b);
  }

  const categoryOrder: string[] = [];
  const servicesByCategory = new Map<string, PartnerServiceNestedItem[]>();
  const category_is_active: boolean[] = [];
  const service_is_active: boolean[] = [];

  for (const x of meaningful) {
    const cid = String(x.categoryId);
    const block = blockByCategoryId.get(cid);
    const categoryActive = block?.is_active !== false;
    const row = (block?.serviceRows ?? []).find(
      (r) => String(r.serviceId) === String(x.serviceId)
    );
    const serviceActive = categoryActive && row?.is_active !== false;
    const priceNum =
      Number(String(x.price ?? "").replace(/[^\d.]/g, "")) || 0;
    const item: PartnerServiceNestedItem = {
      service_id: partnerApiJsonId(x.serviceId),
      description: x.description.trim(),
      price: priceNum,
      is_active: serviceActive,
    };
    if (!servicesByCategory.has(cid)) {
      servicesByCategory.set(cid, []);
      categoryOrder.push(cid);
      category_is_active.push(categoryActive);
    }
    servicesByCategory.get(cid)!.push(item);
    service_is_active.push(serviceActive);
  }

  const partner_services: PartnerServicesCategoryPayload[] = categoryOrder.map(
    (cid, idx) => ({
      category_id: partnerApiJsonId(cid),
      is_active: category_is_active[idx] ?? true,
      services: (servicesByCategory.get(cid) ?? []).map((svc) => ({
        ...svc,
        is_active:
          (category_is_active[idx] ?? true) && svc.is_active !== false,
      })),
    })
  );

  return {
    ok: true,
    category_ids,
    service_ids,
    service_names,
    service_descriptions,
    service_prices,
    category_is_active,
    service_is_active,
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
