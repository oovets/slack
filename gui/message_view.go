package gui

import (
	"bytes"
	"fmt"
	"hash/fnv"
	"image"
	"image/color"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/canvas"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/driver/desktop"
	"fyne.io/fyne/v2/widget"
	"github.com/stefan/slack-gui/api"
)

var (
	twemojiCacheMu           sync.RWMutex
	twemojiCache             = map[string]fyne.Resource{}
	twemojiMissCache         = map[string]bool{}
	workspaceEmojiMu         sync.RWMutex
	workspaceEmojiURLByKey   = map[string]string{}
	workspaceEmojiAliasByKey = map[string]string{}
	avatarImageCache         sync.Map // url → fyne.Resource
)

// mediaHTTPClient is used for all outgoing image/avatar fetches. It applies a
// fixed timeout so goroutines can't block indefinitely on slow or stalled URLs.
var mediaHTTPClient = &http.Client{Timeout: 8 * time.Second}

func renderMessageRow(m api.Message, isFromMe bool, mentionedMe bool, selfUserID string, win fyne.Window, showTimestamps bool, compact bool, onThread func(api.Message), onReply func(api.Message), onMedia func(api.File), onReaction func(api.Message, string), fetchMedia func(string) ([]byte, string, error), showHeader bool, inThreadView bool) fyne.CanvasObject {
	name := senderName(m)
	ts := canvas.NewText(formatHoverTimestamp(m.Time), color.NRGBA{R: 100, G: 106, B: 130, A: 190})
	ts.TextSize = hoverTimestampTextSize()

	body := newMessageBody(m.Text, isFromMe)
	row := container.NewVBox(alignOutgoingRow(body, isFromMe))
	rowWithMeta := container.NewVBox()
	var actionRow fyne.CanvasObject
	if quoted := strings.TrimSpace(renderSlackText(m.ForwardedText)); quoted != "" {
		preview := compactQuotedPreview(quoted)
		quoteText := widget.NewLabel("↪ " + preview)
		quoteText.Wrapping = fyne.TextWrapWord
		quoteText.TextStyle = fyne.TextStyle{Italic: true}
		quoteTextRow := container.NewPadded(quoteText)
		quoteBg := canvas.NewRectangle(color.NRGBA{R: 92, G: 99, B: 126, A: 22})
		quoteBg.StrokeWidth = 0
		quoteBar := canvas.NewRectangle(color.NRGBA{R: 122, G: 162, B: 247, A: 170})
		quoteBar.SetMinSize(fyne.NewSize(1, 1))
		quoteContent := container.NewMax(quoteBg, quoteTextRow)
		quote := container.NewBorder(nil, nil, quoteBar, nil, quoteContent)
		rowWithMeta.Add(alignOutgoingRow(quote, isFromMe))
	}
	rowWithMeta.Add(row)
	openThread := func() {
		if inThreadView {
			return
		}
		if onThread == nil {
			return
		}
		onThread(m)
	}
	// Compact thread bar (Slack-native): only when this message has replies
	// and we're not already inside the thread view.
	if !inThreadView && m.ReplyCount > 0 {
		rowWithMeta.Add(alignOutgoingRow(newThreadReplyBar(m.ReplyCount, openThread), isFromMe))
	}
	// Unified actions row: existing reactions + "+" add + reply icon, all
	// on the same line. Keeps the message vertically tight.
	if onReaction != nil || onReply != nil || len(m.Reactions) > 0 {
		actionsRow := container.NewHBox()
		for _, reaction := range m.Reactions {
			r := reaction
			var tap func()
			if onReaction != nil {
				tap = func() { onReaction(m, r.Name) }
			}
			actionsRow.Add(newReactionChip(r, selfUserID, tap))
		}
		if onReaction != nil {
			if addBtn := newAddReactionButton(win, func(name string) { onReaction(m, name) }); addBtn != nil {
				actionsRow.Add(addBtn)
			}
		}
		if onReply != nil {
			actionsRow.Add(newIconActionButton("↩", "Reply in thread", func() { onReply(m) }))
		}
		if len(actionsRow.Objects) > 0 {
			actionRow = alignOutgoingRow(actionsRow, isFromMe)
		}
	}

	var content *fyne.Container
	if showHeader {
		sender := canvas.NewText(name, senderColor(name, isFromMe))
		sender.TextStyle = fyne.TextStyle{Bold: true}
		sender.TextSize = hoverSenderTextSize()
		metaRow := []fyne.CanvasObject{sender}
		if showTimestamps {
			metaRow = append(metaRow, ts)
		}
		content = container.NewVBox(container.NewHBox(metaRow...), rowWithMeta)
	} else {
		content = container.NewVBox(rowWithMeta)
	}
	for _, card := range m.Cards {
		rowWithMeta.Add(alignOutgoingRow(newAttachmentCardView(card), isFromMe))
	}
	for _, img := range m.InlineImages {
		rowWithMeta.Add(alignOutgoingRow(newInlineImagePreview(img.URL, img.Name, fetchMedia), isFromMe))
	}
	for _, f := range m.Files {
		ff := f
		name := strings.TrimSpace(f.Name)
		if name == "" {
			name = "file"
		}
		if f.IsImage() && strings.TrimSpace(f.BestImageURL()) != "" {
			rowWithMeta.Add(alignOutgoingRow(newInlineImagePreview(f.BestImageURL(), name, fetchMedia), isFromMe))
			rowWithMeta.Add(alignOutgoingRow(newSubtleTapLabel("Open image", func() {
				if onMedia != nil {
					onMedia(ff)
				}
			}), isFromMe))
			continue
		}
		if strings.TrimSpace(f.Permalink) != "" {
			if u := parseDisplayURL(f.Permalink); u != nil {
				link := widget.NewHyperlink(name, u)
				link.Wrapping = fyne.TextWrapWord
				rowWithMeta.Add(link)
			} else {
				fileLabel := widget.NewLabel(name)
				fileLabel.Wrapping = fyne.TextWrapWord
				rowWithMeta.Add(fileLabel)
			}
		} else {
			fileLabel := widget.NewLabel(name)
			fileLabel.Wrapping = fyne.TextWrapWord
			rowWithMeta.Add(fileLabel)
		}
	}
	// All messages use the same avatar-gutter layout regardless of sender.
	avatarSize := float32(32)
	if compact {
		avatarSize = 20
	}
	avatarGap := float32(6)
	if compact {
		avatarGap = 4
	}
	var gutter fyne.CanvasObject
	if showHeader {
		gutter = newAvatarBubble(name, m.AvatarURL, avatarSize)
	} else {
		gutter = fixedWidthSpacer(avatarSize)
	}
	bodyWithAvatar := container.NewBorder(nil, nil, container.NewHBox(container.NewVBox(gutter), fixedWidthSpacer(avatarGap)), nil, content)
	rowCanvas := applyMessageSideIndent(bodyWithAvatar)
	if !showTimestamps {
		rowCanvas = newTimestampToggleRow(rowCanvas, formatHoverTimestamp(m.Time), isFromMe)
	}
	if showHeader && !compact {
		rowCanvas = container.NewVBox(fixedHeightSpacer(4), rowCanvas)
	}
	if !isFromMe && mentionedMe {
		bg := canvas.NewRectangle(palette.MentionRowBG)
		bar := canvas.NewRectangle(palette.MentionAmber)
		bar.SetMinSize(fyne.NewSize(3, 1))
		barWrap := container.NewBorder(nil, nil, bar, nil, rowCanvas)
		rowCanvas = container.NewMax(bg, barWrap)
	}
	if actionRow != nil {
		return newMessageActionHover(rowCanvas, actionRow)
	}
	return rowCanvas
}

