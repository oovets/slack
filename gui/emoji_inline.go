package gui

import (
	"image/color"
	"strings"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/canvas"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/widget"
)

// newMessageBody renders a Slack message body with inline emoji images
// (standard + workspace) mixed with text. Falls back to a plain wrapping
// label when the text contains no emoji shortcodes (cheap, perfect wrap).
func newMessageBody(rawText string, isFromMe bool) fyne.CanvasObject {
	text := renderSlackTextNoEmoji(rawText)
	// Fast path: nothing emoji-ish in here. Use a regular label which has
	// built-in word-wrap and accurate MinSize for the virtual list.
	if !mightContainEmoji(text) && !mightContainEmoji(rawText) {
		lbl := widget.NewLabel(text)
		lbl.Wrapping = fyne.TextWrapWord
		if isFromMe {
			lbl.Alignment = fyne.TextAlignTrailing
			lbl.Importance = widget.LowImportance
		}
		return lbl
	}

	// Tokenize the original text into runs of text and emoji segments.
	segments := tokenizeEmojiText(rawText)
	// Convert each segment into one or more inline canvas objects (words +
	// emoji images) and stack them in a wrap-flow container so the rendered
	// row breaks naturally on width.
	objs := make([]fyne.CanvasObject, 0, len(segments)*2)
	for _, seg := range segments {
		if seg.isEmoji {
			objs = append(objs, newInlineEmoji(seg.name))
			continue
		}
		// Split text into wordy chunks (word + trailing whitespace) so the
		// wrap layout can break on natural boundaries.
		for _, w := range splitInlineWords(seg.text) {
			if w == "" {
				continue
			}
			t := canvas.NewText(w, inlineBodyColor(isFromMe))
			t.TextSize = inlineBodyTextSize()
			objs = append(objs, t)
		}
	}
	if len(objs) == 0 {
		lbl := widget.NewLabel("")
		return lbl
	}
	body := newWrapBox(objs)
	if isFromMe {
		// right-align by wrapping in a border with leading spacer
		return container.NewBorder(nil, nil, nil, nil, body)
	}
	return body
}

func inlineBodyColor(isFromMe bool) color.Color {
	if isFromMe {
		return color.NRGBA{R: 175, G: 184, B: 198, A: 230}
	}
	return color.NRGBA{R: 212, G: 218, B: 232, A: 255}
}

func inlineBodyTextSize() float32 {
	return fyne.CurrentApp().Settings().Theme().Size("text")
}

// renderSlackTextNoEmoji is the existing renderer minus the unicode
// substitution — we keep shortcodes intact so the tokenizer can convert them
// into image segments later.
func renderSlackTextNoEmoji(raw string) string {
	text := strings.TrimSpace(raw)
	if text == "" {
		return ""
	}
	text = strings.ReplaceAll(text, "&amp;", "&")
	text = strings.ReplaceAll(text, "&lt;", "<")
	text = strings.ReplaceAll(text, "&gt;", ">")
	return convertSlackLinks(text)
}

func mightContainEmoji(s string) bool {
	return strings.Contains(s, ":")
}

type emojiSegment struct {
	isEmoji bool
	text    string // for text segments
	name    string // for emoji segments (shortcode name, no colons)
}

