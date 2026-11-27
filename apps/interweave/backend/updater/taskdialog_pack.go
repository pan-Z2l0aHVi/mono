// cspell:ignore pshpack

package updater

import "encoding/binary"

const (
	// Win32 CommCtrl.h 在 #include <pshpack1.h> 下定义的 amd64 结构体精确字节长度。
	taskDialogButtonSizeAMD64 = 12
	taskDialogConfigSizeAMD64 = 160
)

// taskDialogButtonSpec 描述 TASKDIALOG_BUTTON 的字段（1 字节紧凑打包）。
type taskDialogButtonSpec struct {
	ButtonID   int32
	ButtonText uintptr
}

// taskDialogConfigSpec 描述 TASKDIALOGCONFIG 的字段（1 字节紧凑打包，amd64 160 字节）。
type taskDialogConfigSpec struct {
	HwndParent           uintptr
	HInstance            uintptr
	Flags                uint32
	CommonButtons        uint32
	WindowTitle          uintptr
	MainIcon             uintptr
	MainInstruction      uintptr
	Content              uintptr
	ButtonCount          uint32
	Buttons              uintptr
	DefaultButton        int32
	RadioButtonCount     uint32
	RadioButtons         uintptr
	DefaultRadioButton   int32
	VerificationText     uintptr
	ExpandedInformation  uintptr
	ExpandedControlText  uintptr
	CollapsedControlText uintptr
	FooterIcon           uintptr
	Footer               uintptr
	Callback             uintptr
	CallbackData         uintptr
	Width                uint32
}

// packTaskDialogButtonsAMD64 按 CommCtrl.h 的 1 字节对齐规则序列化 TASKDIALOG_BUTTON 数组。
func packTaskDialogButtonsAMD64(buttons []taskDialogButtonSpec) []byte {
	if len(buttons) == 0 {
		return nil
	}
	buf := make([]byte, len(buttons)*taskDialogButtonSizeAMD64)
	for i, b := range buttons {
		off := i * taskDialogButtonSizeAMD64
		binary.LittleEndian.PutUint32(buf[off:off+4], uint32(b.ButtonID))
		binary.LittleEndian.PutUint64(buf[off+4:off+12], uint64(b.ButtonText))
	}
	return buf
}

// packTaskDialogConfigAMD64 按 CommCtrl.h 的 1 字节对齐规则序列化 TASKDIALOGCONFIG（总长 160 字节）。
func packTaskDialogConfigAMD64(cfg taskDialogConfigSpec) [taskDialogConfigSizeAMD64]byte {
	var buf [taskDialogConfigSizeAMD64]byte
	binary.LittleEndian.PutUint32(buf[0:4], taskDialogConfigSizeAMD64)
	binary.LittleEndian.PutUint64(buf[4:12], uint64(cfg.HwndParent))
	binary.LittleEndian.PutUint64(buf[12:20], uint64(cfg.HInstance))
	binary.LittleEndian.PutUint32(buf[20:24], cfg.Flags)
	binary.LittleEndian.PutUint32(buf[24:28], cfg.CommonButtons)
	binary.LittleEndian.PutUint64(buf[28:36], uint64(cfg.WindowTitle))
	binary.LittleEndian.PutUint64(buf[36:44], uint64(cfg.MainIcon))
	binary.LittleEndian.PutUint64(buf[44:52], uint64(cfg.MainInstruction))
	binary.LittleEndian.PutUint64(buf[52:60], uint64(cfg.Content))
	binary.LittleEndian.PutUint32(buf[60:64], cfg.ButtonCount)
	binary.LittleEndian.PutUint64(buf[64:72], uint64(cfg.Buttons))
	binary.LittleEndian.PutUint32(buf[72:76], uint32(cfg.DefaultButton))
	binary.LittleEndian.PutUint32(buf[76:80], cfg.RadioButtonCount)
	binary.LittleEndian.PutUint64(buf[80:88], uint64(cfg.RadioButtons))
	binary.LittleEndian.PutUint32(buf[88:92], uint32(cfg.DefaultRadioButton))
	binary.LittleEndian.PutUint64(buf[92:100], uint64(cfg.VerificationText))
	binary.LittleEndian.PutUint64(buf[100:108], uint64(cfg.ExpandedInformation))
	binary.LittleEndian.PutUint64(buf[108:116], uint64(cfg.ExpandedControlText))
	binary.LittleEndian.PutUint64(buf[116:124], uint64(cfg.CollapsedControlText))
	binary.LittleEndian.PutUint64(buf[124:132], uint64(cfg.FooterIcon))
	binary.LittleEndian.PutUint64(buf[132:140], uint64(cfg.Footer))
	binary.LittleEndian.PutUint64(buf[140:148], uint64(cfg.Callback))
	binary.LittleEndian.PutUint64(buf[148:156], uint64(cfg.CallbackData))
	binary.LittleEndian.PutUint32(buf[156:160], cfg.Width)
	return buf
}