type messageActionHover struct {
	widget.BaseWidget
	content fyne.CanvasObject
	actions fyne.CanvasObject
}

func newMessageActionHover(content fyne.CanvasObject, actions fyne.CanvasObject) *messageActionHover {
	r := &messageActionHover{content: content, actions: actions}
	r.ExtendBaseWidget(r)
	if r.actions != nil {
		r.actions.Hide()
	}
	return r
}

func (r *messageActionHover) CreateRenderer() fyne.WidgetRenderer {
	return &messageActionHoverRenderer{row: r}
}

func (r *messageActionHover) MouseIn(_ *desktop.MouseEvent) {
	if r.actions != nil {
		r.actions.Show()
		r.actions.Refresh()
	}
}

func (r *messageActionHover) MouseOut() {
	if r.actions != nil {
		r.actions.Hide()
		r.actions.Refresh()
	}
}

func (r *messageActionHover) MouseMoved(_ *desktop.MouseEvent) {}

type messageActionHoverRenderer struct {
	row *messageActionHover
}

func (r *messageActionHoverRenderer) MinSize() fyne.Size {
	if r.row.content == nil {
		return fyne.NewSize(0, 0)
	}
	return r.row.content.MinSize()
}

func (r *messageActionHoverRenderer) Layout(size fyne.Size) {
	if r.row.content != nil {
		r.row.content.Move(fyne.NewPos(0, 0))
		r.row.content.Resize(size)
	}
	if r.row.actions == nil {
		return
	}
	actionSize := r.row.actions.MinSize()
	x := size.Width - actionSize.Width - 10
	if x < 0 {
		x = 0
	}
	y := size.Height - actionSize.Height
	if y < 0 {
		y = 0
	}
	r.row.actions.Move(fyne.NewPos(x, y))
	r.row.actions.Resize(actionSize)
}

