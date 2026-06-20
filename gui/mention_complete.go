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
// Fyne's PopUp runs in its own overlay focus context, which means keyboard
// events are routed to the overlay's focus manager rather than the main canvas.
// To keep the composer entry receiving keystrokes we:
//  1. Reuse a single PopUp and swap its Content in-place (avoids the
//     hide→show cycle that triggers extra focus-context switches).
//  2. Call cvs.Focus(entry) after each show so the entry is registered as the
//     focused widget inside the overlay's focus context.
type mentionCompleter struct {
	popup     *widget.PopUp
	entry     fyne.Focusable
	items     []completionMatch
	selected  int
	rowBGs    []*canvas.Rectangle
	rowLabels []*widget.Label
	onPick    func(handle string)
	cvs       fyne.Canvas
}

func newMentionCompleter(cvs fyne.Canvas, entry fyne.Focusable, onPick func(handle string)) *mentionCompleter {
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

	if mc.popup == nil {
		// First show: create the popup.
		mc.popup = widget.NewPopUp(content, mc.cvs)
	} else {
		// Subsequent updates: swap content in-place to avoid the Hide→Show
		// cycle that would trigger an extra overlay focus-context switch.
		mc.popup.Content = content
		mc.popup.Refresh()
	}
	mc.popup.ShowAtPosition(pos)

	// Fyne routes keyboard events to the overlay's focus manager when a PopUp
	// is visible. Re-focus the composer entry inside that context so keystrokes
	// keep reaching it while the completer is open.
	if mc.entry != nil {
		mc.cvs.Focus(mc.entry)
	}
}

func (mc *mentionCompleter) hide() {
	if mc.popup != nil {
		mc.popup.Hide()
	}
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
	return unicode.IsLetter(r) || unicode.IsDigit(r) || r == '.' || r == '_' || r == '-' || r == ' '
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
	entry.SetText(strings.Join(lines, "\n"))
}
