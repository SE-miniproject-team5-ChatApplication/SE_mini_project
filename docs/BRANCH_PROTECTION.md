# Branch protection and GitHub automation

These settings are clicked once in GitHub by a repo owner (admin). They cannot be
set from a file, so this page records exactly what was configured.

## 1. Protect `main`

Settings → Rules → Rulesets → **New branch ruleset**

| Setting | Value |
|---|---|
| Name | `protect-main` |
| Enforcement | Active |
| Target branches | Include default branch (`main`) |
| Restrict deletions | On |
| Block force pushes | On |
| Require a pull request before merging | On, **1** approving review |
| Dismiss stale approvals when new commits are pushed | On |
| Require status checks to pass | On: `server (lint + tests)`, `client (lint + build)`, `PR references an issue` |
| Require branches to be up to date before merging | On |

Result: nobody (including owners) pushes directly to `main`; every change arrives
through a reviewed pull request with green CI.

## 2. Project board automation

Project → ⋯ → **Workflows**, turn on:

- *Item added to project* → Status **Todo**
- *Pull request linked to issue* → Status **In Progress**
- *Pull request merged* → Status **Done**
- *Item closed* → Status **Done**

Because every PR body contains `Closes #N` (checked by the *Linked issue* workflow),
merging the PR closes the issue and moves the card to Done.

## 3. Who does what

- The **assigned member** creates the branch, commits and opens the PR.
- A **repo owner** reviews and merges (Part-2 deliverable, 2c and 2d).
