package api

import (
	"encoding/json"
	"testing"
)

func TestRenderBlocksPrefersSlackDisplayContent(t *testing.T) {
	blocks := []json.RawMessage{
		json.RawMessage(`{"type":"section","text":{"type":"mrkdwn","text":"hello <https://example.com|site>"}}`),
		json.RawMessage(`{"type":"rich_text","elements":[{"type":"rich_text_section","elements":[{"type":"text","text":"wave "},{"type":"emoji","name":"wave"},{"type":"user","user_id":"U123"}]}]}`),
	}

	got := renderBlocks(blocks)
	want := "hello <https://example.com|site>\nwave :wave:<@U123>"
	if got != want {
		t.Fatalf("renderBlocks() = %q, want %q", got, want)
	}
}

func TestAttachmentsBecomeCardsAndInlineImages(t *testing.T) {
	attachments := []rawAttachment{
		{
			Color:      "#36a64f",
			AuthorName: "Build bot",
			Title:      "Deploy",
			TitleLink:  "https://example.com/deploy",
			Text:       "Ready",
			Footer:     "CI",
			ImageURL:   "https://example.com/preview.png",
		},
	}

	cards := attachmentsToCards(attachments)
	if len(cards) != 1 {
		t.Fatalf("cards len = %d, want 1", len(cards))
	}
	if cards[0].Author != "Build bot" || cards[0].Title != "Deploy" || cards[0].Body != "Ready" {
		t.Fatalf("unexpected card: %#v", cards[0])
	}

	images := attachmentInlineImages(attachments)
	if len(images) != 1 {
		t.Fatalf("images len = %d, want 1", len(images))
	}
	if images[0].URL != "https://example.com/preview.png" || images[0].Name != "Deploy" {
		t.Fatalf("unexpected image: %#v", images[0])
	}
}
