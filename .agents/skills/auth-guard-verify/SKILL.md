---
name: auth-guard-verify
description: Prove the three-role permission model (PRD §2) is actually enforced end-to-end, not just implemented. This is the highest-risk area of the whole app and the easiest to get subtly wrong.
---

## When to use this
Before marking the auth milestone, or any endpoint milestone that touches a guarded route, as complete.

## Procedure
1. Seed three test users if they don't already exist:
   - `director@test.local` — role `DIRECTOR`
   - `alto-lead@test.local` — role `SECTION_LEADER`, `leadsVoicePart: ALTO`
   - `chorister@test.local` — role `CHORISTER`
2. Log in as each and capture their JWTs.
3. Run this matrix against every write endpoint in PRD §7 (adjust song/part IDs to real seeded data):

   | Endpoint | Director | Alto Section Leader | Chorister | No token |
   |---|---|---|---|---|
   | `POST /songs` | 201 | 403 | 403 | 401 |
   | `PATCH /songs/:id` | 200 | 403 | 403 | 401 |
   | `DELETE /songs/:id` | 200/204 | 403 | 403 | 401 |
   | `PUT /songs/:id/parts` | 200 | 403 | 403 | 401 |
   | `PATCH /songs/:id/parts/ALTO` | 200 | 200 | 403 | 401 |
   | `PATCH /songs/:id/parts/SOPRANO` | 200 | 403 | 403 | 401 |
   | `POST /songs/:id/links` | 201 | 403 | 403 | 401 |
   | `GET /songs` | 200 | 200 | 200 | 401 |

4. Fill in the *actual* result next to each expected value. Any mismatch blocks the milestone — do not mark it complete with an unresolved row.
5. Include the completed table in the milestone report.

## Definition of done
- Every cell in the matrix above has been actually tested (curl or equivalent), not assumed.
- Every mismatch is either fixed or explicitly called out as a known issue with a plan to fix it.

## Common pitfalls
- Only testing the Director's "happy path" and never actually proving the other two roles are blocked.
- Testing role-based access but not the Section-Leader's part-specific scope (the Alto row above is the one that actually exercises that logic).
- Skipping the no-token row — an endpoint that 500s instead of 401ing on a missing token is still a bug worth catching.