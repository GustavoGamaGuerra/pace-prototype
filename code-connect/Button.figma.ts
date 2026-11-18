// url=https://www.figma.com/design/PBixnVx0NkLeVxsQfB4dcB/WIT-Take-Home?node-id=39-35
// source=https://github.com/GustavoGamaGuerra/pace-prototype/blob/main/styles.css
// component=Button
/**
 * Pace · Button: Code Connect template (Code Connect v2, HTML)
 *
 * Figma  02 — Components › Button (component set 39:35)
 *        Variant  Primary | Secondary | Tertiary
 *        State    Default | Hover | Focused | Disabled | Loading
 *        Label (text) · Show icon (boolean)
 * Code   styles.css  .btn + .btn-primary | .btn-secondary | .btn-tertiary
 *        app.js renders it, e.g. bottomBar({ primary: '<button class="btn btn-primary" …>' })
 *
 * Hover and Focused are CSS states (:hover, :focus-visible), so they add no markup.
 * Disabled uses aria-disabled, not the disabled attribute, so the button stays
 * focusable and its helper text can explain why it is blocked.
 * Loading is aria-busy + aria-disabled, with the spinner icon in place of any icon.
 */
import figma from 'figma'

const instance = figma.selectedInstance

const variant = instance.getEnum('Variant', {
  Primary: 'btn-primary',
  Secondary: 'btn-secondary',
  Tertiary: 'btn-tertiary',
})
const state = instance.getEnum('State', {
  Default: 'default',
  Hover: 'default',
  Focused: 'default',
  Disabled: 'disabled',
  Loading: 'loading',
})
const label = instance.getString('Label')
const showIcon = instance.getBoolean('Show icon')

const attrs =
  state === 'disabled' ? ' aria-disabled="true"'
  : state === 'loading' ? ' aria-busy="true" aria-disabled="true"'
  : ''

const icon =
  state === 'loading' ? '<svg class="icon sm spinner" aria-hidden="true"><use href="#i-loader"></use></svg>'
  : showIcon ? '<svg class="icon sm" aria-hidden="true"><use href="#i-pause"></use></svg>'
  : ''

export default {
  id: 'pace-button',
  example: figma.html`<button type="button" class="btn ${variant}"${attrs}>${icon}${label}</button>`,
  metadata: { nestable: true },
}
