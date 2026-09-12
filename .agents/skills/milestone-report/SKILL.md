---
name: milestone-report
description: Produce the Implementation Plan and Diff artifacts rules.md requires, and close every milestone with a fixed-shape summary, so each phase in EXECUTION.md is reviewable before the next one starts.
---

## When to use this
At the start and end of every milestone defined in `EXECUTION.md` — this is what turns "step-by-step tasking" from an intention into something enforced.

## Procedure
1. **Before writing any code for the milestone**, output an Implementation Plan artifact containing:
   - Files to be created or changed.
   - Which shared schemas (`libs/shared/validation`) and PRD §7 endpoints, if any, are touched.
   - Any open questions or ambiguities in the PRD/EXECUTION.md for this milestone.
   Wait for explicit approval before proceeding.
2. **After implementing**, output a Diff artifact of the actual changes made — not a paraphrase of them.
3. **Close the milestone** with a summary in exactly this shape:
   - **What I built** — concrete, matched against the EXECUTION.md checklist item.
   - **Deviations from PRD or plan** — anything that didn't go exactly as planned, and why. "None" is a valid answer, but it must be stated, not omitted.
   - **Risks or open issues** — anything you're not fully confident in.
   - **Verification run** — which skill(s) were run (`nx-workspace-verify`, `docker-build-test`, `auth-guard-verify`, `frontend-browser-verify`) and their result. A milestone summary with no verification attached is incomplete.
   - **Decision needed from you** — what you need approval or input on before the next milestone.
4. Commit the milestone's changes using the commit-code skill, and include the resulting commit hash in the summary.
5. Stop. Do not start the next milestone in the same turn, even if the plan for it seems obvious.

## Definition of done
- Plan artifact was produced and approved before code was written.
- Diff artifact reflects the real changes.
- Summary follows the fixed shape above, with a verification result attached.

## Common pitfalls
- Writing "implemented and tested" without actually having run a verification skill in this milestone.
- Skipping the plan artifact for a milestone that "seemed simple."
- Rolling straight into the next milestone instead of waiting for the go-ahead — this defeats the entire purpose of phased execution.