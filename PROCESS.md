At some point, the AI fix was contradicting with the agent itself.
It changed a dynamic value to a hard coded language selection. Then specs-reviewer flagged it as not using the detected locale. But it was specs-reviewer and the orchestrator 1 turn ago who flagged and decided to make it hardcoded.

---

on implementation:
 - single agent since I think the agent will benefit from having the extra context from the tests cases on the initial pass which would help with the implementation.

on fixing reviews from specs-reviewer and test-auditor:
 - used fan out for `src/` and `test/` folder so the subagent won't know the context of each other and not make biases on it.