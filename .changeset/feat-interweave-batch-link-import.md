---
'@greypan/interweave': minor
---

Batch link import: the add-link dialog now scans pasted text and clipboard HTML anchors for every http(s) link, shows an editable preview of the extracted list, and submits them in one batch. The backend imports the batch concurrently (8 workers by default), streams per-item progress, keeps failed items in the queue for retry, and can stop the remaining items mid-run.
