---
name: Morandi Minimal
colors:
  surface: '#faf9f5'
  surface-dim: '#dbdad6'
  surface-bright: '#faf9f5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f4f0'
  surface-container: '#efeeea'
  surface-container-high: '#e9e8e4'
  surface-container-highest: '#e3e2df'
  on-surface: '#1b1c1a'
  on-surface-variant: '#43474c'
  inverse-surface: '#2f312e'
  inverse-on-surface: '#f2f1ed'
  outline: '#74777c'
  outline-variant: '#c4c7cc'
  surface-tint: '#506070'
  primary: '#506070'
  on-primary: '#ffffff'
  primary-container: '#899aab'
  on-primary-container: '#223240'
  inverse-primary: '#b7c8da'
  secondary: '#695c52'
  on-secondary: '#ffffff'
  secondary-container: '#efdcd0'
  on-secondary-container: '#6e6056'
  tertiary: '#79564a'
  on-tertiary: '#ffffff'
  tertiary-container: '#b78f81'
  on-tertiary-container: '#45291f'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d3e4f7'
  primary-fixed-dim: '#b7c8da'
  on-primary-fixed: '#0c1d2a'
  on-primary-fixed-variant: '#384857'
  secondary-fixed: '#f2dfd3'
  secondary-fixed-dim: '#d5c3b7'
  on-secondary-fixed: '#231a12'
  on-secondary-fixed-variant: '#51443b'
  tertiary-fixed: '#ffdbcf'
  tertiary-fixed-dim: '#e9bdae'
  on-tertiary-fixed: '#2d150c'
  on-tertiary-fixed-variant: '#5e3f34'
  background: '#faf9f5'
  on-background: '#1b1c1a'
  surface-variant: '#e3e2df'
  sage-green: '#A29EAD'
  dusty-rose: '#D18E85'
  slate-blue: '#899AAB'
  warm-beige: '#D8C6BA'
  charcoal-text: '#423936'
  stone-gray: '#DADC08'
typography:
  headline-lg:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Manrope
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
    fontFamily: Manrope
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
  gutter: 12px
  margin: 16px
  panel-gap: 2px
  toolbar-height: 48px
---

## Brand & Style

The brand personality is artistic, serene, and intellectual, evolving from the precision of a dark "pro-tool" into a light-filled editorial studio. This design system evokes a sense of "quiet luxury"—where the interface feels like high-quality paper and the colors are pulled from a muted, naturalist palette.

This design system utilizes a **Minimalist** foundation enriched with **Tonal Layers** and **Soft Neutrals**. It prioritizes a calm user experience, reducing cognitive load through low-saturation colors while maintaining the rigorous functional density required for complex workflows.

**Core Visual Principles:**
- **Atmospheric Clarity:** Large expanses of off-white and soft gray create a breathable, high-end environment that minimizes eye fatigue.
- **Muted Precision:** Functional elements are defined by "Morandi" dusty tones rather than vibrant primaries, ensuring the UI never competes with the user's content.
- **Tactile Depth:** Depth is communicated through subtle shifts in warm and cool neutrals, mimicking the layering of matte paint.

## Colors

The palette is anchored in the "Morandi Light" aesthetic, utilizing desaturated, dusty tones to create a sophisticated and professional workspace.

- **Primary (Slate Blue):** Used for primary actions and active state indicators. It provides a cool, stable anchor for the interface.
- **Secondary (Warm Beige):** Applied to supporting UI elements, hover states, and container backgrounds to add warmth to the gray-scale base.
- **Tertiary (Dusty Rose):** Reserved for special highlights, AI features, or subtle call-to-outs that require distinction without high-contrast aggression.
- **Neutral (Off-White):** The `FAF9F5` base acts as the global canvas, providing a soft, non-reflective surface that feels premium and intentional.
- **Typography:** Text shifts from pure black to a rich `Deep Espresso (#423936)` to maintain high legibility while softening the overall contrast.

## Typography

The typography system transitions to **Manrope** for a more modern, refined, and balanced feel than standard sans-serifs. **JetBrains Mono** is retained for technical data, providing a functional "tool" aesthetic within the soft editorial framework.

- **Editorial Hierarchy:** Panel titles and headers use semi-bold Manrope weights with tight letter spacing for an architectural look.
- **Technical Readouts:** All numeric values, timecodes, and property inputs utilize the monospaced font to ensure vertical alignment and prevent layout jitter during value scrubbing.
- **Optical Comfort:** Body text uses the `Deep Espresso` color at 85% opacity to ensure the "Light Mode" remains gentle on the eyes during extended professional use.

## Layout & Spacing

This design system employs a **Fixed Grid** workspace with slightly more breathing room than its predecessor, shifting from 1px dividers to 2px tonal gaps.

- **Tonal Separation:** Layout zones are defined by background color shifts (e.g., a `Warm Beige` inspector next to a `Stone Gray` timeline) rather than heavy borders.
- **The 4px Rhythm:** All padding and margins follow a 4px incremental scale. 8px is the standard for component internal spacing, while 12px is the default for panel gutters.
- **Adaptive Reflow:** On desktop, the layout is a multi-pane environment. On mobile, the interface uses a bottom-sheet model for properties, keeping the primary focus (the content canvas) centered and unobstructed.

## Elevation & Depth

Hierarchy is established through **Ambient Shadows** and **Tonal Layers** rather than brightness tiers.

- **Surface Levels:** 
  - **Level 0 (Canvas):** `FAF9F5` (Off-white) - The primary work area.
  - **Level 1 (Panels):** `E1CFCB` or `D8C6BA` - Sidebars and timeline containers.
  - **Level 2 (Active Elements):** White (`#FFFFFF`) - Input fields and active button states.
- **Shadows:** Use extremely soft, diffused shadows with a subtle warm tint (e.g., `rgba(66, 57, 54, 0.08)`) for floating modals or popovers. 
- **Active State:** Selection is indicated by a subtle `Slate Blue` 2px border or a soft inner glow, avoiding harsh high-contrast outlines.

## Shapes

The shape language is **Soft (1)**, moving away from the industrial sharpness of the previous system to a more approachable, modern aesthetic.

- **Standard Components:** Buttons and inputs use a 4px (`0.25rem`) radius.
- **Containers:** Property panels and large asset cards use 8px (`0.5rem`) to feel more like distinct physical objects.
- **Interactive Triggers:** Small utility icons and timeline playheads maintain a 2px radius to preserve precision.

## Components

- **Buttons:**
  - *Primary:* `Slate Blue` background with `Off-White` text.
  - *Secondary:* `Warm Beige` background with `Deep Espresso` text.
  - *Tertiary:* Ghost style with `Deep Espresso` text and a subtle `Dusty Rose` underline on hover.
- **Input Fields:** Pure white background, 1px `Warm Beige` border, transitioning to a `Slate Blue` border on focus. Text uses `JetBrains Mono`.
- **Cards & Bins:** Use a `Stone Gray` background with 8px rounding. Assets are displayed with a 4px internal margin to create a "framed" gallery look.
- **Chips:** `Dusty Rose` or `Sage Green` backgrounds at 15% opacity with full-opacity text of the same hue. Pill-shaped for tags.
- **Sliders:** A 4px `Warm Beige` track with a `Deep Espresso` thumb. The active portion of the track is highlighted in `Slate Blue`.
- **Checkboxes & Radios:** Softly rounded corners for checkboxes (2px); `Slate Blue` fill for checked states with a white checkmark.