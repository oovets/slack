package gui

import (
	_ "embed"
	"image/color"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"sort"
	"strings"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/theme"
)

//go:embed fonts/Inter-Regular.ttf
var interRegular []byte

//go:embed fonts/Inter-Bold.ttf
var interBold []byte

//go:embed fonts/Inter-Italic.ttf
var interItalic []byte

//go:embed fonts/Inter-BoldItalic.ttf
var interBoldItalic []byte

//go:embed fonts/Lato-Regular.ttf
var latoRegular []byte

//go:embed fonts/Lato-Bold.ttf
var latoBold []byte

//go:embed fonts/Lato-Italic.ttf
var latoItalic []byte

//go:embed fonts/Lato-BoldItalic.ttf
var latoBoldItalic []byte

//go:embed fonts/NotoSans-Regular.ttf
var notoSansRegular []byte

//go:embed fonts/NotoSans-Bold.ttf
var notoSansBold []byte

//go:embed fonts/NotoSans-Italic.ttf
var notoSansItalic []byte

//go:embed fonts/NotoSans-BoldItalic.ttf
var notoSansBoldItalic []byte

//go:embed fonts/JetBrainsMono-Regular.ttf
var jetBrainsMonoRegular []byte

//go:embed fonts/JetBrainsMono-Bold.ttf
var jetBrainsMonoBold []byte

//go:embed fonts/JetBrainsMono-Italic.ttf
var jetBrainsMonoItalic []byte

//go:embed fonts/JetBrainsMono-BoldItalic.ttf
var jetBrainsMonoBoldItalic []byte

var bundledFonts = map[string]fontSet{
	"Inter": {
		regular:    fyne.NewStaticResource("Inter-Regular.ttf", interRegular),
		bold:       fyne.NewStaticResource("Inter-Bold.ttf", interBold),
		italic:     fyne.NewStaticResource("Inter-Italic.ttf", interItalic),
		boldItalic: fyne.NewStaticResource("Inter-BoldItalic.ttf", interBoldItalic),
	},
	"Lato": {
		regular:    fyne.NewStaticResource("Lato-Regular.ttf", latoRegular),
		bold:       fyne.NewStaticResource("Lato-Bold.ttf", latoBold),
		italic:     fyne.NewStaticResource("Lato-Italic.ttf", latoItalic),
		boldItalic: fyne.NewStaticResource("Lato-BoldItalic.ttf", latoBoldItalic),
	},
	"Noto Sans": {
		regular:    fyne.NewStaticResource("NotoSans-Regular.ttf", notoSansRegular),
		bold:       fyne.NewStaticResource("NotoSans-Bold.ttf", notoSansBold),
		italic:     fyne.NewStaticResource("NotoSans-Italic.ttf", notoSansItalic),
		boldItalic: fyne.NewStaticResource("NotoSans-BoldItalic.ttf", notoSansBoldItalic),
	},
	"JetBrains Mono": {
		regular:    fyne.NewStaticResource("JetBrainsMono-Regular.ttf", jetBrainsMonoRegular),
		bold:       fyne.NewStaticResource("JetBrainsMono-Bold.ttf", jetBrainsMonoBold),
		italic:     fyne.NewStaticResource("JetBrainsMono-Italic.ttf", jetBrainsMonoItalic),
		boldItalic: fyne.NewStaticResource("JetBrainsMono-BoldItalic.ttf", jetBrainsMonoBoldItalic),
	},
}

type fontSet struct {
	regular, bold, italic, boldItalic fyne.Resource
}

const (
	defaultUIFontSize = 12
	minUIFontSize     = 9
	maxUIFontSize     = 16
	minMetaTextSize   = 8
)

func clampUIFontSize(size int) int {
	if size < minUIFontSize {
		return minUIFontSize
	}
	if size > maxUIFontSize {
		return maxUIFontSize
	}
	return size
}

func textSizeWithFloor(base, delta, floor float32) float32 {
	size := base + delta
	if size < floor {
		return floor
	}
	return size
}

func captionTextSize(base float32, compact bool) float32 {
	delta := float32(-3)
	if compact {
		delta = -4
	}
	return textSizeWithFloor(base, delta, minMetaTextSize)
}

func senderTextSize() float32 {
	return textSizeWithFloor(theme.TextSize(), -2, minMetaTextSize)
}

