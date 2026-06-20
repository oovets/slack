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
	"fyne.io/fyne/v2/driver/desktop"
	"fyne.io/fyne/v2/theme"
	"fyne.io/fyne/v2/widget"
	"github.com/stefan/slack-gui/api"
)


// ===== Reaction chips =====================================================

// reactionChip is a Slack-style pill: rounded corners, hairline border,
// tight padding, and hover affordance. Self-reacted variants use the
// accent (blue) tint and a bold count.
type reactionChip struct {
	widget.BaseWidget
	bg     *canvas.Rectangle
	emoji  fyne.CanvasObject
	count  *canvas.Text
	onTap  func()
	self   bool
	hover  bool
}

func newReactionChip(reaction api.Reaction, selfUserID string, onTap func()) fyne.CanvasObject {
	self := false
	trimmedSelf := strings.TrimSpace(selfUserID)
	if trimmedSelf != "" {
		for _, u := range reaction.Users {
			if strings.TrimSpace(u) == trimmedSelf {
				self = true
				break
			}
		}
	}

	bgCol := palette.ChipBG
	strokeCol := palette.ChipBorder
	textCol := palette.ChipText
	if self {
		bgCol = palette.ChipSelfBG
		strokeCol = palette.ChipSelfBorder
		textCol = palette.ChipSelfText
	}

	bg := canvas.NewRectangle(bgCol)
	bg.CornerRadius = 12
	bg.StrokeColor = strokeCol
	bg.StrokeWidth = 1

	emoji := newReactionEmojiView(reaction.Name)
	count := canvas.NewText(fmt.Sprintf("%d", reaction.Count), textCol)
	count.TextSize = reactionCountTextSize()
	count.TextStyle = fyne.TextStyle{Bold: self}

	c := &reactionChip{
		bg:    bg,
		emoji: emoji,
		count: count,
		onTap: onTap,
		self:  self,
	}
	c.ExtendBaseWidget(c)
	return c
}

func (c *reactionChip) CreateRenderer() fyne.WidgetRenderer {
	return &reactionChipRenderer{chip: c}
}

func (c *reactionChip) Tapped(_ *fyne.PointEvent)          { if c.onTap != nil { c.onTap() } }
func (c *reactionChip) TappedSecondary(_ *fyne.PointEvent) {}
func (c *reactionChip) Cursor() desktop.Cursor             { return desktop.PointerCursor }
func (c *reactionChip) MouseIn(_ *desktop.MouseEvent) {
	c.hover = true
	c.applyHoverTint()
}
func (c *reactionChip) MouseOut() {
	c.hover = false
	c.applyHoverTint()
}
func (c *reactionChip) MouseMoved(_ *desktop.MouseEvent) {}

func (c *reactionChip) applyHoverTint() {
	if c.hover {
		c.bg.StrokeColor = mixColor(c.bg.StrokeColor, color.NRGBA{R: 255, G: 255, B: 255, A: 255}, 0.18)
	} else if c.self {
		c.bg.StrokeColor = palette.ChipSelfBorder
	} else {
		c.bg.StrokeColor = palette.ChipBorder
	}
	c.bg.Refresh()
}

// reactionChipRenderer lays out [emoji][gap][count] inside the rounded
// background with consistent horizontal/vertical padding.
type reactionChipRenderer struct{ chip *reactionChip }

const (
	chipPadX   = float32(5)
	chipPadY   = float32(0)
	chipInnerG = float32(3)
	chipMinH   = float32(18)
)



func (r *reactionChipRenderer) MinSize() fyne.Size {
	em := r.chip.emoji.MinSize()
	ct := r.chip.count.MinSize()
	h := em.Height
	if ct.Height > h {
		h = ct.Height
	}
	if h < chipMinH-2*chipPadY {
		h = chipMinH - 2*chipPadY
	}
	w := chipPadX*2 + em.Width + chipInnerG + ct.Width
	return fyne.NewSize(w, h+chipPadY*2)
}

func (r *reactionChipRenderer) Layout(size fyne.Size) {
	r.chip.bg.Move(fyne.NewPos(0, 0))
	r.chip.bg.Resize(size)

	em := r.chip.emoji.MinSize()
	ct := r.chip.count.MinSize()
	inner := size.Height - 2*chipPadY
	// vertically center each
	emY := chipPadY + (inner-em.Height)/2
	ctY := chipPadY + (inner-ct.Height)/2

	r.chip.emoji.Move(fyne.NewPos(chipPadX, emY))
	r.chip.emoji.Resize(em)
	r.chip.count.Move(fyne.NewPos(chipPadX+em.Width+chipInnerG, ctY))
	r.chip.count.Resize(ct)
}

func (r *reactionChipRenderer) Refresh() {
	r.chip.bg.Refresh()
	r.chip.emoji.Refresh()
	r.chip.count.Refresh()
}

func (r *reactionChipRenderer) Objects() []fyne.CanvasObject {
	return []fyne.CanvasObject{r.chip.bg, r.chip.emoji, r.chip.count}
}

