import { BUGS, useBugs } from "@/lib/bugs";
import { RECORDED_COUNT } from "@/data/recorded";
import { CodeBlock, CodeBlockCode, CodeBlockGroup } from "@/components/ui/code-block";
import { COMMANDS, REPO_URL, VIDEO_URL, type TabId } from "@/components/demo/shared";
import { LoopDiagram } from "@/components/demo/LoopDiagram";

const CARDS: [string, string, string][] = [
  ["1", "Plant", "Switch on a bug in the shop and watch it change."],
  ["2", "Check", "Kane runs a plain-English flow in a real Chrome."],
  ["3", "Fix", "Kiro reads the report, fixes the app, and runs it again."],
];

export function OverviewTab({ onGo }: { onGo: (tab: TabId) => void }) {
  const bugs = useBugs();
  const flows = new Set(BUGS.map((b) => b.flow)).size;
  const link = "rounded text-(--vos-text) underline underline-offset-4";

  return (
    <div>
      <p className="text-[11px] tracking-[0.14em] text-(--vos-muted) uppercase">KaneCLI Online Hackathon, built with Kiro</p>
      <h1 className="mt-3 text-[30px] leading-[1.1] font-semibold tracking-[-0.02em]">
        Plant a bug. <span className="text-(--vos-coral)">Watch the loop close.</span>
      </h1>
      <p className="mt-3 max-w-[56ch] text-[15px] leading-relaxed text-(--vos-soft)">
        An AI agent changes code, Kane CLI checks it in a real browser, and the agent reads the report and fixes what failed.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => onGo("bugs")}
          className="rounded-md bg-(--vos-primary) px-4 py-2 text-[14px] font-semibold text-(--vos-on-primary) transition-opacity hover:opacity-85"
        >
          Plant a bug
        </button>
        <button
          type="button"
          onClick={() => onGo("how")}
          className="rounded-md border border-(--vos-line-strong) px-4 py-2 text-[14px] text-(--vos-text) transition-colors hover:border-(--vos-muted)"
        >
          How it works
        </button>
        <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className={`text-[14px] ${link}`}>GitHub repo</a>
        <a href={VIDEO_URL} target="_blank" rel="noopener noreferrer" className={`text-[14px] ${link}`}>Demo video</a>
      </div>

      <LoopDiagram onGo={onGo} />

      <ol className="mt-7 grid gap-3 sm:grid-cols-3">
        {CARDS.map(([n, title, text]) => (
          <li key={n} className="rounded-lg border border-(--vos-line-strong) bg-(--vos-subtle) p-3.5">
            <span className="font-mono text-[12px] text-(--vos-muted)">{n}</span>
            <h2 className="mt-1 text-[15px] font-semibold">{title}</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-(--vos-soft)">{text}</p>
          </li>
        ))}
      </ol>

      <dl className="mt-5 grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-(--vos-line-strong) bg-(--vos-subtle) p-3">
          <dt className="text-[12px] text-(--vos-muted)">Bugs planted</dt>
          <dd className={`mt-1 font-mono text-[22px] font-semibold ${bugs.active.length ? "text-(--vos-coral)" : ""}`} aria-live="polite">
            {bugs.active.length}/{BUGS.length}
          </dd>
        </div>
        <div className="rounded-lg border border-(--vos-line-strong) bg-(--vos-subtle) p-3">
          <dt className="text-[12px] text-(--vos-muted)">Real Kane runs recorded</dt>
          <dd className="mt-1 font-mono text-[22px] font-semibold text-(--vos-green)">{RECORDED_COUNT}/{BUGS.length}</dd>
        </div>
        <div className="rounded-lg border border-(--vos-line-strong) bg-(--vos-subtle) p-3">
          <dt className="text-[12px] text-(--vos-muted)">Plain-English flows</dt>
          <dd className="mt-1 font-mono text-[22px] font-semibold">{flows}</dd>
        </div>
      </dl>

      <h2 className="mt-7 text-[15px] font-semibold">Try it on your machine</h2>
      <CodeBlock className="mt-2">
        <CodeBlockGroup language="bash" filename="terminal" code={COMMANDS} />
        <CodeBlockCode code={COMMANDS} language="bash" />
      </CodeBlock>

      <p className="mt-5 text-[12px] leading-relaxed text-(--vos-muted)">
        Toggles change this live app. Kane runs on my machine, not in your browser; verdicts shown here are recorded from real runs.
      </p>
    </div>
  );
}
