// Package core 承载 Interweave 的产品规则与编排，不感知 Wails 或前端。
//
// 依赖方向为 service → core → storage/remote：core 只暴露领域类型与哨兵错误，
// 由 service 外观映射为前端可见的 DTO 与文案。详见 ADR-0031。
package core
