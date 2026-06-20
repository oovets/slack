package gui

import (
	"image/color"
	"strings"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/canvas"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/driver/desktop"
	"fyne.io/fyne/v2/theme"
	"fyne.io/fyne/v2/widget"
	"github.com/stefan/slack-gui/api"
)

func btoi(b bool) int {
	if b {
		return 1
	}
	return 0
}

// =========================================================================
// Workspace rail — 52px column on the far left with the team initials tile
// and a column of navigation icons. Painted with palette.RailBG.
// =========================================================================

func (a *App) buildWorkspaceRail() fyne.CanvasObject {
	bg := canvas.NewRectangle(palette.RailBG)
	a.railBg = bg

	tile := newWorkspaceTile(a.info)
	homeIcon := newRailIcon(theme.HomeIcon())
	chatIcon := newRailIcon(theme.MailComposeIcon())
	bellIcon := newRailIcon(theme.VisibilityIcon())

	userInitials := "Yo"
	if a.info != nil {
		userInitials = userInitialsFrom(a.info.UserName)
	}
	user := newWorkspaceTileFromInitials(userInitials, color.NRGBA{R: 91, G: 141, B: 255, A: 230})

	col := container.NewVBox(
		fixedHeightSpacer(8),
		container.NewCenter(tile),
		fixedHeightSpacer(14),
		container.NewCenter(homeIcon),
		fixedHeightSpacer(6),
		container.NewCenter(chatIcon),
		fixedHeightSpacer(6),
		container.NewCenter(bellIcon),
	)
	bottom := container.NewVBox(
		container.NewCenter(user),
		fixedHeightSpacer(8),
	)
	stacked := container.NewBorder(col, bottom, nil, nil, canvas.NewRectangle(color.Transparent))

	wrap := container.NewStack(bg, stacked)
	return &fixedWidthBox{CanvasObject: wrap, w: 44}
}

func userInitialsFrom(name string) string {
	name = strings.TrimSpace(name)
	if name == "" {
		return "Yo"
	}
	return teamInitials(name)
}

// fixedWidthBox wraps any object and reports a fixed-width MinSize so the
// workspace rail keeps its fixed column regardless of content.
type fixedWidthBox struct {
	fyne.CanvasObject
	w float32
}

func (b *fixedWidthBox) MinSize() fyne.Size {
	m := b.CanvasObject.MinSize()
	return fyne.NewSize(b.w, m.Height)
}

// =========================================================================
// Workspace tile — rounded-square badge showing team initials in a soft
// gradient. Falls back to "DS" when no team name is available.
// =========================================================================

func newWorkspaceTile(info *api.AuthInfo) fyne.CanvasObject {
	name := "DS"
	if info != nil && strings.TrimSpace(info.TeamName) != "" {
		name = teamInitials(info.TeamName)
	}
	return newWorkspaceTileFromInitials(name, color.NRGBA{R: 99, G: 102, B: 241, A: 255})
}

func newWorkspaceTileFromInitials(initials string, bgCol color.NRGBA) fyne.CanvasObject {
	bg := canvas.NewRectangle(bgCol)
	bg.CornerRadius = 10
	bg.SetMinSize(fyne.NewSize(36, 36))

	txt := canvas.NewText(initials, color.NRGBA{R: 255, G: 255, B: 255, A: 255})
	txt.Alignment = fyne.TextAlignCenter
	txt.TextStyle = fyne.TextStyle{Bold: true}
	txt.TextSize = 13

	stack := container.NewStack(bg, container.NewCenter(txt))
	stack.Resize(fyne.NewSize(36, 36))
	return stack
}

func teamInitials(name string) string {
	if name == "" {
		return "DS"
	}
	runes := []rune(name)
	if len(runes) == 1 {
		return string(runes)
	}
	out := []rune{}
	prevSpace := true
	for _, r := range runes {
		if r == ' ' || r == '-' || r == '_' {
			prevSpace = true
			continue
		}
		if prevSpace {
			out = append(out, r)
			if len(out) == 2 {
				break
			}
		}
		prevSpace = false
	}
	if len(out) == 0 {
		out = append(out, runes[0])
	}
	if len(out) == 1 && len(runes) > 1 {
		out = append(out, runes[1])
	}
	return string(out)
}

// =========================================================================
// Rail icon — ghost button styled in muted palette tones with hover state.
// =========================================================================

type railIcon struct {
	widget.BaseWidget
	bg    *canvas.Rectangle
	icon  *canvas.Image
	onTap func()
}

func newRailIcon(res fyne.Resource) *railIcon {
	bg := canvas.NewRectangle(color.Transparent)
	bg.CornerRadius = 8
	img := canvas.NewImageFromResource(res)
	img.FillMode = canvas.ImageFillContain
	img.SetMinSize(fyne.NewSize(18, 18))
	r := &railIcon{bg: bg, icon: img}
	r.ExtendBaseWidget(r)
	return r
}

func (r *railIcon) CreateRenderer() fyne.WidgetRenderer { return &railIconRenderer{r: r} }
func (r *railIcon) Tapped(_ *fyne.PointEvent) {
	if r.onTap != nil {
		r.onTap()
	}
}
func (r *railIcon) TappedSecondary(_ *fyne.PointEvent) {}
func (r *railIcon) Cursor() desktop.Cursor             { return desktop.PointerCursor }
func (r *railIcon) MouseIn(_ *desktop.MouseEvent) {
	r.bg.FillColor = color.NRGBA{R: 255, G: 255, B: 255, A: 18}
	r.bg.Refresh()
}
func (r *railIcon) MouseOut() {
	r.bg.FillColor = color.Transparent
	r.bg.Refresh()
}
func (r *railIcon) MouseMoved(_ *desktop.MouseEvent) {}

