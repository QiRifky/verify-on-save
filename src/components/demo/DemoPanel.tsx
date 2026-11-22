/**
 * Dark scoreboard panel for the split-screen demo.
 * Wording avoids the exact strings that scripts/verify.js asks Kane to look for in the shop.
 */
import { useRef, useState, type KeyboardEvent } from "react";
import { BUGS, useBugs, type BugId } from "@/lib/bugs";
import recordedRaw from "@/data/recorded-runs.json";

type Recorded = { flow: string; status: string; reason_code: string; summary: string; time: string };
const RECORDED = recordedRaw as Partial<Record<BugId, Recorded>>;

const REPO_URL = "https://github.com/QiRifky/verify-on-save";
const VIDEO_URL = "https://youtu.be/0ELXQwoe02Y";

const CORAL = "text-[#ff6b5b]";
const GREEN = "text-[#2ecc71]";
const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8ecbff]";

const COMMANDS = `node scripts/demo-bug.js                                        # inject the bug
node scripts/verify.js promo-buy3                               # Kane fails
git checkout src/components/ui/skincare-product-shelf.tsx       # reset`;

const STEPS: [string, string][] = [
  ["1", "Kiro edits the code."],
  ["2", "It runs the check script, node scripts/verify.js."],
  ["3", "Kane reads the flows: short checks written in plain English."],
  ["4", "Kane drives a real Chrome and uses the shop like a customer."],
  ["5", "The app responds to every click and every typed code."],
  ["6", "Kane writes a report with a verdict and a short reason."],
  ["7", "The verdict decides what happens next. A real app bug goes back to Kiro. A pass means the work is done."],
  ["8A", "Passed: Kiro reports the work as done."],
  ["8B", "Failed with an app bug: Kiro fixes the code and runs the check again, up to 5 cycles."],
];

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch { /* ignore */ }
    document.body.removeChild(ta);
    return ok;
  }
}

/** Button that shows a short confirmation after copying. */
function CopyButton({ label, done, getText, className }: { label: string; done: string; getText: () => string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(0);
  return (
    <button
      type="button"
      onClick={async () => {
        if (!(await copyToClipboard(getText()))) return;
        setCopied(true);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setCopied(false), 1800);
      }}
      className={`rounded-md border border-[#2f333b] bg-[#14161a] px-3 py-1.5 text-[13px] text-[#e8eaed] hover:border-[#5a606b] ${FOCUS} ${className ?? ""}`}
    >
      <span aria-live="polite">{copied ? done : label}</span>
    </button>
  );
}

function RecordedLine({ id }: { id: BugId }) {
  const r = RECORDED[id];
  if (!r) return <p className="mt-2 text-[12px] text-[#8b919b]">No recorded run yet</p>;
  // With the bug planted, a failing flow means the check caught it; a passing flow means it slipped.
  const verdict = r.status === "failed" ? "caught" : r.status === "passed" ? "slipped" : null;
  const color = verdict === "caught" ? GREEN : verdict === "slipped" ? CORAL : "text-[#c5cad2]";
  return (
    <div className="mt-2 rounded-md border border-[#24272d] bg-[#0f1114] p-2.5 text-[12px] leading-relaxed">
      <p className="text-[#8b919b]">Recorded Kane run</p>
      <p className="mt-0.5">
        <span className={`font-semibold ${color}`}>{verdict ?? r.status}</span>
        <span className="text-[#8b919b]"> · flow </span>
        <span className="font-mono text-[#e8eaed]">{r.flow}</span>
        <span className="text-[#8b919b]"> · status </span>
        <span className="font-mono text-[#e8eaed]">{r.status}</span>
      </p>
      <p className="font-mono text-[#c5cad2] break-all">{r.reason_code}</p>
      <p className="mt-1 text-[#c5cad2]">{r.summary}</p>
      <p className="mt-1 font-mono text-[#8b919b]">{r.time.slice(0, 16).replace("T", " ")} UTC</p>
    </div>
  );
}

