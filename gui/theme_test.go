package gui

import (
	"testing"

	"fyne.io/fyne/v2/theme"
)

func TestClampUIFontSize(t *testing.T) {
	tests := []struct {
		name string
		in   int
		want int
	}{
		{name: "below minimum", in: 4, want: minUIFontSize},
		{name: "inside range", in: defaultUIFontSize, want: defaultUIFontSize},
		{name: "above maximum", in: 40, want: maxUIFontSize},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := clampUIFontSize(tt.in); got != tt.want {
				t.Fatalf("clampUIFontSize(%d) = %d, want %d", tt.in, got, tt.want)
			}
		})
	}
}

func TestCompactThemeTypographyScale(t *testing.T) {
	th := &compactTheme{fontSize: defaultUIFontSize}

	if got := th.Size(theme.SizeNameText); got != defaultUIFontSize {
		t.Fatalf("text size = %v, want %v", got, defaultUIFontSize)
	}
	if got, want := th.Size(theme.SizeNameCaptionText), float32(9); got != want {
		t.Fatalf("caption size = %v, want %v", got, want)
	}
	if got, want := th.Size(theme.SizeNameSubHeadingText), float32(13); got != want {
		t.Fatalf("subheading size = %v, want %v", got, want)
	}
	if got, want := th.Size(theme.SizeNameHeadingText), float32(16); got != want {
		t.Fatalf("heading size = %v, want %v", got, want)
	}
	if got, want := th.Size(theme.SizeNameLineSpacing), float32(2); got != want {
		t.Fatalf("line spacing = %v, want %v", got, want)
	}
}
