<!-- BRACE-GENERATED: v1 -->
---
date: <% tp.date.now("YYYY-MM-DD") %>
type: daily-note
mood:
energy:
focus:
tags: [daily, brace]
---
# Daily Note - <% tp.date.now("dddd, MMMM D, YYYY") %>

## Today's Focus
- 

## College Tasks
- [ ] 

## Study Tasks
- [ ] 

## Project Tasks
- [ ] 

## AI Updates
```dataview
TABLE source, reliability, category
FROM "02_AI_UNIVERSE/Updates"
WHERE date = date(today)
SORT file.ctime DESC
```

## World Updates
```dataview
TABLE source, reliability, category
FROM "03_WORLD_INTELLIGENCE/Updates"
WHERE date = date(today)
SORT file.ctime DESC
```

## CWIT Updates
```dataview
TABLE source, official, category
FROM "04_CWIT_COLLEGE_PUNE/Updates"
WHERE retrieved = date(today)
SORT file.ctime DESC
```

## Notes Captured Today
- 

## Questions I Asked
- 

## Things I Learned
- 

## Tomorrow Plan
- [ ]
