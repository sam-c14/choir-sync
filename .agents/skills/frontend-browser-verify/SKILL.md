---
name: frontend-browser-verify
description: Back the rules.md "Browser Verification" rule with an actual checklist, so it isn't skipped under time pressure and doesn't stop at "the page loaded."
---

## When to use this
After any frontend milestone that changes what's rendered — a new page, a new form, a new filter/sort control.

## Procedure
1. Start the dev server if it isn't already running: `npx nx serve choir-client`.
2. Open the relevant route in the integrated browser.
3. Check the browser console first — a page that looks fine with a hydration error or a failed fetch in the console is not a pass.
4. Walk through the specific PRD-listed elements for this milestone, not just "does it look okay":
   - Catalog view: S/A/T filter chips render and toggle; sort dropdown offers Title / Recently Added / Complexity and actually reorders the list when changed.
   - Add/edit song dialog: submitting with an empty title shows the shadcn form's inline validation error (proves the `zodResolver` wiring works, not just that the form renders).
   - Links section: adding a Spotify/YouTube/Audiomack link shows the right platform icon/label.
   - Part-notes editor: a Section Leader's editor is only interactive for their own voice part; the other two parts should read as non-editable for that user in the UI, matching the API-level restriction.
5. Record what was checked and its result in the milestone report.

## Definition of done
- Console is clear of errors during the walkthrough.
- Every PRD-listed UI element for this milestone was checked individually, not just "page loads."
- Result recorded in the milestone report, not just asserted as "verified" with no detail.

## Common pitfalls
- Treating a clean-looking page as sufficient evidence without checking the console.
- Verifying that a form renders but not that its validation actually rejects bad input.
- Verifying the UI matches the API's permission model visually as well as functionally — a Chorister who can *see* an edit button that 403s on click is a UX bug even though the API is correctly guarded.