func timestampTextSize() float32 {
	return theme.CaptionTextSize()
}

func metaActionTextSize() float32 {
	return textSizeWithFloor(theme.CaptionTextSize(), -1, minMetaTextSize)
}

func reactionCountTextSize() float32 {
	return metaActionTextSize()
}

func reactionEmojiViewSize() float32 {
	return textSizeWithFloor(theme.TextSize(), 2, 12)
}

func glyphTextSize() float32 {
	return textSizeWithFloor(theme.CaptionTextSize(), 1, 9)
}

type fontDef struct {
	Name                              string
	Regular, Bold, Italic, BoldItalic []string
}

var knownFonts = []fontDef{
	{Name: "Default"},
	{
		Name:       "Lato",
		Regular:    []string{"/usr/share/fonts/TTF/Lato-Regular.ttf"},
		Bold:       []string{"/usr/share/fonts/TTF/Lato-Bold.ttf"},
		Italic:     []string{"/usr/share/fonts/TTF/Lato-Italic.ttf"},
		BoldItalic: []string{"/usr/share/fonts/TTF/Lato-BoldItalic.ttf"},
	},
	{
		Name:       "Inter",
		Regular:    []string{"/usr/share/fonts/inter/Inter-Regular.otf"},
		Bold:       []string{"/usr/share/fonts/inter/Inter-Bold.otf"},
		Italic:     []string{"/usr/share/fonts/inter/Inter-Italic.otf"},
		BoldItalic: []string{"/usr/share/fonts/inter/Inter-BoldItalic.otf"},
	},
	{
		Name:       "Noto Sans",
		Regular:    []string{"/usr/share/fonts/noto/NotoSans-Regular.ttf"},
		Bold:       []string{"/usr/share/fonts/noto/NotoSans-Bold.ttf"},
		Italic:     []string{"/usr/share/fonts/noto/NotoSans-Italic.ttf"},
		BoldItalic: []string{"/usr/share/fonts/noto/NotoSans-BoldItalic.ttf"},
	},
	{
		Name: "JetBrains Mono Nerd Font",
		Regular: []string{
			"/usr/share/fonts/TTF/JetBrainsMonoNerdFont-Regular.ttf",
			"/usr/share/fonts/TTF/JetBrainsMonoNLNerdFont-Regular.ttf",
			"/usr/share/fonts/TTF/JetBrainsMonoNerdFontMono-Regular.ttf",
			"/usr/share/fonts/TTF/JetBrainsMonoNLNerdFontMono-Regular.ttf",
		},
		Bold: []string{
			"/usr/share/fonts/TTF/JetBrainsMonoNerdFont-Bold.ttf",
			"/usr/share/fonts/TTF/JetBrainsMonoNLNerdFont-Bold.ttf",
			"/usr/share/fonts/TTF/JetBrainsMonoNerdFontMono-Bold.ttf",
			"/usr/share/fonts/TTF/JetBrainsMonoNLNerdFontMono-Bold.ttf",
		},
		Italic: []string{
			"/usr/share/fonts/TTF/JetBrainsMonoNerdFont-Italic.ttf",
			"/usr/share/fonts/TTF/JetBrainsMonoNLNerdFont-Italic.ttf",
			"/usr/share/fonts/TTF/JetBrainsMonoNerdFontMono-Italic.ttf",
			"/usr/share/fonts/TTF/JetBrainsMonoNLNerdFontMono-Italic.ttf",
		},
		BoldItalic: []string{
			"/usr/share/fonts/TTF/JetBrainsMonoNerdFont-BoldItalic.ttf",
			"/usr/share/fonts/TTF/JetBrainsMonoNLNerdFont-BoldItalic.ttf",
			"/usr/share/fonts/TTF/JetBrainsMonoNerdFontMono-BoldItalic.ttf",
			"/usr/share/fonts/TTF/JetBrainsMonoNLNerdFontMono-BoldItalic.ttf",
		},
	},
	{
		Name: "Geist",
		Regular: []string{
			"/usr/share/fonts/TTF/Geist-Regular.ttf",
			"/usr/share/fonts/OTF/Geist-Regular.otf",
			"/usr/share/fonts/TTF/GeistVF.ttf",
			"/usr/share/fonts/OTF/GeistVF.otf",
		},
		Bold: []string{
			"/usr/share/fonts/TTF/Geist-Bold.ttf",
			"/usr/share/fonts/OTF/Geist-Bold.otf",
			"/usr/share/fonts/TTF/GeistVF.ttf",
			"/usr/share/fonts/OTF/GeistVF.otf",
		},
		Italic: []string{
			"/usr/share/fonts/TTF/Geist-Italic.ttf",
			"/usr/share/fonts/OTF/Geist-Italic.otf",
			"/usr/share/fonts/TTF/GeistVF.ttf",
			"/usr/share/fonts/OTF/GeistVF.otf",
		},
		BoldItalic: []string{
			"/usr/share/fonts/TTF/Geist-BoldItalic.ttf",
			"/usr/share/fonts/OTF/Geist-BoldItalic.otf",
			"/usr/share/fonts/TTF/GeistVF.ttf",
			"/usr/share/fonts/OTF/GeistVF.otf",
		},
	},
}

