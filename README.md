# Pace · Save for a holiday

A working, coded prototype of **Pace**, an AI-assisted savings journey in a mobile banking app. The scenario: *“I’d like to save €3,000 for a holiday next summer. What can I afford each month?”*

It's plain HTML, CSS and JavaScript, with no build step and no dependencies. Open `index.html` or publish it with GitHub Pages.

> Demo with sample data. Pace's replies are **scripted** (rule-based), not a live AI model. No real money moves.

## Run it

- **Locally:** double-click `index.html`, or serve the folder with `python3 -m http.server` and open <http://localhost:8000>.
- **GitHub Pages:** push these files to the root of a repository. Then go to **Settings → Pages → Build and deployment**, choose **Deploy from a branch**, and pick `main` and `/ (root)`. The site will be at `https://<user>.github.io/<repo>/`.

## The journey

| Step | Screen | What you can do |
| --- | --- | --- |
| 1 | **Goal** (chat) | Pick *31 Jul 2027* or *Choose a date* (presets, calendar or typed date, with validation). Pace “looks at your last 3 months”. |
| 2 | **Your monthly picture** | Income €2,800 − bills €1,550 − spending €650 = **€600** left. A €200 buffer leaves **€400** to save. |
| 3 | **Your savings plan** | Suggested **€300/month**: €2,400 ÷ 8 transfers (1 Dec 2026 → 1 Jul 2027). |
| 4 | **Adjust your plan** | Stepper, slider or typing. At **€250** you're **€400 short** by 31 July. Choose *Keep the date* (€300) or *Keep the amount* (goal moves to **30 Sep 2027**). The date never moves without an explicit choice. |
| 5 | **Review** | Full schedule (9 × €250, then €150), money in/out, fees and “No money moves today”. |
| 6 | **Scheduled** | Confirmation, reminder toggle, **Manage plan** (edit, pause, resume). |
| — | **Ask Pace** | Available from every screen. Try *“Why €300?”*, *“I can save €250 a month”* or *“What if I need it sooner?”*. Amounts return an inline **draft plan** marked *Not scheduled*. |

States covered:

- Above the preferred €400 (warning, can continue)
- Below €10 or above €600 (error, blocked)
- Explicit date change
- Invalid typed date
- Confirming (locked button)
- Paused

Direct links work too: `#/goal`, `#/picture`, `#/plan`, `#/adjust`, `#/review`, `#/scheduled`, `#/paused`.

## How the numbers are worked out

All figures are computed in `app.js` from the sample data, not hard-coded:

- `transfersBy(goal)`: the number of monthly transfers on the 1st, from 1 Dec 2026 up to the goal date.
- `suggested(goal)`: €2,400 ÷ transfers, rounded **up** to the nearest €10.
- `schedule(amount)`: *k* transfers with a smaller final one (for example 9 × €250, then €150, reaching €3,000 on 1 Sep 2027).
- `projection(amount, goal)`: what you'd have by the goal date, and the shortfall.

## Accessibility

Built to WCAG 2.2 AA, matching the design system's accessibility notes:

- Every interactive control has a visible focus ring (green-600, 5.6:1). Targets are at least 44 px.
- Bottom sheets are modal dialogs. Focus moves in, is trapped, `Esc` closes, and focus returns to the trigger.
- Status updates (“Looking at your last 3 complete months…”, “Confirming…”, Pace's replies, validation) are announced through a polite live region.
- The slider is a native range input with `aria-valuetext` (“€250 a month”), and the arrow keys step by €10.
- The trade-off choice is a radio group. Errors pair colour with an icon and text, and blocked actions explain why.
- `prefers-reduced-motion` turns off sheet and spinner animation.

## Design-to-code handoff

- **[HANDOFF.md](HANDOFF.md):** every Figma component mapped to its code (classes, render helpers, property → markup rules, tokens, accessibility).
- **[code-connect/Button.figma.ts](code-connect/Button.figma.ts):** a Figma Code Connect v2 template for the Button set. It's validated with `figma connect parse`, and publishing it needs a Figma Organization or Enterprise plan.

## Files

```
index.html               page shell, icon sprite, live region
styles.css               design tokens (same names as the Figma variables) and components
app.js                   data and maths, state, screens, sheets, scripted Ask Pace
HANDOFF.md               component-to-code mapping
code-connect/            Figma Code Connect template (Button)
figma.config.json        Code Connect config
package.json             dev dependency for Code Connect only (the site needs no build)
```

Typeface: Inter, loaded from Google Fonts. Icons: Lucide-style, inlined as an SVG sprite.