func (r *reactionChipRenderer) Destroy() {}

// ===== Icon action buttons ===============================================

// newAddReactionButton renders Slack's add-reaction affordance using the
// theme's content-add icon: a compact, outline-only square that visually
// defers to existing reaction chips.
func newAddReactionButton(win fyne.Window, onPicked func(name string)) fyne.CanvasObject {
	if onPicked == nil {
		return nil
	}
	return newIconChipButton(theme.ContentAddIcon(), func() { showEmojiPicker(win, onPicked) })
}

// newIconActionButton renders a compact icon-only action chip (same
// footprint as the add-reaction button) for actions like Reply that
// belong on the same row as the reaction chips.
//
// glyph is ignored when iconRes is non-nil; callers should prefer the
// resource overload below.
func newIconActionButton(_glyph, _tooltip string, onTap func()) fyne.CanvasObject {
	if onTap == nil {
		return nil
	}
	return newIconChipButton(theme.MailReplyIcon(), onTap)
}

// newIconChipButton is the shared chip-shaped icon button used by the
// add-reaction "+" and the inline "Reply" affordance.
func newIconChipButton(res fyne.Resource, onTap func()) fyne.CanvasObject {
	bg := canvas.NewRectangle(palette.ChipAddBG)
	bg.CornerRadius = 10
	bg.StrokeColor = palette.ChipAddBorder
	bg.StrokeWidth = 1

	icon := canvas.NewImageFromResource(res)
	icon.FillMode = canvas.ImageFillContain
	icon.SetMinSize(fyne.NewSize(12, 12))

	btn := &iconChipBtn{bg: bg, icon: icon, onTap: onTap}
	btn.ExtendBaseWidget(btn)
	return btn
}

type iconChipBtn struct {
	widget.BaseWidget
	bg    *canvas.Rectangle
	icon  *canvas.Image
	onTap func()
}

func (b *iconChipBtn) CreateRenderer() fyne.WidgetRenderer { return &iconChipBtnRenderer{btn: b} }
func (b *iconChipBtn) Tapped(_ *fyne.PointEvent)           { if b.onTap != nil { b.onTap() } }
func (b *iconChipBtn) TappedSecondary(_ *fyne.PointEvent)  {}
func (b *iconChipBtn) Cursor() desktop.Cursor              { return desktop.PointerCursor }
func (b *iconChipBtn) MouseIn(_ *desktop.MouseEvent) {
	b.bg.FillColor = palette.ThreadHoverBG
	b.bg.StrokeColor = mixColor(palette.ChipAddBorder, color.NRGBA{R: 255, G: 255, B: 255, A: 255}, 0.45)
	b.bg.Refresh()
}
func (b *iconChipBtn) MouseOut() {
	b.bg.FillColor = palette.ChipAddBG
	b.bg.StrokeColor = palette.ChipAddBorder
	b.bg.Refresh()
}
func (b *iconChipBtn) MouseMoved(_ *desktop.MouseEvent) {}

type iconChipBtnRenderer struct{ btn *iconChipBtn }

func (r *iconChipBtnRenderer) MinSize() fyne.Size {
	// Square chip, same height as reaction chips so they align on one row.
	return fyne.NewSize(chipMinH+2, chipMinH+2*chipPadY)
}
func (r *iconChipBtnRenderer) Layout(size fyne.Size) {
	r.btn.bg.Move(fyne.NewPos(0, 0))
	r.btn.bg.Resize(size)
	const iconSize float32 = 11
	r.btn.icon.Move(fyne.NewPos((size.Width-iconSize)/2, (size.Height-iconSize)/2))
	r.btn.icon.Resize(fyne.NewSize(iconSize, iconSize))
}
func (r *iconChipBtnRenderer) Refresh()                     { r.btn.bg.Refresh(); r.btn.icon.Refresh() }
func (r *iconChipBtnRenderer) Objects() []fyne.CanvasObject { return []fyne.CanvasObject{r.btn.bg, r.btn.icon} }
func (r *iconChipBtnRenderer) Destroy()                     {}




// ===== Color helpers =====================================================

func mixColor(a color.Color, b color.Color, t float32) color.NRGBA {
	ar, ag, ab, aa := nrgba(a)
	br, bg, bb, _ := nrgba(b)
	if t < 0 {
		t = 0
	}
	if t > 1 {
		t = 1
	}
	lerp := func(x, y uint8) uint8 { return uint8(float32(x)*(1-t) + float32(y)*t) }
	return color.NRGBA{R: lerp(ar, br), G: lerp(ag, bg), B: lerp(ab, bb), A: aa}
}

func nrgba(c color.Color) (uint8, uint8, uint8, uint8) {
	if n, ok := c.(color.NRGBA); ok {
		return n.R, n.G, n.B, n.A
	}
	r, g, b, a := c.RGBA()
	return uint8(r >> 8), uint8(g >> 8), uint8(b >> 8), uint8(a >> 8)
}

// ===== Emoji picker ======================================================

