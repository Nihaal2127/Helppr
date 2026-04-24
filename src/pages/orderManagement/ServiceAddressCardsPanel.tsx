import React from "react";
import { Row, Col, Button, Form } from "react-bootstrap";
import type { UseFormRegister, UseFormUnregister, UseFormSetValue } from "react-hook-form";
import type { ServiceAddressCard, AddressCityDropdownRow } from "../../models/OrderItemModel";
import CustomTextFieldSelect from "../../components/CustomTextFieldSelect";
import { sanitizeIndianPincodeInput } from "../../helper/pincodeValidation";
import { openConfirmDialog } from "../../components/CustomConfirmDialog";
import type { CustomerSavedAddressPreview } from "../../helper/userAddressPreview";

const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const sanId = (id: string) => String(id).replace(/[^a-zA-Z0-9_]/g, "_");
const fieldState = (cardId: string) => `addrCard_${sanId(cardId)}_state`;
const fieldCity = (cardId: string) => `addrCard_${sanId(cardId)}_city`;

/** Clear react-hook-form keys for removed/replaced address cards (dynamic `addrCard_*` fields). */
export function unregisterServiceAddressCardFields(
    unregister: UseFormUnregister<any> | undefined,
    cardIds: readonly string[]
) {
    if (!unregister) return;
    for (const id of cardIds) {
        unregister(fieldState(id));
        unregister(fieldCity(id));
    }
}

export function getServiceAddressCardFieldNames(cardId: string) {
    return { stateField: fieldState(cardId), cityField: fieldCity(cardId) };
}

const miniCardBase: React.CSSProperties = {
    borderRadius: "10px",
    padding: "12px 14px",
    backgroundColor: "var(--bg-color)",
    height: "100%",
};

const savedCardShell: React.CSSProperties = {
    ...miniCardBase,
    border: "1px dashed var(--primary-color)",
    boxShadow: "none",
};

const stackLabel: React.CSSProperties = {
    fontSize: "16px",
    fontWeight: 600,
    color: "var(--content-txt-color, #6c757d)",
    marginBottom: "4px",
};

const stackValue: React.CSSProperties = {
    fontSize: "15px",
    fontWeight: 500,
    fontFamily: "Inter, sans-serif",
    color: "var(--txt-color)",
    wordBreak: "break-word",
};

/** Primary / focus colors for “active address” checkbox — aligned with `CustomFormSwitch` theme. */
const SERVICE_ADDR_CHECKBOX_THEME_CSS = `
.service-addr-active-check .form-check-input {
  cursor: pointer;
  border-color: var(--primary-color) !important;
  background-color: var(--bg-color) !important;
}
.service-addr-active-check .form-check-input:checked {
  background-color: var(--primary-color) !important;
  border-color: var(--primary-color) !important;
}
.service-addr-active-check .form-check-input:focus {
  border-color: var(--primary-color) !important;
  box-shadow: 0 0 0 0.1rem rgba(155, 12, 12, 1) !important;
}
`;

export function serializeServiceAddressCards(cards: ServiceAddressCard[] | undefined): string {
    if (!cards?.length) return "";
    const sorted = [...cards].sort((a, b) => {
        if (!!a.isActive === !!b.isActive) return 0;
        return a.isActive ? -1 : 1;
    });
    return sorted
        .map((c) => {
            const parts = [
                c.line?.trim(),
                c.postal?.trim(),
                c.cityLabel?.trim(),
                c.stateLabel?.trim(),
            ].filter(Boolean);
            return parts.join(", ");
        })
        .filter(Boolean)
        .join("\n---\n");
}

type ServiceAddressCardsPanelProps = {
    cards: ServiceAddressCard[];
    onChange: (next: ServiceAddressCard[]) => void;
    register: UseFormRegister<any>;
    setValue: UseFormSetValue<any>;
    unregister?: UseFormUnregister<any>;
    stateOptions: { value: string; label: string }[];
    cityRows: AddressCityDropdownRow[];
    /** Selected customer profile address(es) — read-only context above editable service cards. */
    customerSavedAddresses?: CustomerSavedAddressPreview[];
};

