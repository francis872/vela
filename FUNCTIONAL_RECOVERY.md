# VELA Functional Recovery

## Validate

| Issue | Root Cause | Fix | Test | Status |
|---|---|---|---|---|
| Coverage could crash when there was no next objective | Backend returned `string | null`, UI consumed `string[]` | Canonical `nextToValidate: string[]` contract and boundary normalization | `tests/phase-a-contracts.test.ts` | Fixed |
| Signals were usually unlinked | Validate had no objective selector | Optional selector loads real objectives and persists `objectiveId` | API contract plus manual acceptance case | Fixed |
| Validate errors could escape the module | No localized route error boundary | Added `src/app/validate/error.tsx` with Retry | Manual route acceptance case | Fixed |
| Empty validation evidence was ambiguous | Generic empty list text | Explicit no-evidence state without mock data | Manual empty-state acceptance case | Fixed |

## Capital

| Issue | Root Cause | Fix | Test | Status |
|---|---|---|---|---|
| Readiness differed from the API | UI recomputed passed gates / total gates | UI renders `readinessData.readiness`; gates passed remain a separate count | Backend/frontend contract check | Fixed |
| No evaluation event existed | Readiness endpoint only returned a response | Emits `capital_evaluated` after both available and insufficient evaluations | Event dispatcher compile check | Fixed |

## Sprint execution

| Issue | Root Cause | Fix | Test | Status |
|---|---|---|---|---|
| Score could be duplicated | UI incremented score after backend increment | UI now refetches Sprints and FounderScore | Completion mutation acceptance case | Fixed |
| Admin completion attributed score to actor | Endpoint used `session.sub` | Score uses Sprint `ownerId` and `ownerName` | Admin-owner acceptance case | Fixed |
| Completion could partially persist | Item, Sprint and score were separate writes | Prisma transaction covers item, Sprint status and score | Transaction acceptance case | Fixed |
| Arbitrary status accepted | No request schema | Zod schema accepts only `active`, `completed`, `blocked` | Invalid status API case | Fixed |
| Duplicate completion awarded score again | No transition guard | Award only when previous Sprint status was not `completed` | Idempotency acceptance case | Fixed |

## Domain events

Events are emitted after committed mutations from API/domain boundaries, never React components. The initial dispatcher is intentionally small and in-process; it is a foundation for audit, analytics and future invalidation, not a WebSocket implementation.