var (
	alacrittyFontDottedRE = regexp.MustCompile(`(?mi)^\s*(?:normal|bold|italic|bold_italic)\.family\s*=\s*["']?([^"'\n#]+)`)
	alacrittyFontFlatRE   = regexp.MustCompile(`(?mi)^\s*family\s*[:=]\s*["']?([^"'\n#]+)`)
)

func loadFont(path string) fyne.Resource {
	if path == "" {
		return nil
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return nil
	}
	return fyne.NewStaticResource(path, data)
}

func loadFirstFont(paths []string) fyne.Resource {
	for _, p := range paths {
		if r := loadFont(p); r != nil {
			return r
		}
	}
	return nil
}

func detectAlacrittyFontFamily() string {
	home, err := os.UserHomeDir()
	if err != nil || home == "" {
		return ""
	}
	paths := []string{
		filepath.Join(home, ".config", "alacritty", "alacritty.toml"),
		filepath.Join(home, ".alacritty.toml"),
		filepath.Join(home, ".config", "alacritty", "alacritty.yml"),
		filepath.Join(home, ".config", "alacritty", "alacritty.yaml"),
		filepath.Join(home, ".alacritty.yml"),
		filepath.Join(home, ".alacritty.yaml"),
	}
	for _, p := range paths {
		data, err := os.ReadFile(p)
		if err != nil || len(data) == 0 {
			continue
		}
		if m := alacrittyFontDottedRE.FindSubmatch(data); len(m) > 1 {
			return strings.TrimSpace(string(m[1]))
		}
		if m := alacrittyFontFlatRE.FindSubmatch(data); len(m) > 1 {
			return strings.TrimSpace(string(m[1]))
		}
	}
	return ""
}

func fontDefFromFontConfig(family string) (fontDef, bool) {
	family = strings.TrimSpace(family)
	if family == "" {
		return fontDef{}, false
	}
	fcList, ok := resolveFCListPath()
	if !ok {
		return fontDef{}, false
	}
	cmd := exec.Command(fcList, "--format=%{file}\t%{family}\t%{style}\n")
	out, err := cmd.Output()
	if err != nil || len(out) == 0 {
		return fontDef{}, false
	}
	def := fontDef{Name: family}
	familyLower := strings.ToLower(family)

	for _, line := range strings.Split(string(out), "\n") {
		if strings.TrimSpace(line) == "" {
			continue
		}
		parts := strings.SplitN(line, "\t", 3)
		if len(parts) < 3 {
			continue
		}
		file := strings.TrimSpace(parts[0])
		families := strings.Split(parts[1], ",")
		style := strings.ToLower(parts[2])

		matched := false
		for _, f := range families {
			if strings.EqualFold(strings.TrimSpace(f), familyLower) || strings.EqualFold(strings.TrimSpace(f), family) {
				matched = true
				break
			}
		}
		if !matched {
			for _, f := range families {
				if strings.Contains(strings.ToLower(strings.TrimSpace(f)), familyLower) {
					matched = true
					break
				}
			}
		}
		if !matched {
			continue
		}

		switch {
		case strings.Contains(style, "bold") && (strings.Contains(style, "italic") || strings.Contains(style, "oblique")):
			def.BoldItalic = append(def.BoldItalic, file)
		case strings.Contains(style, "bold"):
			def.Bold = append(def.Bold, file)
		case strings.Contains(style, "italic") || strings.Contains(style, "oblique"):
			def.Italic = append(def.Italic, file)
		default:
			def.Regular = append(def.Regular, file)
		}
	}
	if len(def.Regular) == 0 && len(def.Bold) == 0 && len(def.Italic) == 0 && len(def.BoldItalic) == 0 {
		return fontDef{}, false
	}
	return def, true
}

