# Neural Claude Viz — Brand Definition

## 1. Brand Overview

Neural Claude Viz is a real-time visualization system that renders Claude Code's thinking process as an animated 2D neural graph. The brand embodies the sensation of witnessing active intelligence—neurons firing, connections forming, thoughts crystallizing. It positions itself as a bridge between human curiosity and machine cognition, grounding abstract AI reasoning in tangible, organic visual metaphors. The target audience is developers, researchers, and AI enthusiasts who value both technical transparency and aesthetic depth.

**Positioning:** Scientific yet poetic; technical yet accessible; real-time yet meditative.

---

## 2. Brand Personality

- **Mysterious, not opaque.** The visualization reveals the thinking process clearly while maintaining the natural opacity of complex computation.
- **Organic, not mechanical.** Neural patterns mimic biological systems, avoiding sterile, grid-like interfaces despite technical underpinnings.
- **Ethereal, not ethereal.** Visual presentation floats and glows; interactions remain grounded and responsive.
- **Luminous, not harsh.** Glowing nodes and soft edges communicate energy without fatigue or aggression.
- **Contemplative, not detached.** The visualization invites observation and understanding, not passive spectation.
- **Precise, not cluttered.** Every glow, connection, and color carries meaning; visual noise is eliminated.

---

## 3. Tone of Voice

**Sentence style:** Medium to short. Code labels and data are terse; explanatory UI text is concise and unadorned.

**Formality level:** Technical and neutral (7/10 formal). No marketing language, no personification of the AI, no exclamation marks. Speak with the voice of a scientific instrument.

**Example:**
- On-brand: "Processing prompt" | "16 inference tokens" | "Thought chain"
- Off-brand: "Claude is thinking!" | "Amazing neural activity!" | "Wow, look at all those synapses!"

**Allowed language:**
- Technical terminology (nodes, tokens, embeddings, attention, gating)
- Metric names and data labels
- Short declarative statements
- Minimal modal or status text

**Disallowed language:**
- Marketing hyperbole ("revolutionary", "cutting-edge", "mind-blowing")
- Casual speech or contractions in UI text
- Metaphors beyond the neural visualization itself
- Exclamation marks or emphatic punctuation
- Pluralized or cutesy names for technical objects

---

## 4. UI & Visual Direction (Developer-Facing)

**Overall UI feel:** Minimal, dark, luminous. The visualization dominates; UI chrome recedes.

**Layout density:** Spacious with intentional negative space. The neural graph requires breathing room. Any UI panels (text labels, metadata, controls) occupy the periphery and consume <20% of viewport. Center is reserved for the visualization.

