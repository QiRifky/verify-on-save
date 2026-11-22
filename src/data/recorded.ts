import recordedRaw from "@/data/recorded-runs.json";
import type { BugId } from "@/lib/bugs";

/** Fields copied from a real Kane CLI run (see recorded-runs.json). Only bugs with a real run appear here. */
export type Recorded = { flow: string; status: string; reason_code: string; summary: string; time: string };

export const RECORDED = recordedRaw as Partial<Record<BugId, Recorded>>;

/** How many bugs have a real recorded run. Computed from the keys of recorded-runs.json, never hard-coded. */
export const RECORDED_COUNT = Object.keys(RECORDED).length;

/** With the bug planted, a failing flow means the check caught it; a passing flow means it slipped. */
export function verdictOf(r: Recorded): "caught" | "slipped" | null {
  return r.status === "failed" ? "caught" : r.status === "passed" ? "slipped" : null;
}