func resolveFCListPath() (string, bool) {
	for _, path := range []string{"/usr/bin/fc-list", "/bin/fc-list"} {
		if st, err := os.Stat(path); err == nil && !st.IsDir() {
			return path, true
		}
	}
	path, err := exec.LookPath("fc-list")
	if err != nil {
		return "", false
	}
	clean := filepath.Clean(path)
	if !filepath.IsAbs(clean) {
		return "", false
	}
	return clean, true
}

type compactTheme struct {
	dark        bool
	fontSize    float32
	boldAll     bool
	compactMode bool
	fonts       map[string]fontSet
	curFamily   string
}

type themePalette struct {
	background      color.NRGBA
	inputBackground color.NRGBA
	foreground      color.NRGBA
	mutedForeground color.NRGBA
	separator       color.NRGBA
	hover           color.NRGBA
	focus           color.NRGBA
	primary         color.NRGBA
	success         color.NRGBA
	shadow          color.NRGBA
}

// darkPalette: warm charcoal ground built around #1f1f1d.
var darkPalette = themePalette{
	background:      color.NRGBA{R: 31, G: 31, B: 29, A: 255},    // #1f1f1d
	inputBackground: color.NRGBA{R: 39, G: 39, B: 37, A: 255},    // #272725
	foreground:      color.NRGBA{R: 230, G: 233, B: 235, A: 255}, // #e6e9eb
	mutedForeground: color.NRGBA{R: 122, G: 122, B: 118, A: 255}, // #7a7a76
	separator:       color.NRGBA{R: 255, G: 255, B: 255, A: 20},
	hover:           color.NRGBA{R: 255, G: 255, B: 255, A: 16},
	focus:           color.NRGBA{R: 91, G: 141, B: 255, A: 180},
	primary:         color.NRGBA{R: 91, G: 141, B: 255, A: 255}, // #5b8dff
	success:         color.NRGBA{R: 108, G: 193, B: 138, A: 255},
	shadow:          color.NRGBA{A: 0},
}

// lightPalette: soft off-white ground with pure-white input cards that pop,
// matching the redesign's airier light theme.
var lightPalette = themePalette{
	background:      color.NRGBA{R: 245, G: 246, B: 249, A: 255}, // #f5f6f9
	inputBackground: color.NRGBA{R: 255, G: 255, B: 255, A: 255}, // #ffffff
	foreground:      color.NRGBA{R: 25, G: 27, B: 36, A: 255},    // #191b24
	mutedForeground: color.NRGBA{R: 121, G: 127, B: 142, A: 255}, // #797f8e
	separator:       color.NRGBA{R: 18, G: 20, B: 28, A: 24},
	hover:           color.NRGBA{R: 18, G: 20, B: 28, A: 12},
	focus:           color.NRGBA{R: 63, G: 111, B: 214, A: 170},
	primary:         color.NRGBA{R: 63, G: 111, B: 214, A: 255}, // #3f6fd6
	success:         color.NRGBA{R: 72, G: 140, B: 83, A: 255},
	shadow:          color.NRGBA{A: 0},
}

func newCompactTheme() *compactTheme {
	t := &compactTheme{
		dark:     false,
		fontSize: defaultUIFontSize, // compact chat default; Fyne's built-in text size is 14
		fonts:    make(map[string]fontSet),
	}

	// Always available: bundled fonts
	t.fonts["Default"] = fontSet{}
	for name, fs := range bundledFonts {
		t.fonts[name] = fs
	}

	// System fonts: add with "(system)" suffix if name already bundled
	fontDefs := append([]fontDef{}, knownFonts...)
	alacrittyFamily := detectAlacrittyFontFamily()
	if alacrittyDef, ok := fontDefFromFontConfig(alacrittyFamily); ok {
		fontDefs = append(fontDefs, alacrittyDef)
	}
	for _, def := range fontDefs {
		if def.Name == "Default" {
			continue
		}
		regular := loadFirstFont(def.Regular)
		if regular == nil {
			continue
		}
		name := def.Name
		if _, exists := bundledFonts[name]; exists {
			name = name + " (system)"
		}
		t.fonts[name] = fontSet{
			regular:    regular,
			bold:       loadFirstFont(def.Bold),
			italic:     loadFirstFont(def.Italic),
			boldItalic: loadFirstFont(def.BoldItalic),
		}
	}

	t.curFamily = "Inter"
	return t
}