function PlantTab() {
  const bugs = useBugs();
  return (
    <div>
      <p className="rounded-md border border-[#24272d] bg-[#0f1114] p-3 text-[13px] leading-relaxed text-[#c5cad2]">
        Toggles change this live app. Verdicts are recorded from real Kane CLI runs on my machine; Kane itself does not run in your browser.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={bugs.reset}
          disabled={bugs.active.length === 0}
          className={`rounded-md border border-[#2f333b] bg-[#14161a] px-3 py-1.5 text-[13px] text-[#e8eaed] hover:border-[#5a606b] disabled:cursor-not-allowed disabled:text-[#6b717b] ${FOCUS}`}
        >
          Reset all
        </button>
        <CopyButton label="Copy link" done="Link copied" getText={bugs.link} />
      </div>
      <ul className="mt-4 grid gap-3">
        {BUGS.map((b) => {
          const on = bugs.on(b.id);
          const labelId = `bug-${b.id}-label`;
          return (
            <li
              key={b.id}
              className={`rounded-lg border p-3.5 ${on ? "border-[#ff6b5b]/60 bg-[#1a1213]" : "border-[#24272d] bg-[#12141a]"}`}
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className={`font-mono text-[13px] font-semibold ${on ? CORAL : "text-[#e8eaed]"}`}>{b.id}</span>
                    <span id={labelId} className="text-[14px] leading-snug text-[#e8eaed]">{b.title}</span>
                  </div>
                  <p className="mt-2">
                    <span className="inline-block rounded-full border border-[#2ecc71]/40 bg-[#2ecc71]/10 px-2.5 py-0.5 text-[12px] text-[#2ecc71]">
                      caught by <span className="font-mono">{b.flow}</span>
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-labelledby={labelId}
                  onClick={() => bugs.toggle(b.id)}
                  className={`relative mt-0.5 h-7 w-12 shrink-0 rounded-full border transition-colors ${FOCUS} ${on ? "border-[#ff6b5b] bg-[#ff6b5b]" : "border-[#3a3f48] bg-[#1d2026]"}`}
                >
                  <span aria-hidden className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white transition-transform ${on ? "translate-x-5" : ""}`} />
                  <span className="sr-only">{on ? "planted" : "off"}</span>
                </button>
              </div>
              <RecordedLine id={b.id} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function HowTab() {
  return (
    <div>
      <img
        src="/verify-on-save-swimlane.png"
        alt="Swimlane diagram of the loop between Kiro, the check script, Kane, Chrome and the app"
        className="w-full rounded-lg border border-[#24272d] bg-white"
      />
      <ol className="mt-5 grid gap-2.5">
        {STEPS.map(([n, text]) => (
          <li key={n} className="flex gap-3 text-[14px] leading-relaxed text-[#d7dbe1]">
            <span className="w-7 shrink-0 font-mono text-[13px] font-semibold text-[#8ecbff]">{n}</span>
            <span>{text}</span>
          </li>
        ))}
      </ol>
      <h2 className="mt-7 text-[15px] font-semibold text-[#e8eaed]">Try it yourself</h2>
      <p className="mt-1.5 text-[14px] leading-relaxed text-[#c5cad2]">
        Clone the repo, start the app, then run these three commands. The first one plants a one-character bug. The second lets Kane catch it. The third puts the file back.
      </p>
      <div className="mt-3 rounded-lg border border-[#24272d] bg-[#0f1114]">
        <pre className="overflow-x-auto p-3 font-mono text-[12px] leading-relaxed text-[#e8eaed]"><code>{COMMANDS}</code></pre>
        <div className="border-t border-[#24272d] p-2">
          <CopyButton label="Copy commands" done="Commands copied" getText={() => COMMANDS} />
        </div>
      </div>
      <p className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[14px]">
        <a href={REPO_URL} target="_blank" rel="noreferrer" className={`rounded text-[#8ecbff] underline underline-offset-4 ${FOCUS}`}>GitHub repo</a>
        <a href={VIDEO_URL} target="_blank" rel="noreferrer" className={`rounded text-[#8ecbff] underline underline-offset-4 ${FOCUS}`}>Demo video</a>
      </p>
    </div>
  );
}

const TABS = [
  { id: "plant", label: "Plant a bug" },
  { id: "how", label: "How it works" },
] as const;

export function DemoPanel() {
  const bugs = useBugs();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("plant");
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const i = TABS.findIndex((t) => t.id === tab);
    const next = e.key === "Home" ? 0 : e.key === "End" ? TABS.length - 1 : (i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length;
    setTab(TABS[next].id);
    refs.current[TABS[next].id]?.focus();
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#0a0b0d] text-[#e8eaed]">
      <header className="shrink-0 border-b border-[#24272d] px-5 pt-5 pb-0">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-[18px] leading-snug font-semibold tracking-[-0.01em]">Plant a bug, then see which check catches it</h1>
          <p className="shrink-0 rounded-md border border-[#2f333b] bg-[#14161a] px-2.5 py-1 text-[12px] whitespace-nowrap" aria-live="polite">
            Bugs planted <span className={`font-mono font-semibold ${bugs.active.length ? CORAL : "text-[#e8eaed]"}`}>{bugs.active.length}/{BUGS.length}</span>
          </p>
        </div>
        <div role="tablist" aria-label="Demo panel" className="mt-4 flex gap-1">
          {TABS.map((t) => {
            const sel = tab === t.id;
            return (
              <button
                key={t.id}
                ref={(el) => { refs.current[t.id] = el; }}
                type="button"
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={sel}
                aria-controls={`tabpanel-${t.id}`}
                tabIndex={sel ? 0 : -1}
                onClick={() => setTab(t.id)}
                onKeyDown={onKey}
                className={`-mb-px rounded-t-md border border-b-0 px-4 py-2 text-[14px] ${FOCUS} ${sel ? "border-[#24272d] bg-[#0a0b0d] text-[#e8eaed]" : "border-transparent text-[#9aa0a8] hover:text-[#e8eaed]"}`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </header>
      <div
        role="tabpanel"
        id={`tabpanel-${tab}`}
        aria-labelledby={`tab-${tab}`}
        tabIndex={0}
        className={`min-h-0 flex-1 overflow-y-auto px-5 py-5 ${FOCUS}`}
      >
        {tab === "plant" ? <PlantTab /> : <HowTab />}
      </div>
    </div>
  );
}
