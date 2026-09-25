package main

import (
	"testing"

	"github.com/wailsapp/wails/v3/pkg/application"
)

func TestAddPasteFilesMenuItem(t *testing.T) {
	menu := application.NewMenu()
	menu.AddRole(application.EditMenu)

	if !addPasteFilesMenuItem(menu, func() {}) {
		t.Fatal("expected Edit menu")
	}
	item := menu.FindByLabel("Paste Files")
	if item == nil {
		t.Fatal("expected Paste Files menu item")
	}
	if accelerator := item.GetAccelerator(); accelerator != "Cmd+Shift+V" && accelerator != "Ctrl+Shift+V" {
		t.Fatalf("unexpected Paste Files accelerator: %q", accelerator)
	}
}

func TestAddPasteFilesMenuItemRequiresEditMenu(t *testing.T) {
	if addPasteFilesMenuItem(application.NewMenu(), func() {}) {
		t.Fatal("expected missing Edit menu to be rejected")
	}
}