// tokenizeEmojiText splits raw Slack text into alternating text and emoji
// segments. Only resolvable shortcodes (workspace or unicode) become emoji
// segments; unknown shortcodes stay as text.
func tokenizeEmojiText(raw string) []emojiSegment {
	text := renderSlackTextNoEmoji(raw)
	if text == "" {
		return nil
	}
	var out []emojiSegment
	var buf strings.Builder
	flush := func() {
		if buf.Len() > 0 {
			out = append(out, emojiSegment{text: buf.String()})
			buf.Reset()
		}
	}
	i := 0
	for i < len(text) {
		if text[i] != ':' {
			buf.WriteByte(text[i])
			i++
			continue
		}
		end := strings.IndexByte(text[i+1:], ':')
		if end < 0 {
			buf.WriteByte(text[i])
			i++
			continue
		}
		end += i + 1
		name := text[i+1 : end]
		if len(name) == 0 || len(name) > 80 || strings.ContainsAny(name, " \n\t:") {
			buf.WriteByte(text[i])
			i++
			continue
		}
		if strings.HasPrefix(name, "skin-tone-") {
			i = end + 1
			continue
		}
		// Resolvable?
		if _, ok := resolveWorkspaceEmojiURL(name); ok {
			flush()
			out = append(out, emojiSegment{isEmoji: true, name: name})
			i = end + 1
			continue
		}
		if u, ok := resolveReactionUnicode(name); ok && strings.TrimSpace(u) != "" {
			flush()
			out = append(out, emojiSegment{isEmoji: true, name: name})
			i = end + 1
			continue
		}
		// Unknown — keep as raw text.
		buf.WriteString(text[i : end+1])
		i = end + 1
	}
	flush()
	return out
}

// splitInlineWords splits text on whitespace, keeping spaces attached to
// the preceding word and emitting newlines as their own tokens so the
// wrap-box treats them as hard breaks.
func splitInlineWords(text string) []string {
	if text == "" {
		return nil
	}
	var out []string
	var buf strings.Builder
	for _, r := range text {
		if r == '\n' {
			if buf.Len() > 0 {
				out = append(out, buf.String())
				buf.Reset()
			}
			out = append(out, "\n")
			continue
		}
		buf.WriteRune(r)
		if r == ' ' {
			out = append(out, buf.String())
			buf.Reset()
		}
	}
	if buf.Len() > 0 {
		out = append(out, buf.String())
	}
	return out
}

// newInlineEmoji returns a small canvas object sized to a single line for
// inline use within message bodies. Resolves workspace emojis first, then
// twemoji bitmaps. Falls back to the shortcode text if everything misses.
func newInlineEmoji(name string) fyne.CanvasObject {
	size := inlineEmojiSize()
	if url, ok := resolveWorkspaceEmojiURL(name); ok {
		if res, ok := cachedTwemojiResource(url); ok && res != nil {
			img := canvas.NewImageFromResource(res)
			img.FillMode = canvas.ImageFillContain
			img.SetMinSize(fyne.NewSize(size, size))
			return img
		}
		host, img, fallback := newPendingEmojiHost(name, size)
		go fetchTwemojiResource([]string{url}, func(res fyne.Resource) {
			if res == nil {
				return
			}
			fyne.Do(func() {
				img.Resource = res
				img.Show()
				fallback.Hide()
				host.Refresh()
			})
		})
		return host
	}
	unicode, ok := resolveReactionUnicode(name)
	if !ok || strings.TrimSpace(unicode) == "" {
		return inlineEmojiFallback(name)
	}
	codes := twemojiCodeCandidates(unicode)
	if len(codes) == 0 {
		return inlineEmojiFallback(name)
	}
	for _, code := range codes {
		if res, ok := cachedTwemojiResource(code); ok && res != nil {
			img := canvas.NewImageFromResource(res)
			img.FillMode = canvas.ImageFillContain
			img.SetMinSize(fyne.NewSize(size, size))
			return img
		}
	}
	host, img, fallback := newPendingEmojiHost(unicode, size)
	go fetchTwemojiResource(codes, func(res fyne.Resource) {
		if res == nil {
			return
		}
		fyne.Do(func() {
			img.Resource = res
			img.Show()
			fallback.Hide()
			host.Refresh()
		})
	})
	return host
}

func newPendingEmojiHost(label string, size float32) (*fyne.Container, *canvas.Image, *canvas.Text) {
	fallback := canvas.NewText(label, color.NRGBA{R: 175, G: 184, B: 198, A: 230})
	fallback.TextSize = inlineBodyTextSize()
	img := canvas.NewImageFromResource(nil)
	img.FillMode = canvas.ImageFillContain
	img.SetMinSize(fyne.NewSize(size, size))
	img.Hide()
	return container.NewStack(fallback, img), img, fallback
}

