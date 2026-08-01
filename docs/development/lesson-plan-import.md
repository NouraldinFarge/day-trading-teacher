# External lesson-plan workflow

Imported plans are first-class, plan-scoped curricula. They remain separate
from the verified core path, preserve their author and source record, and use
the same focused lesson reader, objective feedback, session resume, and
connected practice workspaces as built-in lessons.

1. In **Learn**, select **Export request** or **Copy ChatGPT prompt**.
2. Share only the exported, privacy-safe request with ChatGPT.
3. Save ChatGPT's JSON output locally.
4. Select **Import lesson plan**.
5. Review schema, skill, safety, source, and calculation findings.
6. Explicitly approve installation.

Custom content never overwrites built-in lessons. Reimporting the same `plan_id` replaces only that custom plan, while deleting it leaves built-in curriculum and learner records intact.

## Practice-quality review

The local review screen summarizes lesson count, total time, activities,
objective checks, declared sources, and the Decision Card, Chart Replay,
Evidence Journal, and Learning Lab routes inferred for every lesson. Safe files
can still produce non-blocking quality notes when lessons lack retrieval,
application, objective checks, quantitative mastery standards, extension links,
source context, or full target-skill coverage.

The exported ChatGPT prompt uses curriculum guideline `5.0` and requests:

- 7–9 purposeful activities per lesson;
- 2–3 reasoning-based single-choice checks per lesson;
- balanced authored answer positions plus per-attempt display shuffling;
- plausible professional distractors rather than giveaway answers;
- first-try, unseen-case, analytic-rubric, retention, and remediation criteria;
- an explicit core, extension, remediation, or assessment role;
- bounded instruction, independent-performance, and review sessions for long lessons;
- retrieval, application, transfer, and a specific commitment;
- evidence artifacts compatible with feasible app workspaces;
- responsible historical, replay, paper, or no-trade practice only.

## Included expanded plan

The workspace includes
`content/lesson-plans/trading-records-deliberate-execution-v2.dtlesson.json`.
Its stable filename and lesson IDs preserve update compatibility, while the
content is now plan version 3.0: eight advanced extension lessons, 270 focused
minutes, 64 activities, and 24 objective checks. Each lesson names the core
lesson it extends and requires five successful independent cases out of six.
The app offers it through the same review-and-approve boundary. If an older copy
with the same `plan_id` is installed, the plan header offers a local update
review. Prior practice evidence is retained after approval.
