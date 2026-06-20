package gui

import (
	"image/color"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/canvas"
	"fyne.io/fyne/v2/driver/desktop"
	"fyne.io/fyne/v2/widget"
)

func btoi(b bool) int {
	if b {
		return 1
	}
	return 0
}

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
