---
---

Internal change: the add dialog's empty queue panel now mirrors the drop zone exactly
instead of nudging itself into place. Its caption splits onto two lines, matching the
drop zone's own two-line kind list, so both panes compose to the same 134px block and
their icon, title and caption rows land on identical baselines at every breakpoint. That
retires the single-sided bottom padding that used to fake the alignment, which had to be
scoped to the two-column breakpoint and left dead whitespace below the card once the
pane stacked. The cancel button also takes a fixed 76px width so it stops shifting with
its label. No published package version changes.
