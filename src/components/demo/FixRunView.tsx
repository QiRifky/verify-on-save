/**
 * "Fix with Kiro + Kane" run view: an animated illustration of one full loop for one planted bug.
 * Kane does not run here. Only bugs with an entry in recorded-runs.json show real recorded fields.
 */
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { BugDef } from "@/lib/bugs";
import { BUG_FIXES, type BugFix } from "@/data/bug-fixes";
import { RECORDED, verdictOf, type Recorded } from "@/data/recorded";

type NodeId = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8B" | "8A";
type Kind = "note" | "cmd" | "out" | "fail" | "pass" | "meta" | "del" | "add";
type Ev = { node: NodeId; target: "term" | "code"; kind: Kind; text: string };

const NODES: { id: NodeId; label: string }[] = [
  { id: "1", label: "Edit the code" },
  { id: "2", label: "Run verify.js" },
  { id: "3", label: "Read the flows" },
  { id: "4", label: "Drive Chrome" },
  { id: "5", label: "App responds" },
  { id: "6", label: "Write report" },
  { id: "7", label: "Verdict" },
  { id: "8B", label: "Fix the app" },
  { id: "8A", label: "Report done" },
];
const LABEL = Object.fromEntries(NODES.map((n) => [n.id, n.label])) as Record<NodeId, string>;

const KIND_CLASS: Record<Kind, string> = {
  note: "text-[#8b919b]",
  cmd: "text-[#e8eaed]",
  out: "text-[#c5cad2]",
  fail: "text-[#ff6b5b] font-semibold",
  pass: "text-[#2ecc71] font-semibold",
  meta: "text-[#8b919b]",
  del: "bg-[#ff6b5b]/15 text-[#ff6b5b]",
  add: "bg-[#2ecc71]/15 text-[#2ecc71]",
};

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8ecbff]";
const BTN = `rounded-md border border-[#2f333b] bg-[#14161a] px-3 py-1.5 text-[13px] text-[#e8eaed] hover:border-[#5a606b] ${FOCUS}`;

/** The whole loop as a flat list of lines to type, in order. */
function buildEvents(flow: string, fix: BugFix, recorded: boolean): Ev[] {
  const ev: Ev[] = [];
  const term = (node: NodeId, kind: Kind, text: string) => ev.push({ node, target: "term", kind, text });
  const code = (kind: Kind, text: string) => ev.push({ node: "8B", target: "code", kind, text });
  term("1", "note", "# 1  Kiro edits the code");
  term("2", "cmd", `$ node scripts/verify.js ${flow}`);
  term("2", "out", `Running flow: ${flow} ...`);
  term("3", "note", `# 3  Kane reads the flow: ${fix.checks}`);
  term("4", "note", "# 4  Kane drives a real Chrome");
  term("5", "note", `# 5  The app responds. ${fix.symptom}`);
  term("6", "note", "# 6  Kane writes the report");
  term("7", "fail", `[FAILED] ${flow}${recorded ? "" : "  (expected, not recorded)"}`);
  term("8B", "note", "# 8B  Kiro fixes the app");
  code("meta", `--- ${fix.file}`);
  code("del", `- ${fix.before}`);
  code("add", `+ ${fix.after}`);
  term("2", "cmd", `$ node scripts/verify.js ${flow}`);
  term("2", "out", `Running flow: ${flow} ...`);
  term("7", "pass", `[PASSED] ${flow}  (illustrated, not recorded)`);
  term("8A", "note", "# 8A  Kiro reports done");
  return ev;
}

