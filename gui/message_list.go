package gui

import (
	"strings"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/widget"
	"github.com/stefan/slack-gui/api"
)

// trimEq reports whether a and b are equal after trimming, and non-empty.
func trimEq(a, b string) bool {
	a = strings.TrimSpace(a)
	return a != "" && a == strings.TrimSpace(b)
}

// messageRenderCtx carries the per-channel render inputs that renderMessageRow
// needs but that don't vary message-to-message.
type messageRenderCtx struct {
	currentUserID  string
	selfUserID     string
	showTimestamps bool
	inThreadView   bool
	compact        bool
	win            fyne.Window
	onThread       func(api.Message)
	onReply        func(api.Message)
	onMedia        func(api.File)
	onReaction     func(api.Message, string)
	fetchMedia     func(string) ([]byte, string, error)
}

// virtualMessageList renders a message history through a windowed widget.List.
// Only the rows currently on screen hold widgets; everything else is virtual,
// so memory and layout cost scale with the viewport, not with history length.
//
// Heights are variable: each visible row reports its own MinSize().Height back
// to the list via SetItemHeight, so wrapped text, reactions, threads and file
// chips all lay out correctly. A per-index cache stops SetItemHeight from
// re-triggering layout in a loop.
type virtualMessageList struct {
	list    *widget.List
	msgs    []api.Message
	ctx     messageRenderCtx
	heights map[int]float32
}

func newVirtualMessageList() *virtualMessageList {
	v := &virtualMessageList{heights: map[int]float32{}}

	v.list = widget.NewList(
		func() int {
			if len(v.msgs) == 0 {
				return 1 // single "empty state" row
			}
			return len(v.msgs)
		},
		func() fyne.CanvasObject {
			// Recyclable shell; the real (heterogeneous) row is injected on update.
			return container.NewStack()
		},
		func(id widget.ListItemID, obj fyne.CanvasObject) {
			shell, ok := obj.(*fyne.Container)
			if !ok {
				return
			}
			var row fyne.CanvasObject
			switch {
			case len(v.msgs) == 0:
				lbl := widget.NewLabel("No messages yet")
				lbl.Importance = widget.LowImportance
				lbl.Wrapping = fyne.TextWrapWord
				row = container.NewPadded(lbl)
			case id >= 0 && id < len(v.msgs):
				row = v.renderRow(id)
			default:
				row = container.NewStack()
			}
			shell.Objects = []fyne.CanvasObject{row}
			shell.Refresh()

			h := row.MinSize().Height
			if h > 0 && v.heights[id] != h {
				v.heights[id] = h
				v.list.SetItemHeight(id, h)
			}
		},
	)
	// Chat rows provide their own spacing; the list's divider lines would be noise.
	// If your Fyne build predates this field, delete the next line.
	v.list.HideSeparators = true
	return v
}

func (v *virtualMessageList) renderRow(i int) fyne.CanvasObject {
	m := v.msgs[i]
	isFromMe := trimEq(m.UserID, v.ctx.currentUserID)
	showHeader := isLastInSenderGroup(v.msgs, i)
	if isFromMe {
		// Always show own sender header so the name appears above outgoing text.
		showHeader = true
	}
	mentionedMe := m.MentionedMe || messageMentionsUser(m.Text, v.ctx.selfUserID)
	return renderMessageRow(m, isFromMe, mentionedMe, v.ctx.selfUserID, v.ctx.win, v.ctx.showTimestamps, v.ctx.compact, v.ctx.onThread, v.ctx.onReply, v.ctx.onMedia, v.ctx.onReaction, v.ctx.fetchMedia, showHeader, v.ctx.inThreadView)
}

// setMessages swaps in a new history and refreshes the visible window only.
func (v *virtualMessageList) setMessages(msgs []api.Message, ctx messageRenderCtx) {
	v.msgs = msgs
	v.ctx = ctx
	v.heights = map[int]float32{}
	v.list.Refresh()
	if len(msgs) > 0 {
		v.list.ScrollToBottom()
	}
}

func (v *virtualMessageList) clear() {
	v.msgs = nil
	v.heights = map[int]float32{}
	v.list.Refresh()
}

func (v *virtualMessageList) scrollToBottom() { v.list.ScrollToBottom() }

// invalidateHeights clears the row-height cache so that on the next render
// pass every row re-measures itself. Call this after the container is resized
// so text that wraps at a new width gets the correct height allocated.
func (v *virtualMessageList) invalidateHeights() {
	v.heights = map[int]float32{}
	v.list.Refresh()
}

// applyLocalReactions swaps in a new reactions slice for the message with
// the given TS and asks the underlying list to redraw only that one row,
// so we don't pay for a full history reload on every toggle.
func (v *virtualMessageList) applyLocalReactions(ts string, reactions []api.Reaction) bool {
	ts = strings.TrimSpace(ts)
	if ts == "" {
		return false
	}
	for i := range v.msgs {
		if strings.TrimSpace(v.msgs[i].TS) != ts {
			continue
		}
		v.msgs[i].Reactions = reactions
		// Height may change (e.g. reactions row appears/disappears).
		// Drop the cached height so the next render measures fresh.
		delete(v.heights, i)
		v.list.RefreshItem(i)
		return true
	}
	return false
}

// messageByTS returns a copy of the message with the given TS, if any.
func (v *virtualMessageList) messageByTS(ts string) (api.Message, bool) {
	ts = strings.TrimSpace(ts)
	if ts == "" {
		return api.Message{}, false
	}
	for i := range v.msgs {
		if strings.TrimSpace(v.msgs[i].TS) == ts {
			return v.msgs[i], true
		}
	}
	return api.Message{}, false
}
