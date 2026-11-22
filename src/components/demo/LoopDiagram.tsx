/**
 * "The loop, in motion": an animated illustration of the Verify-on-Save loop, built with plain SVG and HTML.
 * It draws a fixed design canvas (see src/data/loop-graph.ts) scaled to the container, or a vertical list on narrow widths.
 * Nodes are real buttons. Nothing here is a real result, and Kane does not run in the browser.
 */
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  BookOpen, Check, ChevronLeft, ChevronRight, CircleCheck, FileText, GitBranch, Globe, Pause, Pencil, Play, RotateCcw,
  ShoppingBag, Terminal, TriangleAlert, Wrench, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CANVAS, EDGES, LANE_BANDS, LANE_LABEL, NODES, SCENARIOS,
  type EdgeKind, type IconKey, type Lane, type LoopEdge, type LoopNode, type NodeId, type Port,
} from "@/data/loop-graph";
import { BTN, type TabId } from "@/components/demo/shared";

const ICONS: Record<IconKey, LucideIcon> = {
  edit: Pencil, terminal: Terminal, read: BookOpen, browser: Globe, app: ShoppingBag,
  report: FileText, decision: GitBranch, fix: Wrench, done: CircleCheck, other: TriangleAlert,
};

const LANE_VAR: Record<Lane, string> = { kiro: "var(--vos-kiro)", kane: "var(--vos-kane)", app: "var(--vos-app)" };
const NODE_BY_ID = Object.fromEntries(NODES.map((n) => [n.id, n])) as Record<NodeId, LoopNode>;
/** List order for the narrow layout. */
const LIST_ORDER: NodeId[] = ["1", "2", "3", "4", "5", "6", "7", "8B", "8A", "other"];

/** Coral for the bug path, green for done, otherwise the lane colour. */
function accentOf(n: LoopNode): string {
  if (n.id === "8A") return "var(--vos-green)";
  if (n.id === "8B") return "var(--vos-coral)";
  return LANE_VAR[n.lane];
}
const EDGE_COLOR: Record<Exclude<EdgeKind, "flow">, string> = {
  pass: "var(--vos-green)", bug: "var(--vos-coral)", retry: "var(--vos-coral)", other: "var(--vos-muted)",
};

// ---------- edge geometry (computed once) ----------

type Pt = { x: number; y: number };
const DIR: Record<Port, Pt> = { t: { x: 0, y: -1 }, b: { x: 0, y: 1 }, l: { x: -1, y: 0 }, r: { x: 1, y: 0 } };

function portPoint(n: LoopNode, p: Port): Pt {
  const { nodeW: w, nodeH: h } = CANVAS;
  if (p === "t") return { x: n.x + w / 2, y: n.y };
  if (p === "b") return { x: n.x + w / 2, y: n.y + h };
  if (p === "l") return { x: n.x, y: n.y + h / 2 };
  return { x: n.x + w, y: n.y + h / 2 };
}

function geometry(e: LoopEdge) {
  const a = portPoint(NODE_BY_ID[e.from], e.fromPort);
  const c = portPoint(NODE_BY_ID[e.to], e.toPort);
  const d = Math.min(70, Math.max(8, Math.hypot(c.x - a.x, c.y - a.y) * 0.5));
  const c1 = { x: a.x + DIR[e.fromPort].x * d, y: a.y + DIR[e.fromPort].y * d };
  const c2 = { x: c.x + DIR[e.toPort].x * d, y: c.y + DIR[e.toPort].y * d };
  return {
    a, c,
    path: `M${a.x} ${a.y} C${c1.x} ${c1.y} ${c2.x} ${c2.y} ${c.x} ${c.y}`,
    mid: { x: (a.x + 3 * c1.x + 3 * c2.x + c.x) / 8, y: (a.y + 3 * c1.y + 3 * c2.y + c.y) / 8 },
  };
}
const GEO = Object.fromEntries(EDGES.map((e) => [e.id, geometry(e)]));

// ---------- small hooks ----------

function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduce(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduce;
}

// ---------- the diagram ----------

