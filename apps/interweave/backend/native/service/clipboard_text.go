package service

import (
	"context"
	"fmt"
	"runtime"
)

// ReadClipboardText 返回剪贴板中的纯文本。剪贴板没有文本时返回空串而不是错误：
// 「没有东西可粘贴」是正常状态，调用方据空串给出提示。富文本（HTML / RTF）不在此范围。
func (s *OSService) ReadClipboardText(ctx context.Context) (string, error) {
	if err := ctx.Err(); err != nil {
		return "", err
	}
	text, err := readClipboardText(ctx)
	if err != nil {
		return "", err
	}
	if err := ctx.Err(); err != nil {
		return "", err
	}
	return text, nil
}

// WriteClipboardText 用纯文本覆盖剪贴板。空串是 no-op，不报错：调用方在此之前已判定
// 没有内容可写（「复制为纯文本」在选区为空时就不该走这里），这里再清一次剪贴板是纯粹的
// 破坏性副作用。
func (s *OSService) WriteClipboardText(ctx context.Context, text string) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	if text == "" {
		return nil
	}
	return writeClipboardText(ctx, text)
}

func unsupportedClipboardTextError() error {
	return fmt.Errorf("clipboard text access is unsupported on %s", runtime.GOOS)
}
