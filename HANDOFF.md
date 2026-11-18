# Pace · Component handoff

How each Figma component maps to the coded prototype in this repository. All values come from shared tokens. The CSS custom properties in `styles.css` use the same names as the Figma variables, for example `color/bg/brand` → `--color-bg-brand`.

- **Figma library:** [02 — Components](https://www.figma.com/design/PBixnVx0NkLeVxsQfB4dcB/WIT-Take-Home?node-id=22-3)
- **Screens:** [03 — Screens V2](https://www.figma.com/design/PBixnVx0NkLeVxsQfB4dcB/WIT-Take-Home?node-id=43-2)
- **Code:** `styles.css` (component classes) and `app.js` (render helpers and behaviour)
- **Code Connect example:** [`code-connect/Button.figma.ts`](code-connect/Button.figma.ts) (see the end of this file)

## Conventions

| Figma | Code |
| --- | --- |
| Variant property (`Variant=Primary`) | Modifier class (`.btn-primary`) |
| `State=Hover` | `:hover` (no markup) |
| `State=Focused` | `:focus-visible`: 2 px `--color-border-focus` outline, 2 px offset (no markup) |
| `State=Disabled` | `aria-disabled="true"`. The element stays focusable, so the helper text can say why it is blocked. |
| `State=Loading` | `aria-busy="true"` + `aria-disabled="true"` + spinner |
| `State=Selected` / `On=True` | `aria-pressed`, `aria-checked` or `role="switch"` state. Styled from the ARIA attribute, never a separate class. |
| Text property (`Label`) | Element text content |
| Boolean property (`Show icon`) | Element present or absent |
| Icon instance | `<svg class="icon"><use href="#i-{name}"/></svg>` from the sprite in `index.html` |
| `size/button` 48, `size/touch-min` 44 | `min-height`, never a fixed `height`, so text can scale |

## Actions

| Figma component | Properties → code | Tokens | Accessibility |
| --- | --- | --- | --- |
| [Button](https://www.figma.com/design/PBixnVx0NkLeVxsQfB4dcB/WIT-Take-Home?node-id=39-35) | `<button class="btn btn-{primary\|secondary\|tertiary}">`. `Label` → text. `Show icon` → leading `.icon.sm`. States as in Conventions. | `--color-bg-brand`, `--color-bg-brand-hover`, `--color-bg-hover`, `--color-bg-disabled`, `--radius-control`, `--size-button` | One primary per screen. A disabled primary has a helper line (`aria-describedby="bar-helper"`). |
| [IconButton](https://www.figma.com/design/PBixnVx0NkLeVxsQfB4dcB/WIT-Take-Home?node-id=39-49) | `<button class="icon-btn {—\|outline\|filled}">`. `Style=Ghost` → no modifier (`.ai` for the Pace entry). `Icon` swap → sprite id. | `--radius-full`, `--color-border-default`, `--color-bg-brand` | Always needs `aria-label`: Back, Ask Pace, Send, Close, Decrease by €10, Increase by €10, Previous month, Next month. |
| [Chip](https://www.figma.com/design/PBixnVx0NkLeVxsQfB4dcB/WIT-Take-Home?node-id=39-67) | `<button class="chip">`. Quick replies use `aria-pressed`; date presets use `role="radio"` + `aria-checked`. The selected chip shows the check icon. | `--color-bg-positive-subtle`, `--color-border-brand`, `--color-border-default` | 44 px minimum. The selected state is never colour alone (check icon). |
| [TextLink](https://www.figma.com/design/PBixnVx0NkLeVxsQfB4dcB/WIT-Take-Home?node-id=40-131) | `Type=AI` → `aiLink(label)`: `<button class="link">` with a sparkles icon. `Type=Disclosure` → `.link.full` with an arrow-down icon. | `--color-text-brand` | Link text describes the destination. Hover underlines it. |

## Bars and navigation

| Figma component | Code | Notes |
| --- | --- | --- |
| [AppBar](https://www.figma.com/design/PBixnVx0NkLeVxsQfB4dcB/WIT-Take-Home?node-id=39-106) | `Type=Title` → `appBar(title, { back, ai })`. `Type=Brand` → `<header class="app-bar brand">`. | `Show back` / `Show AI` → the `back` / `ai` options. The empty leading slot keeps the title centred. |
| [BottomActionBar](https://www.figma.com/design/PBixnVx0NkLeVxsQfB4dcB/WIT-Take-Home?node-id=39-107) | `bottomBar({ helper, primary, secondary })` | `Show helper` → `helper`. `Show secondary` → `secondary`. Sticky in a flex column, followed by the home indicator. |
| [MessageComposer](https://www.figma.com/design/PBixnVx0NkLeVxsQfB4dcB/WIT-Take-Home?node-id=39-120) | `.composer` > `form[data-form]` > `input` + `.icon-btn.filled` | The input has a visually hidden `<label>`. The placeholder is `--color-text-secondary`. `Show disclaimer` → the `.caption` line. |
| [SheetHeader](https://www.figma.com/design/PBixnVx0NkLeVxsQfB4dcB/WIT-Take-Home?node-id=41-509) | `sheetHead(title, id)`, inside `.sheet[role=dialog][aria-modal=true]` | `Type=Ask Pace` → `.sheet-head.ai` with the "AI · can make mistakes" line and the goal context. Focus moves in, is trapped, `Esc` closes, and focus returns to the trigger. |

## Conversation

| Figma component | Code | Notes |
| --- | --- | --- |
| [ChatMessage](https://www.figma.com/design/PBixnVx0NkLeVxsQfB4dcB/WIT-Take-Home?node-id=40-51) | `Type=User` → `.msg-user`. `Type=Assistant` → `.msg-ai` with `.ai-label` ("PACE"). | `Show label=false` + secondary text → `.msg-ai.earlier`. User text is HTML-escaped (`esc()`). |
| [TypingIndicator](https://www.figma.com/design/PBixnVx0NkLeVxsQfB4dcB/WIT-Take-Home?node-id=40-52) | `.typing` with `.dots` | `role="status"`, so the activity is announced. Says which data Pace is reading. |
| [DraftPlanCard](https://www.figma.com/design/PBixnVx0NkLeVxsQfB4dcB/WIT-Take-Home?node-id=41-266) | `.draft`, rendered by `paceReply()` | Always carries the "Not scheduled" `.badge`. Primary → `draft-compare` (opens Adjust). Nothing schedules from chat. |

## Content and data

| Figma component | Code | Notes |
| --- | --- | --- |
| [GoalTag](https://www.figma.com/design/PBixnVx0NkLeVxsQfB4dcB/WIT-Take-Home?node-id=40-62) | `goalTag(label)` → `.goal-tag` | |
| [SectionHeader](https://www.figma.com/design/PBixnVx0NkLeVxsQfB4dcB/WIT-Take-Home?node-id=40-66) | `<h2 class="h-section">` + `<p class="muted">` | Section `aria-labelledby` points to the `h2`. |
| [KeyFigure](https://www.figma.com/design/PBixnVx0NkLeVxsQfB4dcB/WIT-Take-Home?node-id=40-69) | `.overline` + `.amount-row` (`.amount` + `.unit`) + caption | `Show overline`, `Show suffix` and `Show caption` → the element is present or absent. |
| [Stat](https://www.figma.com/design/PBixnVx0NkLeVxsQfB4dcB/WIT-Take-Home?node-id=40-81) | `<div class="stat">` inside a `<dl>` (`dt` label, `dd` value) | `Align=Right` → `.stat.right` |
| [SummaryTile](https://www.figma.com/design/PBixnVx0NkLeVxsQfB4dcB/WIT-Take-Home?node-id=41-258) | `<dl class="tile">` | Two `.stat` items with an `<hr>` divider |
| [ListRow](https://www.figma.com/design/PBixnVx0NkLeVxsQfB4dcB/WIT-Take-Home?node-id=40-97) | `rows([[label, value, detail]])` → `<dl class="rows">` of `.list-row` | `Type=Stacked` → the third array item (`detail`). `Type=Badge` → `.badge` inside `dd`. `Show divider=false` → `:last-child` (automatic). |
| [GoalProgress](https://www.figma.com/design/PBixnVx0NkLeVxsQfB4dcB/WIT-Take-Home?node-id=40-98) | `progress()` | `role="progressbar"` with `aria-valuetext="€600 of €3,000"`. The bar is supplementary to the labels. |
| [SpendingBar](https://www.figma.com/design/PBixnVx0NkLeVxsQfB4dcB/WIT-Take-Home?node-id=40-104) | `.bar` (flex segments) + `.legend` | `role="img"` with a full text alternative. Segment widths come from the data. |
| [Timeline](https://www.figma.com/design/PBixnVx0NkLeVxsQfB4dcB/WIT-Take-Home?node-id=41-226) | `.timeline` (`i` dots, `b` lines; `i.goal` is the last) | One dot per transfer (`schedule(a).k`). Decorative: `aria-hidden`. |
| [Formula](https://www.figma.com/design/PBixnVx0NkLeVxsQfB4dcB/WIT-Take-Home?node-id=41-246) | `.formula` | `role="img"` + `aria-label` reads the sum as a sentence. Shows `≈` when rounded. |
| [Badge](https://www.figma.com/design/PBixnVx0NkLeVxsQfB4dcB/WIT-Take-Home?node-id=39-76) | `.badge` | "Changed", "Not scheduled" |
| [OutcomeMark](https://www.figma.com/design/PBixnVx0NkLeVxsQfB4dcB/WIT-Take-Home?node-id=40-153) | `.outcome-mark` (`.paused` for `Type=Paused`) | Decorative; the status line carries the meaning. |

## Feedback

| Figma component | Code | Notes |
| --- | --- | --- |
| [StatusLabel](https://www.figma.com/design/PBixnVx0NkLeVxsQfB4dcB/WIT-Take-Home?node-id=40-187) | `.status.{positive\|paused\|warning}` + icon | Always icon + word. |
| [InlineMessage](https://www.figma.com/design/PBixnVx0NkLeVxsQfB4dcB/WIT-Take-Home?node-id=40-203) | `.inline-msg.{warning\|error}` | Error is linked to its field with `aria-describedby` (`#amount-msg`, `#date-msg`). |
| [Notice](https://www.figma.com/design/PBixnVx0NkLeVxsQfB4dcB/WIT-Take-Home?node-id=40-224) | `notice(title, body, tone)` → `.notice.{info\|warning\|highlight}` | Warning has `role="status"`. |

## Inputs

| Figma component | Code | Notes |
| --- | --- | --- |
| [ContributionControl](https://www.figma.com/design/PBixnVx0NkLeVxsQfB4dcB/WIT-Take-Home?node-id=41-225) | `.cc`: stepper `.icon-btn.outline` ×2, `.amount-field > input#amount`, `.slider-wrap > input#slider[type=range]`, `.scale` | `State=Default/Warning/Error` is derived in `updateAdjust()` from the amount: warning above €400, error below €10 or above €600. Input, slider and stepper stay in sync. |
| [Slider](https://www.figma.com/design/PBixnVx0NkLeVxsQfB4dcB/WIT-Take-Home?node-id=41-130) | Native `input[type=range]` (min 10, max 600, step 10). Fill via `--fill`. `.tick` marks the preferred max. | `aria-valuetext="€250 a month"`. Arrow keys step €10. |
| [RadioCard](https://www.figma.com/design/PBixnVx0NkLeVxsQfB4dcB/WIT-Take-Home?node-id=41-110) + [Radio](https://www.figma.com/design/PBixnVx0NkLeVxsQfB4dcB/WIT-Take-Home?node-id=41-92) | `<button class="radio-card" role="radio" aria-checked>` with `.radio`, inside `role="radiogroup"` | `Title` → `.h-sub`, `Detail` → `.small.muted`, `Outcome` → `.outcome`. Nothing is preselected; the goal date moves only on an explicit choice. |
| [Toggle](https://www.figma.com/design/PBixnVx0NkLeVxsQfB4dcB/WIT-Take-Home?node-id=40-136) / [ToggleRow](https://www.figma.com/design/PBixnVx0NkLeVxsQfB4dcB/WIT-Take-Home?node-id=40-137) | `<button class="switch" role="switch" aria-checked>` in `.toggle-row` | Labelled and described by the row text. |
| [DateField](https://www.figma.com/design/PBixnVx0NkLeVxsQfB4dcB/WIT-Take-Home?node-id=41-336) | `.date-field > label + input#date-input` | `State=Error` → `aria-invalid="true"` + `.inline-msg.error`. Validated on Enter or blur by `parseTypedDate()`. |
| [Calendar](https://www.figma.com/design/PBixnVx0NkLeVxsQfB4dcB/WIT-Take-Home?node-id=41-337) | `<table class="cal">`, built by `updateDateSheet()` | Days are buttons with full-date `aria-label`s. The selected day has `aria-pressed`. Dates on or before 1 Dec 2026 are `disabled`. |

## Figma-only

`StatusBar` and `HomeIndicator` frame the mock device. In code they are decorative (`aria-hidden`) and wouldn't ship in a real app. The `Icon/*` components map one-to-one to the `<symbol id="i-*">` sprite in `index.html`.

## Known differences

- **Focus and hover:** Figma shows them as variants; code uses CSS pseudo-classes, so there's no extra markup.
- **Date field:** the Figma `DateField` appears in code as the "Or type a goal date" field inside the date picker.
- **Accepted contrast exceptions:** the slider track, the Toggle-off track and the left-over segment are below 3:1 on purpose, in both Figma and code. See section 7a of `design-foundations.md`.

## Code Connect

[`code-connect/Button.figma.ts`](code-connect/Button.figma.ts) is a Code Connect **v2 template** (HTML / Web Components) for the Button set. In Dev Mode it would show the real markup for any Button instance:

| Figma instance | Snippet shown in Dev Mode |
| --- | --- |
| Primary · Default | `<button type="button" class="btn btn-primary">Review plan</button>` |
| Primary · Disabled | `<button type="button" class="btn btn-primary" aria-disabled="true">Review plan</button>` |
| Primary · Loading | `<button type="button" class="btn btn-primary" aria-busy="true" aria-disabled="true"><svg class="icon sm spinner" …><use href="#i-loader"></use></svg>Confirming…</button>` |
| Tertiary · Default · Show icon | `<button type="button" class="btn btn-tertiary"><svg class="icon sm" …><use href="#i-pause"></use></svg>Pause plan</button>` |

**How it was checked:**
- `npx figma connect parse` accepts the file.
- The template was run against every Variant × State × Show icon combination, and the output matches the markup `app.js` renders.

**Publishing:**

```bash
npm install
npx figma connect publish --token <FIGMA_ACCESS_TOKEN>
```

Publishing Code Connect to Dev Mode needs a Figma **Organization or Enterprise** plan. This file is on a Professional plan, so the mapping is included as a ready-to-publish example and hasn't been published.