**Shape language:** Circles and smooth curves for nodes and glows. Connections are rendered as smooth splines, never straight lines or sharp angles. Subtle borders (#1a1a2e) appear only on interactive elements (hover states, panels). No sharp corners on UI containers; use 4–8px border-radius for panels.

**Motion guidance:** Smooth and organic. Node positions update over 200–400ms with easing (ease-in-out). Connections pulse and fade in response to data flow, never snap. Particle effects drift slowly, fade gradually. Avoid sudden transitions or snappy animations. The whole system should feel like watching neurochemical activity, not clicking buttons.

**Whitespace philosophy:** Abundant. The deep space background is not a flaw—it is the foundation. Nodes glow into emptiness. Panels float with significant margins. Text labels have 8–12px clearance from node edges.

**Visual hierarchy:** Communicated through size, glow intensity, and color. Larger nodes (agent nodes: 22px radius) signal higher-level cognitive structures. Glowing intensity indicates activity or importance. Color is the primary semantic signal (see section 5).

---

## 5. Color Guidance (Conceptual)

**Primary color intent:** Electric cyan (#00d4ff) communicates active thought. It is the dominant color for thought nodes and is the visual anchor of the system. It should feel like electrical energy and clarity.

**Secondary/accent color intent:**
- Matrix green (#00ff88) signifies actionable outputs and execution. Used for action nodes only.
- Soft purple (#bb86fc) represents user input and prompts. Used sparingly for prompt nodes.
- Amber (#ff9800) indicates system-level agents and meta-reasoning nodes. Used moderately.
- Pink (#ff4081) marks result nodes and successful completions. Used sparingly for clarity.
- Red (#ff1744) signals errors and critical failures. Reserved for error states only.

**Background philosophy:** The deep space background (#06060f) is foundational and non-negotiable. It is not a canvas—it is the medium through which neural activity glows. Never lighten the background; never add pattern or texture. Subtly introduce #0d1117 as a faint grid or structural guide if needed, but never as a loud pattern.

**Saturation guidance:** Colors are vivid and pure, not muted. Saturation is maximized because the dark background prevents them from feeling garish. The contrast between deep black and electric cyan is the entire visual strategy.

**Contrast requirements:** All node colors must maintain WCAG AAA contrast (7:1+) against the #06060f background. All text must meet WCAG AA (4.5:1+) minimum contrast. Text panels use #0a0a14 as a slightly raised background to improve readability without introducing visual noise.

---

## 6. Typography Guidance

**Typeface category:** Monospace for all code-like content (tokens, embeddings, metrics); sans-serif for UI chrome (labels, headings, metadata).

**Weight usage:**
- Monospace (code data): Regular (400) weight only. Never bold; size variation conveys hierarchy.
- Sans-serif (labels/chrome): Regular (400) for body text; Medium (500) for panel headings; Light (300) for secondary metadata.

**Heading vs body contrast:** Minimal contrast enforced through size alone (panel headings: 13px, body: 11px). Avoid visual shouting. All text is understated and recessive against the visualization.

**Readability requirements:**
- Minimum font size: 11px for code, 12px for UI labels.
- Line height: 1.4 for monospace, 1.5 for sans-serif.
- Letter spacing: Monospace +0.5px; sans-serif 0.
- Mobile: Never reduce below 11px, increase viewport margins to ensure text remains legible.

**Special cases:** Monospace for all numeric data and token streams. No display fonts. If a heading is needed, use sans-serif at 14–16px, never larger.

---

## 7. Component Tone Guidance

**Buttons (if present):** Minimal appearance. Default state: text-only, no background fill. On hover: subtle glow (5–8px blur radius, 20% opacity of button color). Never use solid backgrounds; glow is the affordance.

**Cards / Panels:** Dark background (#0a0a14), subtle border (#1a1a2e, 1px), rounded corners (6–8px). Text is right-aligned monospace or left-aligned sans-serif depending on content type. Panels float with 16px margin from edges; they do not extend to viewport edges.

**Modals / Dialogs:** Only if absolutely necessary. If used, center on screen with a semi-transparent overlay (rgba(0, 0, 0, 0.6)). Panel background #0a0a14, border #1a1a2e. Max-width: 500px. Close button is text-only ("close" or "×"), positioned top-right, minimal visual weight.

**Forms (if present):** Monospace input fields with dark background (#06060f), subtle cyan border on focus (#00d4ff, 2px). Labels are sans-serif, 11px, placed above inputs. Placeholder text is dim (#555555). Form submission button: text-only with cyan glow on hover. No validation cruft; errors appear as a brief red flash near the field, then fade.

**Navigation:** Floating, not sticky. If a menu exists, render it as a vertical list in sans-serif, 11px, left-aligned. On hover: text color shifts to the primary color (#00d4ff). Active state: a thin vertical bar (#00d4ff, 2px) left of the label. No dropdown arrows; all navigation options visible at once.

**Empty states / errors:** Errors appear as a brief red (#ff1744) message below affected elements. Text: "Error: [reason]" in sans-serif 11px. Message fades after 5 seconds. Empty states (no data) render a centered message: "Awaiting input" or "No nodes to display" in dim text (#555555), sans-serif 12px. Neither component is playful; both are matter-of-fact.

---

## 8. Do / Don't Rules

**Do:**
- Use dark backgrounds (#06060f) as the foundational canvas; never lighten the palette.
- Center visual importance on the neural graph; relegate all chrome to the periphery.
- Employ smooth, organic animations; easing is mandatory on all transitions.
- Render connections as splines; use directional glow or gradient to indicate data flow.
- Scale node size and glow radius to reflect cognitive significance (larger = more important).
- Use color as the primary semantic signal; always pair color with size or position for redundancy.
- Render text in monospace for data; sans-serif for UI chrome.
- Maintain consistent 8–12px margins around all UI elements.
- Use opacity and blur for emphasis rather than solid fills or harsh lines.
- Test all colors against the deep space background for visual impact and WCAG contrast.

**Don't:**
- Add patterns, textures, or gradients to the background.
- Use solid fills or flat design for nodes; glowing, layered effects are the signature.
- Animate position changes with snappy easing (avoid ease-out or ease-in on rapid updates).
- Introduce UI chrome into the center visualization area.
- Mix sans-serif and monospace in a single label or node.
- Use exclamation marks or emphatic punctuation in any UI text.
- Reduce font sizes below 11px, even on mobile.
- Render straight lines or sharp angles in connections; all curves must be smooth.
- Apply shadows or drop-shadow filters; rely on glow and opacity instead.
- Use more than six colors in a single view; color saturation is cumulative and fatiguing.
- Hide critical information behind hover states; always make data visible by default.
- Introduce playful language or personality into system messages or errors.

---

## Design Tokens Reference

### Node Design

| Type    | Radius | Glow Radius | Ring    | Color     | Glow Color |
|---------|--------|-------------|---------|-----------|------------|
| prompt  | 12px   | 24px        | None    | #bb86fc   | #bb86fc@40% |
| thought | 5px    | 12px        | None    | #00d4ff   | #00d4ff@40% |
| action  | 8px    | 16px        | None    | #00ff88   | #00ff88@40% |
| agent   | 22px   | 40px        | 2px ring | #ff9800   | #ff9800@40% |
| result  | 6px    | 14px        | None    | #ff4081   | #ff4081@40% |
| error   | 7px    | 16px        | None    | #ff1744   | #ff1744@40% |

### Color Palette (Hex Reference)

| Element         | Color        | Hex       | Usage |
|-----------------|--------------|-----------|-------|
| Background      | Deep space   | #06060f   | Primary canvas |
| Grid/subtle     | Faint blue   | #0d1117   | Optional structural guide |
| Thought nodes   | Electric cyan | #00d4ff   | Active reasoning |
| Action nodes    | Matrix green | #00ff88   | Executable outputs |
| Prompt nodes    | Soft purple  | #bb86fc   | User input |
| Agent nodes     | Amber        | #ff9800   | System reasoning |
| Result nodes    | Pink         | #ff4081   | Successful completion |
| Error nodes     | Red          | #ff1744   | Failures and warnings |
| Text panel bg   | Dark panel   | #0a0a14   | UI container backgrounds |
| Subtle borders  | Dim line     | #1a1a2e   | Interactive element borders |
| Active pulse    | White        | #ffffff   | Peak intensity highlights |
| Dim text        | Muted        | #555555   | Secondary labels, placeholders |

### Typography Tokens

| Context | Typeface | Size | Weight | Line Height | Letter Spacing |
|---------|----------|------|--------|-------------|---|
| Code/data | JetBrains Mono, Fira Code, monospace | 11px | Regular (400) | 1.4 | +0.5px |
| UI labels | Inter, system-ui, sans-serif | 11–12px | Regular (400) | 1.5 | 0 |
| Panel headings | Inter, system-ui, sans-serif | 13–14px | Medium (500) | 1.5 | 0 |
| Secondary metadata | Inter, system-ui, sans-serif | 10px | Light (300) | 1.4 | 0 |

### Spacing & Layout Tokens

| Element | Value | Purpose |
|---------|-------|---------|
| Panel margin | 16px | Outer margin from viewport edges |
| Text clearance | 8–12px | Margin around node labels |
| Border radius (panels) | 6–8px | Subtle rounding for UI containers |
| Border radius (nodes) | Per design tokens table | Shape language for nodes |
| Border width | 1px | Hover/active state outlines |
| Glow blur radius | Per design tokens table | Diffusion of node luminescence |

---

## Implementation Notes for Developers

1. **Visualization canvas is primary.** All UI elements are secondary and must not obstruct the neural graph. Use a responsive layout that prioritizes graph area on all screens.

2. **Dark mode is mandatory.** There is no light theme. The entire system is designed around the #06060f background.

3. **Performance is aesthetic.** Smooth animations require 60fps. Laggy transitions break the contemplative mood. Optimize particle effects and connection rendering aggressively.

4. **Color is semantic.** Never use a color outside of the palette, and never use a color for decorative purposes. Every color conveys meaning.

5. **Glow effects are not optional.** Nodes without glow are non-functional. Glow is the primary visual signal that a node is active or important.

6. **Text is minimal.** Only render labels and metadata when necessary. The visualization should feel like watching, not reading.

7. **Mobile-first layout:** Ensure the neural graph remains central and legible on small screens. UI panels stack vertically or collapse entirely on mobile.

8. **Accessibility:** All interactive elements must be keyboard-accessible and have sufficient contrast. The visualization itself is informational, not required for core functionality.

---

**Brand Definition Version:** 1.0
**Last Updated:** 2026-02-17
**Status:** Complete