const ServiceAddressCardsPanel: React.FC<ServiceAddressCardsPanelProps> = ({
    cards,
    onChange,
    register,
    setValue,
    unregister,
    stateOptions,
    cityRows,
    customerSavedAddresses,
}) => {
    const patchCard = (id: string, patch: Partial<ServiceAddressCard>) => {
        onChange(cards.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    };

    const setExclusiveActive = (id: string) => {
        onChange(cards.map((c) => ({ ...c, isActive: c.id === id })));
    };

    const clearActiveAndPickFirst = (exceptId: string) => {
        const others = cards.filter((c) => c.id !== exceptId);
        const pick = others[0]?.id;
        if (!pick) {
            onChange(cards.map((c) => ({ ...c, isActive: true })));
            return;
        }
        onChange(cards.map((c) => ({ ...c, isActive: c.id === pick })));
    };

    const addCard = () => {
        onChange([
            ...cards,
            {
                id: newId(),
                stateId: "",
                cityId: "",
                postal: "",
                line: "",
                stateLabel: "",
                cityLabel: "",
                isActive: false,
            },
        ]);
    };

    const removeCard = (id: string) => {
        if (cards.length <= 1) return;
        openConfirmDialog("Remove this address?", "Delete", "Cancel", () => {
            unregister?.(fieldState(id));
            unregister?.(fieldCity(id));
            const next = cards.filter((c) => c.id !== id);
            if (!next.some((c) => c.isActive)) {
                onChange(next.map((c, i) => ({ ...c, isActive: i === 0 })));
            } else {
                onChange(next);
            }
        });
    };

    const cityOptionsForCard = (stateId: string): { value: string; label: string }[] => {
        if (!stateId?.trim()) {
            return [{ value: "", label: "Select state first" }];
        }
        const filtered = cityRows.filter((r) => r.state_id === stateId);
        if (!filtered.length) {
            return [{ value: "", label: "No cities for state" }];
        }
        return [{ value: "", label: "Select city" }, ...filtered.map((r) => ({ value: r.value, label: r.label }))];
    };

    const rows: ServiceAddressCard[][] = [];
    for (let i = 0; i < cards.length; i += 4) {
        rows.push(cards.slice(i, i + 4));
    }

    return (
        <div className="mt-3 pt-3 border-top">
            <style>{SERVICE_ADDR_CHECKBOX_THEME_CSS}</style>
            {customerSavedAddresses?.length ? (
                <div className="mb-3">
                    <div
                        className="fw-semibold mb-2"
                        style={{ fontSize: "13px", color: "var(--content-txt-color, #6c757d)" }}>
                        Customer address on file
                    </div>
                    <Row className="g-3 mb-1">
                        {customerSavedAddresses.map((a, idx) => (
                            <Col key={`saved-${idx}`} xs={12} md={6} lg={3}>
                                <div style={savedCardShell}>
                                    <div
                                        className="fw-semibold mb-2"
                                        style={{ fontSize: "14px", color: "var(--primary-color)" }}>
                                        Saved address
                                    </div>
                                    <div className="mb-2">
                                        <div style={stackLabel}>State</div>
                                        <div style={stackValue}>{a.stateLabel}</div>
                                    </div>
                                    <div className="mb-2">
                                        <div style={stackLabel}>City</div>
                                        <div style={stackValue}>{a.cityLabel}</div>
                                    </div>
                                    <div className="mb-2">
                                        <div style={stackLabel}>Postal Code</div>
                                        <div style={stackValue}>{a.postal}</div>
                                    </div>
                                    <div className="mb-0">
                                        <div style={stackLabel}>Address</div>
                                        <div style={stackValue}>{a.line}</div>
                                    </div>
                                </div>
                            </Col>
                        ))}
                    </Row>
                </div>
            ) : null}
            <Row className="align-items-center mb-2">
                <Col>
                    <span className="custom-profile-lable">Service addresses</span>
                </Col>
                <Col xs="auto">
                    <span style={{ color: "var(--primary-color)", cursor: "pointer" }} className="p-0 text-decoration-none" onClick={addCard}>
                        + Add address
                    </span>
                </Col>
            </Row>
            {rows.map((rowCards, rowIdx) => (
                <Row key={rowIdx} className="mb-2">
                    {rowCards.map((card, colIdx) => {
                        const globalIdx = rowIdx * 4 + colIdx + 1;
                        const cityOpts = cityOptionsForCard(card.stateId);
                        const active = !!card.isActive;
                        const cardShell: React.CSSProperties = {
                            ...miniCardBase,
                            border: active
                                ? "1px solid var(--primary-color)"
                                : "1px solid var(--txtfld-border, rgba(0, 0, 0, 0.1))",
                            boxShadow: active ? "0 0 0 1px var(--primary-color)" : undefined,
                        };
                        return (
                            <Col key={card.id} xs={12} md={6} lg={3}>
                                <div style={cardShell}>
                                    <div className="d-flex justify-content-between align-items-center mb-2 gap-2">
                                        <div className="d-flex align-items-center gap-2 flex-wrap">
                                            <span className="fw-semibold" style={{ color: "var(--primary-color)" }}>
                                                Address {globalIdx}
                                            </span>
                                        </div>
                                        <div className="d-flex align-items-center gap-2 flex-shrink-0">
                                            <Form.Check
                                                type="checkbox"
                                                id={`addr-active-${card.id}`}
                                                className="service-addr-active-check"
                                                checked={active}
                                                onChange={(e) => {
                                                    const on = e.target.checked;
                                                    if (on) setExclusiveActive(card.id);
                                                    else if (cards.length <= 1) {
                                                        patchCard(card.id, { isActive: true });
                                                    } else if (active) {
                                                        clearActiveAndPickFirst(card.id);
                                                    }
                                                }}
                                                title="Primary address"
                                                aria-label="Set as active address"
                                            />
                                            
                                            <i
                                                className="bi bi-trash text-danger"
                                                role="button"
                                                title="Delete"
                                                style={{ fontSize: "0.95rem" }}
                                                onClick={() => removeCard(card.id)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter" || e.key === " ") {
                                                        e.preventDefault();
                                                        removeCard(card.id);
                                                    }
                                                }}
                                                tabIndex={0}
                                                aria-label="Delete address"
                                            />
                                        </div>
                                    </div>
                                    <div className="mb-2">
                                        <CustomTextFieldSelect
                                            label="State"
                                            controlId={`addr-state-${card.id}`}
                                            options={stateOptions}
                                            register={register}
                                            fieldName={fieldState(card.id)}
                                            defaultValue={card.stateId}
                                            setValue={setValue as (name: string, value: any) => void}
                                            menuPortal
                                            labelSize={12}
                                            noRowBottomMargin
                                            noBottomMargin
                                            placeholder="Select state"
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                const label =
                                                    stateOptions.find((o) => o.value === v)?.label?.trim() ?? "";
                                                patchCard(card.id, {
                                                    stateId: v,
                                                    cityId: "",
                                                    cityLabel: "",
                                                    stateLabel: label,
                                                });
                                                setValue(fieldCity(card.id), "", { shouldValidate: false });
                                            }}
                                        />
                                    </div>
                                    <div className="mb-2" key={`city-wrap-${card.id}-${card.stateId}`}>
                                        <CustomTextFieldSelect
                                            label="City"
                                            controlId={`addr-city-${card.id}`}
                                            options={cityOpts}
                                            register={register}
                                            fieldName={fieldCity(card.id)}
                                            defaultValue={card.cityId}
                                            setValue={setValue as (name: string, value: any) => void}
                                            menuPortal
                                            labelSize={12}
                                            noRowBottomMargin
                                            noBottomMargin
                                            placeholder="Select city"
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                const label =
                                                    cityOpts.find((o) => o.value === v)?.label?.trim() ?? "";
                                                patchCard(card.id, { cityId: v, cityLabel: label });
                                            }}
                                        />
                                    </div>
                                    <div className="mb-2">
                                        <div className="d-block" style={stackLabel}>
                                            Postal Code
                                        </div>
                                        <Form.Control
                                            className="custom-form-input"
                                            type="tel"
                                            inputMode="numeric"
                                            maxLength={6}
                                            placeholder="6-digit PIN"
                                            value={card.postal}
                                            onChange={(e) =>
                                                patchCard(card.id, {
                                                    postal: sanitizeIndianPincodeInput(e.target.value),
                                                })
                                            }
                                        />
                                    </div>
                                    <div className="mb-0">
                                        <div className="d-block" style={stackLabel}>
                                            Address
                                        </div>
                                        <Form.Control
                                            as="textarea"
                                            rows={3}
                                            className="custom-form-input"
                                            placeholder="Street, building, etc."
                                            value={card.line}
                                            onChange={(e) => patchCard(card.id, { line: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </Col>
                        );
                    })}
                </Row>
            ))}
        </div>
    );
};

export default ServiceAddressCardsPanel;
