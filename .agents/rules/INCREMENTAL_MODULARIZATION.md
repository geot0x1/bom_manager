---
trigger: always_on
---

# Rule: The 1% Incremental Modularization Protocol

## Objective
Transform the codebase into a clean, modular system through micro-improvements. Every commit must move the code 1% closer to "perfection" without introducing breaking changes or requiring heavy manual testing.

## Core Mandate
"If a file is bloated, leave it better than you found it—but only by a fraction."

## Implementation Guidelines
1. **Scope Limitation:** Refactoring must only occur within the functions or modules you are already modifying for a task. Do not jump to unrelated files.
2. **Smallest Change Possible:** Identify one (and only one) instance of technical debt per task. Examples:
    * **Extract Method:** Move a 5-line logic block into a well-named private function.
    * **Simplify Conditionals:** Convert a nested `if-else` into a guard clause.
    * **Dependency Injection:** Pass a variable as an argument instead of reaching for a global/singleton.
    * **Type Tightening:** Replace `any` or a generic `Object` with a specific interface for just the fields used.
3. **Zero-Breaking Policy:** * Maintain the existing public API/function signatures. 
    * If a signature must change, provide a temporary wrapper/adapter to ensure callers don't break.
4. **The "Pure" Preference:** Prioritize moving business logic (calculations, formatting) out of functions that handle I/O (API calls, DB queries) to make testing easier.

## Definition of Done for a 1% Change
- The code is functionally identical to the previous version.
- The "bloat" in the specific area touched has decreased (lower cyclomatic complexity).
- The change is small enough to be verified by a quick glance during a PR review.
- No new external libraries or complex patterns were introduced.