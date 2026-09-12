After adding the other features to the UI, treat visual design as a real
requirement for this milestone, not a wrapper around functional
components. "It renders correctly" is not the bar — "it looks
intentionally designed" is. Specifically:

1. Pick and commit to a visual identity, don't leave shadcn's default
   zinc/slate theme untouched. Choose one accent color that fits a
   choir/music context (warm, confident — not a generic SaaS blue) and
   apply it consistently for primary actions, active nav states, and
   focus rings via Tailwind v4's @theme tokens in styles.css — not
   scattered inline hex values.

2. Give complexity and voice-part visual meaning, not just text.
   EASY/MODERATE/CHALLENGING should read as a color-coded scale (e.g.
   green -> amber -> red-toned badges), and the Soprano/Alto/Tenor
   chips should be visually distinct from each other and from status
   badges — right now everything risks looking like the same gray pill
   repeated with different text.

3. Design real empty, loading, and error states — not a blank list or
   a bare spinner. An empty catalog should say something inviting
   ("No songs yet — add your first one") with appropriate iconography,
   not just render nothing. Loading should use skeleton placeholders
   matching the actual card shape, not a generic spinner that causes
   layout shift when data arrives.

4. Use spacing and type scale with intention. Establish a clear
   hierarchy between song title, composer, and metadata (size, weight,
   color — not just font-size alone), and use consistent spacing
   rhythm (Tailwind's scale, not arbitrary values) across cards, the
   filter bar, and dialogs.

5. Add restrained motion: transitions on hover/focus (150-200ms ease)
   for buttons, cards, and dialog open/close. Not gratuitous animation
   — just enough that the UI feels responsive rather than static.

6. This is used on a phone/tablet at a music stand per PRD §3.4 —
   touch targets need real tap-friendly sizing, not desktop-density
   spacing. Verify at both desktop and mobile viewport widths.

7. Don't sacrifice accessibility for aesthetics — maintain visible
   focus rings and real contrast ratios even with the new color choices.

When you run frontend-browser-verify for this milestone, don't just
confirm the console is clean — take screenshots at both desktop and
mobile widths and include them in the milestone report so I can
actually evaluate the visual result, not just its absence of errors.

### NOTE
- Don't forget to add the light mode/dark mode toggle