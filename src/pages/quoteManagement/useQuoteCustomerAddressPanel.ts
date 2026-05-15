import type { Dispatch, SetStateAction } from "react";
import { useEffect, useState } from "react";
import {
  displayStateName,
  formatAddressLineFromRecord,
} from "./quoteAddressFormat";
import { normalizePincodeDigits } from "./quoteFranchisePins";

export type QuoteAddressRowUi = {
  id: string;
  summary: string;
  selectable: boolean;
  contactName: string;
  stateName: string;
  cityName: string;
  areaName: string;
  streetAddress: string;
  landmark: string;
  pincode: string;
};

export type QuoteAddressUiState = {
  ready: boolean;
  rows: QuoteAddressRowUi[];
  error: string;
};

const emptyUi = (): QuoteAddressUiState => ({
  ready: false,
  rows: [],
  error: "",
});

function strTrim(v: unknown): string {
  if (v == null) return "";
  const s = String(v).trim();
  return s === "undefined" || s === "null" ? "" : s;
}

/**
 * Add Quote / Edit Quote: customer address cards + franchise area / pin rules.
 * When `preferredAddressId` matches a selectable saved address, it is selected by default.
 */
export function useQuoteCustomerAddressPanel(args: {
  userId: string;
  quoteCustomerRecords: Record<string, unknown>[];
  franchiseQuotePinSet: Set<string>;
  franchiseQuoteAreaIdSet: Set<string>;
  franchisePinsLoadDone: boolean;
  preferredAddressId?: string;
}): {
  addressUi: QuoteAddressUiState;
  selectedAddressId: string;
  setSelectedAddressId: Dispatch<SetStateAction<string>>;
} {
  const {
    userId,
    quoteCustomerRecords,
    franchiseQuotePinSet,
    franchiseQuoteAreaIdSet,
    franchisePinsLoadDone,
    preferredAddressId,
  } = args;

  const [addressUi, setAddressUi] = useState<QuoteAddressUiState>(emptyUi);
  const [selectedAddressId, setSelectedAddressId] = useState("");

  useEffect(() => {
    const uid = String(userId ?? "").trim();
    if (!uid) {
      setSelectedAddressId("");
      setAddressUi(emptyUi());
      return;
    }
    if (!franchisePinsLoadDone) {
      setSelectedAddressId("");
      setAddressUi({ ready: false, rows: [], error: "" });
      return;
    }

    const customer =
      quoteCustomerRecords.find(
        (c) => String(c._id ?? c.id ?? "").trim() === uid
      ) ?? null;
    if (!customer) {
      setSelectedAddressId("");
      setAddressUi({
        ready: true,
        rows: [],
        error:
          "This customer is not in the franchise list from the catalog. Pick another user or refresh.",
      });
      return;
    }

    const addrs = (customer.addresses ?? customer.user_addresses) as
      | unknown[]
      | undefined;
    const parsed: {
      id: string;
      summary: string;
      pinNorm: string;
      areaId: string;
      contactName: string;
      stateName: string;
      cityName: string;
      areaName: string;
      streetAddress: string;
      landmark: string;
      pincode: string;
    }[] = Array.isArray(addrs)
      ? addrs
          .filter((a) => a != null && typeof a === "object")
          .map((a) => {
            const rec = a as Record<string, unknown>;
            const id = strTrim(rec._id);
            const pinNorm = normalizePincodeDigits(
              rec.pincode ?? rec.postal_code ?? rec.postcode
            );
            const areaId = strTrim(rec.area_id);
            const stateName = displayStateName(
              strTrim(rec.state_name ?? rec.state)
            );
            const cityName = strTrim(rec.city_name ?? rec.city);
            const areaName = strTrim(rec.area_name ?? rec.area);
            const landmark = strTrim(rec.landmark);
            const door = strTrim(rec.door_no);
            const street = strTrim(rec.street ?? rec.address_line);
            const freeform = strTrim(rec.address);
            let streetAddress = [door, street].filter(Boolean).join(", ");
            if (!streetAddress) streetAddress = freeform;
            return {
              id,
              summary: formatAddressLineFromRecord(rec),
              pinNorm,
              areaId,
              contactName:
                strTrim(rec.contact_name ?? rec.contactName) || "Address",
              stateName,
              cityName,
              areaName,
              streetAddress,
              landmark,
              pincode: strTrim(rec.pincode ?? rec.postal_code ?? rec.postcode),
            };
          })
          .filter((r) => r.id)
      : [];

    if (!parsed.length) {
      setSelectedAddressId("");
      setAddressUi({ ready: true, rows: [], error: "" });
      return;
    }

    const areaRules = franchiseQuoteAreaIdSet;
    const hasAreaRules = areaRules.size > 0;
    const pinRules = franchiseQuotePinSet;
    const hasPinRules = pinRules.size > 0;

    const rows: QuoteAddressRowUi[] = parsed.map((r) => {
      let selectable = true;
      if (hasAreaRules) {
        selectable = Boolean(r.areaId && areaRules.has(r.areaId));
      } else if (hasPinRules) {
        selectable = Boolean(
          r.pinNorm.length === 6 && pinRules.has(r.pinNorm)
        );
      }
      return {
        id: r.id,
        summary: r.summary,
        selectable,
        contactName: r.contactName,
        stateName: r.stateName,
        cityName: r.cityName,
        areaName: r.areaName,
        streetAddress: r.streetAddress,
        landmark: r.landmark,
        pincode: r.pincode,
      };
    });

    const preferred = String(preferredAddressId ?? "").trim();
    const preferredRow =
      preferred && rows.find((r) => r.id === preferred && r.selectable);

    if (!hasAreaRules && !hasPinRules) {
      setSelectedAddressId(preferredRow ? preferred : parsed[0].id);
      setAddressUi({ ready: true, rows, error: "" });
      return;
    }

    const firstSelectable = rows.find((r) => r.selectable);
    if (!firstSelectable) {
      setSelectedAddressId("");
      setAddressUi({
        ready: true,
        rows,
        error: hasAreaRules
          ? "This customer does not have an address in this franchise's service areas (no matching area)."
          : "This customer does not have an address in this franchise's service area (no matching postcode).",
      });
      return;
    }

    setSelectedAddressId(preferredRow ? preferred : firstSelectable.id);
    setAddressUi({ ready: true, rows, error: "" });
  }, [
    userId,
    quoteCustomerRecords,
    franchiseQuotePinSet,
    franchiseQuoteAreaIdSet,
    franchisePinsLoadDone,
    preferredAddressId,
  ]);

  return { addressUi, selectedAddressId, setSelectedAddressId };
}
