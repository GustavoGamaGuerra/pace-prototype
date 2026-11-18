/* Pace · coded prototype
   Vanilla JS, no build step. Hash routes: #/goal #/picture #/plan #/adjust #/review #/scheduled #/paused
   All figures are computed from the sample data below. Pace's replies are scripted (no live AI). */
'use strict';

// ---------------------------------------------------------------- Data & maths
const DATA = {
  income: 2800, bills: 1550, spending: 650, buffer: 200,
  saved: 600, target: 3000, min: 10, max: 600, step: 10,
  account: 'Everyday ·4821', pot: 'Summer holiday pot',
};
DATA.surplus = DATA.income - DATA.bills - DATA.spending;   // €600 left after spending
DATA.available = DATA.surplus - DATA.buffer;                 // €400 preferred max
const REMAINING = DATA.target - DATA.saved;                  // €2,400
const FIRST = new Date(2026, 11, 1);                         // first transfer: 1 Dec 2026
const PRESETS = [new Date(2027, 5, 30), new Date(2027, 6, 31), new Date(2027, 7, 31)];
const DEFAULT_GOAL = PRESETS[1];

const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTH = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const WORDS = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve'];

const eur = n => '€' + Math.round(n).toLocaleString('en-IE');
const fmt = d => `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`;
const fmtLong = d => `${d.getDate()} ${MONTH[d.getMonth()]}`;
const addMonths = (d, m) => new Date(d.getFullYear(), d.getMonth() + m, 1);
const endOfMonth = d => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const sameDay = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const word = n => (n <= 12 ? WORDS[n] : String(n));

/** Monthly transfers (on the 1st) from FIRST up to and including the goal date. */
const transfersBy = goal => (goal.getFullYear() - FIRST.getFullYear()) * 12 + goal.getMonth() - FIRST.getMonth() + 1;
/** Monthly amount that reaches the target by the goal date, rounded up to €10. */
const suggested = goal => Math.ceil(REMAINING / transfersBy(goal) / 10) * 10;
/** Schedule for a fixed monthly amount: k transfers, smaller final one if needed. */
function schedule(a) {
  const k = Math.ceil(REMAINING / a);
  const last = REMAINING - (k - 1) * a;
  const lastDate = addMonths(FIRST, k - 1);
  return { k, last, lastDate, text: last === a ? `${k} × ${eur(a)}` : `${k - 1} × ${eur(a)}, then ${eur(last)}` };
}
/** What you'd have by the goal date at amount a. */
function projection(a, goal) {
  const n = transfersBy(goal);
  const byGoal = DATA.saved + Math.min(n * a, REMAINING);
  return { n, byGoal, short: DATA.target - byGoal };
}
const leftEachMonth = a => DATA.surplus - a;
const isValidAmount = a => Number.isFinite(a) && a >= DATA.min && a <= DATA.max;

// ---------------------------------------------------------------- State
const initialState = () => ({
  goalDate: null,          // chosen goal date
  amount: null,            // amount being edited on Adjust
  choice: null,            // 'amount' when the user explicitly moves the date
  plan: null,              // { amount, goalDate, changed }
  status: 'draft',         // 'draft' | 'scheduled' | 'paused'
  reminder: true,
  analysing: false,
  chat: [],                // goal-screen chat after the scripted opening
  ask: [],                 // Ask Pace conversation
  confirming: false,
});
let S = initialState();