var commonReactionEmojis = []string{
	"+1", "-1", "joy", "heart", "fire", "tada",
	"eyes", "raised_hands", "pray", "rocket",
	"thinking_face", "white_check_mark",
}

const emojiPickerMaxResults = 56
const emojiPickerColumns = 8


var (
	emojiNamesCache    []string
	emojiNamesCacheKey int
)

func allEmojiNames() []string {
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

func filterEmojiNames(query string, maxResults int) []string {
	q := strings.ToLower(strings.Trim(strings.TrimSpace(query), ":"))
	all := allEmojiNames()
	if q == "" {
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

// pickerCell renders a single emoji button with hover background and a
// name label that surfaces on hover (Slack's emoji picker shows the
// shortcode in a footer; we keep the label inside the cell as a tooltip).
type pickerCell struct {
	widget.BaseWidget
	bg     *canvas.Rectangle
	emoji  fyne.CanvasObject
	name   string
	onTap  func()
	onHover func(string)
}

func newPickerCell(name string, onTap func(), onHover func(string)) *pickerCell {
	bg := canvas.NewRectangle(palette.PickerCellBG)
	bg.CornerRadius = 6
	c := &pickerCell{
		bg:     bg,
		emoji:  newReactionEmojiView(name),
		name:   name,
		onTap:  onTap,
		onHover: onHover,
	}
	c.ExtendBaseWidget(c)
	return c
}

func (c *pickerCell) CreateRenderer() fyne.WidgetRenderer {
	return &pickerCellRenderer{cell: c}
}
func (c *pickerCell) Tapped(_ *fyne.PointEvent)          { if c.onTap != nil { c.onTap() } }
func (c *pickerCell) TappedSecondary(_ *fyne.PointEvent) {}
func (c *pickerCell) Cursor() desktop.Cursor             { return desktop.PointerCursor }
func (c *pickerCell) MouseIn(_ *desktop.MouseEvent) {
	c.bg.FillColor = palette.PickerHoverBG
	c.bg.Refresh()
	if c.onHover != nil {
		c.onHover(c.name)
	}
}
func (c *pickerCell) MouseOut() {
	c.bg.FillColor = palette.PickerCellBG
	c.bg.Refresh()
	if c.onHover != nil {
		c.onHover("")
	}
}
func (c *pickerCell) MouseMoved(_ *desktop.MouseEvent) {}

type pickerCellRenderer struct{ cell *pickerCell }

func (r *pickerCellRenderer) MinSize() fyne.Size {
	s := r.cell.emoji.MinSize()
	side := s.Width
	if s.Height > side {
		side = s.Height
	}
	side += 8
	if side < 28 {
		side = 28
	}

	return fyne.NewSize(side, side)
}
func (r *pickerCellRenderer) Layout(size fyne.Size) {
	r.cell.bg.Move(fyne.NewPos(0, 0))
	r.cell.bg.Resize(size)
	s := r.cell.emoji.MinSize()
	r.cell.emoji.Move(fyne.NewPos((size.Width-s.Width)/2, (size.Height-s.Height)/2))
	r.cell.emoji.Resize(s)
}
func (r *pickerCellRenderer) Refresh()                     { r.cell.bg.Refresh(); r.cell.emoji.Refresh() }
func (r *pickerCellRenderer) Objects() []fyne.CanvasObject { return []fyne.CanvasObject{r.cell.bg, r.cell.emoji} }
func (r *pickerCellRenderer) Destroy()                     {}

func showEmojiPicker(win fyne.Window, onPicked func(name string)) {
	if win == nil {
		return
	}
	var form dialog.Dialog
	current := filterEmojiNames("", emojiPickerMaxResults)

	grid := container.NewGridWithColumns(emojiPickerColumns)
	status := canvas.NewText("", palette.MetaText)
	status.TextSize = reactionCountTextSize()

	hoverLabel := canvas.NewText("Pick an emoji", palette.MetaTextStrong)
	hoverLabel.TextSize = reactionCountTextSize() + 1
	hoverLabel.TextStyle = fyne.TextStyle{Bold: true}

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

	setHover := func(name string) {
		if strings.TrimSpace(name) == "" {
			hoverLabel.Text = "Pick an emoji"
		} else {
			hoverLabel.Text = ":" + name + ":"
		}
		hoverLabel.Refresh()
	}

	rebuild := func(names []string) {
		current = names
		grid.Objects = grid.Objects[:0]
		for _, name := range names {
			n := name
			grid.Objects = append(grid.Objects, newPickerCell(n, func() { pick(n) }, setHover))
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
	scrollGrid.SetMinSize(fyne.NewSize(280, 220))

	footer := container.NewBorder(nil, nil, hoverLabel, status, nil)

	body := container.NewBorder(
		entry,
		footer, nil, nil,
		scrollGrid,
	)

	form = dialog.NewCustomConfirm("Add reaction", "Add", "Cancel", body, func(ok bool) {
		if !ok {
			return
		}
		pick(entry.Text)
	}, win)
	form.Resize(fyne.NewSize(320, 320))
	form.Show()
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
