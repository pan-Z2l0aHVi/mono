# Review Guide

Use this guide for a code review or self-review. Lead the report with concrete findings ordered by severity, including file and line references. State test gaps and residual risk when no defects are found.

Check public behavior and backward compatibility, focused test coverage, boundary and failure cases, type and error handling, race or resource leaks, user-input security risks, and documentation changes. For refactors, compare the completed change against a pre-change behavior inventory.

An independent review agent must not also implement the reviewed change. Review final code and tests rather than relying on the implementation narrative.