func (r *messageActionHoverRenderer) Refresh() {
	if r.row.content != nil {
		r.row.content.Refresh()
	}
	if r.row.actions != nil {
		r.row.actions.Refresh()
	}
}

func (r *messageActionHoverRenderer) Objects() []fyne.CanvasObject {
	objects := make([]fyne.CanvasObject, 0, 2)
	if r.row.content != nil {
		objects = append(objects, r.row.content)
	}
	if r.row.actions != nil {
		objects = append(objects, r.row.actions)
	}
	return objects
}

func (r *messageActionHoverRenderer) Destroy() {}

// fixedHeightSpacer is a vertical spacer used to add breathing room
// between sender groups without inflating min-width.
func fixedHeightSpacer(height float32) fyne.CanvasObject {
	r := canvas.NewRectangle(color.Transparent)
	r.SetMinSize(fyne.NewSize(1, height))
	return r
}

// newThreadReplyBar renders a Slack-style "N replies · View thread" chip:
// rounded background that lights up on hover, accent-colored label, and a
// muted reply count. Tapping opens the thread view.
func newThreadReplyBar(count int, onTap func()) fyne.CanvasObject {
	bg := canvas.NewRectangle(color.Transparent)
	bg.CornerRadius = 6

	countText := canvas.NewText(fmt.Sprintf("%d %s", count, pluralizeReplies(count)), palette.ThreadAccent)
	countText.TextSize = messageMetaActionTextSize()
	countText.TextStyle = fyne.TextStyle{Bold: true}

	dot := canvas.NewText("·", palette.MetaText)
	dot.TextSize = messageMetaActionTextSize()

	view := canvas.NewText("View thread", palette.MetaText)
	view.TextSize = messageMetaActionTextSize()

	inner := container.NewHBox(fixedWidthSpacer(2), countText, dot, view, fixedWidthSpacer(2))
	stack := container.NewStack(bg, container.NewPadded(inner))

	bar := &threadReplyBar{bg: bg, content: stack, onTap: onTap}
	bar.ExtendBaseWidget(bar)
	return bar
}

func pluralizeReplies(n int) string {
	if n == 1 {
		return "reply"
	}
	return "replies"
}

// threadReplyBar is the hoverable Slack-style "N replies · View thread"
// pill used inline beneath messages with a thread.
type threadReplyBar struct {
	widget.BaseWidget
	bg      *canvas.Rectangle
	content fyne.CanvasObject
	onTap   func()
}

func (b *threadReplyBar) CreateRenderer() fyne.WidgetRenderer {
	return widget.NewSimpleRenderer(b.content)
}
func (b *threadReplyBar) Tapped(_ *fyne.PointEvent) {
	if b.onTap != nil {
		b.onTap()
	}
}
func (b *threadReplyBar) TappedSecondary(_ *fyne.PointEvent) {}
func (b *threadReplyBar) MouseIn(_ *desktop.MouseEvent) {
	b.bg.FillColor = palette.ThreadHoverBG
	b.bg.Refresh()
}
func (b *threadReplyBar) MouseOut() {
	b.bg.FillColor = color.Transparent
	b.bg.Refresh()
}
func (b *threadReplyBar) MouseMoved(_ *desktop.MouseEvent) {}
func (b *threadReplyBar) Cursor() desktop.Cursor           { return desktop.PointerCursor }

func senderName(m api.Message) string {
	if s := strings.TrimSpace(m.Username); s != "" {
		return s
	}
	if s := strings.TrimSpace(m.UserID); s != "" {
		return s
	}
	if strings.TrimSpace(m.BotID) != "" {
		return "bot"
	}
	return "unknown"
}

// avatarInitials derives one or two uppercase initials from a display name.
func avatarInitials(name string) string {
	name = strings.TrimSpace(name)
	if name == "" {
		return "?"
	}
	parts := strings.Fields(name)
	if len(parts) >= 2 {
		return strings.ToUpper(string([]rune(parts[0])[:1]) + string([]rune(parts[1])[:1]))
	}
	r := []rune(name)
	if len(r) >= 2 {
		return strings.ToUpper(string(r[:2]))
	}
	return strings.ToUpper(string(r[:1]))
}

