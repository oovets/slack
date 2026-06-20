package gui

import (
	"image/color"
	"regexp"
	"strings"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/canvas"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/theme"
	"fyne.io/fyne/v2/widget"
)

// mentionTokenRE matches @mention tokens in rendered message text.
var mentionTokenRE = regexp.MustCompile(`@[a-zA-Z0-9._-]+`)

// mentionTokenColor returns the text color for a @mention token.
// @here / @channel / @everyone use amber; other @name mentions use blue.
func mentionTokenColor(token string) color.Color {
	switch strings.ToLower(strings.TrimPrefix(token, "@")) {
	case "here", "channel", "everyone":
		return color.Color(palette.MentionAmber)
	}
	return color.Color(palette.ThreadAccent)
}

// textChunk is a fragment of a text segment, optionally a @mention token.
type textChunk struct {
	text      string
	isMention bool
}

// splitByMentionTokens splits text into plain-text and @mention pieces.
func splitByMentionTokens(text string) []textChunk {
	locs := mentionTokenRE.FindAllStringIndex(text, -1)
	if len(locs) == 0 {
		return []textChunk{{text: text}}
	}
	out := make([]textChunk, 0, len(locs)*2+1)
	prev := 0
	for _, loc := range locs {
		if loc[0] > prev {
			out = append(out, textChunk{text: text[prev:loc[0]]})
		}
		out = append(out, textChunk{text: text[loc[0]:loc[1]], isMention: true})
		prev = loc[1]
	}
	if prev < len(text) {
		out = append(out, textChunk{text: text[prev:]})
	}
	return out
}

// newMessageBody renders a Slack message body with inline emoji images
// (standard + workspace) mixed with text. Falls back to a plain wrapping
// label when the text contains no emoji shortcodes or @mentions (cheap path).
func newMessageBody(rawText string, isFromMe bool) fyne.CanvasObject {
	text := renderSlackTextNoEmoji(rawText)
	// Fast path: nothing emoji-ish or mention-ish. Use a regular label which
	// has built-in word-wrap and accurate MinSize for the virtual list.
	if !mightContainEmoji(text) && !mightContainEmoji(rawText) && !strings.Contains(text, "@") {
		lbl := widget.NewLabel(text)
		lbl.Wrapping = fyne.TextWrapWord
		if isFromMe {
			lbl.Alignment = fyne.TextAlignTrailing
		}
		return lbl
	}

	// Tokenize the original text into runs of text and emoji segments.
	segments := tokenizeEmojiText(rawText)
	// Convert each segment into inline canvas objects. Text segments are
	// further split on @mention tokens and word boundaries.
	objs := make([]fyne.CanvasObject, 0, len(segments)*2)
	for _, seg := range segments {
		if seg.isEmoji {
			objs = append(objs, newInlineEmoji(seg.name))
			continue
		}
		for _, chunk := range splitByMentionTokens(seg.text) {
			if chunk.isMention {
				t := canvas.NewText(chunk.text, mentionTokenColor(chunk.text))
				t.TextSize = inlineBodyTextSize()
				t.TextStyle = fyne.TextStyle{Bold: true}
				objs = append(objs, t)
				continue
			}
			for _, w := range splitInlineWords(chunk.text) {
				if w == "" {
					continue
				}
				t := canvas.NewText(w, inlineBodyColor(isFromMe))
				t.TextSize = inlineBodyTextSize()
				objs = append(objs, t)
			}
		}
	}
	if len(objs) == 0 {
		lbl := widget.NewLabel("")
		return lbl
	}
	body := newWrapBox(objs)
	if isFromMe {
		return container.NewBorder(nil, nil, nil, nil, body)
	}
	return body
}

func inlineBodyColor(_ bool) color.Color {
	return theme.Color(theme.ColorNameForeground)
}

func inlineBodyTextSize() float32 {
	return theme.TextSize()
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
	fallback := canvas.NewText(label, theme.Color(theme.ColorNameForeground))
	fallback.TextSize = inlineBodyTextSize()
	img := canvas.NewImageFromResource(nil)
	img.FillMode = canvas.ImageFillContain
	img.SetMinSize(fyne.NewSize(size, size))
	img.Hide()
	return container.NewStack(fallback, img), img, fallback
}

func inlineEmojiFallback(name string) fyne.CanvasObject {
	t := canvas.NewText(formatReactionToken(name), theme.Color(theme.ColorNameForeground))
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
// Two-pass per line: collect items into lines first, then vertically
// center each item against the tallest sibling in its line so text
// baselines and emoji glyphs sit on the same optical line.
func (r *wrapBoxRenderer) layoutWith(width float32, apply bool) float32 {
	if width <= 0 {
		width = 480
	}
	type item struct {
		obj  fyne.CanvasObject
		size fyne.Size
		hard bool
	}
	var lines [][]item
	var cur []item
	x := float32(0)
	for _, o := range r.box.objs {
		if t, ok := o.(*canvas.Text); ok && t.Text == "\n" {
			cur = append(cur, item{obj: o, hard: true})
			lines = append(lines, cur)
			cur = nil
			x = 0
			continue
		}
		s := o.MinSize()
		if x > 0 && x+s.Width > width {
			lines = append(lines, cur)
			cur = nil
			x = 0
		}
		cur = append(cur, item{obj: o, size: s})
		x += s.Width + r.box.hGap
	}
	if cur != nil {
		lines = append(lines, cur)
	}

	y := float32(0)
	for li, line := range lines {
		var maxH float32
		for _, it := range line {
			if it.hard {
				continue
			}
			if it.size.Height > maxH {
				maxH = it.size.Height
			}
		}
		if maxH == 0 {
			maxH = inlineBodyTextSize() + 2
		}
		xx := float32(0)
		for _, it := range line {
			if it.hard {
				if apply {
					it.obj.Resize(fyne.NewSize(0, 0))
				}
				continue
			}
			cy := y + (maxH-it.size.Height)/2
			if apply {
				it.obj.Move(fyne.NewPos(xx, cy))
				it.obj.Resize(it.size)
			}
			xx += it.size.Width + r.box.hGap
		}
		y += maxH
		if li < len(lines)-1 {
			y += r.box.lineGap
		}
	}
	return y
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
