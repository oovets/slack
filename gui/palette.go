package gui

import "image/color"

// uiPalette holds every custom chrome color used outside Fyne's theme system.
// There are two instances — one for dark mode, one for light — and the active
// one is exposed as the package-level `palette` variable. Call
// updatePaletteForMode when the user switches themes.
type uiPalette struct {
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
	QuoteBG       color.NRGBA
	QuoteBar      color.NRGBA
	MentionRowBG  color.NRGBA
	MentionAmber  color.NRGBA
	HereMentionBG color.NRGBA

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
	ChannelTileBG  color.NRGBA
	ChannelTileFG  color.NRGBA
	PaneHeaderBG   color.NRGBA
	PaneHeaderLine color.NRGBA
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
}

var darkUIColors = uiPalette{
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

	QuoteBG:       color.NRGBA{R: 92, G: 99, B: 126, A: 22},
	QuoteBar:      color.NRGBA{R: 122, G: 162, B: 247, A: 170},
	MentionRowBG:  color.NRGBA{R: 66, G: 53, B: 24, A: 110},
	MentionAmber:  color.NRGBA{R: 242, G: 199, B: 68, A: 255},
	HereMentionBG: color.NRGBA{R: 30, G: 80, B: 160, A: 55},

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

	ChannelTileBG:  color.NRGBA{R: 167, G: 139, B: 250, A: 46},
	ChannelTileFG:  color.NRGBA{R: 196, G: 181, B: 253, A: 255},
	PaneHeaderBG:   color.NRGBA{R: 20, G: 20, B: 29, A: 255},
	PaneHeaderLine: color.NRGBA{R: 255, G: 255, B: 255, A: 18},

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

var lightUIColors = uiPalette{
	ChipBG:         color.NRGBA{R: 0, G: 0, B: 0, A: 10},
	ChipBorder:     color.NRGBA{R: 0, G: 0, B: 0, A: 20},
	ChipText:       color.NRGBA{R: 55, G: 60, B: 75, A: 255},
	ChipSelfBG:     color.NRGBA{R: 59, G: 130, B: 246, A: 28},
	ChipSelfBorder: color.NRGBA{R: 59, G: 130, B: 246, A: 180},
	ChipSelfText:   color.NRGBA{R: 30, G: 85, B: 185, A: 255},
	ChipAddBG:      color.NRGBA{R: 0, G: 0, B: 0, A: 0},
	ChipAddBorder:  color.NRGBA{R: 0, G: 0, B: 0, A: 24},
	ChipAddText:    color.NRGBA{R: 90, G: 95, B: 112, A: 230},

	PickerHoverBG: color.NRGBA{R: 0, G: 0, B: 0, A: 14},
	PickerCellBG:  color.NRGBA{R: 0, G: 0, B: 0, A: 0},

	MetaText:       color.NRGBA{R: 100, G: 105, B: 122, A: 230},
	MetaTextStrong: color.NRGBA{R: 20, G: 22, B: 34, A: 255},
	ThreadAccent:   color.NRGBA{R: 63, G: 111, B: 214, A: 255},
	ThreadHoverBG:  color.NRGBA{R: 0, G: 0, B: 0, A: 8},

	QuoteBG:       color.NRGBA{R: 0, G: 0, B: 0, A: 10},
	QuoteBar:      color.NRGBA{R: 80, G: 130, B: 220, A: 170},
	MentionRowBG:  color.NRGBA{R: 255, G: 220, B: 60, A: 40},
	MentionAmber:  color.NRGBA{R: 150, G: 100, B: 0, A: 255},
	HereMentionBG: color.NRGBA{R: 59, G: 130, B: 246, A: 28},

	SidebarBG:      color.NRGBA{R: 0, G: 0, B: 0, A: 0},
	SidebarHover:   color.NRGBA{R: 0, G: 0, B: 0, A: 8},
	SidebarSelBG:   color.NRGBA{R: 59, G: 130, B: 246, A: 22},
	SidebarSelText: color.NRGBA{R: 10, G: 14, B: 28, A: 255},
	SectionLabel:   color.NRGBA{R: 100, G: 106, B: 124, A: 255},

	BadgeMutedBG:     color.NRGBA{R: 0, G: 0, B: 0, A: 22},
	BadgeMutedText:   color.NRGBA{R: 40, G: 45, B: 60, A: 255},
	BadgeMentionBG:   color.NRGBA{R: 224, G: 86, B: 107, A: 255},
	BadgeMentionText: color.NRGBA{R: 255, G: 255, B: 255, A: 255},
	BadgeHighlightBG: color.NRGBA{R: 59, G: 130, B: 246, A: 255},
	BadgeHighlightTx: color.NRGBA{R: 255, G: 255, B: 255, A: 255},

	ChannelTileBG:  color.NRGBA{R: 130, G: 90, B: 240, A: 22},
	ChannelTileFG:  color.NRGBA{R: 90, G: 55, B: 190, A: 255},
	PaneHeaderBG:   color.NRGBA{R: 245, G: 246, B: 250, A: 255},
	PaneHeaderLine: color.NRGBA{R: 0, G: 0, B: 0, A: 14},

	ComposerBG:     color.NRGBA{R: 255, G: 255, B: 255, A: 255},
	ComposerBorder: color.NRGBA{R: 0, G: 0, B: 0, A: 20},
	SendButtonBG:   color.NRGBA{R: 59, G: 130, B: 246, A: 255},
	SendButtonFG:   color.NRGBA{R: 255, G: 255, B: 255, A: 255},

	PresenceOnline: color.NRGBA{R: 34, G: 180, B: 90, A: 255},
	TopBarBG:       color.NRGBA{R: 238, G: 240, B: 247, A: 255},
	SegmentBG:      color.NRGBA{R: 0, G: 0, B: 0, A: 10},
	SegmentActive:  color.NRGBA{R: 0, G: 0, B: 0, A: 22},
	SegmentText:    color.NRGBA{R: 20, G: 22, B: 34, A: 255},
}

// palette is the active color set. Starts as dark; call updatePaletteForMode
// after any theme switch then refresh all stored canvas refs.
var palette = darkUIColors

func updatePaletteForMode(dark bool) {
	if dark {
		palette = darkUIColors
	} else {
		palette = lightUIColors
	}
}
