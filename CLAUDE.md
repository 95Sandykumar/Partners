# POFlow — AI Document Processing SaaS

## Product Identity
POFlow scans **physical documents, photos, and PDFs** — extracts, categorizes, and converts them into structured **Excel/CSV output** that plugs into any ERP, accounting, or inventory system. Built for industrial distributors processing purchase orders at scale.

## Vision Model Strategy
- **Primary:** DeepSeek-OCR 2 (open-source, self-hostable, zero per-page cost)
- **Fallback:** Mistral OCR 3 (API, best handwriting support)
- **Mode:** Hybrid — DeepSeek first, Mistral fallback if confidence < 75%

---

# Workflow & Development Standards

## Workflow Orchestration

### 1. Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately — don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop
- After ANY correction from the user: update tasks/lessons.md
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "Is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution."
- Skip this for simple, obvious fixes — don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it
- Don't ask for hand-holding
- Point at logs, errors, failing tests — then resolve them
- Zero context switching required from the user
- Fix failing CI tests without being told how

## Task Management
- **Plan First** — write plan to tasks/todo.md with checkable items
- **Verify Plan** — check in before starting implementation
- **Track Progress** — mark items complete as you go
- **Explain Changes** — high-level summary at each step
- **Document Results** — add review section to tasks/todo.md
- **Capture Lessons** — update tasks/lessons.md after corrections

## Core Principles
- **Simplicity First** — make every change as simple as possible; minimal code impact
- **No Laziness** — find root causes; no temporary fixes; senior developer standards
- **Minimal Impact** — change only what's necessary; avoid introducing bugs