// newAvatarBubble draws an avatar for a sender. If avatarURL is non-empty the
// real profile photo is fetched asynchronously and swapped in; until it loads
// (or if it fails) an initials bubble is shown as a fallback.
func newAvatarBubble(name, avatarURL string, size float32) fyne.CanvasObject {
	circle := canvas.NewCircle(senderColor(name, false))
	initials := canvas.NewText(avatarInitials(name), color.NRGBA{R: 255, G: 255, B: 255, A: 255})
	initials.TextStyle = fyne.TextStyle{Bold: true}
	initials.TextSize = size * 0.4
	initials.Alignment = fyne.TextAlignCenter
	fallback := container.NewMax(circle, container.NewCenter(initials))

	if strings.TrimSpace(avatarURL) == "" {
		return container.NewGridWrap(fyne.NewSize(size, size), fallback)
	}

	img := canvas.NewImageFromResource(nil)
	img.FillMode = canvas.ImageFillContain
	img.Hide()
	host := container.NewMax(fallback, img)
	wrap := container.NewGridWrap(fyne.NewSize(size, size), host)

	if res, ok := avatarImageCache.Load(avatarURL); ok {
		if r, ok := res.(fyne.Resource); ok && r != nil {
			img.Resource = r
			img.Show()
			fallback.Hide()
		}
		return wrap
	}

	go func() {
		res, err := fetchAvatarImage(avatarURL)
		if err != nil || res == nil {
			return
		}
		avatarImageCache.Store(avatarURL, res)
		fyne.Do(func() {
			img.Resource = res
			img.Show()
			fallback.Hide()
			wrap.Refresh()
		})
	}()
	return wrap
}

func fetchAvatarImage(rawURL string) (fyne.Resource, error) {
	resp, err := mediaHTTPClient.Get(rawURL)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("avatar status %d", resp.StatusCode)
	}
	data, err := io.ReadAll(io.LimitReader(resp.Body, 4<<20)) // 4 MB cap
	if err != nil || len(data) == 0 {
		return nil, err
	}
	return fyne.NewStaticResource("avatar", data), nil
}

func senderColor(name string, isFromMe bool) color.Color {
	if isFromMe {
		return color.NRGBA{R: 125, G: 207, B: 255, A: 255}
	}
	palette := []color.NRGBA{
		{R: 122, G: 162, B: 247, A: 255},
		{R: 158, G: 206, B: 106, A: 255},
		{R: 224, G: 175, B: 104, A: 255},
		{R: 247, G: 118, B: 142, A: 255},
		{R: 187, G: 154, B: 247, A: 255},
		{R: 125, G: 207, B: 255, A: 255},
		{R: 231, G: 130, B: 132, A: 255},
		{R: 115, G: 218, B: 202, A: 255},
	}
	trimmed := strings.TrimSpace(strings.ToLower(name))
	if trimmed == "" {
		return palette[0]
	}
	h := fnv.New32a()
	_, _ = h.Write([]byte(trimmed))
	return palette[int(h.Sum32())%len(palette)]
}

func threadRootTS(m api.Message) string {
	if ts := strings.TrimSpace(m.ThreadTS); ts != "" {
		return ts
	}
	return strings.TrimSpace(m.TS)
}

func isFirstInSenderGroup(msgs []api.Message, idx int) bool {
	if idx == 0 {
		return true
	}
	cur, prev := msgs[idx], msgs[idx-1]
	if senderName(cur) != senderName(prev) {
		return true
	}
	return cur.Time.Sub(prev.Time) > 4*time.Minute
}

func hoverSenderTextSize() float32 {
	return senderTextSize()
}

func hoverTimestampTextSize() float32 {
	return timestampTextSize()
}

// messageMetaActionTextSize is for inline chat actions (e.g. view thread, open image) — smaller than body text.
func messageMetaActionTextSize() float32 {
	return metaActionTextSize()
}

func formatHoverTimestamp(t time.Time) string {
	return t.Format("15:04")
}

func messageMentionsUser(text, userID string) bool {
	id := strings.TrimSpace(userID)
	if id == "" {
		return false
	}
	return strings.Contains(text, "<@"+id+">") || strings.Contains(text, "<@"+id+"|")
}

func applyMessageSideIndent(row fyne.CanvasObject) fyne.CanvasObject {
	return container.NewBorder(nil, nil, fixedWidthSpacer(10), fixedWidthSpacer(10), row)
}

func fixedWidthSpacer(width float32) fyne.CanvasObject {
	r := canvas.NewRectangle(color.Transparent)
	r.SetMinSize(fyne.NewSize(width, 1))
	return r
}

