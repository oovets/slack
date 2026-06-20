package gui

import "image/color"

// Slack-native color palette aligned to the "Design Spark" mock.
// Centralizes every chrome color so styling stays consistent and we
// never sprinkle raw NRGBA literals through the rest of the code.
var palette = struct {
	// Reaction chips
	ChipBG         color.NRGBA
	ChipBorder     color.NRGBA
	ChipText       color.NRGBA
	ChipSelfBG     color.NRGBA
	ChipSelfBorder color.NRGBA
	ChipSelfText   color.NRGBA
	ChipAddBG      color.NRGBA
	ChipAddBorder  color.NRGBA
	ChipAddText    color.NRGBA
	// Picker
	PickerHoverBG color.NRGBA
	PickerCellBG  color.NRGBA
	// Threads / meta
	MetaText       color.NRGBA
	MetaTextStrong color.NRGBA
	ThreadAccent   color.NRGBA
	ThreadHoverBG  color.NRGBA
	// Quote / mention highlights
	QuoteBG      color.NRGBA
	QuoteBar     color.NRGBA
	MentionRowBG color.NRGBA
	MentionAmber color.NRGBA

	// === Design Spark redesign tokens ===
	// Workspace rail (far-left strip)
	RailBG      color.NRGBA
	RailIcon    color.NRGBA
	RailIconHot color.NRGBA
	// Sidebar (channels/DMs column)
	SidebarBG      color.NRGBA
	SidebarHover   color.NRGBA
	SidebarSelBG   color.NRGBA
	SidebarSelText color.NRGBA
	SectionLabel   color.NRGBA
	// Badges (unread pills on sidebar rows)
	BadgeMutedBG     color.NRGBA
	BadgeMutedText   color.NRGBA
	BadgeMentionBG   color.NRGBA
	BadgeMentionText color.NRGBA
	BadgeHighlightBG color.NRGBA
	BadgeHighlightTx color.NRGBA
	// Channel header tile (the big "#" square)
	ChannelTileBG color.NRGBA
	ChannelTileFG color.NRGBA
	// Composer
	ComposerBG     color.NRGBA
	ComposerBorder color.NRGBA
	SendButtonBG   color.NRGBA
	SendButtonFG   color.NRGBA
	// Presence / top header chrome
	PresenceOnline color.NRGBA
	TopBarBG       color.NRGBA
	SegmentBG      color.NRGBA
	SegmentActive  color.NRGBA
	SegmentText    color.NRGBA
}{
	ChipBG:         color.NRGBA{R: 255, G: 255, B: 255, A: 10},
	ChipBorder:     color.NRGBA{R: 255, G: 255, B: 255, A: 22},
	ChipText:       color.NRGBA{R: 200, G: 202, B: 209, A: 255},
	ChipSelfBG:     color.NRGBA{R: 91, G: 141, B: 255, A: 40},
	ChipSelfBorder: color.NRGBA{R: 91, G: 141, B: 255, A: 200},
	ChipSelfText:   color.NRGBA{R: 160, G: 196, B: 255, A: 255},
	ChipAddBG:      color.NRGBA{R: 255, G: 255, B: 255, A: 0},
	ChipAddBorder:  color.NRGBA{R: 255, G: 255, B: 255, A: 26},
	ChipAddText:    color.NRGBA{R: 155, G: 161, B: 176, A: 230},

	PickerHoverBG: color.NRGBA{R: 255, G: 255, B: 255, A: 20},
	PickerCellBG:  color.NRGBA{R: 0, G: 0, B: 0, A: 0},

	MetaText:       color.NRGBA{R: 134, G: 138, B: 150, A: 230},
	MetaTextStrong: color.NRGBA{R: 220, G: 223, B: 230, A: 255},
	ThreadAccent:   color.NRGBA{R: 91, G: 141, B: 255, A: 255},
	ThreadHoverBG:  color.NRGBA{R: 255, G: 255, B: 255, A: 14},

	QuoteBG:      color.NRGBA{R: 92, G: 99, B: 126, A: 22},
	QuoteBar:     color.NRGBA{R: 122, G: 162, B: 247, A: 170},
	MentionRowBG: color.NRGBA{R: 66, G: 53, B: 24, A: 110},
	MentionAmber: color.NRGBA{R: 242, G: 199, B: 68, A: 255},

	// Rail / sidebar
	RailBG:      color.NRGBA{R: 10, G: 12, B: 18, A: 255},
	RailIcon:    color.NRGBA{R: 140, G: 148, B: 168, A: 255},
	RailIconHot: color.NRGBA{R: 230, G: 233, B: 240, A: 255},

	SidebarBG:      color.NRGBA{R: 15, G: 17, B: 24, A: 255},
	SidebarHover:   color.NRGBA{R: 255, G: 255, B: 255, A: 12},
	SidebarSelBG:   color.NRGBA{R: 91, G: 141, B: 255, A: 36},
	SidebarSelText: color.NRGBA{R: 255, G: 255, B: 255, A: 255},
	SectionLabel:   color.NRGBA{R: 107, G: 113, B: 133, A: 255},

	BadgeMutedBG:     color.NRGBA{R: 255, G: 255, B: 255, A: 28},
	BadgeMutedText:   color.NRGBA{R: 200, G: 202, B: 209, A: 255},
	BadgeMentionBG:   color.NRGBA{R: 224, G: 86, B: 107, A: 255},
	BadgeMentionText: color.NRGBA{R: 255, G: 255, B: 255, A: 255},
	BadgeHighlightBG: color.NRGBA{R: 59, G: 130, B: 246, A: 255},
	BadgeHighlightTx: color.NRGBA{R: 255, G: 255, B: 255, A: 255},

	ChannelTileBG: color.NRGBA{R: 167, G: 139, B: 250, A: 46},
	ChannelTileFG: color.NRGBA{R: 196, G: 181, B: 253, A: 255},

	ComposerBG:     color.NRGBA{R: 26, G: 29, B: 40, A: 255},
	ComposerBorder: color.NRGBA{R: 255, G: 255, B: 255, A: 18},
	SendButtonBG:   color.NRGBA{R: 59, G: 130, B: 246, A: 255},
	SendButtonFG:   color.NRGBA{R: 255, G: 255, B: 255, A: 255},

	PresenceOnline: color.NRGBA{R: 74, G: 222, B: 128, A: 255},
	TopBarBG:       color.NRGBA{R: 13, G: 15, B: 21, A: 255},
	SegmentBG:      color.NRGBA{R: 255, G: 255, B: 255, A: 14},
	SegmentActive:  color.NRGBA{R: 255, G: 255, B: 255, A: 36},
	SegmentText:    color.NRGBA{R: 220, G: 223, B: 230, A: 255},
}
