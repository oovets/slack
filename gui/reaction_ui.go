package gui

import (
	"fmt"
	"image/color"
	"sort"
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

func newAddReactionButton(win fyne.Window, onPicked func(name string)) fyne.CanvasObject {
	if onPicked == nil {
		return nil
	}
	bg := canvas.NewRectangle(color.NRGBA{R: 120, G: 126, B: 146, A: 22})
	bg.CornerRadius = 10
	bg.StrokeColor = color.NRGBA{R: 120, G: 126, B: 146, A: 55}
	bg.StrokeWidth = 1

	plus := canvas.NewText("+", color.NRGBA{R: 160, G: 170, B: 190, A: 230})
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

// commonReactionEmojis is the default "recent / popular" strip shown when
// the search field is empty.
var commonReactionEmojis = []string{
	"+1", "-1", "joy", "heart", "fire", "tada",
	"eyes", "raised_hands", "pray", "rocket",
	"thinking_face", "white_check_mark",
}

const emojiPickerMaxResults = 60
const emojiPickerColumns = 8

// emojiNameIndex caches the sorted list of all known emoji shortcodes
// (standard + workspace) so the live filter doesn't re-walk the maps on
// every keystroke. It's rebuilt lazily and after workspace emoji updates.
var (
	emojiNamesCache    []string
	emojiNamesCacheKey int // bumped when workspace map changes
)

func allEmojiNames() []string {
	// Standard names always present; workspace names depend on the workspace
	// map, which can be swapped. We rebuild whenever the workspace map size
	// changes — cheap enough for a few thousand entries.
	workspaceEmojiMu.RLock()
	wsCount := len(workspaceEmojiURLByKey) + len(workspaceEmojiAliasByKey)
	workspaceEmojiMu.RUnlock()
	if emojiNamesCache != nil && emojiNamesCacheKey == wsCount {
		return emojiNamesCache
	}
	seen := make(map[string]struct{}, len(slackEmojiUnicode)+wsCount)
	for name := range slackEmojiUnicode {
		if name == "" || strings.HasPrefix(name, "skin-tone-") {
			continue
		}
		seen[name] = struct{}{}
	}
	workspaceEmojiMu.RLock()
	for name := range workspaceEmojiURLByKey {
		seen[name] = struct{}{}
	}
	for name := range workspaceEmojiAliasByKey {
		seen[name] = struct{}{}
	}
	workspaceEmojiMu.RUnlock()
	out := make([]string, 0, len(seen))
	for name := range seen {
		out = append(out, name)
	}
	sort.Strings(out)
	emojiNamesCache = out
	emojiNamesCacheKey = wsCount
	return out
}

// filterEmojiNames returns up to maxResults shortcodes matching the query.
// Ranking prefers exact matches, then prefix, then substring; results are
// otherwise alphabetical so the grid order is stable.
func filterEmojiNames(query string, maxResults int) []string {
	q := strings.ToLower(strings.Trim(strings.TrimSpace(query), ":"))
	all := allEmojiNames()
	if q == "" {
		// Default view: the curated quick-picks first, then alphabetical
		// fill from the full index so the grid never looks empty.
		out := make([]string, 0, maxResults)
		seen := map[string]bool{}
		for _, name := range commonReactionEmojis {
			if !seen[name] {
				out = append(out, name)
				seen[name] = true
			}
		}
		for _, name := range all {
			if len(out) >= maxResults {
				break
			}
			if seen[name] {
				continue
			}
			out = append(out, name)
		}
		return out
	}
	type scored struct {
		name string
		rank int
	}
	hits := make([]scored, 0, 128)
	for _, name := range all {
		lower := strings.ToLower(name)
		rank := -1
		switch {
		case lower == q:
			rank = 0
		case strings.HasPrefix(lower, q):
			rank = 1
		case strings.Contains(lower, q):
			rank = 2
		default:
			// Also try matching against the unicode glyph itself, so
			// pasting an emoji character into the search finds it.
			if u, ok := slackEmojiUnicode[name]; ok && strings.Contains(u, query) {
				rank = 3
			}
		}
		if rank < 0 {
			continue
		}
		hits = append(hits, scored{name: name, rank: rank})
	}
	sort.SliceStable(hits, func(i, j int) bool {
		if hits[i].rank != hits[j].rank {
			return hits[i].rank < hits[j].rank
		}
		return hits[i].name < hits[j].name
	})
	if len(hits) > maxResults {
		hits = hits[:maxResults]
	}
	out := make([]string, len(hits))
	for i, h := range hits {
		out[i] = h.name
	}
	return out
}

// showEmojiPicker opens a dialog with a live-filtered emoji grid. Typing
// in the search field re-renders the grid; Enter picks the first result.
func showEmojiPicker(win fyne.Window, onPicked func(name string)) {
	if win == nil {
		return
	}
	var form dialog.Dialog
	current := filterEmojiNames("", emojiPickerMaxResults)

	grid := container.NewGridWithColumns(emojiPickerColumns)
	status := canvas.NewText("", color.NRGBA{R: 150, G: 158, B: 178, A: 200})
	status.TextSize = reactionCountTextSize()

	pick := func(name string) {
		clean := strings.Trim(strings.TrimSpace(name), ":")
		if clean == "" {
			return
		}
		onPicked(clean)
		if form != nil {
			form.Hide()
		}
	}

	rebuild := func(names []string) {
		current = names
		grid.Objects = grid.Objects[:0]
		for _, name := range names {
			n := name
			emoji := newReactionEmojiView(n)
			cell := container.NewPadded(container.NewCenter(emoji))
			grid.Objects = append(grid.Objects, newTapWrap(cell, func() { pick(n) }))
		}
		grid.Refresh()
		if len(names) == 0 {
			status.Text = "No matches"
		} else {
			status.Text = fmt.Sprintf("%d match%s", len(names), pluralES(len(names)))
		}
		status.Refresh()
	}

	entry := widget.NewEntry()
	entry.SetPlaceHolder("Search emoji — name or :shortcode:")
	entry.OnChanged = func(q string) {
		rebuild(filterEmojiNames(q, emojiPickerMaxResults))
	}
	entry.OnSubmitted = func(q string) {
		if len(current) > 0 {
			pick(current[0])
			return
		}
		pick(q)
	}

	rebuild(current)

	scrollGrid := container.NewVScroll(grid)
	scrollGrid.SetMinSize(fyne.NewSize(380, 260))

	body := container.NewBorder(
		container.NewVBox(entry, status),
		nil, nil, nil,
		scrollGrid,
	)

	form = dialog.NewCustomConfirm("Add reaction", "Add", "Cancel", body, func(ok bool) {
		if !ok {
			return
		}
		pick(entry.Text)
	}, win)
	form.Resize(fyne.NewSize(420, 380))
	form.Show()
	// Focus the search field so the user can start typing immediately.
	if c := win.Canvas(); c != nil {
		c.Focus(entry)
	}
}

func pluralES(n int) string {
	if n == 1 {
		return ""
	}
	return "es"
}