func alignOutgoingRow(obj fyne.CanvasObject, _ bool) fyne.CanvasObject {
	return obj
}

func truncate(s string, n int) string {
	if n <= 0 || len([]rune(s)) <= n {
		return s
	}
	r := []rune(s)
	return string(r[:n]) + "…"
}

func compactQuotedPreview(s string) string {
	clean := strings.Join(strings.Fields(strings.TrimSpace(s)), " ")
	if clean == "" {
		return ""
	}
	r := []rune(clean)
	if len(r) <= 160 {
		if len(r) <= 80 {
			return clean
		}
		return string(r[:80]) + "\n" + string(r[80:])
	}
	return string(r[:80]) + "\n" + string(r[80:160]) + "…"
}

func parseDisplayURL(raw string) *url.URL {
	u, err := url.ParseRequestURI(strings.TrimSpace(raw))
	if err != nil || u == nil {
		return nil
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return nil
	}
	if strings.TrimSpace(u.Host) == "" {
		return nil
	}
	return u
}

func newAttachmentCardView(card api.AttachmentCard) fyne.CanvasObject {
	bar := canvas.NewRectangle(attachmentColor(card.Color))
	bar.SetMinSize(fyne.NewSize(3, 1))

	lines := container.NewVBox()
	if s := strings.TrimSpace(card.Pretext); s != "" {
		lbl := widget.NewLabel(renderSlackText(s))
		lbl.Wrapping = fyne.TextWrapWord
		lbl.TextStyle = fyne.TextStyle{Italic: true}
		lbl.Importance = widget.LowImportance
		lines.Add(lbl)
	}
	header := strings.TrimSpace(card.Title)
	if author := strings.TrimSpace(card.Author); author != "" {
		if header != "" {
			header = author + " · " + header
		} else {
			header = author
		}
	}
	if header != "" {
		if strings.TrimSpace(card.TitleLink) != "" {
			if u := parseDisplayURL(card.TitleLink); u != nil {
				link := widget.NewHyperlink(renderSlackText(header), u)
				link.Wrapping = fyne.TextWrapWord
				lines.Add(link)
			} else {
				lbl := widget.NewLabel(renderSlackText(header))
				lbl.Wrapping = fyne.TextWrapWord
				lbl.TextStyle = fyne.TextStyle{Bold: true}
				lines.Add(lbl)
			}
		} else {
			lbl := widget.NewLabel(renderSlackText(header))
			lbl.Wrapping = fyne.TextWrapWord
			lbl.TextStyle = fyne.TextStyle{Bold: true}
			lines.Add(lbl)
		}
	}
	if body := strings.TrimSpace(card.Body); body != "" {
		lbl := widget.NewLabel(renderSlackText(body))
		lbl.Wrapping = fyne.TextWrapWord
		lines.Add(lbl)
	}
	if footer := strings.TrimSpace(card.Footer); footer != "" {
		lbl := widget.NewLabel(renderSlackText(footer))
		lbl.Wrapping = fyne.TextWrapWord
		lbl.Importance = widget.LowImportance
		lines.Add(lbl)
	}
	bg := canvas.NewRectangle(color.NRGBA{R: 120, G: 126, B: 146, A: 18})
	return container.NewMax(bg, container.NewBorder(nil, nil, bar, nil, container.NewPadded(lines)))
}

func attachmentColor(raw string) color.Color {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "good":
		return color.NRGBA{R: 75, G: 181, B: 67, A: 210}
	case "warning":
		return color.NRGBA{R: 224, G: 175, B: 104, A: 220}
	case "danger":
		return color.NRGBA{R: 247, G: 118, B: 142, A: 220}
	}
	s := strings.TrimPrefix(strings.TrimSpace(raw), "#")
	if len(s) != 6 {
		return color.NRGBA{R: 122, G: 162, B: 247, A: 180}
	}
	n, err := strconv.ParseUint(s, 16, 32)
	if err != nil {
		return color.NRGBA{R: 122, G: 162, B: 247, A: 180}
	}
	return color.NRGBA{R: uint8(n >> 16), G: uint8(n >> 8), B: uint8(n), A: 220}
}

