---
---

fix(herdr-cos): give every role contract an explicit stop/continue boundary, and stop printing a pull cadence nothing can enforce

五个 role 契约此前假设「一次投递即完成」：读完、规划、然后回到等下一步——而从账本外面看，它与正在思考的成员无法区分。本轮实地观察到一名成员宣布要规划并开工，然后一直 idle 直到 lead 推它，没有 error、没有 blocked、没有 failure。契约现在各自写明什么该让它停下，以及哪些情况必须自己判断并继续；manager 额外承担推醒停住成员的那一手。

同时拆掉一个假前提：`cos poll` 与渲染的 `peer-contract.md` 一直印着「Lead pull cadence 30s」，而 lead 不是定时器、`cos` 也强制不了调用者的间隔——那行断言的是一个没人观测得到的节奏，并与 SKILL.md 自己「你不连续运行」的表述矛盾。节奏数与 `LEAD_POLL_MS` 常量一并删除；`PROTOCOL.md` 里建立在它上面的往返时间估算改为说明其真实依据（lead 下一次能动的时刻）。`ACK_DEADLINE_MS` 不变，它是有测试的规则。
