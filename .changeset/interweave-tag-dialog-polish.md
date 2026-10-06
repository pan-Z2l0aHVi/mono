---
---

Internal change: polish pass on the Interweave tag dialog. The confirm button in the tag
field grows from a 20px square to 40px wide by 28px tall, and pulls 8px toward the right
edge, which turns the three gaps around it into an even 4px on the top, bottom and right.
The width comes from a separate custom property so it leaves that vertical spacing alone,
and the check inside grows to 18px to match. The field's placeholder reads "Enter a tag".
The row of current tags takes 12px of horizontal padding instead of 10px. Tag close buttons
switch from the stroked Lucide X to the solid Heroicons X mark, matching the solid check
already used in the same dialog, which reads far better at 10px inside a 22px chip. These
were the only tag close icons in the app. No published package version changes.
