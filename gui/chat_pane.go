package gui

import (
	"image/color"
	"strings"
	"time"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/canvas"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/theme"
	"fyne.io/fyne/v2/widget"
	"github.com/oovets/slack/api"
)

// paneIDCounter assigns unique IDs to chat panes. All pane creation happens on
// the Fyne main goroutine, so no locking is needed.
var paneIDCounter int

type chatPane struct {
	id           int
	root         *paneSurface
	panel        *fyne.Container
	title        *widget.Label
	viewport     *fyne.Container
	msgList      *virtualMessageList
	msgScroll    *widget.List
	input        *focusEntry
	inputCard    *fyne.Container
	inputTopGap  *canvas.Rectangle
	inputVisible bool
	revealAnim   *fyne.Animation
	replyHolder  *fyne.Container
	replyLabel   *widget.Label
	threadHolder *fyne.Container
	threadLabel  *widget.Label

	channelID   string
	channelName string
	threadTS    string
	replyTarget *api.Message

	inputBg     *canvas.Rectangle
	inputBorder *canvas.Rectangle
	threadBg    *canvas.Rectangle
	replyBg     *canvas.Rectangle

	header      *fyne.Container
	headerBg    *canvas.Rectangle
	headerLine  *canvas.Rectangle
	headerTitle *canvas.Text
	headerSub   *canvas.Text

	// mention autocomplete
	completer *mentionCompleter
	mentionFn func(prefix string) []completionMatch
}

func newChatPane(onActivate func(*chatPane), onSend func(*chatPane), onExitThread func(*chatPane), onCancelReply func(*chatPane), onResized func(*chatPane), onShortcut func(fyne.Shortcut) bool) *chatPane {
	p := &chatPane{id: paneIDCounter}
	paneIDCounter++
	p.title = widget.NewLabel("Select a channel")
	p.title.Importance = widget.HighImportance
	p.msgList = newVirtualMessageList()
	p.msgScroll = p.msgList.list
	p.input = newFocusEntry(func() {
		if onActivate != nil {
			onActivate(p)
		}
	}, onShortcut, func() {
		if strings.TrimSpace(p.threadTS) != "" {
			if onExitThread != nil {
				onExitThread(p)
			}
			return
		}
		if p.replyTarget != nil && onCancelReply != nil {
			onCancelReply(p)
		}
	})
	p.input.Wrapping = fyne.TextWrapWord
	p.input.SetMinRowsVisible(1)
	p.input.OnSubmitted = func(_ string) {
		if onSend != nil {
			onSend(p)
		}
	}
	p.input.OnChanged = func(_ string) {
		p.handleMentionChange()
	}
	p.input.onMentionKey = func(key *fyne.KeyEvent) bool {
		return p.handleMentionKey(key)
	}
	p.replyLabel = widget.NewLabel("")
	p.replyLabel.Wrapping = fyne.TextTruncate
	p.threadLabel = widget.NewLabel("")
	p.threadLabel.Wrapping = fyne.TextTruncate
	p.threadBg = canvas.NewRectangle(theme.Color(theme.ColorNameHover))
	p.replyBg = canvas.NewRectangle(theme.Color(theme.ColorNameHover))
	exitThreadBtn := newGlyph("✕", func() {
		if onExitThread != nil {
			onExitThread(p)
		}
	})
	p.threadHolder = container.NewMax(p.threadBg, container.NewPadded(container.NewBorder(nil, nil, nil, exitThreadBtn, p.threadLabel)))
	p.threadHolder.Hide()
	cancelReplyBtn := newGlyph("✕", func() {
		if onCancelReply != nil {
			onCancelReply(p)
		}
	})
	p.replyHolder = container.NewMax(p.replyBg, container.NewPadded(container.NewBorder(nil, nil, nil, cancelReplyBtn, p.replyLabel)))
	p.replyHolder.Hide()

	p.inputTopGap = canvas.NewRectangle(color.Transparent)
	p.inputTopGap.SetMinSize(fyne.NewSize(1, 8))
	p.inputBg = canvas.NewRectangle(palette.ComposerBG)
	p.inputBg.CornerRadius = 10
	p.inputBorder = canvas.NewRectangle(color.Transparent)
	p.inputBorder.StrokeColor = palette.ComposerBorder
	p.inputBorder.StrokeWidth = 1
	p.inputBorder.CornerRadius = 10
	inputHPad := float32(10)
	inputVPad := float32(6)
	inputTopPad := canvas.NewRectangle(color.Transparent)
	inputTopPad.SetMinSize(fyne.NewSize(1, inputVPad))
	inputBottomPad := canvas.NewRectangle(color.Transparent)
	inputBottomPad.SetMinSize(fyne.NewSize(1, inputVPad))

	inner := container.NewBorder(
		inputTopPad, inputBottomPad,
		fixedWidthSpacer(inputHPad),
		fixedWidthSpacer(inputHPad),
		p.input,
	)
	entryRow := container.NewStack(p.inputBg, p.inputBorder, inner)
	formatBar := newFormatBar(p.input)
	composer := container.NewVBox(formatBar, entryRow)
	p.inputCard = container.NewVBox(p.inputTopGap, p.threadHolder, p.replyHolder, container.NewPadded(composer))

	// Channel header bar (name + topic) painted at top.
	p.headerTitle = canvas.NewText("Select a channel", palette.MetaTextStrong)
	p.headerTitle.TextStyle = fyne.TextStyle{Bold: true}
	p.headerTitle.TextSize = 12
	p.headerSub = canvas.NewText("", palette.SectionLabel)
	p.headerSub.TextSize = 10
	headerLeft := container.NewHBox(
		fixedWidthSpacer(12),
		container.NewVBox(p.headerTitle, p.headerSub),
	)
	headerRow := container.NewBorder(nil, nil, headerLeft, fixedWidthSpacer(12), nil)
	p.headerBg = canvas.NewRectangle(palette.PaneHeaderBG)
	p.headerLine = canvas.NewRectangle(palette.PaneHeaderLine)
	p.headerLine.SetMinSize(fyne.NewSize(1, 1))
	p.header = container.NewStack(
		p.headerBg,
		container.NewBorder(layoutSpacerH(5), p.headerLine, nil, nil, headerRow),
	)

	p.inputVisible = true
	p.viewport = container.NewBorder(p.header, p.inputCard, nil, nil, p.msgScroll)
	p.viewport.Objects = []fyne.CanvasObject{p.msgScroll, p.header, p.inputCard}
	p.panel = container.NewMax(p.viewport)
	p.root = newPaneSurface(p.panel, func() {
		if onActivate != nil {
			onActivate(p)
		}
	}, func() {
		// Invalidate cached row heights asynchronously so wrapped text
		// re-measures itself at the new container width.
		go func() {
			fyne.Do(func() {
				if p.msgList != nil {
					p.msgList.invalidateHeights()
				}
			})
		}()
		if onResized != nil {
			onResized(p)
		}
	})
	return p
}

