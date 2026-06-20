package gui

import (
	"image/color"
	"strings"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/canvas"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/driver/desktop"
	"fyne.io/fyne/v2/widget"
)

// =========================================================================
// Composer helpers: send button, vertical spacer, formatting toolbar.
// =========================================================================

// layoutSpacerH returns a transparent vertical spacer of the given height.
func layoutSpacerH(h float32) fyne.CanvasObject {
	r := canvas.NewRectangle(color.Transparent)
	r.SetMinSize(fyne.NewSize(1, h))
	return r
}

// sendArrowIcon is the white paper-plane glyph used inside the primary
// blue send button.
var sendArrowIcon = fyne.NewStaticResource("send-arrow.svg", []byte(
	`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`))

// newPrimarySendButton renders the rounded blue square with a white arrow
// used to submit a composer message.
func newPrimarySendButton(onTap func()) fyne.CanvasObject {
	bg := canvas.NewRectangle(palette.SendButtonBG)
	bg.CornerRadius = 8

	icon := canvas.NewImageFromResource(sendArrowIcon)
	icon.FillMode = canvas.ImageFillContain
	icon.SetMinSize(fyne.NewSize(14, 14))

	b := &primarySendButton{bg: bg, icon: icon, onTap: onTap}
	b.ExtendBaseWidget(b)
	return b
}

type primarySendButton struct {
	widget.BaseWidget
	bg    *canvas.Rectangle
	icon  *canvas.Image
	onTap func()
}

func (b *primarySendButton) CreateRenderer() fyne.WidgetRenderer {
	return &primarySendButtonRenderer{b: b}
}
func (b *primarySendButton) Tapped(_ *fyne.PointEvent) {
	if b.onTap != nil {
		b.onTap()
	}
}
func (b *primarySendButton) TappedSecondary(_ *fyne.PointEvent) {}
func (b *primarySendButton) Cursor() desktop.Cursor             { return desktop.PointerCursor }
func (b *primarySendButton) MouseIn(_ *desktop.MouseEvent) {
	b.bg.FillColor = color.NRGBA{R: 96, G: 152, B: 252, A: 255}
	b.bg.Refresh()
}
func (b *primarySendButton) MouseOut() {
	b.bg.FillColor = palette.SendButtonBG
	b.bg.Refresh()
}
func (b *primarySendButton) MouseMoved(_ *desktop.MouseEvent) {}

type primarySendButtonRenderer struct{ b *primarySendButton }

func (r *primarySendButtonRenderer) MinSize() fyne.Size { return fyne.NewSize(30, 26) }
func (r *primarySendButtonRenderer) Layout(s fyne.Size) {
	r.b.bg.Move(fyne.NewPos(0, 0))
	r.b.bg.Resize(s)
	const ic float32 = 14
	r.b.icon.Move(fyne.NewPos((s.Width-ic)/2, (s.Height-ic)/2))
	r.b.icon.Resize(fyne.NewSize(ic, ic))
}
func (r *primarySendButtonRenderer) Refresh() { r.b.bg.Refresh(); r.b.icon.Refresh() }
func (r *primarySendButtonRenderer) Objects() []fyne.CanvasObject {
	return []fyne.CanvasObject{r.b.bg, r.b.icon}
}
func (r *primarySendButtonRenderer) Destroy() {}

// =========================================================================
// Formatting toolbar — B / I / S / link / code / emoji ghost-icon buttons.
// Each button wraps the current entry text with the matching markdown token.
// =========================================================================

var (
	fmtIconBold = fyne.NewStaticResource("fmt-bold.svg", []byte(
		`<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c8cad1" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4h7a4 4 0 0 1 0 8H6z"/><path d="M6 12h8a4 4 0 0 1 0 8H6z"/></svg>`))
	fmtIconItalic = fyne.NewStaticResource("fmt-italic.svg", []byte(
		`<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c8cad1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>`))
	fmtIconStrike = fyne.NewStaticResource("fmt-strike.svg", []byte(
		`<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c8cad1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h16"/><path d="M8 6a4 4 0 0 1 4-2c2 0 4 1 4 3"/><path d="M16 18a4 4 0 0 1-4 2c-2 0-4-1-4-3"/></svg>`))
	fmtIconLink = fyne.NewStaticResource("fmt-link.svg", []byte(
		`<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c8cad1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>`))
	fmtIconCode = fyne.NewStaticResource("fmt-code.svg", []byte(
		`<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c8cad1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`))
	fmtIconEmoji = fyne.NewStaticResource("fmt-emoji.svg", []byte(
		`<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c8cad1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>`))
)

