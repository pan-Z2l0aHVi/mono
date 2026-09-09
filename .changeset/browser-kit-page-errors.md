---
'@greypan/browser-kit': minor
---

Add a `definePageErrors()` plugin to the Tracker that collects uncaught errors and unhandled promise rejections through the existing transport pipeline. Includes error-count limits, a signature dedupe window, and message/stack truncation protection by default.
