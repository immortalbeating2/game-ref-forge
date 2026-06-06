# Issue Tracker

Issues and PRDs for this repo live as GitHub Issues.

Repository:

```text
immortalbeating2/game-ref-forge
```

Use the `gh` CLI for issue operations when available.

## Conventions

- Create an issue: `gh issue create --title "..." --body "..."`
- Read an issue: `gh issue view <number> --comments`
- List issues: `gh issue list --state open --json number,title,body,labels,comments`
- Comment on an issue: `gh issue comment <number> --body "..."`
- Apply a label: `gh issue edit <number> --add-label "..."`
- Remove a label: `gh issue edit <number> --remove-label "..."`
- Close an issue: `gh issue close <number> --comment "..."`

Run commands from inside the repository so `gh` can infer the repo from `git remote -v`.

## When A Skill Says "Publish To The Issue Tracker"

Create a GitHub issue in `immortalbeating2/game-ref-forge`.

## When A Skill Says "Fetch The Relevant Ticket"

Run:

```bash
gh issue view <number> --comments
```

If GitHub authentication is missing, report that clearly and continue with local analysis where possible.

