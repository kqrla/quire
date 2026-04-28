---
title: fabnet roadmap
tags: [fabnet, planning, product]
date: 2026-04-01
summary: what we're building and where we're going
---

building a contribution tracking system for volunteers. the goal is to make effort visible, recognize people properly, and help the organization understand where energy is going.

::: card
**q2 2026 goal:** get 50 active contributors using the system weekly. lightweight, useful, not bureaucratic.
:::

## phases

### phase 1 — core (now)
- contribution logging with time, tags, and notes
- basic time tracking
- volunteer dashboard
- admin review flow

### phase 2 — social layer
- public contributor profiles
- activity feeds and recognition
- contribution streaks and milestones

### phase 3 — integrations
- github sync for code contributions
- slack notifications for activity
- csv and api export

## open questions

- how do we handle {fold: retroactive logging | contributors entering contributions they forgot to log at the time. current thinking: allow any date up to 30 days past, with a note field explaining context.}
- what's the right granularity for time? (15-min increments feels right)
- how do we handle recurring contributions vs one-off?

## design principles

keep it simple. contribution logging should take less than 2 minutes. if it's a chore, people won't do it.

::: branch on contribution fatigue
many volunteer tools fail because they add overhead without value. the system needs to give back more than it takes — recognition, visibility, a record of your impact.

the dashboard should make volunteers feel good about what they've done, not surveilled.
:::

## connections

the patterns here connect to how [[learning]] works — contribution tracking teaches us about how people build skills over time through repeated practice.