func newInlineImagePreview(rawURL, name string, fetchMedia func(string) ([]byte, string, error)) fyne.CanvasObject {
	const (
		previewW = float32(280)
		previewH = float32(170)
	)
	img := canvas.NewImageFromImage(image.NewRGBA(image.Rect(0, 0, 1, 1)))
	img.FillMode = canvas.ImageFillContain
	img.SetMinSize(fyne.NewSize(previewW, previewH))
	img.Hide()
	placeholder := widget.NewLabel(strings.TrimSpace(name))
	if strings.TrimSpace(placeholder.Text) == "" {
		placeholder.SetText("image")
	}
	placeholder.Importance = widget.LowImportance
	placeholder.Alignment = fyne.TextAlignCenter
	bg := canvas.NewRectangle(color.NRGBA{R: 120, G: 126, B: 146, A: 18})
	host := container.NewMax(bg, container.NewCenter(placeholder), img)
	go func() {
		data, err := fetchPreviewImage(rawURL, fetchMedia)
		if err != nil || len(data) == 0 {
			return
		}
		decoded, _, err := image.Decode(bytes.NewReader(data))
		if err != nil {
			return
		}
		fyne.Do(func() {
			img.Image = decoded
			img.Show()
			placeholder.Hide()
			host.Refresh()
		})
	}()
	return container.NewGridWrap(fyne.NewSize(previewW, previewH), host)
}

func fetchPreviewImage(rawURL string, fetchMedia func(string) ([]byte, string, error)) ([]byte, error) {
	u := strings.TrimSpace(rawURL)
	if u == "" {
		return nil, fmt.Errorf("empty image url")
	}
	if fetchMedia != nil && shouldUseSlackAuth(u) {
		data, _, err := fetchMedia(u)
		return data, err
	}
	resp, err := mediaHTTPClient.Get(u)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("image status %d", resp.StatusCode)
	}
	return io.ReadAll(io.LimitReader(resp.Body, 20<<20)) // 20 MB cap
}

func shouldUseSlackAuth(rawURL string) bool {
	u, err := url.Parse(strings.TrimSpace(rawURL))
	if err != nil {
		return false
	}
	host := strings.ToLower(u.Hostname())
	return strings.HasSuffix(host, "slack.com") || strings.HasSuffix(host, "slack-edge.com")
}

func renderSlackText(raw string) string {
	text := strings.TrimSpace(raw)
	if text == "" {
		return ""
	}
	text = strings.ReplaceAll(text, "&amp;", "&")
	text = strings.ReplaceAll(text, "&lt;", "<")
	text = strings.ReplaceAll(text, "&gt;", ">")
	text = convertSlackLinks(text)
	return convertSlackEmojiShortcodes(text)
}

func convertSlackLinks(text string) string {
	if !strings.Contains(text, "<") {
		return text
	}
	var out strings.Builder
	for i := 0; i < len(text); {
		if text[i] != '<' {
			out.WriteByte(text[i])
			i++
			continue
		}
		end := strings.IndexByte(text[i+1:], '>')
		if end < 0 {
			out.WriteByte(text[i])
			i++
			continue
		}
		end += i + 1
		token := text[i+1 : end]
		switch {
		case strings.HasPrefix(token, "!"):
			special := strings.SplitN(strings.TrimPrefix(token, "!"), "|", 2)[0]
			out.WriteString("@" + special)
		case strings.Contains(token, "|"):
			parts := strings.SplitN(token, "|", 2)
			label := strings.TrimSpace(parts[1])
			if label == "" {
				label = strings.TrimSpace(parts[0])
			}
			// User/channel mentions keep the @ prefix.
			if strings.HasPrefix(parts[0], "@") || strings.HasPrefix(parts[0], "U") || strings.HasPrefix(parts[0], "W") {
				if !strings.HasPrefix(label, "@") {
					label = "@" + label
				}
			}
			out.WriteString(label)
		case strings.HasPrefix(token, "@") || strings.HasPrefix(token, "U") || strings.HasPrefix(token, "W"):
			// Bare user mention without display name, keep @ prefix so it's recognisable.
			out.WriteString("@" + token)
		default:
			out.WriteString(token)
		}
		i = end + 1
	}
	return out.String()
}

func formatReactionToken(name string) string {
	trimmed := strings.Trim(strings.TrimSpace(name), ":")
	if trimmed == "" {
		return ":emoji:"
	}
	return ":" + trimmed + ":"
}

