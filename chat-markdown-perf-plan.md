# Chat — Bounding markdown render cost (#22821)

> Plan + benchmarks for fixing **"[chat] Large markdown message freezes the render
> thread (no input-length bound)"**.
> Affected file: `packages/x-chat/src/ChatMessage/renderMarkdown.tsx`.
> Renderer: `markdown-to-jsx@9.8.1`.

## TL;DR

- A large/dense markdown message blocks the render thread because `markdown-to-jsx`
  parsing is **super-linear** and runs **synchronously during React render**, with
  **no input bound**.
- **Streaming makes it much worse**: the headless text part re-parses the *entire*
  growing string on every streamed chunk (`useMemo([text])`), so cost compounds.
  An **11.7 KB** dense message streamed token-by-token churns the thread for **~65 s**.
- We benchmarked **switching to `streamdown`** — it is **not** the fix. It is ~2–3×
  **slower** on the single-message freeze (the issue's exact case), **2× slower** on
  normal streaming, still super-linear, and pulls in a heavy dependency tree
  (`marked` + `remark`/`rehype` + `mermaid` + highlighting).
- We benchmarked **rendering in batches** (block-split + memoize on top of
  `markdown-to-jsx`). It **halves** per-frame jank and cumulative cost on multi-block
  content — but gives **zero** benefit on a single dense block (the issue's literal
  input), so it cannot stand alone.
- **Proposed fix (layered):** per-block **length/density cap** (the safety backstop)
  + **block-level memoization** + **`startTransition`** during streaming. This
  reproduces `streamdown`'s smoothness on the lightweight `markdown-to-jsx`, bounds
  the pathological case `streamdown` can't, and preserves formatting for all
  legitimate content.

---

## 1. The problem

`renderMarkdown` (and its streaming sibling) feed message text straight into
`markdown-to-jsx` with no upper bound:

```tsx
// packages/x-chat/src/ChatMessage/renderMarkdown.tsx
export function renderMarkdown(text: string): React.ReactNode {
  return <Markdown options={markdownOptions}>{normalizeMarkdownForRender(text)}</Markdown>;
}
```

`markdown-to-jsx`'s inline parser is super-linear on dense inline markup, and parsing
runs **synchronously during render**, so the main thread is blocked for the whole
parse. Two things make it worse than it first looks:

1. **It's the default path, not opt-in.** `ChatMessageContent.tsx` wires
   `renderStreamingMarkdown` as the default `renderText` for every text part — any app
   using `<ChatMessage>` is exposed.
2. **Streaming amplifies it.** The headless `TextPart` memoizes on `text`
   (`MessageContent.tsx`: `useMemo(() => renderText(text), [text])`), so **every**
   streamed chunk re-parses the **entire** growing string. Over a stream the total work
   is the sum of `f(prefix)` across all prefixes — if `f` is quadratic, cumulative cost
   is ~cubic in the final length.

### Threat model

- **Accidental large/normal message** — handled fine by `markdown-to-jsx` (see §3.1).
- **Pathological / adversarial dense markdown** (e.g. a malicious or malfunctioning
  model emitting `'**a**'×N`) — freezes on a single render, and churns for tens of
  seconds when streamed. This is a realistic client-side DoS for a chat surface that
  renders untrusted model/user content.

---

## 2. Root cause

| Axis | Cause | Symptom |
|---|---|---|
| Single render | Unbounded super-linear parse, synchronous in render | 78 KB dense → ~3 s freeze |
| Streaming | Full re-parse of growing string on every chunk; no incremental memo | 11.7 KB dense → ~65 s cumulative churn |

---

## 3. Benchmarks

### Methodology

- Packages: `markdown-to-jsx@9.8.1` (exact repo pin), `streamdown@2.5.0`,
  `react@19`, `react-dom@19`, `jsdom`.
- `markdown-to-jsx` configured like `renderMarkdown.tsx`
  (`forceBlock`, `disableParsingRawHTML`, `Fragment` wrapper).
- **Single render** measured with `renderToStaticMarkup`.
- **Streaming** measured with a real reconciler: `jsdom` + `react-dom/client`,
  re-rendering the growing prefix once per chunk, chunks of **random 1–10 chars**
  (seeded RNG), timed with `flushSync` per chunk.
- "worst update" = slowest single chunk render (the jank / dropped-frame metric;
  one frame ≈ 16 ms). "final (complete)" = the last render, i.e. the full message.

> **Important caveat on the streaming numbers for `streamdown`.** `streamdown` defers
> block rendering into a React **transition** (`startTransition`). Our `flushSync`
> timing commits synchronously and the deferred transition render lands *outside* that
> window, so **`streamdown`'s per-update cost is under-counted** in the streaming
> tables. Treat `streamdown`'s streaming figures as a *lower bound* on its CPU work;
> its real benefit is responsiveness (interruptible rendering), not lower total work.

### 3.1 Single full render — pathological `'**a**'.repeat(n)`

| Input | markdown-to-jsx | streamdown |
|------:|----------------:|-----------:|
| 10 KB | 56 ms | 376 ms |
| 20 KB | 119 ms | 707 ms |
| 39 KB | 517 ms | 1,613 ms |
| 78 KB | 3,004 ms | 5,861 ms |
| 156 KB | 8,231 ms | 25,650 ms |

### 3.2 Single full render — realistic prose (headings, paragraphs, lists, links, code)

| Input | markdown-to-jsx | streamdown |
|------:|----------------:|-----------:|
| 12 KB | 19 ms | 297 ms |
| 49 KB | 19 ms | 674 ms |
| 194 KB | 51 ms | 2,655 ms |

**Takeaway:** the blowup is **input-specific** (dense inline), not a length problem and
not a `markdown-to-jsx` defect — realistic prose stays ~flat (19–51 ms up to 194 KB).
A length cap is therefore *conservative*: it keys off the worst case. `streamdown` is
markedly slower even on normal prose.

### 3.3 Streaming (real reconciler, random 1–10 char chunks)

**Realistic multi-block answer**

| size / updates | renderer | cumulative | worst update | final |
|---|---|---:|---:|---:|
| 9.5 KB / 1772 | markdown-to-jsx | **2,078 ms** | 12.5 ms | 1.9 ms |
| 9.5 KB / 1772 | streamdown | 4,647 ms | 17.7 ms | 5.6 ms |

**Pathological single dense block** (`'**a**'.repeat(n)`)

| size / updates | renderer | cumulative | worst update | final |
|---|---|---:|---:|---:|
| 11.7 KB / 2188 | markdown-to-jsx | **64,863 ms** | 116 ms | 40 ms |
| 11.7 KB / 2188 | streamdown | 17,776 ms* | 45 ms* | 21 ms* |

`*` under-counted — see methodology caveat.

**Takeaways:**
- Streaming is the **worse axis** — 65 s of cumulative churn for an 11.7 KB message.
- On **normal** streaming, `markdown-to-jsx` is **2× faster** than `streamdown` and
  perfectly smooth (12.5 ms worst). Adopting `streamdown` would **regress** the 99%
  case.
- A **high** length cap (e.g. 40 KB) does **not** protect streaming: the cumulative
  cost is dominated by renders of the near-full-size prefix, which all happen *below*
  the cap for an 11.7 KB message.

### 3.4 "Render in batches" experiment

Prototype: split the streaming text into blocks, render each block with
`markdown-to-jsx`, and **reuse the same element object for unchanged blocks** so React
skips them (no re-parse). Only the growing tail block (and new blocks) re-parse.

| scenario (cumulative / worst update) | naive m2j | **batched m2j** | streamdown |
|---|---:|---:|---:|
| Realistic multi-block (6.4 KB) | 1157 / 16.2 ms | 1282 / **8.3** ms | 2202 / 20 ms |
| Single dense block (4.9 KB) | 9941 / 73 ms | **9600 / 46** ms | 2321 / 16 ms* |
| Many dense blocks (11.8 KB, blank-line separated) | 12727 / 16.9 ms | **6693 / 8.4** ms | 7350 / 9.3 ms* |

**Takeaways:**
- Batching **works when there are blocks to batch**: halved cumulative and worst-update
  on multi-block content, and **beat `streamdown`** there — all on the lightweight
  `markdown-to-jsx`.
- Batching does **nothing for a single giant block** (naive ≈ batched: 9.6 s ≈ 9.9 s),
  because `'**a**'×N` has no blank lines → one block → nothing to memoize. And the
  **final** render parses the whole block once regardless — the freeze is unchanged.
- Per-update overhead of batching is small (block tokenize): realistic cumulative
  +11 %, but worst-update halved. Net win for responsiveness.

**Conclusion:** batching is *half* the fix (responsiveness for normal content). It
must be paired with a cap that catches the unbatchable single dense block.

---

## 4. How `streamdown` solves it (decompiled from `streamdown@2.5.0`)

`streamdown`'s advantage is **architecture, not parser**. Per content update:

1. **Repair incomplete markdown** (streaming only) — `parseIncompleteMarkdown` (uses
   `remend`) closes unterminated `**bold**`, `` `code` ``, fences, links.
2. **Split into blocks** via `marked`'s `Lexer.lex(text, { gfm: true })`, taking each
   top-level token's `.raw`, with repair rules so streaming constructs aren't split:
   - unclosed code fence (odd ` ``` ` count) → merge the next token in;
   - block-level HTML with an unbalanced open tag → keep appending until it closes;
   - footnotes present → bail, treat the whole message as one block.
3. **Memoize blocks**: held in state, **keyed by index** (stable for append-only
   streaming), each `Block` wrapped in `React.memo` with a comparator on the parsed
   node → unchanged blocks skip re-render/re-parse.
4. **Concurrent rendering**: during streaming, block-state updates are wrapped in
   **`startTransition`** (`useTransition`) → block rendering is interruptible and
   time-sliced, keeping the thread responsive even mid-parse.
5. **Per-block render** via `remark-parse` + `remark-gfm` → `remark-rehype` →
   `rehype-harden`/`rehype-sanitize` → `hast-util-to-jsx-runtime` (+ shiki, mermaid,
   KaTeX overrides).

> Note: step 2 confirms our benchmark — a single dense paragraph is **one** `marked`
> block, so `streamdown`'s block memo can't help it either. Its smaller single-block
> streaming number comes from steps 3–4 (deferred/concurrent rendering), not from
> splitting.

### Why we won't adopt `streamdown`

- Slower on the single-message freeze (the issue's exact case) — §3.1.
- **2× slower** on normal streaming — §3.3.
- Heavy dependency tree (`marked`, `remark`, `rehype`, `mermaid`, highlighting,
  `tailwind-merge`) vs. mui-x's deliberately lightweight `markdown-to-jsx` + optional
  `remend`.
- Its only genuine wins are **borrowable** on top of `markdown-to-jsx` (below).

---

## 5. Proposed solution — layered, on top of `markdown-to-jsx`

| streamdown technique | mui-x equivalent | cost |
|---|---|---|
| `parseIncompleteMarkdown` | already have it (`remend` + `normalizeMarkdownForRender`) | none |
| block split via `marked.Lexer` | **fence-aware blank-line splitter** | dependency-free (~30 lines); avoids adding `marked` |
| index keys + `React.memo` per block | Layer 2 below | small |
| `startTransition` while streaming | Layer 3 below | one hook, no deps |
| heavy remark/rehype render | **don't adopt** — keep `markdown-to-jsx` per block | — |

### Layer 1 — Per-block length/density cap (the safety backstop; closes the issue)

Parse a block as markdown only if it's under a length **and** inline-marker-density
threshold; otherwise render it as **raw text** (no truncation — all content stays
visible). Applying the cap **per block** is strictly better than the whole-message cap
the issue proposes: a legitimate 50 KB answer made of normal blocks stays **fully
formatted**, while only a pathological block degrades to raw text.

- Fixes the **78 KB → 3 s single-render freeze**.
- Catches the **unbatchable single dense block** that Layer 2 can't.
- ~15–20 lines, no dependencies. **Minimum needed to close #22821.**

### Layer 2 — Block-level memoization (streaming smoothness)

Split streaming text into blocks (fence-aware, dependency-free), key by index, wrap
each block in `React.memo`, render each with `markdown-to-jsx`. Reuse unchanged blocks
→ only the active tail re-parses. **Halves** worst-update and cumulative on real content
(§3.4).

### Layer 3 — `startTransition` during streaming (responsiveness)

Wrap streaming block-state updates in `startTransition` so heavy renders are
interruptible/time-sliced. One hook, no deps. This is the lever that keeps even a
heavy in-flight block from janking the thread.

### Composition

```
content
  → repair incomplete markdown (existing remend / normalizeMarkdownForRender)
  → split into blocks (fence-aware, dependency-free)
  → per block: density/length cap? raw text : <Markdown> (markdown-to-jsx)
  → React.memo per block, keyed by index
  → setBlocks wrapped in startTransition while streaming
```

This reproduces `streamdown`'s smoothness on the lightweight renderer, **and** bounds
the pathological case `streamdown` can't.

---

## 6. Recommendation & rollout

1. **Ship Layer 1 now** to close #22821 — the cap is the safety guarantee and the
   minimal change. (Either per-block cap, or the simpler whole-message cap if we want
   the smallest possible diff first.)
2. **Add Layer 2 + Layer 3** as a follow-up (or same PR) for streaming smoothness on
   normal long messages — justified by §3.3/§3.4. Stays on `markdown-to-jsx`, no new
   deps.
3. **Do not switch to `streamdown`** — §3 + §4.

Both Layer 1 and Layer 2 live in `renderMarkdown.tsx` / `StreamingMarkdownText`; no
changes to the headless package are required.

### Open questions for reviewers

- Cap thresholds: length (e.g. ~40 KB/block) and inline-marker density — exact values?
- Should the cap / batching be configurable (prop on `<ChatMessage>`), or fixed
  defaults with `renderText` override as the escape hatch?
- Is **adversarial dense streaming** in scope, or only the single-render freeze? (Layer
  1 covers the latter; Layers 1–3 cover both.)

---

## Appendix — reproducing the benchmarks

Standalone (outside the monorepo):

```bash
mkdir md-bench && cd md-bench && npm init -y
npm i markdown-to-jsx@9.8.1 streamdown@2.5.0 react@19 react-dom@19 jsdom
```

### A. Single render (`renderToStaticMarkup`)

```js
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Markdown from 'markdown-to-jsx';
import { Streamdown } from 'streamdown';
const h = React.createElement;
const opts = { forceBlock: true, wrapper: React.Fragment, disableParsingRawHTML: true };
const time = (el) => { const t = performance.now(); renderToStaticMarkup(el); return performance.now() - t; };
for (const n of [2000, 4000, 8000, 16000, 32000]) {
  const md = '**a**'.repeat(n);
  console.log((md.length/1024|0)+'KB', time(h(Markdown,{options:opts},md)), time(h(Streamdown,null,md)));
}
```

### B. Streaming (real reconciler, random 1–10 char chunks)

```js
// jsdom + react-dom/client; flushSync(() => root.render(<Comp text={prefix}/>)) per chunk.
// chunk size = 1 + floor(rng()*10); rng = seeded LCG for reproducibility.
// Measure cumulative, worst single update, and the final (complete-message) update.
// Compare: naive markdown-to-jsx, batched (block-split + memoized) markdown-to-jsx, streamdown.
// NOTE: flushSync under-counts streamdown (its render is deferred via startTransition).
```

### C. Batched renderer (prototype used in §3.4)

```js
import { Lexer } from 'marked'; // or a dependency-free fence-aware blank-line splitter
function makeBatched(Markdown, opts, h) {
  let prevRaw = [], prevEls = [];
  return function BatchedMarkdown({ text }) {
    const blocks = Lexer.lex(text).map((t) => t.raw);
    const els = blocks.map((raw, i) =>
      (prevRaw[i] === raw && prevEls[i]) ? prevEls[i] : h(Markdown, { options: opts, key: i }, raw));
    prevRaw = blocks; prevEls = els;
    return h(React.Fragment, null, els);
  };
}
```
