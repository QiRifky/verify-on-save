/**
 * The Verify-on-Save loop as plain data: nodes, edges and three illustrated scenarios.
 * Everything here is an illustration of the process. It holds no timestamps, reason codes, amounts or verdicts
 * that look like real results.
 */
export type NodeId = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8B" | "8A" | "other";
export type Lane = "kiro" | "kane" | "app";
export type IconKey = "edit" | "terminal" | "read" | "browser" | "app" | "report" | "decision" | "fix" | "done" | "other";
export type Port = "t" | "b" | "l" | "r";
export type EdgeKind = "flow" | "pass" | "bug" | "retry" | "other";

export type LoopNode = {
  id: NodeId;
  /** Short step label shown on the card ("1", "8B", ...). */
  step: string;
  title: string;
  detail: string;
  lane: Lane;
  icon: IconKey;
  /** Top-left corner on the design canvas. */
  x: number;
  y: number;
  decision?: boolean;
  dashed?: boolean;
};

export type LoopEdge = {
  id: string;
  from: NodeId;
  to: NodeId;
  fromPort: Port;
  toPort: Port;
  kind: EdgeKind;
  label?: string;
  /** Nudge the label away from the middle of the curve. */
  labelDx?: number;
  labelDy?: number;
  dashed?: boolean;
};

/** Design canvas. The diagram scales this whole box to the width of its container. */
export const CANVAS = { width: 960, height: 510, nodeW: 176, nodeH: 104 } as const;

/** Horizontal bands behind the nodes, like the project's swimlane diagram. */
export const LANE_BANDS: { lane: Lane; label: string; y: number; h: number }[] = [
  { lane: "kiro", label: "Kiro", y: 0, h: 242 },
  { lane: "kane", label: "Kane CLI", y: 242, h: 120 },
  { lane: "app", label: "Skasman shop app", y: 362, h: 148 },
];

export const LANE_LABEL: Record<Lane, string> = { kiro: "Kiro", kane: "Kane CLI", app: "Skasman shop app" };

// columns and rows of the design canvas
const C = [36, 285, 535, 784];
const ROW_A = 6;
const ROW_B = 134;
const ROW_K = 252;
const ROW_P = 390;

export const NODES: LoopNode[] = [
  { id: "1", step: "1", title: "Edit the code", detail: "Kiro changes files in the app's source.", lane: "kiro", icon: "edit", x: C[0], y: ROW_A },
  { id: "2", step: "2", title: "Run verify.js", detail: "Kiro runs the check script. It holds ten plain-English flows.", lane: "kiro", icon: "terminal", x: C[0], y: ROW_B },
  { id: "3", step: "3", title: "Read the flows", detail: "Kane reads each flow written in plain English.", lane: "kane", icon: "read", x: C[0], y: ROW_K },
  { id: "4", step: "4", title: "Drive Chrome", detail: "Kane clicks through the app in a real browser.", lane: "kane", icon: "browser", x: C[1], y: ROW_K },
  { id: "5", step: "5", title: "App responds", detail: "The shop answers the way it would for a customer.", lane: "app", icon: "app", x: C[1], y: ROW_P },
  { id: "6", step: "6", title: "Write report", detail: "Kane writes last-result.json with the verdict, a reason code and a summary.", lane: "kane", icon: "report", x: C[2], y: ROW_K },
  { id: "7", step: "7", title: "Verdict?", detail: "Kiro reads the report: passed, an app bug, or something else.", lane: "kiro", icon: "decision", x: C[2], y: ROW_B, decision: true },
  { id: "8B", step: "8B", title: "Fix the app", detail: "Only an app bug lets Kiro change code. It fixes the cause and runs again, at most 5 cycles.", lane: "kiro", icon: "fix", x: C[1], y: ROW_A },
  { id: "8A", step: "8A", title: "Report done", detail: "Passed. Kiro reports what Kane found, what changed and the final result.", lane: "kiro", icon: "done", x: C[2], y: ROW_A },
  { id: "other", step: "?", title: "Other results", detail: "Suspect: re-run once. Error: tell the user, no code change.", lane: "kane", icon: "other", x: C[3], y: ROW_K, dashed: true },
];

export const EDGES: LoopEdge[] = [
  { id: "e12", from: "1", to: "2", fromPort: "b", toPort: "t", kind: "flow" },
  { id: "e23", from: "2", to: "3", fromPort: "b", toPort: "t", kind: "flow" },
  { id: "e34", from: "3", to: "4", fromPort: "r", toPort: "l", kind: "flow" },
  { id: "e45", from: "4", to: "5", fromPort: "b", toPort: "t", kind: "flow" },
  { id: "e56", from: "5", to: "6", fromPort: "r", toPort: "l", kind: "flow" },
  { id: "e67", from: "6", to: "7", fromPort: "t", toPort: "b", kind: "flow" },
  { id: "e78A", from: "7", to: "8A", fromPort: "t", toPort: "b", kind: "pass", label: "passed", labelDx: 38 },
  { id: "e78B", from: "7", to: "8B", fromPort: "l", toPort: "r", kind: "bug", label: "app bug" },
  { id: "e8B2", from: "8B", to: "2", fromPort: "l", toPort: "r", kind: "retry", label: "repeat, max 5 cycles", dashed: true },
  { id: "e7o", from: "7", to: "other", fromPort: "r", toPort: "l", kind: "other", label: "suspect or error", dashed: true },
];

/** One step of an animation: light up a node, and the edge that leads into it (null when none does). */
export type Beat = { node: NodeId; edge: string | null; note?: string };
export type Scenario = { id: string; label: string; beats: Beat[] };

const b = (node: NodeId, edge: string | null = null, note?: string): Beat => ({ node, edge, note });

export const SCENARIOS: Scenario[] = [
  {
    id: "bug",
    label: "Bug found",
    beats: [
      b("1"),
      b("2", "e12"),
      b("3", "e23"),
      b("4", "e34"),
      b("5", "e45"),
      b("6", "e56"),
      b("7", "e67", "In this illustration, the report says the shop has a bug."),
      b("8B", "e78B", "Kiro fixes the cause, then runs the check again."),
      b("2", "e8B2", "Second pass."),
      b("3", "e23"),
      b("4", "e34"),
      b("5", "e45"),
      b("6", "e56"),
      b("7", "e67", "In this illustration, the second run passes."),
      b("8A", "e78A", "The loop is closed."),
    ],
  },
  {
    id: "clear",
    label: "All clear",
    beats: [
      b("1"),
      b("2", "e12"),
      b("3", "e23"),
      b("4", "e34"),
      b("5", "e45"),
      b("6", "e56"),
      b("7", "e67", "In this illustration, everything passes."),
      b("8A", "e78A", "No fix was needed."),
    ],
  },
  {
    id: "error",
    label: "Kane error",
    beats: [
      b("1"),
      b("2", "e12"),
      b("3", "e23"),
      b("4", "e34", "In this illustration, Kane cannot finish the run, so the shop is never checked."),
      b("6", null, "Kane still writes a report, and the report says error."),
      b("7", "e67", "The verdict is neither passed nor an app bug."),
      b("other", "e7o", "No code change. Kiro tells the user."),
    ],
  },
];
