# Freezing development and tagging v1.0 (PRC-4)

Do this after the last Sprint-3 pull request is merged and CI on `main` is green.

```bash
git checkout main
git pull
git tag -a v1.0 -m "Chat Application v1.0 - end of Sprint 3"
git push origin v1.0
```

Then on GitHub:

1. **Releases → Draft a new release →** choose tag `v1.0`, title "v1.0", paste the
   1.0.0 section of `CHANGELOG.md`, attach `demo/sprint1-demo.mp4` and
   `demo/sprint2-demo.mp4`, Publish.
2. **Freeze `main`:** Settings → Rules → Rulesets → `Protect main` → first add the
   Product Owner to the **Bypass list**, then add the rule **Restrict updates** (or set
   "Require a pull request" approvals to 2 and tell the team no more feature PRs). With an
   empty bypass list, Restrict updates blocks every merge, hotfixes included. Bugs found
   after the freeze go on a `hotfix/<issue>` branch.
3. Project board: move every finished item to **Done**; close the Dry Run, Sprint 1 and
   Sprint 2 milestones. Every backlog issue is closed; requirements whose test was not fully
   carried out are listed under "Requirements not fully met" in `docs/DEVIATIONS.md`.
