package gui

import (
	"fmt"
	"image/color"
	"strings"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/canvas"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/dialog"
	"fyne.io/fyne/v2/widget"
	"github.com/stefan/slack-gui/api"
)

// reactionChipColors picks the chip background + count colors based on
// whether the current user has already reacted with this emoji.
type reactionChipColors struct {
	bg     color.NRGBA
	stroke color.NRGBA
	text   color.NRGBA
}

func chipColors(selfReacted bool) reactionChipColors {
	if selfReacted {
		return reactionChipColors{
			bg:     color.NRGBA{R: 122, G: 162, B: 247, A: 55},
			stroke: color.NRGBA{R: 122, G: 162, B: 247, A: 180},
			text:   color.NRGBA{R: 170, G: 200, B: 255, A: 240},
		}
	}
	return reactionChipColors{
		bg:     color.NRGBA{R: 120, G: 126, B: 146, A: 30},
		stroke: color.NRGBA{R: 120, G: 126, B: 146, A: 70},
		text:   color.NRGBA{R: 160, G: 170, B: 190, A: 230},
	}
}

// newReactionChip renders a single reaction as a rounded pill with the
// emoji image + count. Tapping it triggers onTap (typically toggling the
// current user's reaction).
func newReactionChip(reaction api.Reaction, selfUserID string, onTap func()) fyne.CanvasObject {
	self := false
	for _, u := range reaction.Users {
		if strings.TrimSpace(u) != "" && strings.TrimSpace(u) == strings.TrimSpace(selfUserID) {
			self = true
			break
		}
	}
	colors := chipColors(self)

	bg := canvas.NewRectangle(colors.bg)
	bg.CornerRadius = 10
	bg.StrokeColor = colors.stroke
	bg.StrokeWidth = 1

	emoji := newReactionEmojiView(reaction.Name)
	count := canvas.NewText(fmt.Sprintf(" %d", reaction.Count), colors.text)
	count.TextSize = reactionCountTextSize()
	count.TextStyle = fyne.TextStyle{Bold: self}

	inner := container.NewHBox(emoji, count)
	padded := container.NewBorder(
		nil, nil,
		fixedWidthSpacer(8), fixedWidthSpacer(8),
		container.NewPadded(inner),
	)
	chip := container.NewStack(bg, padded)
	if onTap == nil {
		return chip
	}
	return newTapWrap(chip, onTap)
}

// newAddReactionButton renders a small "+" chip that opens an emoji
// picker dialog and forwards the chosen shortcode to onPicked.
func newAddReactionButton(win fyne.Window, onPicked func(name string)) fyne.CanvasObject {
	if onPicked == nil {
		return nil
	}
	bg := canvas.NewRectangle(color.NRGBA{R: 120, G: 126, B: 146, A: 22})
	bg.CornerRadius = 10
	bg.StrokeColor = color.NRGBA{R: 120, G: 126, B: 146, A: 55}
	bg.StrokeWidth = 1

	plus := canvas.NewText("＋", color.NRGBA{R: 160, G: 170, B: 190, A: 230})
	plus.TextSize = reactionCountTextSize() + 2
	plus.TextStyle = fyne.TextStyle{Bold: true}
	plus.Alignment = fyne.TextAlignCenter

	padded := container.NewBorder(
		nil, nil,
		fixedWidthSpacer(8), fixedWidthSpacer(8),
		container.NewPadded(plus),
	)
	chip := container.NewStack(bg, padded)
	return newTapWrap(chip, func() {
		showEmojiPicker(win, onPicked)
	})
}

// commonReactionEmojis are the quick-pick shortcodes shown at the top of
// the add-reaction dialog. Kept short so the dialog stays compact.
var commonReactionEmojis = []string{
	"+1", "-1", "joy", "heart", "fire", "tada", "eyes",
	"raised_hands", "pray", "rocket", "thinking_face", "white_check_mark",
}

func showEmojiPicker(win fyne.Window, onPicked func(name string)) {
	if win == nil {
		// fall back to no-op rather than crashing — caller should always
		// pass a window but the dialog package requires one.
		return
	}
	entry := widget.NewEntry()
	entry.SetPlaceHolder("emoji name, e.g. tada or partyparrot")

	submit := func(name string) {
		clean := strings.Trim(strings.TrimSpace(name), ":")
		if clean == "" {
			return
		}
		onPicked(clean)
	}

	quick := container.NewGridWithColumns(6)
	for _, name := range commonReactionEmojis {
		n := name
		emoji := newReactionEmojiView(n)
		cell := container.NewStack(emoji)
		quick.Add(newTapWrap(container.NewCenter(cell), func() {
			submit(n)
		}))
	}

	hint := canvas.NewText("Quick picks", color.NRGBA{R: 150, G: 158, B: 178, A: 200})
	hint.TextSize = reactionCountTextSize()

	body := container.NewVBox(
		hint,
		quick,
		widget.NewSeparator(),
		entry,
	)

	form := dialog.NewCustomConfirm("Add reaction", "Add", "Cancel", body, func(ok bool) {
		if !ok {
			return
		}
		submit(entry.Text)
	}, win)
	// Hook quick-picks to also close the dialog after picking.
	for i, name := range commonReactionEmojis {
		n := name
		if i >= len(quick.Objects) {
			break
		}
		wrap, ok := quick.Objects[i].(*tapWrap)
		if !ok {
			continue
		}
		wrap.onTap = func() {
			submit(n)
			form.Hide()
		}
	}
	form.Resize(fyne.NewSize(360, 260))
	form.Show()
}