func convertSlackEmojiShortcodes(text string) string {
	if !strings.Contains(text, ":") {
		return text
	}
	var out strings.Builder
	for i := 0; i < len(text); {
		if text[i] != ':' {
			out.WriteByte(text[i])
			i++
			continue
		}
		end := strings.IndexByte(text[i+1:], ':')
		if end < 0 {
			out.WriteByte(text[i])
			i++
			continue
		}
		end += i + 1
		token := text[i : end+1]
		name := strings.Trim(token, ":")
		if strings.HasPrefix(name, "skin-tone-") {
			i = end + 1
			continue
		}
		if len(name) > 80 || strings.ContainsAny(name, " \n\t") {
			out.WriteString(token)
			i = end + 1
			continue
		}
		if unicode, ok := resolveReactionUnicode(name); ok && strings.TrimSpace(unicode) != "" {
			out.WriteString(unicode)
		} else {
			out.WriteString(token)
		}
		i = end + 1
	}
	return out.String()
}

func newReactionEmojiView(name string) fyne.CanvasObject {
	token := formatReactionToken(name)
	emojiSize := reactionEmojiViewSize()
	if url, ok := resolveWorkspaceEmojiURL(name); ok {
		if res, ok := cachedTwemojiResource(url); ok && res != nil {
			img := canvas.NewImageFromResource(res)
			img.FillMode = canvas.ImageFillContain
			img.SetMinSize(fyne.NewSize(emojiSize, emojiSize))
			return img
		}
		fallback := widget.NewLabel(token)
		img := canvas.NewImageFromResource(nil)
		img.FillMode = canvas.ImageFillContain
		img.SetMinSize(fyne.NewSize(emojiSize, emojiSize))
		img.Hide()
		host := container.NewMax(fallback, img)
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
	if !ok {
		fallback := canvas.NewText(token, color.NRGBA{R: 120, G: 126, B: 146, A: 220})
		fallback.TextSize = reactionCountTextSize()
		return fallback
	}
	unicode = strings.TrimSpace(unicode)
	if unicode == "" {
		fallback := canvas.NewText(token, color.NRGBA{R: 120, G: 126, B: 146, A: 220})
		fallback.TextSize = reactionCountTextSize()
		return fallback
	}
	codes := twemojiCodeCandidates(unicode)
	if len(codes) == 0 {
		fallback := canvas.NewText(token, color.NRGBA{R: 120, G: 126, B: 146, A: 220})
		fallback.TextSize = reactionCountTextSize()
		return fallback
	}
	for _, code := range codes {
		if res, ok := cachedTwemojiResource(code); ok && res != nil {
			img := canvas.NewImageFromResource(res)
			img.FillMode = canvas.ImageFillContain
			img.SetMinSize(fyne.NewSize(emojiSize, emojiSize))
			return img
		}
	}
	fallback := canvas.NewText(token, color.NRGBA{R: 120, G: 126, B: 146, A: 220})
	fallback.TextSize = reactionCountTextSize()
	img := canvas.NewImageFromResource(nil)
	img.FillMode = canvas.ImageFillContain
	img.SetMinSize(fyne.NewSize(emojiSize, emojiSize))
	img.Hide()
	host := container.NewMax(fallback, img)
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

func resolveReactionUnicode(name string) (string, bool) {
	base := strings.ToLower(strings.Trim(strings.TrimSpace(name), ":"))
	if base == "" {
		return "", false
	}
	tone := ""
	if strings.Contains(base, "::") {
		parts := strings.SplitN(base, "::", 2)
		base = parts[0]
		tone = strings.TrimSpace(parts[1])
	}
	aliases := []string{base, strings.ReplaceAll(base, "-", "_"), strings.ReplaceAll(base, "_", "-")}
	special := map[string]string{
		"thumbsup":         "+1",
		"thumbsdown":       "-1",
		"heavy_plus_sign":  "heavy_plus_sign",
		"heavy_minus_sign": "heavy_minus_sign",
	}
	if mapped, ok := special[base]; ok {
		aliases = append(aliases, mapped)
	}
	for _, alias := range aliases {
		if unicode, ok := slackEmojiUnicode[alias]; ok && strings.TrimSpace(unicode) != "" {
			return applySlackSkinTone(strings.TrimSpace(unicode), tone), true
		}
	}
	norm := func(s string) string {
		s = strings.ToLower(strings.TrimSpace(strings.Trim(s, ":")))
		s = strings.ReplaceAll(s, "-", "_")
		return s
	}
	needle := norm(base)
	for alias, unicode := range slackEmojiUnicode {
		if norm(alias) == needle && strings.TrimSpace(unicode) != "" {
			return applySlackSkinTone(strings.TrimSpace(unicode), tone), true
		}
	}
	return "", false
}

func applySlackSkinTone(unicode, tone string) string {
	suffix := strings.ToLower(strings.TrimSpace(tone))
	if suffix == "" {
		return unicode
	}
	mod := ""
	switch suffix {
	case "skin-tone-2":
		mod = "\U0001F3FB"
	case "skin-tone-3":
		mod = "\U0001F3FC"
	case "skin-tone-4":
		mod = "\U0001F3FD"
	case "skin-tone-5":
		mod = "\U0001F3FE"
	case "skin-tone-6":
		mod = "\U0001F3FF"
	default:
		return unicode
	}
	return unicode + mod
}

func twemojiCodeCandidates(unicode string) []string {
	code := twemojiCodeFromUnicode(unicode)
	if code == "" {
		return nil
	}
	cands := []string{code}
	if strings.Contains(code, "-fe0f") {
		trimmed := strings.ReplaceAll(code, "-fe0f", "")
		trimmed = strings.TrimPrefix(trimmed, "fe0f-")
		if trimmed != "" && trimmed != code {
			cands = append(cands, trimmed)
		}
	}
	return cands
}

func twemojiCodeFromUnicode(unicode string) string {
	parts := make([]string, 0, len(unicode))
	for _, r := range unicode {
		parts = append(parts, fmt.Sprintf("%x", r))
	}
	if len(parts) == 0 {
		return ""
	}
	return strings.Join(parts, "-")
}

func cachedTwemojiResource(code string) (fyne.Resource, bool) {
	twemojiCacheMu.RLock()
	defer twemojiCacheMu.RUnlock()
	if res, ok := twemojiCache[code]; ok {
		return res, true
	}
	if twemojiMissCache[code] {
		return nil, true
	}
	return nil, false
}

func fetchTwemojiResource(codes []string, onDone func(fyne.Resource)) {
	if len(codes) == 0 {
		onDone(nil)
		return
	}
	client := http.Client{Timeout: 4 * time.Second}
	for _, code := range codes {
		if strings.TrimSpace(code) == "" {
			continue
		}
		url := code
		if !strings.HasPrefix(url, "http://") && !strings.HasPrefix(url, "https://") {
			url = "https://cdn.jsdelivr.net/gh/jdecked/twemoji@17.0.0/assets/72x72/" + code + ".png"
		}
		resp, err := client.Get(url)
		if err != nil {
			cacheMiss(code)
			continue
		}
		body, readErr := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
		_ = resp.Body.Close()
		if resp.StatusCode < 200 || resp.StatusCode >= 300 || readErr != nil || len(body) == 0 {
			cacheMiss(code)
			continue
		}
		res := fyne.NewStaticResource("emoji-image", body)
		twemojiCacheMu.Lock()
		for _, key := range codes {
			if strings.TrimSpace(key) != "" {
				twemojiCache[key] = res
			}
		}
		twemojiCacheMu.Unlock()
		onDone(res)
		return
	}
	onDone(nil)
}

func cacheMiss(code string) {
	twemojiCacheMu.Lock()
	twemojiMissCache[code] = true
	twemojiCacheMu.Unlock()
}

func setWorkspaceEmojiMap(raw map[string]string) {
	urls := map[string]string{}
	aliases := map[string]string{}
	for key, value := range raw {
		name := normalizeEmojiKey(key)
		if name == "" {
			continue
		}
		value = strings.TrimSpace(value)
		if strings.HasPrefix(value, "alias:") {
			aliases[name] = normalizeEmojiKey(strings.TrimPrefix(value, "alias:"))
			continue
		}
		if strings.HasPrefix(value, "http://") || strings.HasPrefix(value, "https://") {
			urls[name] = value
		}
	}
	workspaceEmojiMu.Lock()
	workspaceEmojiURLByKey = urls
	workspaceEmojiAliasByKey = aliases
	workspaceEmojiMu.Unlock()
}

func resolveWorkspaceEmojiURL(name string) (string, bool) {
	key := normalizeEmojiKey(name)
	if key == "" {
		return "", false
	}
	workspaceEmojiMu.RLock()
	defer workspaceEmojiMu.RUnlock()
	seen := map[string]bool{}
	for depth := 0; depth < 8 && key != ""; depth++ {
		if seen[key] {
			return "", false
		}
		seen[key] = true
		if url := strings.TrimSpace(workspaceEmojiURLByKey[key]); url != "" {
			return url, true
		}
		next := normalizeEmojiKey(workspaceEmojiAliasByKey[key])
		if next == "" || next == key {
			return "", false
		}
		key = next
	}
	return "", false
}

func normalizeEmojiKey(name string) string {
	key := strings.ToLower(strings.Trim(strings.TrimSpace(name), ":"))
	key = strings.TrimSpace(key)
	if strings.Contains(key, "::") {
		key = strings.SplitN(key, "::", 2)[0]
	}
	return key
}
