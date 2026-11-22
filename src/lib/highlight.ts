/**
 * Lazy syntax highlighting. Nothing from shiki is imported at the top level: the first call to
 * `highlight()` loads the fine-grained core, the JavaScript regex engine, one theme and four languages
 * with dynamic import(), so the shop's main bundle never contains them.
 */
import type { HighlighterCore } from "shiki/core";

export type CodeLang = "tsx" | "bash" | "json" | "diff";

const THEME = "github-dark";

let loading: Promise<HighlighterCore> | null = null;

function load(): Promise<HighlighterCore> {
  if (!loading) {
    loading = (async () => {
      const [{ createHighlighterCore }, { createJavaScriptRegexEngine }] = await Promise.all([
        import("shiki/core"),
        import("shiki/engine/javascript"),
      ]);
      // languages are added one by one, on first use (see highlight below)
      return createHighlighterCore({
        themes: [import("shiki/themes/github-dark.mjs")],
        langs: [],
        engine: createJavaScriptRegexEngine(),
      });
    })();
    // a failed load can be retried by the next call
    loading.catch(() => { loading = null; });
  }
  return loading;
}

// one dynamic import per language, so a language's grammar is only fetched when a block of that language is shown
const LANGS: Record<CodeLang, () => Promise<unknown>> = {
  tsx: () => import("shiki/langs/tsx.mjs"),
  bash: () => import("shiki/langs/bash.mjs"),
  json: () => import("shiki/langs/json.mjs"),
  diff: () => import("shiki/langs/diff.mjs"),
};
const langLoads = new Map<CodeLang, Promise<void>>();

/** Returns highlighted HTML (a <pre class="shiki"> element). Rejects if the highlighter cannot load. */
export async function highlight(code: string, lang: CodeLang): Promise<string> {
  const h = await load();
  let p = langLoads.get(lang);
  if (!p) {
    p = h.loadLanguage(LANGS[lang]() as Parameters<HighlighterCore["loadLanguage"]>[0]);
    langLoads.set(lang, p);
    p.catch(() => langLoads.delete(lang));
  }
  await p;
  return h.codeToHtml(code, { lang, theme: THEME });
}
