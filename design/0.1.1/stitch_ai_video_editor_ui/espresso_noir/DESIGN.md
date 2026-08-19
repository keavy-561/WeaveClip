---
name: Espresso Noir
colors:
  surface: '#141400'
  surface-dim: '#141400'
  surface-bright: '#3b3b00'
  surface-container-lowest: '#0f0f00'
  surface-container-low: '#1c1d00'
  surface-container: '#212100'
  surface-container-high: '#2b2c00'
  surface-container-highest: '#363700'
  on-surface: '#e8ea24'
  on-surface-variant: '#d4c3be'
  inverse-surface: '#e8ea24'
  inverse-on-surface: '#323200'
  outline: '#9d8d89'
  outline-variant: '#504440'
  surface-tint: '#e9bdae'
  primary: '#e9bdae'
  on-primary: '#45291f'
  primary-container: '#af887a'
  on-primary-container: '#3e2319'
  inverse-primary: '#79564a'
  secondary: '#dfc1a7'
  on-secondary: '#3f2d1b'
  secondary-container: '#5a4531'
  on-secondary-container: '#d0b39a'
  tertiary: '#d2c4bf'
  on-tertiary: '#372f2c'
  tertiary-container: '#9a8e8a'
  on-tertiary-container: '#302825'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdbcf'
  primary-fixed-dim: '#e9bdae'
  on-primary-fixed: '#2d150c'
  on-primary-fixed-variant: '#5e3f34'
  secondary-fixed: '#fcddc2'
  secondary-fixed-dim: '#dfc1a7'
  on-secondary-fixed: '#281808'
  on-secondary-fixed-variant: '#57432f'
  tertiary-fixed: '#eedfdb'
  tertiary-fixed-dim: '#d2c4bf'
  on-tertiary-fixed: '#211a17'
  on-tertiary-fixed-variant: '#4e4542'
  background: '#141400'
  on-background: '#e8ea24'
  surface-variant: '#363700'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '500'
    lineHeight: 12px
    letterSpacing: 0.05em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  toolbar-height: 40px
  panel-gap: 1px
  container-padding: 12px
  item-gap-dense: 4px
  item-gap-relaxed: 12px
---

## Brand & Style

The brand personality is professional, sophisticated, and technologically advanced, catering to high-end content creators and professional video editors. The UI evokes a sense of "quiet power"—where the interface recedes to let the creative content shine, while remaining incredibly precise and functional.

This design system utilizes a **Corporate / Modern** base refined with **Minimalist** and **Tonal Layering** techniques. It prioritizes information density and clarity. The aesthetic is defined by a deep, monochromatic foundation punctuated by warm, editorial accents that make the workspace feel premium rather than clinical.

**Core Visual Principles:**
- **High-Density Utility:** Every pixel is accounted for, maximizing the workspace for complex timelines and property panels.
- **Subdued Sophistication:** Moving away from standard "tech blue" in favor of a warm-dark palette inspired by editorial design.
- **Content-First Focus:** UI elements use low-contrast borders and tonal shifts to maintain hierarchy without distracting from the video preview.

## Colors

The palette is a "Soft Neutral" dark mode. It replaces the harsh blacks of traditional editors with a deep, rich **Deep Espresso** base to reduce eye strain during long editing sessions.

- **Primary (Dusty Rose):** Reserved for primary actions, active timeline selections, and key AI-triggering buttons.
- **Secondary (Warm Beige):** Used for secondary accents, hover states, and highlighting specific metadata or tool-tips.
- **Backgrounds:** Use a tiered system of Espresso shades. `#1A1615` is the global canvas, while `#26211F` defines functional panels (Timeline, Inspector, Assets).
- **Accents:** Derived from the refined tokens, using muted purples (`#7F6070`) and slate blues (`#899AAB`) sparingly for differentiating track types (Audio vs. Video vs. AI Effects).

## Typography

The typography system prioritizes legibility in high-density environments. **Inter** provides a clean, neutral canvas for the majority of the interface, while **JetBrains Mono** is introduced for technical readouts, timecodes, and property values to ensure character alignment and a "pro-tool" feel.

- **Hierarchy:** Use `Headline-MD` for panel titles. `Body-SM` is the workhorse for labels and property names.
- **Numeric Data:** All timecodes and frame counts must use `Label-MD` or `Label-SM` to ensure digits don't shift layout when values change.
- **Contrast:** Active labels use `Cloud White (#E9E5E1)`, while inactive or secondary labels should drop to `Stone Gray (#DADC08)` at 60% opacity.

## Layout & Spacing

This design system uses a **Fixed Grid** workspace model. The layout is divided into functional "Zones" separated by 1px "Dividers" (rather than large gaps) to maximize screen real estate.

- **The 4px Rule:** All spacing must be a multiple of 4px. Use `4px` for internal component padding (e.g., inside a button) and `12px` for container margins.
- **High-Density Toolbars:** Toolbars are fixed at `40px` height to allow for a large vertical stack of panels (Media, Viewer, Inspector, Timeline).
- **Responsive Behavior:** On smaller screens, the Inspector panel (right-side) collapses into an icon-only drawer. The Timeline remains fluid, expanding to fill the bottom 30-40% of the viewport.

## Elevation & Depth

Visual hierarchy is established through **Tonal Layers** and **Low-Contrast Outlines**. In a dark pro-editor, shadows are often distracting; instead, we use surface brightness to indicate "height."

- **Level 0 (Canvas):** `#1A1615` - The base background.
- **Level 1 (Panels):** `#26211F` - Media bins, Timeline background.
- **Level 2 (Popovers/Modals):** `#322B29` - Temporary menus or effect settings.
- **Borders:** Panels are separated by a 1px solid border in `#322B29`. Active states (e.g., a selected clip) use a 1.5px border of `Dusty Rose (#9E786B)`.
- **Glassmorphism:** Use only for the "Video Preview" overlays (e.g., on-screen playback controls) with a 12px backdrop blur and 10% white tint.

## Shapes

The shape language is **Soft (0.25rem)**. This provides a modern feel while maintaining the structural integrity required for a grid-heavy editing interface.

- **Components:** Buttons and input fields use `rounded-sm` (4px).
- **Large Containers:** Asset thumbnails and the video player use `rounded-lg` (8px).
- **Timeline Clips:** Use a specific `2px` radius to allow them to sit flush against one another without looking "bubbly."

## Components

- **Buttons:** 
  - *Primary:* Solid `Dusty Rose`, white text. 
  - *Ghost:* No background, `Stone Gray` icon/text, shifts to `Warm Beige` on hover.
- **Input Fields:** Darker than the panel background (`#1A1615`), 1px border, `JetBrains Mono` for numeric inputs.
- **Timeline Clips:** 
  - *Video:* Deep Charcoal with a thin colored top-bar. 
  - *Audio:* Waveform rendered in `Warm Beige`. 
  - *AI Tracks:* Subtle gradient using `Dusty Rose` to signify generated content.
- **Chips:** Used for "Tags" or "Face Recognition" hits. Small, 10px font, `rounded-pill`, using a 20% opacity version of the accent colors.
- **Sliders:** Minimalist 2px track with a 12px circular thumb in `Warm Beige`. The track fills with `Dusty Rose` as the value increases.
- **Tool Sidebar:** Icon-only (24px icons), 48px wide, vertical alignment on the far left. Active tool highlighted with a subtle `Warm Beige` vertical sliver on the edge.