func (p *chatPane) widget() fyne.CanvasObject { return p.root }

func (p *chatPane) setFocused(focused bool) {
	_ = focused
}

func (p *chatPane) setTitle(t string) {
	p.title.SetText(t)
	if p.headerTitle != nil {
		name := strings.TrimSpace(p.channelName)
		if name == "" {
			name = t
		}
		p.headerTitle.Text = name
		p.headerTitle.Refresh()
	}
	if p.headerSub != nil {
		sub := ""
		if idx := strings.Index(t, " — "); idx >= 0 {
			sub = strings.TrimSpace(t[idx+len(" — "):])
		}
		p.headerSub.Text = sub
		p.headerSub.Refresh()
	}
}

func (p *chatPane) setThreadBanner(text string) {
	if p.threadHolder == nil || p.threadLabel == nil {
		return
	}
	if strings.TrimSpace(text) == "" {
		p.threadLabel.SetText("")
		p.threadHolder.Hide()
		return
	}
	p.threadLabel.SetText(text)
	p.threadHolder.Show()
}

func (p *chatPane) setInputVisible(visible bool, reveal bool) {
	_ = reveal
	if p.inputVisible == visible {
		return
	}
	if p.revealAnim != nil {
		p.revealAnim.Stop()
		p.revealAnim = nil
	}
	p.inputVisible = visible
	if visible {
		p.viewport.Objects = []fyne.CanvasObject{p.msgScroll, p.header, p.inputCard}
	} else {
		hiddenSpacer := canvas.NewRectangle(color.Transparent)
		hiddenSpacer.SetMinSize(fyne.NewSize(1, 10))
		p.viewport.Objects = []fyne.CanvasObject{p.msgScroll, p.header, hiddenSpacer}
	}
	p.panel.Refresh()
	fyne.Do(func() {
		p.msgScroll.ScrollToBottom()
	})
	go func() {
		time.Sleep(90 * time.Millisecond)
		fyne.Do(func() {
			p.msgScroll.ScrollToBottom()
		})
	}()
}

