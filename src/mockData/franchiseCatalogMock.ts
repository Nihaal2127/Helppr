/**
 * Shared catalog for franchise flows (Add/Edit dialog, list mock, view grouping).
 * IDs must match `franchiseMockSeed` category_ids / service_ids.
 *
 * When true, `AddEditFranchiseDialog` loads this catalog instead of category/service APIs
 * (avoids clashing with `franchiseMockSeed` ids). Other pages keep calling the real APIs.
 * Set false when backend ids match franchise payloads.
 */
export const USE_MOCK_FRANCHISE_CATALOG = true;

export const MOCK_FRANCHISE_CATEGORY_DROPDOWN: { value: string; label: string }[] = [
  { value: "cat_grocery", label: "Grocery" },
  { value: "cat_dairy", label: "Dairy" },
  { value: "cat_bakery", label: "Bakery" },
  { value: "cat_produce", label: "Fresh produce" },
];

/** Service rows used by AddEditFranchiseDialog + franchise mock data (ids match seed). */
export const MOCK_FRANCHISE_SERVICES_LIST: Array<{
  _id: string;
  name: string;
  category_id: string;
  category_name: string;
}> = [
  {
    _id: "svc_1",
    name: "Home delivery",
    category_id: "cat_grocery",
    category_name: "Grocery",
  },
  {
    _id: "svc_2",
    name: "Store pickup",
    category_id: "cat_grocery",
    category_name: "Grocery",
  },
  {
    _id: "svc_3",
    name: "Bulk order",
    category_id: "cat_dairy",
    category_name: "Dairy",
  },
  {
    _id: "svc_4",
    name: "Cake order",
    category_id: "cat_bakery",
    category_name: "Bakery",
  },
  {
    _id: "svc_5",
    name: "Organic box subscription",
    category_id: "cat_produce",
    category_name: "Fresh produce",
  },
  {
    _id: "svc_6",
    name: "Express checkout",
    category_id: "cat_grocery",
    category_name: "Grocery",
  },
];