// newFormatBar renders the horizontal formatting toolbar above the composer
// entry. Each button wraps the entry's current text with a markdown token.
func newFormatBar(entry *focusEntry) fyne.CanvasObject {
	wrap := func(token string) func() {
		return func() {
			if entry == nil {
				return
			}
			cur := strings.TrimRight(entry.Text, "\n")
			if cur == "" {
				entry.SetText(token + token)
			} else {
				entry.SetText(token + cur + token)
			}
		}
	}
	bold := newGhostIcon(fmtIconBold, wrap("*"))
	italic := newGhostIcon(fmtIconItalic, wrap("_"))
	strike := newGhostIcon(fmtIconStrike, wrap("~"))
	link := newGhostIcon(fmtIconLink, func() {
		if entry == nil {
			return
		}
		cur := strings.TrimRight(entry.Text, "\n")
		entry.SetText(cur + "<https://|link text>")
	})
	code := newGhostIcon(fmtIconCode, wrap("`"))
	emoji := newGhostIcon(fmtIconEmoji, func() {
		if entry == nil {
			return
		}
		entry.SetText(strings.TrimRight(entry.Text, "\n") + ":")
	})

	sep := func() fyne.CanvasObject {
		r := canvas.NewRectangle(color.NRGBA{R: 255, G: 255, B: 255, A: 18})
		r.SetMinSize(fyne.NewSize(1, 14))
		return container.NewCenter(r)
	}

	return container.NewHBox(
		fixedWidthSpacer(6),
		bold, italic, strike,
		fixedWidthSpacer(6), sep(), fixedWidthSpacer(6),
		link, code,
		fixedWidthSpacer(6), sep(), fixedWidthSpacer(6),
		emoji,
	)
}

// newGhostIcon is a 22x22 transparent button with a faint hover background
// used for composer formatting actions.
func newGhostIcon(res fyne.Resource, onTap func()) fyne.CanvasObject {
	bg := canvas.NewRectangle(color.Transparent)
	bg.CornerRadius = 6
	icon := canvas.NewImageFromResource(res)
	icon.FillMode = canvas.ImageFillContain
	icon.SetMinSize(fyne.NewSize(14, 14))
	g := &ghostIcon{bg: bg, icon: icon, onTap: onTap}
	g.ExtendBaseWidget(g)
	return g
}

type ghostIcon struct {
	widget.BaseWidget
	bg    *canvas.Rectangle
	icon  *canvas.Image
	onTap func()
}

func (g *ghostIcon) CreateRenderer() fyne.WidgetRenderer { return &ghostIconRenderer{g: g} }
func (g *ghostIcon) Tapped(_ *fyne.PointEvent) {
	if g.onTap != nil {
		g.onTap()
	}
}
func (g *ghostIcon) TappedSecondary(_ *fyne.PointEvent) {}
func (g *ghostIcon) Cursor() desktop.Cursor             { return desktop.PointerCursor }
func (g *ghostIcon) MouseIn(_ *desktop.MouseEvent) {
	g.bg.FillColor = color.NRGBA{R: 255, G: 255, B: 255, A: 18}
	g.bg.Refresh()
}
func (g *ghostIcon) MouseOut() {
	g.bg.FillColor = color.Transparent
	g.bg.Refresh()
}
func (g *ghostIcon) MouseMoved(_ *desktop.MouseEvent) {}

type ghostIconRenderer struct{ g *ghostIcon }

func (r *ghostIconRenderer) MinSize() fyne.Size { return fyne.NewSize(22, 22) }
func (r *ghostIconRenderer) Layout(s fyne.Size) {
	r.g.bg.Move(fyne.NewPos(0, 0))
	r.g.bg.Resize(s)
	const ic float32 = 14
	r.g.icon.Move(fyne.NewPos((s.Width-ic)/2, (s.Height-ic)/2))
	r.g.icon.Resize(fyne.NewSize(ic, ic))
}
func (r *ghostIconRenderer) Refresh() { r.g.bg.Refresh(); r.g.icon.Refresh() }
func (r *ghostIconRenderer) Objects() []fyne.CanvasObject {
	return []fyne.CanvasObject{r.g.bg, r.g.icon}
}
func (r *ghostIconRenderer) Destroy() {}
