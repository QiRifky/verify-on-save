import { CodeBlock, CodeBlockCode, CodeBlockGroup } from "@/components/ui/code-block";
import { COMMANDS, REPO_URL, VIDEO_URL } from "@/components/demo/shared";

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

export function HowTab() {
  const link = "rounded text-(--vos-text) underline underline-offset-4";
  return (
    <div>
      <div className="rounded-xl border border-(--vos-line-strong) bg-white p-2">
        <img
          src="/verify-on-save-swimlane.png"
          alt="Swimlane diagram of the loop between Kiro, the check script, Kane, Chrome and the app"
          className="block w-full rounded-lg"
        />
      </div>
      <ol className="mt-5 grid gap-2.5">
        {STEPS.map(([n, text]) => (
          <li key={n} className="flex gap-3 text-[14px] leading-relaxed text-(--vos-soft)">
            <span className="w-7 shrink-0 font-mono text-[13px] font-semibold text-(--vos-text)">{n}</span>
            <span>{text}</span>
          </li>
        ))}
      </ol>
      <h2 className="mt-7 text-[15px] font-semibold">Try it yourself</h2>
      <p className="mt-1.5 text-[14px] leading-relaxed text-(--vos-soft)">
        Clone the repo, start the app, then run these three commands. The first one plants a one-character bug. The second lets Kane catch it. The third puts the file back.
      </p>
      <CodeBlock className="mt-3">
        <CodeBlockGroup language="bash" filename="terminal" code={COMMANDS} />
        <CodeBlockCode code={COMMANDS} language="bash" />
      </CodeBlock>
      <p className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[14px]">
        <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className={link}>GitHub repo</a>
        <a href={VIDEO_URL} target="_blank" rel="noopener noreferrer" className={link}>Demo video</a>
      </p>
    </div>
  );
}
