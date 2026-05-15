/** Section headings in quote view (Quote details, Customer, Amount breakdown, etc.). */
export const QUOTE_SECTION_TITLE_CLASS = "quote-section-title fw-bold mb-3";

/** Shared width (1040px) + 90vh cap with scrollable body for quote add / edit / view modals. */
export const QUOTE_MODAL_LAYOUT = {
  centered: true,
  size: "xl" as const,
  scrollable: true,
  dialogClassName: "add-quote-modal-dialog modal-vh-90",
  contentClassName: "add-quote-modal-content",
} as const;
