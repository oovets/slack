package gui

import "image/color"

// Slack-native color palette. All chrome (reactions, thread chips, quote
// bars, avatars) pulls from here so styling stays consistent across the
// app and we never sprinkle raw NRGBA literals through the rest of the
// code. Values approximate Slack's dark theme:
//   - surface           #1A1D21
//   - elevated surface  #222529
//   - primary text      #D1D2D3
//   - secondary text    #ABABAD
//   - tertiary text     #868686
//   - accent (blue)     #1D9BD1
//   - mention amber     #F2C744
var palette = struct {
	// Reaction chips
	ChipBG          color.NRGBA
	ChipBorder      color.NRGBA
	ChipText        color.NRGBA
	ChipSelfBG      color.NRGBA
	ChipSelfBorder  color.NRGBA
	ChipSelfText    color.NRGBA
	ChipAddBG       color.NRGBA
	ChipAddBorder   color.NRGBA
	ChipAddText     color.NRGBA
	// Picker
	PickerHoverBG color.NRGBA
	PickerCellBG  color.NRGBA
	// Threads / meta
	MetaText        color.NRGBA
	MetaTextStrong  color.NRGBA
	ThreadAccent    color.NRGBA
	ThreadHoverBG   color.NRGBA
	// Quote / mention highlights
	QuoteBG       color.NRGBA
	QuoteBar      color.NRGBA
	MentionRowBG  color.NRGBA
}{
	ChipBG:         color.NRGBA{R: 255, G: 255, B: 255, A: 10},
	ChipBorder:     color.NRGBA{R: 255, G: 255, B: 255, A: 22},
	ChipText:       color.NRGBA{R: 171, G: 171, B: 173, A: 255},
	ChipSelfBG:     color.NRGBA{R: 29, G: 155, B: 209, A: 36},
	ChipSelfBorder: color.NRGBA{R: 29, G: 155, B: 209, A: 200},
	ChipSelfText:   color.NRGBA{R: 120, G: 196, B: 240, A: 255},
	ChipAddBG:      color.NRGBA{R: 255, G: 255, B: 255, A: 0},
	ChipAddBorder:  color.NRGBA{R: 255, G: 255, B: 255, A: 26},
	ChipAddText:    color.NRGBA{R: 155, G: 161, B: 176, A: 230},

	PickerHoverBG: color.NRGBA{R: 255, G: 255, B: 255, A: 20},
	PickerCellBG:  color.NRGBA{R: 0, G: 0, B: 0, A: 0},

	MetaText:       color.NRGBA{R: 134, G: 134, B: 134, A: 230},
	MetaTextStrong: color.NRGBA{R: 209, G: 210, B: 211, A: 255},
	ThreadAccent:   color.NRGBA{R: 29, G: 155, B: 209, A: 255},
	ThreadHoverBG:  color.NRGBA{R: 255, G: 255, B: 255, A: 14},

	QuoteBG:      color.NRGBA{R: 92, G: 99, B: 126, A: 22},
	QuoteBar:     color.NRGBA{R: 122, G: 162, B: 247, A: 170},
	MentionRowBG: color.NRGBA{R: 66, G: 53, B: 24, A: 120},
}
