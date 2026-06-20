package gui

import "testing"

func TestResolveReactionUnicodeUsesSlackShortNames(t *testing.T) {
	tests := map[string]string{
		"+1":           "\U0001F44D",
		"thumbsup":     "\U0001F44D",
		"shaking_face": "\U0001FAE8",
	}

	for name, want := range tests {
		got, ok := resolveReactionUnicode(name)
		if !ok {
			t.Fatalf("resolveReactionUnicode(%q) not found", name)
		}
		if got != want {
			t.Fatalf("resolveReactionUnicode(%q) = %q, want %q", name, got, want)
		}
	}
}

func TestMessageMentionsUser(t *testing.T) {
	if !messageMentionsUser("hello <@U123|stefan>", "U123") {
		t.Fatal("expected Slack display mention to match")
	}
	if messageMentionsUser("hello <@U999>", "U123") {
		t.Fatal("unexpected mention match")
	}
}

func TestRenderSlackTextDecodesHTMLEntities(t *testing.T) {
	got := renderSlackText(`Tom &amp; Jerry &quot;quote&quot; &#39;ok&#39; &nbsp; &lt;@U123|stefan&gt;`)
	want := `Tom & Jerry "quote" 'ok'   @stefan`
	if got != want {
		t.Fatalf("renderSlackText() = %q, want %q", got, want)
	}
}

func TestRenderSlackTextSpecialTokensUseFallback(t *testing.T) {
	tests := map[string]string{
		"<!here>":                                "@here",
		"<!date^1700000000^{date_short}|Nov 14>": "Nov 14",
		"<!subteam^S123|@frontend>":              "@frontend",
	}
	for input, want := range tests {
		if got := renderSlackText(input); got != want {
			t.Fatalf("renderSlackText(%q) = %q, want %q", input, got, want)
		}
	}
}

func TestRenderSlackTextNoEmojiUsesSameEntityDecoding(t *testing.T) {
	got := renderSlackTextNoEmoji(`&lt;https://example.com|site&gt; &quot;x&quot;`)
	want := `site "x"`
	if got != want {
		t.Fatalf("renderSlackTextNoEmoji() = %q, want %q", got, want)
	}
}
