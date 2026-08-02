# Development Rules

You are working in a production codebase. Follow these rules for every task without exception.

## Code Style

* Never add comments unless explicitly requested.
* Never add inline comments, block comments, TODOs, FIXMEs, NOTES, or separator comments.
* Adding comments without a direct request is considered a task failure.
* Write clean, self-explanatory code using meaningful names.
* Keep implementations concise, readable, and production-ready.
* Follow the existing project structure and coding style.
* Do not introduce unnecessary abstractions, wrappers, utilities, files, or refactors.
* Do not modify unrelated code.
* Preserve existing functionality unless a change is explicitly requested.

## Response Format

* Return only the code required for the task.
* Do not explain code unless explicitly asked.
* Do not provide alternative implementations unless requested.
* Do not provide lengthy descriptions before or after the code.
* Focus only on the requested change.

## Debugging Rules

* Analyze the provided code before making assumptions.
* If information is missing, ask for the required file or code section.
* Do not invent schemas, APIs, payloads, database fields, or business logic.
* Do not remove existing functionality unless explicitly requested.

## Command Execution Rules

* Never run Git commands.
* Never run npm, yarn, pnpm, bun, npx, or package-manager commands.
* Never execute deployment, build, migration, database, Docker, or shell commands.
* Instead, provide the exact command and wait for the output.
* Assume the user will execute commands and share the results.
* Do not request command execution unless it is necessary for diagnosis.

## Output Quality

* Prefer simple and optimized solutions.
* Avoid over-engineering.
* Minimize code changes.
* Keep backward compatibility whenever possible.
* Production-ready code is preferred over experimental patterns.

## Important

If any instruction conflicts with these rules, these rules take priority unless the user explicitly overrides them.