func (p *chatPane) clearMessages() {
	p.msgList.clear()
}

func (p *chatPane) setLoadingMessages() {
	p.msgList.setLoading()
}

func (p *chatPane) refreshForTheme(showTimestamps bool, imagePreviews bool, compact bool) {
	if p.inputBg != nil {
		p.inputBg.FillColor = palette.ComposerBG
		p.inputBg.Refresh()
	}
	if p.inputBorder != nil {
		p.inputBorder.StrokeColor = palette.ComposerBorder
		p.inputBorder.StrokeWidth = 1
		p.inputBorder.Refresh()
	}
	if p.headerBg != nil {
		p.headerBg.FillColor = palette.PaneHeaderBG
		p.headerBg.Refresh()
	}
	if p.headerLine != nil {
		p.headerLine.FillColor = palette.PaneHeaderLine
		p.headerLine.Refresh()
	}
	if p.headerTitle != nil {
		p.headerTitle.Color = palette.MetaTextStrong
		p.headerTitle.Refresh()
	}
	if p.headerSub != nil {
		p.headerSub.Color = palette.SectionLabel
		p.headerSub.Refresh()
	}
	if p.threadBg != nil {
		p.threadBg.FillColor = theme.Color(theme.ColorNameHover)
		p.threadBg.Refresh()
	}
	if p.replyBg != nil {
		p.replyBg.FillColor = theme.Color(theme.ColorNameHover)
		p.replyBg.Refresh()
	}
	p.replyLabel.Refresh()
	p.threadLabel.Refresh()
	p.title.Refresh()
	p.msgList.refreshOptions(showTimestamps, imagePreviews, compact)
	p.msgScroll.Refresh()
	p.panel.Refresh()
}

func (p *chatPane) scrollToBottomSoon() {
	fyne.Do(func() {
		p.msgScroll.ScrollToBottom()
	})
	go func() {
		time.Sleep(120 * time.Millisecond)
		fyne.Do(func() {
			p.msgScroll.ScrollToBottom()
		})
	}()
}

func (p *chatPane) setMessages(msgs []api.Message, selfUserID string, win fyne.Window, showTimestamps bool, imagePreviews bool, compact bool, onThread func(api.Message), onReply func(api.Message), onMedia func(api.File), onReaction func(api.Message, string), fetchMedia func(string) ([]byte, string, error)) {
	p.msgList.setMessages(msgs, messageRenderCtx{
		selfUserID:     selfUserID,
		showTimestamps: showTimestamps,
		imagePreviews:  imagePreviews,
		compact:        compact,
		inThreadView:   strings.TrimSpace(p.threadTS) != "",
		win:            win,
		onThread:       onThread,
		onReply:        onReply,
		onMedia:        onMedia,
		onReaction:     onReaction,
		fetchMedia:     fetchMedia,
	})
	if len(msgs) > 0 {
		p.scrollToBottomSoon()
	}
}

// applyLocalReactions updates the rendered chips for one message in this
// pane without triggering a full history reload. Returns false if the
// message isn't currently shown (e.g. user already switched channels).
func (p *chatPane) applyLocalReactions(ts string, reactions []api.Reaction) bool {
	if p == nil || p.msgList == nil {
		return false
	}
	return p.msgList.applyLocalReactions(ts, reactions)
}

func (p *chatPane) messageByTS(ts string) (api.Message, bool) {
	if p == nil || p.msgList == nil {
		return api.Message{}, false
	}
	return p.msgList.messageByTS(ts)
}

func (p *chatPane) handleMentionChange() {
	if p.completer == nil || p.mentionFn == nil {
		return
	}
	prefix, found := mentionPrefixAt(p.input.Text, p.input.CursorRow, p.input.CursorColumn)
	if !found {
		p.completer.hide()
		return
	}
	matches := p.mentionFn(prefix)
	p.completer.update(matches, p.input)
}

func (p *chatPane) handleMentionKey(key *fyne.KeyEvent) bool {
	if p.completer == nil || !p.completer.isVisible() {
		return false
	}
	switch key.Name {
	case fyne.KeyUp:
		p.completer.move(-1)
		return true
	case fyne.KeyDown:
		p.completer.move(1)
		return true
	case fyne.KeyReturn, fyne.KeyEnter, fyne.KeyTab:
		p.completer.confirm()
		return true
	case fyne.KeyEscape:
		p.completer.hide()
		return true
	}
	return false
}
