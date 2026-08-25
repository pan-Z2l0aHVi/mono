package id

import (
	"github.com/google/uuid"
)

// 让领域对象的身份独立于具体存储实现。
func NewID() string {
	return uuid.New().String()
}