func (t *compactTheme) availableFamilies() []string {
	out := make([]string, 0, len(t.fonts))
	for name := range t.fonts {
		if name == "Default" {
			continue
		}
		out = append(out, name)
	}
	sort.Strings(out)
	out = append([]string{"Default"}, out...)
	return out
}

func (t *compactTheme) base() fyne.Theme {
	if t.dark {
		return theme.DarkTheme()
	}
	return theme.LightTheme()
}

func (t *compactTheme) palette() themePalette {
	if t.dark {
		return darkPalette
	}
	return lightPalette
}

func (t *compactTheme) Color(name fyne.ThemeColorName, variant fyne.ThemeVariant) color.Color {
	p := t.palette()
	switch name {
	case theme.ColorNameBackground:
		return p.background
	case theme.ColorNameMenuBackground:
		return p.background
	case theme.ColorNameOverlayBackground:
		return p.background
	case theme.ColorNameInputBackground:
		return p.inputBackground
	case theme.ColorNameInputBorder:
		return p.separator
	case theme.ColorNameForeground:
		return p.foreground
	case theme.ColorNamePlaceHolder, theme.ColorNameDisabled:
		return p.mutedForeground
	case theme.ColorNameSeparator:
		return p.separator
	case theme.ColorNameHover, theme.ColorNamePressed:
		return p.hover
	case theme.ColorNameFocus, theme.ColorNameSelection:
		return p.focus
	case theme.ColorNamePrimary:
		return p.primary
	case theme.ColorNameSuccess:
		return p.success
	case theme.ColorNameShadow:
		return p.shadow
	}
	return t.base().Color(name, variant)
}

func (t *compactTheme) Icon(name fyne.ThemeIconName) fyne.Resource {
	return t.base().Icon(name)
}

func (t *compactTheme) Font(style fyne.TextStyle) fyne.Resource {
	if t.boldAll {
		style.Bold = true
	}
	fs := t.fonts[t.curFamily]
	switch {
	case style.Bold && style.Italic:
		if fs.boldItalic != nil {
			return fs.boldItalic
		}
		if fs.bold != nil {
			return fs.bold
		}
		if fs.italic != nil {
			return fs.italic
		}
		if fs.regular != nil {
			return fs.regular
		}
	case style.Bold:
		if fs.bold != nil {
			return fs.bold
		}
		if fs.regular != nil {
			return fs.regular
		}
	case style.Italic:
		if fs.italic != nil {
			return fs.italic
		}
		if fs.regular != nil {
			return fs.regular
		}
	default:
		if fs.regular != nil {
			return fs.regular
		}
	}
	return t.base().Font(style)
}

func (t *compactTheme) Size(name fyne.ThemeSizeName) float32 {
	switch name {
	case theme.SizeNamePadding, theme.SizeNameInnerPadding:
		if t.compactMode {
			return 1
		}
		return 4
	case theme.SizeNameInputRadius:
		// redesign: softer corners on inputs, cards and the composer.
		if t.compactMode {
			return 6
		}
		return 8
	case theme.SizeNameInputBorder:
		return 1
	case theme.SizeNameScrollBar, theme.SizeNameScrollBarSmall:
		return 0
	case theme.SizeNameLineSpacing:
		if t.compactMode {
			return 0
		}
		return 2
	case theme.SizeNameText:
		return t.fontSize
	case theme.SizeNameSubHeadingText:
		return textSizeWithFloor(t.fontSize, 1, 10)
	case theme.SizeNameHeadingText:
		return textSizeWithFloor(t.fontSize, 4, 14)
	case theme.SizeNameCaptionText:
		return captionTextSize(t.fontSize, t.compactMode)
	default:
		return t.base().Size(name)
	}
}
