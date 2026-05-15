import { BankAccountModel } from "../models/BankAccountModel";
import { UserModel } from "../models/UserModel";

/** Form keys in Add Partner UI → multipart field names on `POST /user/create`. */
export const PARTNER_CREATE_DOCUMENT_FIELDS = {
  vehicle_registration: "vehicle_registration",
  police_verification: "police_verification_certificate",
  pan_card: "pan_card",
  driving_license: "driving_license",
  aadhar_card: "aadhar_card",
} as const;

export type PartnerCreateDocumentKey = keyof typeof PARTNER_CREATE_DOCUMENT_FIELDS;

export const PARTNER_CREATE_DOCUMENT_SLOTS: {
  key: PartnerCreateDocumentKey;
  title: string;
}[] = [
  { key: "vehicle_registration", title: "Vehicle Registration" },
  {
    key: "police_verification",
    title: "Police Verification Certificate",
  },
  { key: "pan_card", title: "PAN Card" },
  { key: "driving_license", title: "Driving License" },
  { key: "aadhar_card", title: "Aadhar Card" },
];

export function partnerBankAccountsFromUser(
  user: UserModel | undefined
): BankAccountModel[] {
  if (!user) return [];
  const multi = user.bank_accounts;
  if (Array.isArray(multi) && multi.length > 0) {
    return sortPartnerBankAccountsActiveFirst(
      multi.filter(
        (a) =>
          a &&
          (String(a._id ?? "").trim() ||
            String(a.account_number ?? "").trim() ||
            String(a.ifsc_code ?? "").trim())
      )
    );
  }
  const single = user.bank_account;
  if (
    single &&
    (String(single._id ?? "").trim() ||
      String(single.account_number ?? "").trim() ||
      String(single.ifsc_code ?? "").trim())
  ) {
    return sortPartnerBankAccountsActiveFirst([single]);
  }
  return [];
}

/** Active accounts first; only one should be active in normal partner flows. */
export function sortPartnerBankAccountsActiveFirst(
  accounts: BankAccountModel[]
): BankAccountModel[] {
  return [...accounts].sort((a, b) => {
    const aScore = a.is_active !== false ? 1 : 0;
    const bScore = b.is_active !== false ? 1 : 0;
    return bScore - aScore;
  });
}