export function LoopDiagram({ onGo }: { onGo: (tab: TabId) => void }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const reduce = usePrefersReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [scenarioId, setScenarioId] = useState("bug");
  const [beat, setBeat] = useState(0);
  const [playing, setPlaying] = useState(false);
  const touched = useRef(false); // the user has used a control
  const started = useRef(false); // autoplay already ran once

  const scenario = SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0];
  const beats = scenario.beats;
  const last = beats.length - 1;
  const cur = beats[Math.min(beat, last)];
  const node = NODE_BY_ID[cur.node];

  // measure the container before the first paint, then follow its size
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    setWidth(el.getBoundingClientRect().width);
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // autoplay once, when the diagram scrolls into view (never with reduced motion)
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || reduce || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current && !touched.current) {
        started.current = true;
        setPlaying(true);
        io.disconnect();
      }
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [reduce]);

  // the clock: one timer at a time, stops at the end
  useEffect(() => {
    if (!playing) return;
    if (beat >= last) { setPlaying(false); return; }
    const t = window.setTimeout(() => setBeat((b) => Math.min(last, b + 1)), 1400);
    return () => window.clearTimeout(t);
  }, [playing, beat, last]);

  const use = () => { touched.current = true; started.current = true; };
  const selectScenario = (id: string) => { use(); setScenarioId(id); setBeat(0); setPlaying(!reduce); };
  const prev = () => { use(); setPlaying(false); setBeat((b) => Math.max(0, b - 1)); };
  const next = () => { use(); setPlaying(false); setBeat((b) => Math.min(last, b + 1)); };
  const replay = () => { use(); setBeat(0); setPlaying(true); };
  const togglePlay = () => {
    use();
    if (playing) setPlaying(false);
    else {
      if (beat >= last) setBeat(0);
      setPlaying(true);
    }
  };
  /** Jump to a node and pause. If the scenario never visits it, switch to one that does. */
  const jump = (id: NodeId) => {
    use();
    const sc = beats.some((b) => b.node === id) ? scenario : SCENARIOS.find((s) => s.beats.some((b) => b.node === id)) ?? scenario;
    setScenarioId(sc.id);
    setBeat(Math.max(0, sc.beats.findIndex((b) => b.node === id)));
    setPlaying(false);
  };

  const seen = useMemo(() => {
    const upto = beats.slice(0, beat + 1);
    return { nodes: new Set(upto.map((b) => b.node)), edges: new Set(upto.map((b) => b.edge).filter((e): e is string => !!e)) };
  }, [beats, beat]);
  const curEdge = cur.edge;

  const narrow = width > 0 && width < 560;
  const scale = Math.min(1, width / CANVAS.width);
  const showDetail = scale >= 0.8;

  const nodeState = (id: NodeId) => (id === cur.node ? "current" : seen.nodes.has(id) ? "visited" : "idle");

  return (
    <section aria-labelledby={`${uid}-h`} className="mt-7">
      <h2 id={`${uid}-h`} className="text-[15px] font-semibold">The loop, in motion</h2>

      <div role="group" aria-label="Scenario" className="mt-2 inline-flex max-w-full flex-wrap gap-1 rounded-lg border border-(--vos-line-strong) bg-(--vos-subtle) p-0.5">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-pressed={s.id === scenario.id}
            onClick={() => selectScenario(s.id)}
            className={cn(
              "rounded-md px-3 py-1 text-[12px] transition-colors",
              s.id === scenario.id ? "border border-(--vos-line-strong) bg-(--vos-raised) font-semibold text-(--vos-text) shadow-sm" : "text-(--vos-muted) hover:text-(--vos-text)",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div
        ref={wrapRef}
        role="group"
        aria-label="Animated diagram of the Verify-on-Save loop"
        data-playing={playing && !reduce}
        className="vos-loop mt-3 w-full"
      >
        {narrow ? (
          <ol className="grid gap-0">
            {LIST_ORDER.map((id, i) => {
              const n = NODE_BY_ID[id];
              const st = nodeState(id);
              const accent = accentOf(n);
              const Icon = ICONS[n.icon];
              const outs = EDGES.filter((e) => e.from === id);
              return (
                <li key={id} className="relative pb-3 pl-9" style={{ "--accent": accent } as CSSProperties}>
                  {i < LIST_ORDER.length - 1 && <span aria-hidden className="absolute top-7 bottom-0 left-[13px] w-px bg-(--vos-line-strong)" />}
                  <span
                    aria-hidden
                    className={cn(
                      "absolute top-1 left-0 grid size-[27px] place-items-center rounded-full border font-mono text-[10px]",
                      st === "idle" ? "border-(--vos-line-strong) text-(--vos-muted)" : "border-(--accent) text-(--accent)",
                      st === "current" && "bg-(--accent)/15",
                    )}
                  >
                    {st === "visited" ? <Check className="size-3.5" /> : n.step}
                  </span>
                  <button
                    type="button"
                    onClick={() => jump(id)}
                    aria-current={st === "current" ? "step" : undefined}
                    className={cn(
                      "block w-full rounded-lg border p-3 text-left transition-colors",
                      st === "current" ? "vos-node-active border-(--accent) bg-(--vos-raised)" : st === "visited" ? "border-(--accent)/50 bg-(--vos-raised)" : "border-(--vos-line) bg-(--vos-bg)",
                      n.dashed && "border-dashed",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Icon className={cn("size-4 shrink-0", st === "idle" ? "text-(--vos-muted)" : "text-(--accent)")} aria-hidden />
                      <span className="text-[14px] font-semibold">Step {n.step}: {n.title}</span>
                    </span>
                    <span className="mt-0.5 block font-mono text-[10px] tracking-[0.12em] text-(--vos-muted) uppercase">{LANE_LABEL[n.lane]}</span>
                    <span className="mt-1.5 block text-[12.5px] leading-relaxed text-(--vos-soft)">{n.detail}</span>
                    {outs.length > 0 && (
                      <span className="mt-2 grid gap-0.5">
                        {outs.map((e) => (
                          <span
                            key={e.id}
                            className={cn("font-mono text-[11px]", e.id === curEdge ? "font-semibold" : "")}
                            style={{ color: e.kind === "flow" ? "var(--vos-soft)" : EDGE_COLOR[e.kind] }}
                          >
                            {e.label ?? "next"} → {NODE_BY_ID[e.to].title}
                          </span>
                        ))}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
        ) : (
          <div
            className="relative overflow-hidden rounded-lg border border-(--vos-line) bg-(--vos-bg)"
            style={{ height: CANVAS.height * scale }}
          >
            <div
              className="absolute top-0"
              style={{
                width: CANVAS.width,
                height: CANVAS.height,
                left: Math.max(0, (width - CANVAS.width * scale) / 2),
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }}
            >
              {/* lane bands */}
              {LANE_BANDS.map((band) => (
                <div
                  key={band.lane}
                  aria-hidden
                  className="absolute inset-x-0 border-b border-(--vos-line)"
                  style={{ top: band.y, height: band.h, background: `color-mix(in srgb, ${LANE_VAR[band.lane]} 6%, transparent)` }}
                >
                  <span
                    className="absolute top-1/2 left-2 -translate-y-1/2 rotate-180 font-mono text-[10px] tracking-[0.14em] whitespace-nowrap uppercase [writing-mode:vertical-rl]"
                    style={{ color: LANE_VAR[band.lane] }}
                  >
                    {band.label}
                  </span>
                </div>
              ))}

              {/* edges */}
              <svg aria-hidden width={CANVAS.width} height={CANVAS.height} className="pointer-events-none absolute inset-0">
                <defs>
                  {EDGES.filter((e) => e.kind === "flow").map((e) => (
                    <linearGradient key={e.id} id={`${uid}-${e.id}`} gradientUnits="userSpaceOnUse" x1={GEO[e.id].a.x} y1={GEO[e.id].a.y} x2={GEO[e.id].c.x} y2={GEO[e.id].c.y}>
                      <stop offset="0" stopColor={LANE_VAR[NODE_BY_ID[e.from].lane]} />
                      <stop offset="1" stopColor={LANE_VAR[NODE_BY_ID[e.to].lane]} />
                    </linearGradient>
                  ))}
                </defs>
                {EDGES.map((e) => {
                  const g = GEO[e.id];
                  const lit = seen.edges.has(e.id);
                  const isCur = e.id === curEdge;
                  const stroke = e.kind === "flow" ? `url(#${uid}-${e.id})` : EDGE_COLOR[e.kind];
                  return (
                    <g key={e.id} opacity={lit ? 1 : 0.32}>
                      <path d={g.path} fill="none" stroke={stroke} strokeOpacity={0.14} strokeWidth={9} strokeLinecap="round" />
                      <path d={g.path} fill="none" stroke={stroke} strokeWidth={isCur ? 3.5 : 2.2} strokeLinecap="round" strokeDasharray={e.dashed ? "6 6" : undefined} />
                      {isCur && <path d={g.path} fill="none" stroke="var(--vos-text)" strokeWidth={2} strokeOpacity={0.85} strokeLinecap="round" className="vos-edge-pulse" />}
                      <circle cx={g.a.x} cy={g.a.y} r={3.5} fill={e.kind === "flow" ? LANE_VAR[NODE_BY_ID[e.from].lane] : EDGE_COLOR[e.kind]} />
                      <circle cx={g.c.x} cy={g.c.y} r={3.5} fill={e.kind === "flow" ? LANE_VAR[NODE_BY_ID[e.to].lane] : EDGE_COLOR[e.kind]} />
                    </g>
                  );
                })}
              </svg>

              {/* edge labels */}
              {EDGES.filter((e) => e.label).map((e) => {
                const g = GEO[e.id];
                const lit = seen.edges.has(e.id);
                const color = lit ? (e.kind === "flow" ? "var(--vos-soft)" : EDGE_COLOR[e.kind]) : "var(--vos-muted)";
                return (
                  <span
                    key={e.id}
                    aria-hidden
                    className="pointer-events-none absolute z-20 max-w-[70px] -translate-x-1/2 -translate-y-1/2 rounded border border-(--vos-line) bg-(--vos-bg) px-1.5 py-0.5 text-center font-mono text-[10px] leading-tight"
                    style={{ left: g.mid.x + (e.labelDx ?? 0), top: g.mid.y + (e.labelDy ?? 0), color }}
                  >
                    {e.label}
                  </span>
                );
              })}

              {/* nodes: real buttons, in step order */}
              <ol className="absolute inset-0 m-0 list-none p-0">
                {LIST_ORDER.map((id) => {
                  const n = NODE_BY_ID[id];
                  const st = nodeState(id);
                  const accent = accentOf(n);
                  const Icon = ICONS[n.icon];
                  return (
                    <li key={id} className="absolute z-10" style={{ left: n.x, top: n.y, width: CANVAS.nodeW, height: CANVAS.nodeH }}>
                      <button
                        type="button"
                        onClick={() => jump(id)}
                        aria-current={st === "current" ? "step" : undefined}
                        aria-label={`Step ${n.step}: ${n.title}. ${LANE_LABEL[n.lane]}. ${n.detail}`}
                        style={{ "--accent": accent } as CSSProperties}
                        className={cn(
                          "relative flex size-full flex-col rounded-xl border p-2.5 text-left transition-[border-color,box-shadow,background-color] duration-200",
                          st === "current" && "vos-node-active border-(--accent) bg-(--vos-raised) shadow-[0_0_0_2px_var(--accent),0_0_22px_-2px_var(--accent)]",
                          st === "visited" && "border-(--accent)/55 bg-(--vos-raised)",
                          st === "idle" && "border-(--vos-line) bg-(--vos-bg)",
                          n.dashed && "border-dashed",
                        )}
                      >
                        {n.decision && (
                          <span aria-hidden className="absolute -top-1.5 -right-1.5 size-3 rotate-45 border bg-(--vos-bg)" style={{ borderColor: accent }} />
                        )}
                        <span className="flex items-start gap-2">
                          <span
                            className={cn(
                              "grid size-[30px] shrink-0 place-items-center rounded-lg border",
                              st === "idle" ? "border-(--vos-line) text-(--vos-muted)" : "border-(--accent)/60 bg-(--accent)/10 text-(--accent)",
                            )}
                          >
                            <Icon className="size-[17px]" aria-hidden />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[14px] leading-tight font-semibold text-(--vos-text)">{n.title}</span>
                            <span className="mt-1 block font-mono text-[9px] tracking-[0.12em] text-(--vos-muted) uppercase">{LANE_LABEL[n.lane]}</span>
                          </span>
                          <span aria-hidden className={cn("font-mono text-[10px]", st === "idle" ? "text-(--vos-muted)" : "text-(--accent)")}>
                            {st === "visited" ? <Check className="size-3.5" /> : n.step}
                          </span>
                        </span>
                        {showDetail && <span className="mt-1.5 line-clamp-3 text-[11px] leading-snug text-(--vos-soft)">{n.detail}</span>}
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        )}
      </div>

      <p className="mt-2 text-[12px] leading-relaxed text-(--vos-muted)">Animated illustration of the loop. Kane does not run in your browser.</p>

      <div role="group" aria-label="Diagram controls" className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={prev} disabled={beat <= 0} className={cn(BTN, "inline-flex items-center gap-1.5")}>
          <ChevronLeft className="size-4" aria-hidden /> Previous
        </button>
        <button type="button" onClick={togglePlay} className={cn(BTN, "inline-flex items-center gap-1.5")}>
          {playing ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
          {playing ? "Pause" : "Play"}
        </button>
        <button type="button" onClick={next} disabled={beat >= last} className={cn(BTN, "inline-flex items-center gap-1.5")}>
          Next <ChevronRight className="size-4" aria-hidden />
        </button>
        <button type="button" onClick={replay} className={cn(BTN, "inline-flex items-center gap-1.5")}>
          <RotateCcw className="size-4" aria-hidden /> Replay
        </button>
      </div>

      <div aria-live="polite" className="mt-3 rounded-lg border border-(--vos-line-strong) bg-(--vos-subtle) p-3">
        <p className="font-mono text-[11px] text-(--vos-muted)">
          Step {node.step} · {LANE_LABEL[node.lane]} · beat {Math.min(beat, last) + 1} of {beats.length}
        </p>
        <p className="mt-1 text-[14px] font-semibold">{node.title}</p>
        <p className="mt-0.5 text-[13px] leading-relaxed text-(--vos-soft)">{node.detail}</p>
        {cur.note && <p className="mt-1.5 text-[12px] leading-relaxed text-(--vos-muted) italic">{cur.note}</p>}
      </div>

      <button type="button" onClick={() => onGo("bugs")} className={cn(BTN, "mt-3")}>
        Plant a bug
      </button>
    </section>
  );
}