// ---------------------------------------------------------------- Helpers
const $ = (sel, root = document) => root.querySelector(sel);
const app = $('#app');
const overlay = $('#overlay');
const ic = (name, cls = '') => `<svg class="icon ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function announce(msg) { const live = $('#live'); live.textContent = ''; setTimeout(() => { live.textContent = msg; }, 50); }
function toast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
  $('#device').appendChild(t); setTimeout(() => t.remove(), 2600);
}
const route = () => (location.hash.replace(/^#\/?/, '') || 'goal');
function go(r, { replace = false } = {}) {
  const url = '#/' + r;
  if (replace) location.replace(url); else location.hash = url;
}
function back() { if (history.length > 1) history.back(); else go('goal'); }

const appBar = (title, { back: showBack = true, ai = true } = {}) => `
  <header class="app-bar">
    <div>${showBack ? `<button class="icon-btn" type="button" data-action="back" aria-label="Back">${ic('arrow-left')}</button>` : ''}</div>
    <div class="app-bar__title"><span>${title}</span><small>Demo · sample data</small></div>
    <div>${ai ? `<button class="icon-btn ai" type="button" data-action="ask" aria-label="Ask Pace">${ic('sparkles')}</button>` : ''}</div>
  </header>`;
const home = '<div class="home-indicator" aria-hidden="true"></div>';
const bottomBar = ({ helper, primary, secondary }) => `
  <div class="bottom-bar">
    ${helper ? `<p class="caption muted helper" id="bar-helper">${helper}</p>` : ''}
    ${primary}
    ${secondary || ''}
  </div>${home}`;
const goalTag = label => `<p class="goal-tag">${ic('flag')}<span>${label}</span></p>`;
const rows = list => `<dl class="rows">${list.map(([dt, dd, sub]) => `
  <div class="list-row"><dt>${dt}</dt><dd><span>${dd}</span>${sub ? `<small>${sub}</small>` : ''}</dd></div>`).join('')}</dl>`;
const progress = () => {
  const pct = Math.round(DATA.saved / DATA.target * 100);
  return `<div class="stack gap-3">
    <div class="progress-labels"><span>${eur(DATA.saved)} saved</span><span>${eur(DATA.target)} goal</span></div>
    <div class="progress" role="progressbar" aria-label="Saved towards goal" aria-valuemin="0" aria-valuemax="${DATA.target}" aria-valuenow="${DATA.saved}" aria-valuetext="${eur(DATA.saved)} of ${eur(DATA.target)}"><span style="width:${pct}%"></span></div>
  </div>`;
};
const notice = (title, body, tone = 'info') => `
  <div class="notice ${tone}" ${tone === 'warning' ? 'role="status"' : ''}>
    ${tone === 'highlight' ? '' : ic(tone === 'warning' ? 'alert' : 'info')}
    <div class="text"><p class="${tone === 'highlight' ? 'h-section' : 'title-s'}">${title}</p><p class="body">${body}</p></div>
  </div>`;
const aiLink = (label, action = 'ask') => `<button class="link" type="button" data-action="${action}">${ic('sparkles')}<span>${label}</span></button>`;
function ensurePlanContext() {
  if (!S.goalDate) S.goalDate = DEFAULT_GOAL;
  if (!S.plan) S.plan = { amount: suggested(S.goalDate), goalDate: S.goalDate, changed: false };
}

// ---------------------------------------------------------------- Screens
const screens = {};

screens.goal = () => {
  const chosen = S.goalDate;
  const isPreset = chosen && sameDay(chosen, DEFAULT_GOAL);
  const chips = `
    <div class="chips" role="group" aria-label="When would you like it ready?">
      <button class="chip" type="button" data-action="pick-default" aria-pressed="${chosen && isPreset ? 'true' : 'false'}" ${S.analysing ? 'disabled' : ''}>
        ${chosen && isPreset ? ic('check', 'sm') : ''}<span>31 Jul 2027</span></button>
      <button class="chip" type="button" data-action="open-date" aria-pressed="${chosen && !isPreset ? 'true' : 'false'}" ${S.analysing ? 'disabled' : ''}>
        ${chosen && !isPreset ? ic('check', 'sm') + `<span>${fmt(chosen)}</span>` : ic('calendar', 'sm') + '<span>Choose a date</span>'}</button>
    </div>`;
  const extra = S.chat.map(m => m.who === 'user'
    ? `<p class="msg-user">${esc(m.text)}</p>`
    : `<div class="msg-ai"><p class="ai-label">${ic('sparkles', 'sm')}PACE</p><p>${m.text}</p></div>`).join('');
  return `
    <header class="app-bar brand"><span class="logo" aria-label="Pace">pace</span><span class="demo-label">Demo · sample data</span></header>
    <div class="scroll"><div class="content">
      <div class="stack gap-3">
        <h1 class="title" tabindex="-1">A little room for<br>what’s next.</h1>
        <p class="muted">What would you like to save for?</p>
      </div>
      <section class="stack gap-6" aria-label="Conversation with Pace">
        <p class="msg-user">I’d like to save €3,000 for a holiday next summer. What can I afford each month?</p>
        <div class="msg-ai"><p class="ai-label">${ic('sparkles', 'sm')}PACE</p><p>Let’s work it out together.<br>When would you like it ready?</p></div>
        ${chips}
        ${extra}
        ${S.analysing ? `<p class="typing" role="status"><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>Looking at your last 3 complete months…</p>` : ''}
      </section>
      <p class="small muted">Prefer a person? <button type="button" class="inline-link" data-action="support">Contact support</button></p>
    </div></div>
    <div class="composer">
      <form data-form="goal-chat"><label class="sr-only" for="goal-input">Message Pace</label>
        <input id="goal-input" name="msg" autocomplete="off" placeholder="Message Pace…">
        <button class="icon-btn filled" type="submit" aria-label="Send">${ic('arrow-up')}</button></form>
      <p class="caption">AI can make mistakes. You’re always in control.</p>
    </div>${home}`;
};

screens.picture = () => {
  const pct = v => (v / DATA.income * 100).toFixed(1);
  return `
    ${appBar('Your monthly picture')}
    <div class="scroll"><div class="content">
      <div class="stack gap-3">${goalTag('Summer holiday · €3,000')}<h1 class="title" tabindex="-1">Room to save.</h1></div>
      <div class="stack gap-6">
        <div class="stack gap-2"><p class="amount">${eur(DATA.surplus)}</p><p class="muted">Estimated left each month</p></div>
        <div class="stack gap-3">
          <div class="bar" role="img" aria-label="Of ${eur(DATA.income)} income: bills ${eur(DATA.bills)}, spending ${eur(DATA.spending)}, left over ${eur(DATA.surplus)}">
            <span style="flex:${pct(DATA.bills)};background:var(--color-data-bills)"></span>
            <span style="flex:${pct(DATA.spending)};background:var(--color-data-spending)"></span>
            <span style="flex:${pct(DATA.surplus)};background:var(--color-data-surplus)"></span>
          </div>
          <ul class="legend" aria-hidden="true"><li><i style="background:var(--color-data-bills)"></i>Bills</li><li><i style="background:var(--color-data-spending)"></i>Spending</li><li><i style="background:var(--color-data-surplus)"></i>Left over</li></ul>
        </div>
        <dl class="pair">
          <div class="stat"><dt>Monthly income</dt><dd>${eur(DATA.income)}</dd></div>
          <div class="stat"><dt>Bills + spending</dt><dd>${eur(DATA.bills + DATA.spending)}</dd></div>
        </dl>
        <button class="link full" type="button" data-action="scroll-breakdown"><span>See the breakdown</span>${ic('arrow-down')}</button>
      </div>
      <section class="stack gap-4" aria-labelledby="buffer-h">
        <div class="stack gap-1"><h2 class="h-section" id="buffer-h">Keep a little breathing room.</h2><p class="muted">Leave ${eur(DATA.buffer)} unallocated for the unexpected.</p></div>
        <div class="list-row boxed"><dt>Available for saving</dt><dd><span><strong class="h-section">${eur(DATA.available)}</strong> <span class="small muted">/ month</span></span></dd></div>
        <p class="small muted">Your buffer is a preference, not a protected balance.</p>
      </section>
      <section class="stack gap-4" aria-labelledby="breakdown-h">
        <div class="stack gap-1"><h2 class="h-section" id="breakdown-h" tabindex="-1">Where your money goes</h2><p class="muted">Monthly averages · Aug–Oct 2026</p></div>
        ${rows([['Committed bills', eur(DATA.bills)], ['Everyday spending', eur(DATA.spending)], ['Left after spending', eur(DATA.surplus)], ['Buffer you keep', '– ' + eur(DATA.buffer)]])}
      </section>
      <section class="stack gap-3" aria-labelledby="method-h">
        <h2 class="h-section" id="method-h">How we estimated this</h2>
        <p class="small muted">We used your last 3 complete months of income and spending. One-off costs and changes to your income can affect what’s available.</p>
        <p class="small muted">This is a starting point. You choose the amount, and nothing moves until you confirm a plan.</p>
        <div>${aiLink('Ask about this estimate')}</div>
      </section>
    </div></div>
    ${bottomBar({ primary: '<button class="btn btn-primary" type="button" data-action="to-plan">See my savings plan</button>' })}`;
};

screens.plan = () => {
  const goal = S.goalDate;
  const a = suggested(goal);
  const n = transfersBy(goal);
  const sch = schedule(a);
  const exact = a * n === REMAINING;
  const tooHigh = a > DATA.surplus;
  const dots = Array.from({ length: Math.min(sch.k, 12) }, (_, i) => (i === Math.min(sch.k, 12) - 1 ? '<i class="goal"></i>' : '<i></i><b></b>')).join('');
  return `
    ${appBar('Your savings plan')}
    <div class="scroll"><div class="content">
      <div class="stack gap-4">${goalTag('Summer holiday')}${progress()}</div>
      <div class="stack gap-6">
        <div class="stack gap-2">
          <p class="overline">Suggested monthly amount</p>
          <h1 class="amount-row" tabindex="-1"><span class="amount">${eur(a)}</span><span class="unit">/ month</span></h1>
          <p class="muted">${cap(word(sch.k))} steady steps towards your holiday.</p>
        </div>
        ${tooHigh
          ? `<p class="status warning">${ic('alert')}<span>More than you have left each month.</span></p>`
          : `<p class="status positive">${ic('circle-check')}<span>On track for ${fmt(sch.lastDate)}</span></p>`}
        <div class="stack gap-2">
          <div class="stack gap-3">
            <div class="timeline" aria-hidden="true">${dots}</div>
            <div class="progress-labels"><span>${MON[FIRST.getMonth()]} ${FIRST.getFullYear()}</span><span>${MON[sch.lastDate.getMonth()]} ${sch.lastDate.getFullYear()}</span></div>
          </div>
          ${rows([['Your goal date', fmt(goal)]])}
        </div>
        ${a > DATA.available && !tooHigh ? notice(`Above your preferred ${eur(DATA.available)}`, `Leaves about ${eur(leftEachMonth(a))} a month for everything else.`, 'warning') : ''}
        ${!tooHigh ? notice(`≈ ${eur(leftEachMonth(a))} left each month`, 'After bills, everyday spending and your transfer.', 'highlight') : ''}
      </div>
      <section class="stack gap-4" aria-labelledby="why-h">
        <h2 class="h-section" id="why-h">Why ${eur(a)}?</h2>
        <div class="formula" role="img" aria-label="${eur(REMAINING)} left to save divided by ${n} transfers ${exact ? 'equals' : 'is about'} ${eur(a)} per month">
          <div><strong>${eur(REMAINING)}</strong><span>left to save</span></div><span class="op" aria-hidden="true">÷</span>
          <div><strong>${n}</strong><span>transfers</span></div><span class="op" aria-hidden="true">${exact ? '=' : '≈'}</span>
          <div><strong>${eur(a)}</strong><span>per month</span></div>
        </div>
        <p class="small muted">You already have ${eur(DATA.saved)} saved. ${exact ? `${cap(word(n))} transfers of ${eur(a)} cover the rest.` : `${sch.text} covers the rest, rounded up to the nearest €10.`}</p>
        ${rows([['First transfer', fmt(FIRST)], ['Frequency', 'Monthly on the 1st']])}
      </section>
      <div class="stack gap-4">
        ${notice('A plan you can change', 'This is an estimate, not advice. Nothing has moved yet. You can adjust the amount before reviewing.')}
        <div>${aiLink('Talk it through with Pace')}</div>
      </div>
    </div></div>
    ${bottomBar({
      primary: `<button class="btn btn-primary" type="button" data-action="plan-review" ${tooHigh ? 'aria-disabled="true"' : ''}>Review plan</button>`,
      secondary: '<button class="btn btn-tertiary" type="button" data-action="plan-adjust">Adjust amount</button>',
    })}`;
};

screens.adjust = () => {
  const a = S.amount;
  const fill = isValidAmount(a) ? (a - DATA.min) / (DATA.max - DATA.min) * 100 : 0;
  const tick = (DATA.available - DATA.min) / (DATA.max - DATA.min);
  return `
    ${appBar('Adjust your plan')}
    <div class="scroll"><div class="content">
      <div class="stack gap-2"><h1 class="title" tabindex="-1">Find your balance.</h1><p class="muted">Summer holiday · ${fmt(S.goalDate)}</p></div>
      <div class="stack gap-4">
        <div class="cc">
          <p class="small muted" id="cc-label">Monthly contribution</p>
          <div class="stepper">
            <button class="icon-btn outline" type="button" data-action="step" data-step="-1" aria-label="Decrease by €10">${ic('minus')}</button>
            <label class="amount-field" id="amount-field"><span aria-hidden="true">€</span>
              <input id="amount" inputmode="numeric" autocomplete="off" value="${Number.isFinite(a) ? a : ''}" aria-labelledby="cc-label" aria-describedby="amount-msg"></label>
            <button class="icon-btn outline" type="button" data-action="step" data-step="1" aria-label="Increase by €10">${ic('plus')}</button>
          </div>
          <div class="slider-wrap">
            <span class="tick" style="left:calc(14px + (100% - 28px) * ${tick.toFixed(4)})" aria-hidden="true"></span>
            <input id="slider" type="range" min="${DATA.min}" max="${DATA.max}" step="${DATA.step}" value="${isValidAmount(a) ? a : DATA.min}" style="--fill:${fill}%"
              aria-labelledby="cc-label" aria-valuetext="${isValidAmount(a) ? eur(a) + ' a month' : 'No amount'}">
          </div>
          <p class="scale" aria-hidden="true"><span>${eur(DATA.min)}</span><span>Preferred max ${eur(DATA.available)}</span><span>${eur(DATA.max)}</span></p>
          <div id="amount-msg"></div>
        </div>
        <div id="left-row"></div>
      </div>
      <div id="adjust-dyn" class="stack gap-8"></div>
      <section class="stack gap-3" aria-labelledby="changes-h">
        <div class="stack gap-1"><h2 class="h-section" id="changes-h">What changes?</h2>
        <p class="small muted">Changing the amount updates your projection. Moving the date is always your choice.</p></div>
        <div>${aiLink('Help me decide')}</div>
      </section>
    </div></div>
    <div id="adjust-bar"></div>`;
};

function updateAdjust({ focusId } = {}) {
  const a = S.amount;
  const valid = isValidAmount(a);
  const goal = S.goalDate;
  const field = $('#amount-field'); const input = $('#amount'); const slider = $('#slider');
  if (!field) return;
  field.classList.toggle('invalid', !valid);
  input.setAttribute('aria-invalid', String(!valid));
  if (document.activeElement !== input) input.value = Number.isFinite(a) ? a : '';
  if (valid) { slider.value = a; }
  slider.style.setProperty('--fill', valid ? `${(a - DATA.min) / (DATA.max - DATA.min) * 100}%` : '0%');
  slider.setAttribute('aria-valuetext', valid ? `${eur(a)} a month` : 'No amount');

  let msg = '';
  if (!valid) msg = `<p class="inline-msg error" style="margin-top:var(--space-6)">${ic('circle-x')}<span>${Number.isFinite(a) && a > DATA.max ? `Enter an amount up to ${eur(DATA.max)}.` : `Enter an amount of at least ${eur(DATA.min)}.`}</span></p>`;
  else if (a > DATA.available) msg = `<div style="margin-top:var(--space-6)">${notice(`Above your preferred ${eur(DATA.available)}`, `Leaves about ${eur(leftEachMonth(a))} a month for everything else.`, 'warning')}</div>`;
  $('#amount-msg').innerHTML = msg;
  $('#left-row').innerHTML = valid ? rows([['Left each month', '≈ ' + eur(leftEachMonth(a))]]) : '';

  let dyn = ''; let canReview = false; let helper = '';
  if (valid) {
    const p = projection(a, goal);
    const need = suggested(goal);
    const sch = schedule(a);
    const moved = endOfMonth(sch.lastDate);
    if (p.short > 0) {
      dyn = `
        <div class="inline-msg warning">${ic('alert')}<div class="stack gap-1"><strong>${eur(p.short)} short by ${fmtLong(goal)}.</strong><span class="small muted">At this amount, you’d have ${eur(p.byGoal)}.</span></div></div>
        <section class="stack gap-4" aria-labelledby="keep-h">
          <h2 class="h-section" id="keep-h">Choose what to keep</h2>
          <div class="stack gap-3" role="radiogroup" aria-labelledby="keep-h">
            <button class="radio-card" type="button" role="radio" id="opt-date" aria-checked="false" data-action="keep-date">
              <span class="radio" aria-hidden="true"></span><span class="text"><span class="h-sub">Keep the date</span><span class="small muted">${fmt(goal)}</span><span class="outcome">Save ${eur(need)} a month</span></span></button>
            <button class="radio-card" type="button" role="radio" id="opt-amount" aria-checked="${S.choice === 'amount'}" data-action="keep-amount">
              <span class="radio" aria-hidden="true"></span><span class="text"><span class="h-sub">Keep the amount</span><span class="small muted">Save ${eur(a)} a month</span><span class="outcome">Move your goal to ${fmt(moved)}</span></span></button>
          </div>
          ${S.choice === 'amount'
            ? `<div class="stack gap-3"><p class="status positive">${ic('circle-check')}<span>${eur(DATA.target)} by ${fmt(sch.lastDate)}</span></p><p class="muted">${sch.text}. Your selected goal date is ${fmt(moved)}.</p></div>`
            : '<p class="small muted">Your goal date stays the same until you choose.</p>'}
        </section>`;
      canReview = S.choice === 'amount';
      helper = canReview ? '' : 'Choose a date or amount to continue.';
    } else {
      dyn = `<div class="stack gap-2"><p class="status positive">${ic('circle-check')}<span>On track for ${fmt(sch.lastDate)}</span></p><p class="small muted">${sch.text}. Your goal date stays ${fmt(goal)}.</p></div>`;
      canReview = true;
    }
  } else helper = 'Fix the amount to continue.';
  $('#adjust-dyn').innerHTML = dyn;
  $('#adjust-bar').innerHTML = bottomBar({
    helper,
    primary: `<button class="btn btn-primary" type="button" data-action="adjust-review" ${canReview ? '' : 'aria-disabled="true" aria-describedby="bar-helper"'}>Review plan</button>`,
  });
  if (focusId) $('#' + focusId)?.focus();
}

screens.review = () => {
  const p = S.plan; const sch = schedule(p.amount);
  return `
    ${appBar('Review plan')}
    <div class="scroll"><div class="content">
      <div class="stack gap-3"><h1 class="title" tabindex="-1">One last look.</h1>${goalTag('Summer holiday')}</div>
      <div class="stack gap-2"><p class="amount-row"><span class="amount">${eur(p.amount)}</span><span class="unit">/ month</span></p><p class="small muted">${sch.text}</p></div>
      <dl class="tile">
        <div class="stat"><dt>Already saved</dt><dd>${eur(DATA.saved)}</dd></div><hr>
        <div class="stat"><dt>Your target</dt><dd>${eur(DATA.target)}</dd></div>
      </dl>
      <section class="stack gap-2" aria-labelledby="sched-h"><h2 class="h-section" id="sched-h">Schedule</h2>
        <dl class="rows">
          <div class="list-row"><dt>First transfer</dt><dd><span>${fmt(FIRST)}</span></dd></div>
          <div class="list-row"><dt>Frequency</dt><dd><span>Monthly on the 1st</span></dd></div>
          <div class="list-row"><dt>Final transfer</dt><dd><span>${eur(sch.last)}</span><small>${fmt(sch.lastDate)}</small></dd></div>
          <div class="list-row"><dt>Goal date</dt><dd><span>${fmt(p.goalDate)}</span>${p.changed ? '<span class="badge">Changed</span>' : ''}</dd></div>
        </dl></section>
      <section class="stack gap-2" aria-labelledby="money-h"><h2 class="h-section" id="money-h">Your money</h2>
        ${rows([['From', DATA.account], ['To', DATA.pot], ['New savings', eur(REMAINING)], ['Fees', '€0'], ['Left each month', '≈ ' + eur(leftEachMonth(p.amount))]])}</section>
      <section class="stack gap-6" aria-labelledby="ctl-h">
        <div class="stack gap-1"><h2 class="h-section" id="ctl-h">You stay in control.</h2><p class="small muted">Transfers stop when your goal reaches ${eur(DATA.target)}. You can edit or pause the plan before the next transfer.</p></div>
        ${notice('If your balance is too low', 'We’ll skip that transfer and let you know. Your account won’t go overdrawn.')}
      </section>
    </div></div>
    ${bottomBar({
      helper: S.confirming ? 'Scheduling your plan…' : 'No money moves today.',
      primary: S.confirming
        ? `<button class="btn btn-primary" type="button" aria-busy="true" aria-disabled="true">${ic('loader', 'sm spinner')}Confirming…</button>`
        : '<button class="btn btn-primary" type="button" data-action="confirm">Confirm savings plan</button>',
      secondary: `<button class="btn btn-tertiary" type="button" data-action="edit-plan" ${S.confirming ? 'aria-disabled="true"' : ''}>Edit plan</button>`,
    })}`;
};

const outcomeScreen = paused => {
  const p = S.plan; const sch = schedule(p.amount);
  return `
    ${appBar('Summer holiday', { back: false })}
    <div class="scroll"><div class="content">
      <div class="stack gap-6">
        <div class="outcome-mark ${paused ? 'paused' : ''}" aria-hidden="true">${ic(paused ? 'pause' : 'check', 'lg')}</div>
        <div class="stack gap-3">
          <p class="status ${paused ? 'paused' : 'positive'}">${ic(paused ? 'pause' : 'calendar')}<span>${paused ? 'Paused' : 'Scheduled'}</span></p>
          <h1 class="title" tabindex="-1">${paused ? 'Take a pause.<br>Your savings stay.' : 'One step closer<br>to summer.'}</h1>
        </div>
      </div>
      <div class="stack gap-2">
        <p class="overline">${paused ? 'Upcoming transfers' : 'Your next transfer'}</p>
        <p class="amount">${paused ? 'None scheduled' : eur(sch.k === 1 ? sch.last : p.amount)}</p>
        <p class="${paused ? 'muted' : ''}">${paused ? `Your ${eur(DATA.saved)} stays in your Summer holiday pot.<br>Nothing moves while your plan is paused.` : `on ${fmt(FIRST)}`}</p>
      </div>
      ${progress()}
      ${paused ? '' : notice('Nothing moves today', 'Your first transfer is scheduled. If your balance is too low, we’ll skip it and tell you.')}
      <section class="stack gap-2" aria-labelledby="details-h">
        <h2 class="h-section" id="details-h">${paused ? 'Your savings' : 'The plan from here'}</h2>
        ${paused ? rows([['To', DATA.pot], ['Saved so far', eur(DATA.saved)]]) : rows([['To', DATA.pot], ['Schedule', sch.text], ['Expected to reach goal', fmt(sch.lastDate)]])}
      </section>
      <div class="toggle-row">
        ${ic('bell')}
        <div class="text"><span class="body-m" id="rem-l">A reminder, a day before</span><span class="small muted" id="rem-d">Before each scheduled transfer</span></div>
        <button class="switch" type="button" role="switch" aria-checked="${S.reminder}" aria-labelledby="rem-l" aria-describedby="rem-d" data-action="toggle-reminder"></button>
      </div>
    </div></div>
    ${bottomBar({
      primary: '<button class="btn btn-primary" type="button" data-action="finish">Done</button>',
      secondary: '<button class="btn btn-tertiary" type="button" data-action="manage">Manage plan</button>',
    })}`;
};
screens.scheduled = () => outcomeScreen(false);
screens.paused = () => outcomeScreen(true);

// ---------------------------------------------------------------- Render
const NEEDS_PLAN = ['review', 'scheduled', 'paused'];
function render({ focus = true } = {}) {
  closeSheet({ restore: false });
  let r = route();
  if (!screens[r]) r = 'goal';
  if (r !== 'goal' && !S.goalDate) S.goalDate = DEFAULT_GOAL;
  if (NEEDS_PLAN.includes(r)) ensurePlanContext();
  if (r === 'scheduled' && S.status === 'paused') S.status = 'scheduled';
  if (r === 'paused') S.status = 'paused';
  if (r === 'adjust' && !Number.isFinite(S.amount) && S.amount !== null) { /* keep invalid input */ }
  else if (r === 'adjust' && S.amount === null) S.amount = suggested(S.goalDate);
  app.innerHTML = screens[r]();
  app.dataset.route = r;
  if (r === 'adjust') updateAdjust();
  const titles = { goal: 'Save for a holiday', picture: 'Your monthly picture', plan: 'Your savings plan', adjust: 'Adjust your plan', review: 'Review plan', scheduled: 'Plan scheduled', paused: 'Plan paused' };
  document.title = `${titles[r]} · Pace`;
  if (focus) $('h1', app)?.focus({ preventScroll: true });
}
window.addEventListener('hashchange', () => render());

// ---------------------------------------------------------------- Sheets (dialogs)
let lastFocus = null; let sheetKind = null; let sheetState = {};
function openSheet(kind, opts = {}) {
  lastFocus = document.activeElement; sheetKind = kind; sheetState = opts;
  overlay.innerHTML = `<div class="scrim" data-action="close-sheet"></div>${sheets[kind]()}`;
  app.inert = true; $('.stage-note').inert = true;
  if (kind === 'date') updateDateSheet();
  const first = $('.sheet [data-autofocus]') || $('.sheet button, .sheet input');
  first?.focus();
}
function closeSheet({ restore = true } = {}) {
  if (!sheetKind) return;
  overlay.innerHTML = ''; sheetKind = null; app.inert = false; $('.stage-note').inert = false;
  if (restore && lastFocus && document.contains(lastFocus)) lastFocus.focus();
}
document.addEventListener('keydown', e => {
  if (!sheetKind) return;
  if (e.key === 'Enter' && e.target.id === 'date-input') { e.preventDefault(); e.target.dispatchEvent(new Event('change', { bubbles: true })); return; }
  if (e.key === 'Escape') { e.preventDefault(); closeSheet(); return; }
  if (e.key === 'Tab') {
    const f = [...overlay.querySelectorAll('button:not([disabled]), input, [tabindex="0"]')].filter(el => el.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});

const sheets = {};
const sheetHead = (title, id) => `<div class="grabber" aria-hidden="true"></div>
  <div class="sheet-head"><h2 class="h-section" id="${id}">${title}</h2>
  <button class="icon-btn" type="button" data-action="close-sheet" aria-label="Close" data-autofocus>${ic('x')}</button></div>`;

// Date picker
sheets.date = () => `
  <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="date-h">
    ${sheetHead('When do you need it?', 'date-h')}
    <div class="sheet-body">
      <p class="muted">Give your summer plans a date.</p>
      <div class="chips" role="radiogroup" aria-label="Suggested dates" id="presets"></div>
      <div class="stack gap-2">
        <div class="cal-nav"><button class="icon-btn" type="button" data-action="cal-prev" aria-label="Previous month">${ic('chevron-left')}</button>
          <p class="h-sub" id="cal-title" aria-live="polite"></p>
          <button class="icon-btn" type="button" data-action="cal-next" aria-label="Next month">${ic('chevron-right')}</button></div>
        <table class="cal" aria-labelledby="cal-title"><thead><tr>${['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d => `<th scope="col"><abbr title="${d}">${d[0]}</abbr></th>`).join('')}</tr></thead><tbody id="cal-body"></tbody></table>
      </div>
      <div class="date-field">
        <label class="small muted" for="date-input">Or type a goal date</label>
        <input id="date-input" inputmode="numeric" placeholder="e.g. 31/07/2027" autocomplete="off" aria-describedby="date-msg">
        <div id="date-msg"></div>
      </div>
      <p class="small muted">Your first transfer is on ${fmt(FIRST)}.</p>
    </div>
    <div id="date-bar"></div>
  </div>`;
function updateDateSheet() {
  const st = sheetState;
  if (!st.view) { const base = st.date || S.goalDate || DEFAULT_GOAL; st.view = new Date(base.getFullYear(), base.getMonth(), 1); }
  $('#presets').innerHTML = PRESETS.map((d, i) => {
    const on = sameDay(d, st.date);
    return `<button class="chip" type="button" role="radio" aria-checked="${on}" data-action="preset" data-i="${i}">${on ? ic('check', 'sm') : ''}<span>${d.getDate()} ${MON[d.getMonth()]}</span></button>`;
  }).join('');
  const v = st.view;
  $('#cal-title').textContent = `${MONTH[v.getMonth()]} ${v.getFullYear()}`;
  const startDay = (new Date(v.getFullYear(), v.getMonth(), 1).getDay() + 6) % 7; // Monday = 0
  const days = endOfMonth(v).getDate();
  let html = '<tr>'; let col = 0;
  for (let i = 0; i < startDay; i++, col++) html += '<td></td>';
  for (let d = 1; d <= days; d++, col++) {
    if (col && col % 7 === 0) html += '</tr><tr>';
    const date = new Date(v.getFullYear(), v.getMonth(), d);
    const disabled = date <= FIRST;
    const sel = sameDay(date, st.date);
    html += `<td><button type="button" data-action="day" data-d="${d}" aria-label="${fmt(date)}" aria-pressed="${sel}" ${disabled ? 'disabled' : ''}>${d}</button></td>`;
  }
  while (col % 7) { html += '<td></td>'; col++; }
  $('#cal-body').innerHTML = html + '</tr>';
  $('[data-action="cal-prev"]').disabled = v <= new Date(FIRST.getFullYear(), FIRST.getMonth(), 1);
  const err = st.error;
  const input = $('#date-input');
  input.setAttribute('aria-invalid', String(!!err));
  $('#date-msg').innerHTML = err ? `<p class="inline-msg error">${ic('circle-x')}<span>${err}</span></p>` : '';
  const ok = st.date && !err;
  $('#date-bar').innerHTML = bottomBar({ primary: `<button class="btn btn-primary" type="button" data-action="use-date" ${ok ? '' : 'aria-disabled="true"'}>${ok ? 'Use ' + fmt(st.date) : 'Use date'}</button>` });
}
function parseTypedDate(s) {
  const m = s.trim().match(/^(\d{1,2})[\/.\- ](\d{1,2})[\/.\- ](\d{4})$/);
  if (!m) return null;
  const d = new Date(+m[3], +m[2] - 1, +m[1]);
  return d.getDate() === +m[1] && d.getMonth() === +m[2] - 1 ? d : null;
}

// Manage plan
sheets.manage = () => {
  const paused = S.status === 'paused'; const p = S.plan;
  return `
  <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="manage-h">
    ${sheetHead('Manage plan', 'manage-h')}
    <div class="sheet-body">
      <div class="stack gap-4">
        <p class="status ${paused ? 'paused' : 'positive'}">${ic(paused ? 'pause' : 'calendar')}<span>${paused ? 'Paused' : 'Scheduled'}</span></p>
        <div class="stack gap-2"><p class="title">${paused ? 'No transfers' : eur(p.amount)}</p><p class="muted">${paused ? `Your ${eur(DATA.saved)} stays in your Summer holiday pot.` : `Next transfer · ${fmt(FIRST)}`}</p></div>
      </div>
      <div class="stack gap-2">
        ${paused
          ? `<button class="btn btn-primary" type="button" data-action="resume">${ic('play', 'sm')}Resume plan</button><button class="btn btn-tertiary" type="button" data-action="edit-from-manage">Edit plan</button>`
          : `<button class="btn btn-primary" type="button" data-action="edit-from-manage">Edit plan</button><button class="btn btn-tertiary" type="button" data-action="pause">${ic('pause', 'sm')}Pause plan</button>`}
      </div>
      <div class="stack gap-4">
        <p class="muted">${paused ? 'Resuming restarts transfers from the next 1st of the month.' : 'Pausing stops future transfers. Edits need a new review.'}</p>
        <div><button class="link" type="button" data-action="support"><span>Need help? Contact support</span></button></div>
      </div>
    </div>${home}
  </div>`;
};

// Ask Pace
sheets.ask = () => `
  <div class="sheet tall" role="dialog" aria-modal="true" aria-labelledby="ask-h">
    <div class="grabber" aria-hidden="true"></div>
    <div class="sheet-head ai">
      <div class="stack gap-3">
        <div><p class="row h-section" id="ask-h">${ic('sparkles', 'icon-positive')}Ask Pace</p><p class="caption muted">AI · can make mistakes</p></div>
        <p class="goal-tag" style="color:var(--color-text-primary)">${ic('flag')}<span>Summer holiday · ${S.goalDate ? 'by ' + fmt(S.goalDate) : eur(DATA.target)}</span></p>
      </div>
      <button class="icon-btn" type="button" data-action="close-sheet" aria-label="Close">${ic('x')}</button>
    </div>
    <div class="sheet-body" id="ask-log" aria-live="polite" aria-relevant="additions"></div>
    <div class="composer">
      <form data-form="ask"><label class="sr-only" for="ask-input">Ask about your plan</label>
        <input id="ask-input" name="msg" autocomplete="off" placeholder="Ask about your plan…" data-autofocus>
        <button class="icon-btn filled" type="submit" aria-label="Send">${ic('arrow-up')}</button></form>
    </div>${home}
  </div>`;
function renderAsk() {
  const log = $('#ask-log'); if (!log) return;
  const goal = S.goalDate;
  const sugg = goal
    ? [`Why ${eur(suggested(goal))}?`, 'I can save €250 a month.', 'What if I need it sooner?']
    : ['How do you work out what I can afford?', 'Is my money safe?'];
  log.innerHTML = (S.ask.length ? '' : `<div class="msg-ai"><p class="ai-label">${ic('sparkles', 'sm')}PACE</p><p>Ask me anything about this plan. I’ll explain the numbers. You decide what happens.</p></div>`)
    + S.ask.map(m => m.who === 'user' ? `<p class="msg-user">${esc(m.text)}</p>`
      : m.who === 'typing' ? `<p class="typing"><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>Pace is thinking…</p>`
      : `<div class="msg-ai"><p class="ai-label">${ic('sparkles', 'sm')}PACE</p>${m.html}</div>${m.draft || ''}`).join('')
    + (S.ask.some(m => m.who === 'typing') ? '' : `<div class="chips" aria-label="Suggested questions">${sugg.map(q => `<button class="chip" type="button" data-action="ask-suggest" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div>`);
  log.scrollTop = log.scrollHeight;
}
function paceReply(text) {
  const t = text.toLowerCase();
  const goal = S.goalDate;
  const num = (t.replace(/[,€]/g, '').match(/\b(\d{1,5})\b/) || [])[1];
  if (!goal) {
    if (/safe|secure/.test(t)) return { html: '<p>Your savings stay in your own Pace pot. Nothing moves without your confirmation.</p>' };
    return { html: '<p>I look at your last 3 complete months of income, bills and everyday spending, then keep a buffer for the unexpected. Pick a date first and I’ll show you a monthly amount.</p>' };
  }
  const need = suggested(goal); const n = transfersBy(goal);
  if (/why|how|work out|calculat/.test(t)) return { html: `<p>It covers the remaining ${eur(REMAINING)} in ${n} transfers and leaves about ${eur(leftEachMonth(need))} a month.</p>` };
  if (num && !/20\d\d/.test(num)) {
    const a = +num;
    if (!isValidAmount(a)) return { html: `<p>I can plan between ${eur(DATA.min)} and ${eur(DATA.max)} a month. That’s what’s left after bills and spending.</p>` };
    const p = projection(a, goal); const sch = schedule(a);
    const draft = `
      <div class="draft" aria-label="Updated draft">
        <div class="row between"><p class="overline">Updated draft</p><span class="badge">Not scheduled</span></div>
        <p class="amount-row"><span class="amount">${eur(a)}</span><span class="unit">/ month</span></p>
        <dl class="row between" style="align-items:flex-start">
          <div class="stat"><dt>By ${fmt(goal)}</dt><dd>${eur(p.byGoal)}</dd></div>
          <div class="stat right"><dt>Left each month</dt><dd>≈ ${eur(leftEachMonth(a))}</dd></div>
        </dl>
        <p class="muted" style="padding:var(--space-1) 0 var(--space-3)">Your goal date hasn’t changed.</p>
        <div class="stack gap-1">
          <button class="btn btn-primary" type="button" data-action="draft-compare" data-a="${a}">${p.short > 0 ? 'Compare my options' : 'Use this amount'}</button>
          <button class="btn btn-tertiary" type="button" data-action="close-sheet">Keep ${eur(need)} a month</button>
        </div>
      </div>`;
    return p.short > 0
      ? { html: `<p>At ${eur(a)} a month, ${MONTH[goal.getMonth()]} leaves a ${eur(p.short)} gap.</p><p>You can keep the date or give yourself more time.</p>`, draft }
      : { html: `<p>At ${eur(a)} a month you’d reach ${eur(DATA.target)} by ${fmt(sch.lastDate)}. That’s on track for your date.</p>`, draft };
  }
  if (/sooner|earlier|june|later|date|august/.test(t)) {
    const opts = PRESETS.map(d => `${fmt(d)}: ${eur(suggested(d))} a month`).join('<br>');
    return { html: `<p>Moving the date changes the monthly amount:</p><p>${opts}</p><p>I won’t change your date for you. You can pick one in your plan.</p>` };
  }
  if (/safe|secure|risk|overdrawn|low/.test(t)) return { html: '<p>If your balance is too low on the 1st, we skip that transfer and tell you. Your account won’t go overdrawn.</p>' };
  if (/buffer|estimate|income|spend/.test(t)) return { html: `<p>I used your last 3 complete months: ${eur(DATA.income)} income, ${eur(DATA.bills)} bills and ${eur(DATA.spending)} everyday spending. I kept ${eur(DATA.buffer)} aside as a buffer.</p>` };
  return { html: '<p>I can explain your estimate, compare dates, or try a different monthly amount. Try “I can save €250 a month.”</p>' };
}
function askPace(text) {
  if (!text.trim()) return;
  S.ask.push({ who: 'user', text: text.trim() }, { who: 'typing' });
  renderAsk();
  setTimeout(() => {
    S.ask = S.ask.filter(m => m.who !== 'typing');
    const r = paceReply(text);
    S.ask.push({ who: 'ai', html: r.html, draft: r.draft });
    renderAsk();
    announce('Pace replied: ' + r.html.replace(/<[^>]+>/g, ' '));
  }, 700);
}

// ---------------------------------------------------------------- Actions
function chooseGoal(date) {
  S.goalDate = date; S.amount = null; S.choice = null; S.plan = null; S.analysing = true;
  render({ focus: false });
  announce(`Goal date ${fmt(date)}. Looking at your last 3 complete months.`);
  setTimeout(() => { S.analysing = false; go('picture'); }, 1800);
}
function restart(msg) {
  S = initialState(); closeSheet({ restore: false });
  if (route() === 'goal') render(); else go('goal');
  if (msg) toast(msg);
}
const actions = {
  back, restart: () => restart('Demo restarted.'),
  ask: () => { openSheet('ask'); renderAsk(); },
  support: () => toast('Support chat would open here (demo).'),
  'close-sheet': () => closeSheet(),
  'pick-default': () => chooseGoal(DEFAULT_GOAL),
  'open-date': () => openSheet('date', { date: S.goalDate }),
  'scroll-breakdown': () => { const h = $('#breakdown-h'); h.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); h.focus({ preventScroll: true }); },
  'to-plan': () => go('plan'),
  'plan-review': el => { if (el.getAttribute('aria-disabled') === 'true') return; S.plan = { amount: suggested(S.goalDate), goalDate: S.goalDate, changed: false }; go('review'); },
  'plan-adjust': () => { S.amount = suggested(S.goalDate); S.choice = null; go('adjust'); },
  step: el => {
    const dir = +el.dataset.step;
    const a = isValidAmount(S.amount) ? S.amount : (dir > 0 ? DATA.min - DATA.step : DATA.min + DATA.step);
    S.amount = Math.min(DATA.max, Math.max(DATA.min, Math.round((a + dir * DATA.step) / DATA.step) * DATA.step));
    S.choice = null; updateAdjust(); announce(`${eur(S.amount)} a month`);
  },
  'keep-date': () => { S.amount = suggested(S.goalDate); S.choice = null; updateAdjust({ focusId: 'amount' }); announce(`Amount set to ${eur(S.amount)} a month. Your goal date stays ${fmt(S.goalDate)}.`); },
  'keep-amount': () => { S.choice = 'amount'; updateAdjust({ focusId: 'opt-amount' }); announce(`Goal date will move to ${fmt(endOfMonth(schedule(S.amount).lastDate))}.`); },
  'adjust-review': el => {
    if (el.getAttribute('aria-disabled') === 'true') { $('#bar-helper') && announce($('#bar-helper').textContent); return; }
    const sch = schedule(S.amount);
    const changed = S.choice === 'amount';
    S.plan = { amount: S.amount, goalDate: changed ? endOfMonth(sch.lastDate) : S.goalDate, changed };
    go('review');
  },
  confirm: () => {
    if (S.confirming) return;
    S.confirming = true; render({ focus: false }); $('[aria-busy="true"]')?.focus(); announce('Confirming your savings plan.');
    setTimeout(() => { S.confirming = false; S.status = 'scheduled'; S.goalDate = S.plan.goalDate; go('scheduled', { replace: true }); announce('Plan scheduled. Nothing moves today.'); }, 1500);
  },
  'edit-plan': el => { if (el.getAttribute('aria-disabled') === 'true') return; S.amount = S.plan.amount; S.choice = null; go('adjust'); },
  'toggle-reminder': el => { S.reminder = !S.reminder; el.setAttribute('aria-checked', String(S.reminder)); announce(S.reminder ? 'Reminder on' : 'Reminder off'); },
  finish: () => restart('Demo complete. Restarted from the beginning.'),
  manage: () => openSheet('manage'),
  pause: () => { closeSheet({ restore: false }); S.status = 'paused'; go('paused', { replace: true }); announce('Plan paused. Nothing moves while paused.'); },
  resume: () => { closeSheet({ restore: false }); S.status = 'scheduled'; go('scheduled', { replace: true }); announce('Plan resumed.'); },
  'edit-from-manage': () => { closeSheet({ restore: false }); S.goalDate = S.plan.goalDate; S.amount = S.plan.amount; S.choice = null; go('adjust'); },
  // date sheet
  preset: el => { sheetState.date = PRESETS[+el.dataset.i]; sheetState.error = null; sheetState.view = new Date(sheetState.date.getFullYear(), sheetState.date.getMonth(), 1); $('#date-input').value = ''; sheetState.lastTyped = ''; updateDateSheet(); $(`[data-action="preset"][data-i="${el.dataset.i}"]`).focus(); },
  'cal-prev': () => { sheetState.view = addMonths(sheetState.view, -1); updateDateSheet(); },
  'cal-next': () => { sheetState.view = addMonths(sheetState.view, 1); updateDateSheet(); },
  day: el => { const v = sheetState.view; sheetState.date = new Date(v.getFullYear(), v.getMonth(), +el.dataset.d); sheetState.error = null; $('#date-input').value = ''; sheetState.lastTyped = ''; updateDateSheet(); $(`[data-action="day"][data-d="${el.dataset.d}"]`).focus(); },
  'use-date': el => { if (el.getAttribute('aria-disabled') === 'true') return; const d = sheetState.date; closeSheet({ restore: false }); chooseGoal(d); },
  // ask
  'ask-suggest': el => askPace(el.dataset.q),
  'draft-compare': el => { closeSheet({ restore: false }); S.amount = +el.dataset.a; S.choice = null; if (route() === 'adjust') { updateAdjust({ focusId: 'amount' }); } else go('adjust'); },
};
document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el || el.disabled) return;
  const fn = actions[el.dataset.action];
  if (fn) { e.preventDefault(); fn(el); }
});
document.addEventListener('submit', e => {
  const form = e.target.closest('[data-form]'); if (!form) return;
  e.preventDefault();
  const input = form.querySelector('input'); const text = input.value.trim(); if (!text) return;
  input.value = '';
  if (form.dataset.form === 'ask') { askPace(text); return; }
  // goal chat
  S.chat.push({ who: 'user', text });
  const amountAsked = /\d/.test(text) && !S.goalDate;
  S.chat.push({ who: 'ai', text: S.goalDate ? 'Got it. I’m working out your plan now.' : amountAsked ? 'Thanks. First, pick when you’d like the money ready, and I’ll work out a monthly amount that fits.' : 'I can help with that. Pick a date above to get started.' });
  render({ focus: false }); $('#goal-input')?.focus(); announce('Pace replied.');
});
document.addEventListener('input', e => {
  if (e.target.id === 'amount') {
    const digits = e.target.value.replace(/[^\d]/g, '');
    if (digits !== e.target.value) e.target.value = digits;
    S.amount = digits === '' ? NaN : +digits; S.choice = null; updateAdjust();
  } else if (e.target.id === 'slider') {
    S.amount = +e.target.value; S.choice = null; updateAdjust();
  }
});
document.addEventListener('change', e => {
  if (e.target.id === 'date-input') {
    const v = e.target.value.trim();
    if (v === sheetState.lastTyped) return; // already validated (Enter, then blur)
    sheetState.lastTyped = v;
    if (!v) { sheetState.error = null; updateDateSheet(); return; }
    const d = parseTypedDate(v);
    if (!d) { sheetState.error = 'Enter a date like 31/07/2027.'; sheetState.date = null; }
    else if (d <= FIRST) { sheetState.error = `Choose a date after your first transfer on ${fmt(FIRST)}.`; sheetState.date = null; }
    else { sheetState.error = null; sheetState.date = d; sheetState.view = new Date(d.getFullYear(), d.getMonth(), 1); }
    updateDateSheet();
  }
});

render({ focus: false });
