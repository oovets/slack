package gui

import (
	"image/color"
	"strings"
	"unicode"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/canvas"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/widget"
)

// completionMatch is one autocomplete candidate (display label + Slack handle to insert).
type completionMatch struct {
	label  string
	handle string
}

// mentionCompleter shows a small popup list of matching users when the composer
// detects an @prefix. The popup uses plain tappable rows (not widget.List) to
// avoid Fyne's internal focus management.
//
// Fyne's PopUp adds its own focus manager to the overlay stack, which means
// canvas.Focused() returns nil while the popup is visible (the entry is not in
// the popup's widget tree). To keep the composer entry receiving keystrokes we:
//  1. Reuse a single PopUp and swap its Content in-place (avoids extra overlay
//     focus-context switches on each update).
//  2. Wire canvas.SetOnTypedRune / SetOnTypedKey while the popup is visible.
//     The glfw driver falls through to these handlers when canvas.Focused()==nil,
//     so typed runes and navigation keys are forwarded directly to the entry.
//  3. Clear those handlers in hide() so normal focus routing resumes.
type mentionCompleter struct {
	popup     *widget.PopUp
	entry     *focusEntry
	items     []completionMatch
	selected  int
	rowBGs    []*canvas.Rectangle
	rowLabels []*widget.Label
	onPick    func(handle string)
	cvs       fyne.Canvas
}

func newMentionCompleter(cvs fyne.Canvas, entry *focusEntry, onPick func(handle string)) *mentionCompleter {
	return &mentionCompleter{cvs: cvs, entry: entry, onPick: onPick}
}

// update shows or refreshes the popup with fresh match rows positioned above anchor.
// Calling with an empty slice hides the popup.
func (mc *mentionCompleter) update(matches []completionMatch, anchor fyne.CanvasObject) {
	if len(matches) == 0 {
		mc.hide()
		return
	}
	mc.items = matches
	if mc.selected >= len(mc.items) {
		mc.selected = 0
	}

	const rowH = float32(26)
	const rowPadV = float32(3)
	h := float32(len(mc.items))*rowH + rowPadV*2

	// Build non-focusable tap rows so Fyne never puts focus inside the popup.
	mc.rowBGs = make([]*canvas.Rectangle, len(mc.items))
	mc.rowLabels = make([]*widget.Label, len(mc.items))
	rows := container.NewVBox()
	for i, m := range mc.items {
		i, m := i, m
		bg := canvas.NewRectangle(color.Transparent)
		bg.CornerRadius = 4
		lbl := widget.NewLabel(m.label)
		lbl.Wrapping = fyne.TextTruncate
		if i == mc.selected {
			bg.FillColor = selBGColor()
			lbl.TextStyle = fyne.TextStyle{Bold: true}
			lbl.Importance = widget.HighImportance
		}
		mc.rowBGs[i] = bg
		mc.rowLabels[i] = lbl
		row := newTapWrap(
			container.NewMax(bg, container.NewBorder(nil, nil, fixedWidthSpacer(6), fixedWidthSpacer(6), lbl)),
			func() {
				mc.selected = i
				mc.confirm()
			},
		)
		rows.Add(row)
	}

	outerBG := canvas.NewRectangle(popupBGColor())
	outerBG.CornerRadius = 7
	outerBorder := canvas.NewRectangle(color.Transparent)
	outerBorder.StrokeColor = popupBorderColor()
	outerBorder.StrokeWidth = 1
	outerBorder.CornerRadius = 7

	padded := container.NewBorder(
		fixedHeightSpacer(rowPadV), fixedHeightSpacer(rowPadV),
		nil, nil,
		rows,
	)
	content := container.NewGridWrap(fyne.NewSize(280, h),
		container.NewMax(outerBG, outerBorder, padded),
	)

	abs := fyne.CurrentApp().Driver().AbsolutePositionForObject(anchor)
	pos := fyne.NewPos(abs.X, abs.Y-h-6)
	if pos.Y < 10 {
		pos.Y = abs.Y + anchor.Size().Height + 6
	}

	// Recreate the popup each update so the renderer's object list always
	// reflects the new rows. Swapping popup.Content in-place doesn't work
	// because the renderer caches the original objects at creation time.
	if mc.popup != nil {
		mc.popup.Hide()
	}
	mc.popup = widget.NewPopUp(content, mc.cvs)
	mc.popup.ShowAtPosition(pos)

	// Fyne's overlay focus manager does not contain the entry, so
	// canvas.Focused() returns nil while the popup is shown. The glfw driver
	// falls back to canvas.OnTypedRune/OnTypedKey when Focused()==nil, so we
	// wire those handlers to forward every keystroke to the entry directly.
	// This also keeps visual focus on the entry (cursor blinking etc.).
	if mc.entry != nil {
		entry := mc.entry
		mc.cvs.SetOnTypedRune(func(r rune) { entry.TypedRune(r) })
		mc.cvs.SetOnTypedKey(func(k *fyne.KeyEvent) { entry.TypedKey(k) })
		mc.cvs.Focus(mc.entry)
	}
}

