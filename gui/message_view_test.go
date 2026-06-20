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