func inlineEmojiFallback(name string) fyne.CanvasObject {
	t := canvas.NewText(formatReactionToken(name), color.NRGBA{R: 175, G: 184, B: 198, A: 230})
	t.TextSize = inlineBodyTextSize()
	return t
}

func inlineEmojiSize() float32 {
	s := inlineBodyTextSize() + 4
	if s < 16 {
		s = 16
	}
	return s
}

// wrapBox is a custom widget that lays its children out left-to-right,
// breaking to a new line whenever the next child would overflow the
// container width. A "\n" canvas.Text segment forces a hard break.
type wrapBox struct {
	widget.BaseWidget
	objs    []fyne.CanvasObject
	lineGap float32
	hGap    float32
	// cached wrapped height from last Layout, used to keep MinSize stable
	// across measure→layout cycles so the virtual list sizes us correctly.
	cachedW float32
	cachedH float32
}

func newWrapBox(objs []fyne.CanvasObject) *wrapBox {
	w := &wrapBox{objs: objs, lineGap: 2, hGap: 0}
	w.ExtendBaseWidget(w)
	return w
}

func (w *wrapBox) CreateRenderer() fyne.WidgetRenderer {
	return &wrapBoxRenderer{box: w}
}

type wrapBoxRenderer struct{ box *wrapBox }

func (r *wrapBoxRenderer) Layout(size fyne.Size) {
	h := r.layoutWith(size.Width, true)
	if size.Width > 0 && (r.box.cachedW != size.Width || r.box.cachedH != h) {
		r.box.cachedW = size.Width
		r.box.cachedH = h
	}
}

// layoutWith places children if `apply` is true, otherwise just measures.
func (r *wrapBoxRenderer) layoutWith(width float32, apply bool) float32 {
	if width <= 0 {
		width = 480 // safe fallback before we have a real container width
	}
	x, y, lineH := float32(0), float32(0), float32(0)
	for _, o := range r.box.objs {
		// Hard break on "\n" tokens.
		if t, ok := o.(*canvas.Text); ok && t.Text == "\n" {
			if apply {
				o.Resize(fyne.NewSize(0, 0))
			}
			y += lineH + r.box.lineGap
			x = 0
			lineH = 0
			continue
		}
		s := o.MinSize()
		if x > 0 && x+s.Width > width {
			y += lineH + r.box.lineGap
			x = 0
			lineH = 0
		}
		if apply {
			o.Move(fyne.NewPos(x, y))
			o.Resize(s)
		}
		x += s.Width + r.box.hGap
		if s.Height > lineH {
			lineH = s.Height
		}
	}
	return y + lineH
}

func (r *wrapBoxRenderer) MinSize() fyne.Size {
	// Width: widest single child (so wrap doesn't deadlock).
	var maxChildW, maxChildH float32
	for _, o := range r.box.objs {
		s := o.MinSize()
		if s.Width > maxChildW {
			maxChildW = s.Width
		}
		if s.Height > maxChildH {
			maxChildH = s.Height
		}
	}
	// Use cached height from last layout when available; otherwise estimate
	// wrap height assuming a typical chat column width.
	if r.box.cachedH > 0 {
		return fyne.NewSize(maxChildW, r.box.cachedH)
	}
	estH := r.layoutWith(480, false)
	if estH < maxChildH {
		estH = maxChildH
	}
	return fyne.NewSize(maxChildW, estH)
}

func (r *wrapBoxRenderer) Refresh() {
	for _, o := range r.box.objs {
		o.Refresh()
	}
}

func (r *wrapBoxRenderer) Objects() []fyne.CanvasObject { return r.box.objs }
func (r *wrapBoxRenderer) Destroy()                     {}
