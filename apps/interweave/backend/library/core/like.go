package core

import "strings"

// LIKE 通配符属于模式语法；用户输入必须先转义，% 与 _ 才能按字面匹配。
func escapeLike(input string) string {
	return strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`).Replace(input)
}
