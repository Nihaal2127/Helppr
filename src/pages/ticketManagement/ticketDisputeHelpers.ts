import { TicketModel } from "../../models/TicketModel";

export type DisputeStatusUi = "open" | "pending" | "closed";

/** Composite label for dispute list / edit (maps existing status + resolve_status). */
export function ticketToDisputeStatusUi(t: TicketModel | null): DisputeStatusUi {
  if (!t || Number(t.status) !== 1) return "closed";
  if (Number(t.resolve_status) === 1) return "pending";
  return "open";
}

export function disputeStatusUiLabel(ui: DisputeStatusUi): string {
  switch (ui) {
    case "open":
      return "Open";
    case "pending":
      return "Pending";
    case "closed":
      return "Closed";
    default:
      return "-";
  }
}

/** Persist API fields used elsewhere (status 1=open ticket, 2=closed; resolve_status 1=pending workflow). */
export function disputeStatusUiToApi(
  ui: DisputeStatusUi,
  ticket: TicketModel | null
): { status: number; resolve_status: number } {
  if (ui === "closed") {
    return {
      status: 2,
      resolve_status: Number(ticket?.resolve_status ?? 1),
    };
  }
  if (ui === "pending") {
    return { status: 1, resolve_status: 1 };
  }
  return { status: 1, resolve_status: 2 };
}

export function contactTypeLabel(v: number | null | undefined): string {
  switch (Number(v)) {
    case 1:
      return "Mail";
    case 2:
      return "Call";
    case 3:
      return "Chat";
    default:
      return "-";
  }
}
