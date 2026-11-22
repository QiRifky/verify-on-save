/**
 * "Fix with Kiro + Kane" run view: an animated illustration of one full loop for one planted bug.
 * Kane does not run here. Only bugs with an entry in recorded-runs.json show real recorded fields.
 */
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { BugDef } from "@/lib/bugs";
import { BUG_FIXES, type BugFix } from "@/data/bug-fixes";
import { RECORDED, verdictOf, type Recorded } from "@/data/recorded";
import { CodeBlock, CodeBlockCode, CodeBlockGroup } from "@/components/ui/code-block";
import { BTN } from "@/components/demo/shared";

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
  note: "text-(--vos-dk-muted)",
  cmd: "text-(--vos-dk-text)",
  out: "text-(--vos-dk-soft)",
  fail: "text-(--vos-dk-coral) font-semibold",
  pass: "text-(--vos-dk-green) font-semibold",
  meta: "text-(--vos-dk-muted)",
  del: "bg-(--vos-dk-coral)/15 text-(--vos-dk-coral)",
  add: "bg-(--vos-dk-green)/15 text-(--vos-dk-green)",
};

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
    const color = verdict === "caught" ? "text-(--vos-green)" : verdict === "slipped" ? "text-(--vos-coral)" : "text-(--vos-soft)";
    return (
      <div className="rounded-md border border-(--vos-line) bg-(--vos-subtle) p-3 text-[12px] leading-relaxed">
        <p className="text-(--vos-muted)">Recorded Kane run, from before the fix</p>
        <p className="mt-1">
          <span className={`font-semibold ${color}`}>{verdict ?? rec.status}</span>
          <span className="text-(--vos-muted)"> · flow </span>
          <span className="font-mono text-(--vos-text)">{rec.flow}</span>
          <span className="text-(--vos-muted)"> · status </span>
          <span className="font-mono text-(--vos-text)">{rec.status}</span>
        </p>
        <p className="font-mono break-all text-(--vos-soft)">{rec.reason_code}</p>
        <p className="mt-1 text-(--vos-soft)">{rec.summary}</p>
        <p className="mt-1 font-mono text-(--vos-muted)">{rec.time.slice(0, 16).replace("T", " ")} UTC</p>
      </div>
    );
  }
  return (
    <div className="rounded-md border border-dashed border-(--vos-line-strong) bg-(--vos-subtle) p-3 text-[12px] leading-relaxed">
      <p className="font-semibold text-(--vos-text)">Expected result, no recorded run yet</p>
      <p className="mt-1 text-(--vos-muted)">Flow</p>
      <p className="font-mono text-(--vos-text)">{bug.flow}</p>
      <p className="mt-1 text-(--vos-muted)">What the flow checks</p>
      <p className="text-(--vos-soft)">{fix.checks}</p>
      <p className="mt-1 text-(--vos-muted)">What the shop does wrong</p>
      <p className="text-(--vos-soft)">{fix.symptom}</p>
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
  const lastCodeIdx = events.reduce((m, e, i) => (e.target === "code" ? i : m), -1);
  // typed so far (plain text while typing; highlighted only once the last diff line is complete)
  const diffText = events
    .map((ev, i) => (ev.target === "code" ? shown(i, ev) : null))
    .filter((t): t is string => t !== null)
    .join("\n");
  const diffTyped = at > lastCodeIdx;
  const fullDiff = events.filter((e) => e.target === "code").map((e) => e.text).join("\n");

  return (
    <div className="absolute inset-0 z-40 flex items-stretch justify-center bg-(--vos-text)/40 p-3" onKeyDown={onKeyDown}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex min-h-0 w-full max-w-[760px] flex-col rounded-lg border border-(--vos-line-strong) bg-(--vos-raised) text-(--vos-text)"
      >
        <div className="shrink-0 border-b border-(--vos-line) px-4 py-3">
          <h2 id={titleId} className="text-[15px] font-semibold">
            Fix <span className="font-mono">{bug.id}</span> with Kiro + Kane
          </h2>
          <p className="mt-0.5 text-[12px] text-(--vos-soft)">Animated illustration. Kane does not run in your browser.</p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <p className="sr-only" aria-live="polite">
            {done ? "Finished. The bug is switched off in the shop." : `Step ${currentNode}: ${LABEL[currentNode]}`}
          </p>

          <ol className="flex gap-1 overflow-x-auto pb-2" aria-label="Loop steps">
            {NODES.map((n) => {
              const isCur = currentNode === n.id && !done;
              const seen = visited(n.id);
              let tone = "border-(--vos-line-strong) text-(--vos-muted)";
              if (seen) tone = "border-(--vos-line-strong) text-(--vos-text)";
              if (n.id === "7" && seen) tone = passSeen ? "border-(--vos-green) text-(--vos-green)" : failSeen ? "border-(--vos-coral) text-(--vos-coral)" : tone;
              if (n.id === "8A" && seen) tone = "border-(--vos-green) text-(--vos-green)";
              return (
                <li
                  key={n.id}
                  aria-current={isCur ? "step" : undefined}
                  className={`flex min-w-[64px] flex-1 flex-col items-center gap-1 rounded-md border px-1 py-1.5 text-center ${tone} ${isCur ? "bg-(--vos-subtle) ring-2 ring-(--vos-focus)" : ""}`}
                >
                  <span className="font-mono text-[12px] font-semibold">{n.id}</span>
                  <span className="text-[10.5px] leading-tight">{n.label}</span>
                </li>
              );
            })}
          </ol>

          <div className="mt-3 grid gap-3">
            <section>
              <h3 className="sr-only">Terminal</h3>
              <CodeBlock>
                <div className="flex items-center gap-2 border-b border-(--vos-dk-line) bg-(--vos-dk-head) px-3 py-1.5">
                  <span className="rounded bg-white/[0.1] px-1.5 py-0.5 font-mono text-[11px] text-(--vos-dk-soft)">terminal</span>
                  <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-(--vos-dk-muted)">node scripts/verify.js {bug.flow}</span>
                </div>
                <pre
                  ref={termRef}
                  tabIndex={0}
                  aria-label="Terminal output"
                  className="m-0 max-h-48 min-h-24 overflow-y-auto p-3 font-mono text-[12px] leading-relaxed text-(--vos-dk-text)"
                >
                  {lines("term")}
                </pre>
              </CodeBlock>
            </section>
            <section>
              <h3 className="mb-1 text-[12px] font-semibold text-(--vos-muted)">Illustrative diff</h3>
              <CodeBlock>
                <CodeBlockGroup language="diff" filename={fix.file} code={fullDiff} />
                {codeStarted ? (
                  <CodeBlockCode code={diffText} language="diff" plain={!diffTyped} className="min-h-16" />
                ) : (
                  <p className="p-3 font-mono text-[12px] text-(--vos-dk-muted)"># The change appears in step 8B.</p>
                )}
              </CodeBlock>
            </section>
            {showReport && <ReportCard bug={bug} fix={fix} rec={rec} />}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-(--vos-line) px-4 py-3">
          {done ? (
            <>
              <p className="mr-auto text-[12px] text-(--vos-green)">Fixed. The bug is switched off in the shop.</p>
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
