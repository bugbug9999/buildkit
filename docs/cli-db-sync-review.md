Reviewing against all 7 criteria:

**1. createDb imported and initialized** ✅
- Import at top: `import { createDb } from './server/db/db.js'`
- Initialized in `main()` with correct path: `createDb({ dbPath: path.resolve(..., 'server/db/buildkit.sqlite') })`

**2. Execution created on start** ✅
- `createExecutionRecord()` called eagerly in both `runPipeline` and `runTask` (before engine runs)
- `executionCreated` flag guards against double-creation if `execution:started` event also fires

**3. Steps seeded** ✅
- `db.seedExecutionSteps(executionId, steps)` called inside `createExecutionRecord()`
- Task mode correctly maps tasks to seedable step objects with `step`/`role` fields

**4. Step events mapped to DB calls** ✅
- `step:started` → `markExecutionStepStarted`
- `step:completed` → `markExecutionStepCompleted` + `syncExecutionTotals`
- `step:failed` → `markExecutionStepFailed`

**5. Execution completed/failed recorded** ✅
- `execution:completed` → `completeExecutionRecord` → `db.completeExecution` (with `finishExecution` fallback)
- `execution:failed` → `failExecutionRecord` → `db.failExecution` (with `finishExecution` fallback)
- `syncExecutionTotals` called in both paths before status change

**6. Console logging preserved** ✅
- `attachPipelineCliLogging` and `attachTaskCliLogging` both intact with all original `console.log` calls

**7. No modifications to db.js** — Cannot verify from provided code alone. The import path is unchanged and only standard consumption patterns are used, but db.js itself wasn't shown.

---

**Score: 9/10**

Deduction: criterion 7 is unverifiable from this diff alone. The implementation itself is clean — the `withDb()` resilience wrapper, `executionCreated` guard flag, and multi-fallback db method patterns (`completeExecution` → `finishExecution`) are all solid defensive choices.