function ReportCard({ bug, fix, rec }: { bug: BugDef; fix: BugFix; rec?: Recorded }) {
  if (rec) {
    const verdict = verdictOf(rec);
    const color = verdict === "caught" ? "text-[#2ecc71]" : verdict === "slipped" ? "text-[#ff6b5b]" : "text-[#c5cad2]";
    return (
      <div className="rounded-md border border-[#24272d] bg-[#0a0b0d] p-3 text-[12px] leading-relaxed">
        <p className="text-[#8b919b]">Recorded Kane run, from before the fix</p>
        <p className="mt-1">
          <span className={`font-semibold ${color}`}>{verdict ?? rec.status}</span>
          <span className="text-[#8b919b]"> · flow </span>
          <span className="font-mono text-[#e8eaed]">{rec.flow}</span>
          <span className="text-[#8b919b]"> · status </span>
          <span className="font-mono text-[#e8eaed]">{rec.status}</span>
        </p>
        <p className="font-mono break-all text-[#c5cad2]">{rec.reason_code}</p>
        <p className="mt-1 text-[#c5cad2]">{rec.summary}</p>
        <p className="mt-1 font-mono text-[#8b919b]">{rec.time.slice(0, 16).replace("T", " ")} UTC</p>
      </div>
    );
  }
  return (
    <div className="rounded-md border border-dashed border-[#3a3f48] bg-[#0a0b0d] p-3 text-[12px] leading-relaxed">
      <p className="font-semibold text-[#e8eaed]">Expected result, no recorded run yet</p>
      <p className="mt-1 text-[#8b919b]">Flow</p>
      <p className="font-mono text-[#e8eaed]">{bug.flow}</p>
      <p className="mt-1 text-[#8b919b]">What the flow checks</p>
      <p className="text-[#c5cad2]">{fix.checks}</p>
      <p className="mt-1 text-[#8b919b]">What the shop does wrong</p>
      <p className="text-[#c5cad2]">{fix.symptom}</p>
    </div>
  );
}

