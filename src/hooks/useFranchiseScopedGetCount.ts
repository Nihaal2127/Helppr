import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useForm, UseFormReturn } from "react-hook-form";
import type { CountModel } from "../models/CountModel";
import { getCount } from "../services/getCountService";
import type { GetCountPathResolution } from "../helper/getCountRouteType";
import { resolveGetCountTypeFromPathname } from "../helper/getCountRouteType";

export const FRANCHISE_HEADER_FIELD = "franchise_id" as const;
export const FRANCHISE_HEADER_ALL = "all" as const;

export type FranchiseHeaderFormValues = {
  franchise_id: string;
};

/**
 * Shared defaults for pages that use `CustomHeader` franchise `CustomFormSelect` (`fieldName="franchise_id"`).
 */
export function useFranchiseHeaderForm(): UseFormReturn<FranchiseHeaderFormValues> & {
  franchiseId: string;
} {
  const methods = useForm<FranchiseHeaderFormValues>({
    defaultValues: { franchise_id: FRANCHISE_HEADER_ALL },
  });
  const franchiseId = String(
    methods.watch("franchise_id") ?? FRANCHISE_HEADER_ALL
  );
  return { ...methods, franchiseId };
}

function scopeFromFranchiseId(franchiseId: string | null | undefined) {
  const fid = String(franchiseId ?? "").trim();
  if (!fid || fid === FRANCHISE_HEADER_ALL) return undefined;
  return { franchise_id: fid };
}

function resolutionToGetCountArgs(res: GetCountPathResolution | null): {
  type: number | string;
} | null {
  if (!res) return null;
  return { type: res.type };
}

export type UseFranchiseScopedGetCountOptions = {
  /** Header / scoped franchise id (`"all"` = do not send `franchise_id`). */
  franchiseId?: string | null;
  /**
   * When set, overrides `inferTypeFromPath` and `useLocation`.
   * Use `undefined` only together with `inferTypeFromPath: true`.
   */
  type?: number | string;
  /** When true and `type` is omitted, uses `resolveGetCountTypeFromPathname(location.pathname)`. */
  inferTypeFromPath?: boolean;
  /** When false, skips fetch (e.g. hidden tab). Default true. */
  enabled?: boolean;
};

/**
 * Reusable `POST /api/getCount` for dashboard cards + franchise dropdown:
 * same payload rules everywhere (`type` + optional `franchise_id`), one hook.
 *
 * @example Explicit type (recommended for clarity)
 * ```tsx
 * const { franchiseId, ...form } = useFranchiseHeaderForm();
 * const { countModel, refresh } = useFranchiseScopedGetCount({
 *   type: "service-management",
 *   franchiseId,
 * });
 * ```
 *
 * @example Infer `type` from the URL (extend `RULES` in `getCountRouteType.ts` for new pages)
 * ```tsx
 * const { countModel, refresh } = useFranchiseScopedGetCount({
 *   franchiseId,
 *   inferTypeFromPath: true,
 * });
 * ```
 */
export function useFranchiseScopedGetCount(
  options: UseFranchiseScopedGetCountOptions
): {
  countModel: CountModel | null;
  responseCount: boolean;
  isLoading: boolean;
  /** Refetch counts (e.g. after create/update). Resolves when the request finishes. */
  refresh: () => Promise<boolean>;
} {
  const { pathname } = useLocation();
  const {
    franchiseId,
    type: explicitType,
    inferTypeFromPath = false,
    enabled = true,
  } = options;

  const spec = useMemo((): GetCountPathResolution | null => {
    if (explicitType !== undefined) {
      return { type: explicitType };
    }
    if (inferTypeFromPath) {
      return resolveGetCountTypeFromPathname(pathname);
    }
    return null;
  }, [explicitType, inferTypeFromPath, pathname]);

  const args = useMemo(() => resolutionToGetCountArgs(spec), [spec]);

  const [countModel, setCountModel] = useState<CountModel | null>(null);
  const [responseCount, setResponseCount] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async (): Promise<boolean> => {
    if (!enabled || !args) {
      setResponseCount(false);
      return false;
    }
    setIsLoading(true);
    try {
      const scope = scopeFromFranchiseId(franchiseId);
      const { responseCount: ok, countModel: record } = await getCount(
        args.type,
        scope
      );
      setResponseCount(ok);
      setCountModel(ok ? record : null);
      return ok;
    } finally {
      setIsLoading(false);
    }
  }, [enabled, args, franchiseId]);

  useEffect(() => {
    if (!enabled || !args) return;
    void refresh();
  }, [enabled, args, franchiseId, refresh]);

  return { countModel, responseCount, isLoading, refresh };
}