func (mc *mentionCompleter) hide() {
	if mc.popup != nil {
		mc.popup.Hide()
	}
	mc.cvs.SetOnTypedRune(nil)
	mc.cvs.SetOnTypedKey(nil)
	mc.items = nil
	mc.rowBGs = nil
	mc.rowLabels = nil
	mc.selected = 0
}

func (mc *mentionCompleter) isVisible() bool {
	return mc.popup != nil && len(mc.items) > 0 && mc.popup.Visible()
}

// move shifts the highlighted row by delta, wrapping around.
func (mc *mentionCompleter) move(delta int) {
	if len(mc.items) == 0 {
		return
	}
	if mc.selected >= 0 && mc.selected < len(mc.rowBGs) {
		mc.rowBGs[mc.selected].FillColor = color.Transparent
		mc.rowBGs[mc.selected].Refresh()
		mc.rowLabels[mc.selected].TextStyle = fyne.TextStyle{}
		mc.rowLabels[mc.selected].Importance = widget.MediumImportance
		mc.rowLabels[mc.selected].Refresh()
	}
	mc.selected += delta
	if mc.selected < 0 {
		mc.selected = len(mc.items) - 1
	}
	if mc.selected >= len(mc.items) {
		mc.selected = 0
	}
	if mc.selected >= 0 && mc.selected < len(mc.rowBGs) {
		mc.rowBGs[mc.selected].FillColor = selBGColor()
		mc.rowBGs[mc.selected].Refresh()
		mc.rowLabels[mc.selected].TextStyle = fyne.TextStyle{Bold: true}
		mc.rowLabels[mc.selected].Importance = widget.HighImportance
		mc.rowLabels[mc.selected].Refresh()
	}
}

func (mc *mentionCompleter) confirm() {
	if len(mc.items) == 0 || mc.selected < 0 || mc.selected >= len(mc.items) {
		return
	}
	handle := mc.items[mc.selected].handle
	mc.hide()
	if mc.onPick != nil {
		mc.onPick(handle)
	}
}

func selBGColor() color.Color       { return palette.SidebarSelBG }
func popupBGColor() color.Color     { return palette.ComposerBG }
func popupBorderColor() color.Color { return color.Color(palette.ComposerBorder) }

// mentionPrefixAt returns the word after the last @ before the cursor (row, col),
// scanning backwards from the cursor. Returns ("", false) if no @ is found.
func mentionPrefixAt(text string, row, col int) (prefix string, found bool) {
	lines := strings.Split(text, "\n")
	if row >= len(lines) {
		return "", false
	}
	runes := []rune(lines[row])
	if col > len(runes) {
		col = len(runes)
	}
	sub := runes[:col]
	for i := len(sub) - 1; i >= 0; i-- {
		r := sub[i]
		if r == '@' {
			return string(sub[i+1:]), true
		}
		if !isMentionHandleChar(r) {
			return "", false
		}
	}
	return "", false
}

func isMentionHandleChar(r rune) bool {
	return unicode.IsLetter(r) || unicode.IsDigit(r) || r == '.' || r == '_' || r == '-'
}

// applyMentionCompletion replaces the @prefix before the cursor with @handle+space.
func applyMentionCompletion(entry *focusEntry, handle string) {
	text := entry.Text
	row := entry.CursorRow
	col := entry.CursorColumn
	lines := strings.Split(text, "\n")
	if row >= len(lines) {
		return
	}
	runes := []rune(lines[row])
	if col > len(runes) {
		col = len(runes)
	}
	atPos := -1
	for i := col - 1; i >= 0; i-- {
		if runes[i] == '@' {
			atPos = i
			break
		}
		if !isMentionHandleChar(runes[i]) {
			break
		}
	}
	if atPos < 0 {
		return
	}
	lines[row] = string(runes[:atPos+1]) + handle + " " + string(runes[col:])
	// Set cursor to after "@handle " before SetText so that updateCursorAndSelection
	// keeps it there (it only clamps, never moves forward).
	entry.CursorRow = row
	entry.CursorColumn = atPos + len([]rune(handle)) + 2
	entry.SetText(strings.Join(lines, "\n"))
}
