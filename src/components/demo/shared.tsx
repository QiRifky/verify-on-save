import { useEffect, useRef, useState } from "react";
import { copyToClipboard } from "@/lib/clipboard";

export const REPO_URL = "https://github.com/QiRifky/verify-on-save";
export const VIDEO_URL = "https://youtu.be/0ELXQwoe02Y";

/** The three commands from the README "Demo" section. */
export const COMMANDS = `node scripts/demo-bug.js                                        # inject the bug
node scripts/verify.js promo-buy3                               # Kane fails
git checkout src/components/ui/skincare-product-shelf.tsx       # reset`;

export type TabId = "overview" | "bugs" | "how";

/** Secondary button: white with a hairline border. */
export const BTN =
  "rounded-md border border-(--vos-line-strong) bg-(--vos-raised) px-3 py-1.5 text-[13px] text-(--vos-text) transition-colors hover:border-(--vos-muted) disabled:cursor-not-allowed disabled:text-(--vos-muted) disabled:opacity-70";

/** Primary button: black with white text, like the shop's pay button. */
export const BTN_PRIMARY =
  "rounded-md border border-(--vos-primary) bg-(--vos-primary) px-3 py-1.5 text-[13px] font-medium text-(--vos-on-primary) transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50";

/** Button that shows a short confirmation after copying. */
export function CopyButton({ label, done, getText, className }: { label: string; done: string; getText: () => string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return (
    <button
      type="button"
      onClick={async () => {
        if (!(await copyToClipboard(getText()))) return;
        setCopied(true);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setCopied(false), 2000);
      }}
      className={`${BTN} ${className ?? ""}`}
    >
      <span aria-live="polite">{copied ? done : label}</span>
    </button>
  );
}