export function FixRunView({ bug, onFixed, onClose }: { bug: BugDef; onFixed: () => void; onClose: () => void }) {
  const titleId = useId();
  const fix = BUG_FIXES[bug.id];
  const rec = RECORDED[bug.id];
  const events = useMemo(() => buildEvents(bug.flow, fix, Boolean(rec)), [bug.flow, fix, rec]);
  const [reduce] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [pos, setPos] = useState(0);
  const [chars, setChars] = useState(0);
  const [run, setRun] = useState(0); // bumps on Replay
  const done = pos >= events.length;

  const dialogRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<HTMLPreElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onFixedRef = useRef(onFixed);
  onFixedRef.current = onFixed;

  // the timeline: one timer at a time, cleared on every change and on unmount
  useEffect(() => {
    if (done) return;
    const cur = events[pos];
    const typing = !reduce && chars < cur.text.length;
    const sameNode = events[pos + 1]?.node === cur.node;
    const delay = typing ? 16 : reduce ? 650 : sameNode ? 260 : 650;
    const t = window.setTimeout(() => {
      if (typing) setChars((c) => Math.min(cur.text.length, c + 2));
      else {
        setPos((p) => p + 1);
        setChars(0);
      }
    }, delay);
    return () => window.clearTimeout(t);
  }, [pos, chars, done, reduce, events, run]);

  const currentNode: NodeId = done ? "8A" : events[pos].node;
  const reached8A = done || currentNode === "8A";

  // at 8A the bug is really switched off in the live shop
  const fired = useRef(false);
  useEffect(() => {
    if (reached8A && !fired.current) {
      fired.current = true;
      onFixedRef.current();
    }
  }, [reached8A]);

  const firstIdx = useMemo(() => {
    const m = new Map<NodeId, number>();
    events.forEach((e, i) => { if (!m.has(e.node)) m.set(e.node, i); });
    return m;
  }, [events]);
  const at = done ? events.length : pos;
  const visited = (n: NodeId) => done || (firstIdx.get(n) ?? Infinity) <= pos;
  const failSeen = done || (firstIdx.get("7") ?? Infinity) <= pos;
  const passIdx = events.findIndex((e) => e.kind === "pass");
  const passSeen = done || (passIdx >= 0 && passIdx <= pos);
  const showReport = visited("6");

  // keep the newest terminal line in view
  useEffect(() => {
    const el = termRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [pos, chars]);

  // focus: Skip while running, Close when finished
  useEffect(() => {
    if (done) closeRef.current?.focus();
    else skipRef.current?.focus();
  }, [done, run]);

  const skip = () => { setPos(events.length); setChars(0); };
  const replay = () => { fired.current = false; setPos(0); setChars(0); setRun((r) => r + 1); };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation(); // do not let the shop's own Escape handler see it
      onClose();
      return;
    }
    if (e.key !== "Tab") return;
    const items = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>("button:not([disabled])") ?? []);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || !dialogRef.current?.contains(active))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (active === last || !dialogRef.current?.contains(active))) { e.preventDefault(); first.focus(); }
  };

  const shown = (i: number, ev: Ev) => (i < at ? ev.text : i === at ? (reduce ? ev.text : ev.text.slice(0, chars)) : null);
  const lines = (target: "term" | "code") =>
    events.map((ev, i) => {
      if (ev.target !== target) return null;
      const text = shown(i, ev);
      if (text === null) return null;
      return <div key={i} className={`whitespace-pre-wrap break-words ${KIND_CLASS[ev.kind]}`}>{text || "\u00a0"}</div>;
    });
  const codeStarted = events.findIndex((e) => e.target === "code") <= at;

  return (
    <div className="absolute inset-0 z-40 flex items-stretch justify-center bg-[#0a0b0d]/85 p-3" onKeyDown={onKeyDown}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex min-h-0 w-full max-w-[760px] flex-col rounded-lg border border-[#2f333b] bg-[#0f1114] text-[#e8eaed]"
      >
        <div className="shrink-0 border-b border-[#24272d] px-4 py-3">
          <h2 id={titleId} className="text-[15px] font-semibold">
            Fix <span className="font-mono">{bug.id}</span> with Kiro + Kane
          </h2>
          <p className="mt-0.5 text-[12px] text-[#c5cad2]">Animated illustration. Kane does not run in your browser.</p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <p className="sr-only" aria-live="polite">
            {done ? "Finished. The bug is switched off in the shop." : `Step ${currentNode}: ${LABEL[currentNode]}`}
          </p>

          <ol className="flex gap-1 overflow-x-auto pb-2" aria-label="Loop steps">
            {NODES.map((n) => {
              const isCur = currentNode === n.id && !done;
              const seen = visited(n.id);
              let tone = "border-[#2f333b] text-[#6b717b]";
              if (seen) tone = "border-[#5a606b] text-[#e8eaed]";
              if (n.id === "7" && seen) tone = passSeen ? "border-[#2ecc71] text-[#2ecc71]" : failSeen ? "border-[#ff6b5b] text-[#ff6b5b]" : tone;
              if (n.id === "8A" && seen) tone = "border-[#2ecc71] text-[#2ecc71]";
              return (
                <li
                  key={n.id}
                  aria-current={isCur ? "step" : undefined}
                  className={`flex min-w-[64px] flex-1 flex-col items-center gap-1 rounded-md border px-1 py-1.5 text-center ${tone} ${isCur ? "bg-[#1a2230] ring-2 ring-[#8ecbff]" : ""}`}
                >
                  <span className="font-mono text-[12px] font-semibold">{n.id}</span>
                  <span className="text-[10.5px] leading-tight">{n.label}</span>
                </li>
              );
            })}
          </ol>

          <div className="mt-3 grid gap-3">
            <section>
              <h3 className="mb-1 text-[12px] font-semibold text-[#8b919b]">Terminal</h3>
              <pre
                ref={termRef}
                tabIndex={0}
                aria-label="Terminal output"
                className={`max-h-48 min-h-24 overflow-y-auto rounded-md border border-[#24272d] bg-[#0a0b0d] p-2.5 font-mono text-[12px] leading-relaxed ${FOCUS}`}
              >
                {lines("term")}
              </pre>
            </section>
            <section>
              <h3 className="mb-1 text-[12px] font-semibold text-[#8b919b]">Illustrative diff</h3>
              <pre
                tabIndex={0}
                aria-label="Illustrative diff"
                className={`min-h-16 overflow-x-auto rounded-md border border-[#24272d] bg-[#0a0b0d] p-2.5 font-mono text-[12px] leading-relaxed ${FOCUS}`}
              >
                {codeStarted ? lines("code") : <span className="text-[#6b717b]"># The change appears in step 8B.</span>}
              </pre>
            </section>
            {showReport && <ReportCard bug={bug} fix={fix} rec={rec} />}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-[#24272d] px-4 py-3">
          {done ? (
            <>
              <p className="mr-auto text-[12px] text-[#2ecc71]">Fixed. The bug is switched off in the shop.</p>
              <button type="button" onClick={replay} className={BTN}>Replay</button>
              <button ref={closeRef} type="button" onClick={onClose} className={BTN}>Close</button>
            </>
          ) : (
            <button ref={skipRef} type="button" onClick={skip} className={BTN}>Skip</button>
          )}
        </div>
      </div>
    </div>
  );
}