type railIconRenderer struct{ r *railIcon }

func (rr *railIconRenderer) MinSize() fyne.Size { return fyne.NewSize(34, 34) }
func (rr *railIconRenderer) Layout(s fyne.Size) {
	rr.r.bg.Move(fyne.NewPos(0, 0))
	rr.r.bg.Resize(s)
	const ic float32 = 18
	rr.r.icon.Move(fyne.NewPos((s.Width-ic)/2, (s.Height-ic)/2))
	rr.r.icon.Resize(fyne.NewSize(ic, ic))
}
func (rr *railIconRenderer) Refresh() { rr.r.bg.Refresh(); rr.r.icon.Refresh() }
func (rr *railIconRenderer) Objects() []fyne.CanvasObject {
	return []fyne.CanvasObject{rr.r.bg, rr.r.icon}
}
func (rr *railIconRenderer) Destroy() {}

// =========================================================================
// Segmented control — two-pill toggle used for Cozy/Compact in the top bar.
// =========================================================================

type segmented struct {
	widget.BaseWidget
	bg     *canvas.Rectangle
	cells  []*segmentCell
	active int
	onSel  func(int)
}

func newSegmented(labels []string, active int, onSel func(int)) *segmented {
	bg := canvas.NewRectangle(palette.SegmentBG)
	bg.CornerRadius = 8
	s := &segmented{bg: bg, active: active, onSel: onSel}
	for i, lbl := range labels {
		idx := i
		cell := newSegmentCell(lbl, i == active, func() {
			if s.active == idx {
				return
			}
			s.setActive(idx)
			if s.onSel != nil {
				s.onSel(idx)
			}
		})
		s.cells = append(s.cells, cell)
	}
	s.ExtendBaseWidget(s)
	return s
}

func (s *segmented) setActive(i int) {
	s.active = i
	for j, c := range s.cells {
		c.setActive(j == i)
	}
}

func (s *segmented) CreateRenderer() fyne.WidgetRenderer {
	objs := []fyne.CanvasObject{s.bg}
	for _, c := range s.cells {
		objs = append(objs, c)
	}
	return &segmentedRenderer{s: s, objs: objs}
}

type segmentedRenderer struct {
	s    *segmented
	objs []fyne.CanvasObject
}

func (r *segmentedRenderer) MinSize() fyne.Size {
	var w, h float32
	for _, c := range r.s.cells {
		m := c.MinSize()
		w += m.Width
		if m.Height > h {
			h = m.Height
		}
	}
	if h < 26 {
		h = 26
	}
	return fyne.NewSize(w+6, h+4)
}

func (r *segmentedRenderer) Layout(size fyne.Size) {
	r.s.bg.Move(fyne.NewPos(0, 0))
	r.s.bg.Resize(size)
	x := float32(3)
	inner := size.Height - 4
	for _, c := range r.s.cells {
		w := c.MinSize().Width
		c.Move(fyne.NewPos(x, 2))
		c.Resize(fyne.NewSize(w, inner))
		x += w
	}
}

func (r *segmentedRenderer) Refresh()                     { r.s.bg.Refresh() }
func (r *segmentedRenderer) Objects() []fyne.CanvasObject { return r.objs }
func (r *segmentedRenderer) Destroy()                     {}

type segmentCell struct {
	widget.BaseWidget
	bg    *canvas.Rectangle
	text  *canvas.Text
	on    bool
	onTap func()
}

func newSegmentCell(label string, on bool, onTap func()) *segmentCell {
	bg := canvas.NewRectangle(color.Transparent)
	bg.CornerRadius = 6
	t := canvas.NewText(label, palette.SegmentText)
	t.TextSize = 11
	t.TextStyle = fyne.TextStyle{Bold: on}
	t.Alignment = fyne.TextAlignCenter
	c := &segmentCell{bg: bg, text: t, on: on, onTap: onTap}
	c.setActive(on)
	c.ExtendBaseWidget(c)
	return c
}

func (c *segmentCell) setActive(on bool) {
	c.on = on
	if on {
		c.bg.FillColor = palette.SegmentActive
	} else {
		c.bg.FillColor = color.Transparent
	}
	c.text.TextStyle = fyne.TextStyle{Bold: on}
	c.bg.Refresh()
	c.text.Refresh()
}

func (c *segmentCell) CreateRenderer() fyne.WidgetRenderer {
	return &segmentCellRenderer{c: c}
}
func (c *segmentCell) Tapped(_ *fyne.PointEvent) {
	if c.onTap != nil {
		c.onTap()
	}
}
func (c *segmentCell) TappedSecondary(_ *fyne.PointEvent) {}
func (c *segmentCell) Cursor() desktop.Cursor             { return desktop.PointerCursor }

type segmentCellRenderer struct{ c *segmentCell }

func (r *segmentCellRenderer) MinSize() fyne.Size {
	m := r.c.text.MinSize()
	return fyne.NewSize(m.Width+18, m.Height+10)
}
func (r *segmentCellRenderer) Layout(s fyne.Size) {
	r.c.bg.Move(fyne.NewPos(0, 0))
	r.c.bg.Resize(s)
	m := r.c.text.MinSize()
	r.c.text.Move(fyne.NewPos((s.Width-m.Width)/2, (s.Height-m.Height)/2))
	r.c.text.Resize(m)
}
func (r *segmentCellRenderer) Refresh() { r.c.bg.Refresh(); r.c.text.Refresh() }
func (r *segmentCellRenderer) Objects() []fyne.CanvasObject {
	return []fyne.CanvasObject{r.c.bg, r.c.text}
}
func (r *segmentCellRenderer) Destroy() {}
