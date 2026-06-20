package api

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

const defaultBaseURL = "https://slack.com/api"

type Client struct {
	token   string
	baseURL string
	http    *http.Client
}

type AuthInfo struct {
	UserID   string
	UserName string
	TeamName string
}

type UserInfo struct {
	ID          string
	Username    string
	DisplayName string
	RealName    string
	IsBot       bool
	IsAppUser   bool
}

type Channel struct {
	ID          string
	Name        string
	DisplayName string
	UserID      string
	IsPrivate   bool
	IsMember    bool
	IsIM        bool
	IsMPIM      bool
	UnreadCount int
	HasUnread   bool
	LastReadTS  string
	LatestTS    string
}

type File struct {
	ID                 string
	Name               string
	MimeType           string
	FileType           string
	URLPrivate         string
	URLPrivateDownload string
	Thumb360           string
	Thumb480           string
	Thumb720           string
	Thumb800           string
	Thumb960           string
	Thumb1024          string
	IsExternal         bool
	Permalink          string
	PermalinkPublic    string
}

func (f File) BestImageURL() string {
	for _, u := range []string{f.Thumb480, f.Thumb360, f.Thumb720, f.Thumb800, f.Thumb960, f.Thumb1024, f.URLPrivate, f.URLPrivateDownload} {
		if strings.TrimSpace(u) != "" {
			return u
		}
	}
	return ""
}

func (f File) BestDownloadURL() string {
	if strings.TrimSpace(f.URLPrivate) != "" {
		return f.URLPrivate
	}
	if strings.TrimSpace(f.URLPrivateDownload) != "" {
		return f.URLPrivateDownload
	}
	return ""
}

func (f File) IsImage() bool {
	m := strings.ToLower(strings.TrimSpace(f.MimeType))
	return strings.HasPrefix(m, "image/")
}

type AttachmentCard struct {
	Color     string
	Author    string
	Title     string
	TitleLink string
	Pretext   string
	Body      string
	Footer    string
}

type InlineImage struct {
	URL  string
	Name string
}

type Message struct {
	TS            string
	ThreadTS      string
	UserID        string
	Username      string
	Text          string
	ForwardedText string
	BotID         string
	Subtype       string
	Time          time.Time
	Files         []File
	Cards         []AttachmentCard
	InlineImages  []InlineImage
	MentionedMe   bool
	ReplyCount    int
	Reactions     []Reaction
}

type Reaction struct {
	Name  string
	Count int
	Users []string
}

type slackEnvelope struct {
	OK    bool   `json:"ok"`
	Error string `json:"error,omitempty"`
}

func NewClient(token, baseURL string) *Client {
	base := strings.TrimRight(strings.TrimSpace(baseURL), "/")
	if base == "" {
		base = defaultBaseURL
	}
	return &Client{
		token:   strings.TrimSpace(token),
		baseURL: base,
		http:    &http.Client{Timeout: 25 * time.Second},
	}
}

func (c *Client) AuthTest() (*AuthInfo, error) {
	var out struct {
		slackEnvelope
		UserID string `json:"user_id"`
		User   string `json:"user"`
		Team   string `json:"team"`
	}
	if err := c.postForm("auth.test", nil, &out); err != nil {
		return nil, err
	}
	return &AuthInfo{UserID: out.UserID, UserName: out.User, TeamName: out.Team}, nil
}

func (c *Client) ListChannels(limit int) ([]Channel, error) {
	if limit <= 0 {
		limit = 200
	}
	var channels []Channel
	cursor := ""
	for {
		form := url.Values{}
		form.Set("limit", strconv.Itoa(limit))
		form.Set("types", "public_channel,private_channel,mpim,im")
		form.Set("exclude_archived", "true")
		if cursor != "" {
			form.Set("cursor", cursor)
		}
		var out struct {
			slackEnvelope
			Channels []struct {
				ID                 string `json:"id"`
				Name               string `json:"name"`
				User               string `json:"user"`
				IsPrivate          bool   `json:"is_private"`
				IsMember           bool   `json:"is_member"`
				IsIM               bool   `json:"is_im"`
				IsMPIM             bool   `json:"is_mpim"`
				UnreadCountDisplay int    `json:"unread_count_display"`
				HasUnreads         bool   `json:"has_unreads"`
				LastRead           string `json:"last_read"`
				Latest             string `json:"latest"`
			} `json:"channels"`
			ResponseMetadata struct {
				NextCursor string `json:"next_cursor"`
			} `json:"response_metadata"`
		}
		if err := c.postForm("conversations.list", form, &out); err != nil {
			return nil, err
		}
		for _, ch := range out.Channels {
			channels = append(channels, Channel{
				ID:          ch.ID,
				Name:        ch.Name,
				DisplayName: ch.Name,
				UserID:      ch.User,
				IsPrivate:   ch.IsPrivate,
				IsMember:    ch.IsMember,
				IsIM:        ch.IsIM,
				IsMPIM:      ch.IsMPIM,
				UnreadCount: ch.UnreadCountDisplay,
				HasUnread:   ch.HasUnreads || ch.UnreadCountDisplay > 0,
				LastReadTS:  ch.LastRead,
				LatestTS:    ch.Latest,
			})
		}
		cursor = strings.TrimSpace(out.ResponseMetadata.NextCursor)
		if cursor == "" {
			break
		}
	}
	return channels, nil
}

func (c *Client) ConversationMembers(channelID string) ([]string, error) {
	form := url.Values{}
	form.Set("channel", channelID)
	form.Set("limit", "200")
	var out struct {
		slackEnvelope
		Members []string `json:"members"`
	}
	if err := c.postForm("conversations.members", form, &out); err != nil {
		return nil, err
	}
	return out.Members, nil
}

func (c *Client) UserMap() (map[string]string, error) {
	users := make(map[string]string)
	cursor := ""
	for {
		form := url.Values{}
		form.Set("limit", "200")
		if cursor != "" {
			form.Set("cursor", cursor)
		}
		var out struct {
			slackEnvelope
			Members []struct {
				ID        string `json:"id"`
				Deleted   bool   `json:"deleted"`
				Name      string `json:"name"`
				IsBot     bool   `json:"is_bot"`
				IsAppUser bool   `json:"is_app_user"`
				Profile   struct {
					DisplayName string `json:"display_name"`
					RealName    string `json:"real_name"`
				} `json:"profile"`
			} `json:"members"`
			ResponseMetadata struct {
				NextCursor string `json:"next_cursor"`
			} `json:"response_metadata"`
		}
		if err := c.postForm("users.list", form, &out); err != nil {
			return nil, err
		}
		for _, m := range out.Members {
			if strings.TrimSpace(m.ID) == "" || m.Deleted {
				continue
			}
			name := strings.TrimSpace(m.Profile.DisplayName)
			if name == "" {
				name = strings.TrimSpace(m.Profile.RealName)
			}
			if name == "" {
				name = strings.TrimSpace(m.Name)
			}
			if name == "" {
				name = m.ID
			}
			users[m.ID] = name
		}
		cursor = strings.TrimSpace(out.ResponseMetadata.NextCursor)
		if cursor == "" {
			break
		}
	}
	return users, nil
}

func (c *Client) UserDirectory() ([]UserInfo, error) {
	var users []UserInfo
	cursor := ""
	for {
		form := url.Values{}
		form.Set("limit", "200")
		if cursor != "" {
			form.Set("cursor", cursor)
		}
		var out struct {
			slackEnvelope
			Members []struct {
				ID        string `json:"id"`
				Deleted   bool   `json:"deleted"`
				Name      string `json:"name"`
				IsBot     bool   `json:"is_bot"`
				IsAppUser bool   `json:"is_app_user"`
				Profile   struct {
					DisplayName string `json:"display_name"`
					RealName    string `json:"real_name"`
				} `json:"profile"`
			} `json:"members"`
			ResponseMetadata struct {
				NextCursor string `json:"next_cursor"`
			} `json:"response_metadata"`
		}
		if err := c.postForm("users.list", form, &out); err != nil {
			return nil, err
		}
		for _, m := range out.Members {
			if strings.TrimSpace(m.ID) == "" || m.Deleted {
				continue
			}
			users = append(users, UserInfo{
				ID:          m.ID,
				Username:    strings.TrimSpace(m.Name),
				DisplayName: strings.TrimSpace(m.Profile.DisplayName),
				RealName:    strings.TrimSpace(m.Profile.RealName),
				IsBot:       m.IsBot,
				IsAppUser:   m.IsAppUser,
			})
		}
		cursor = strings.TrimSpace(out.ResponseMetadata.NextCursor)
		if cursor == "" {
			break
		}
	}
	return users, nil
}

func (c *Client) UserInfo(userID string) (*UserInfo, error) {
	uid := strings.TrimSpace(userID)
	if uid == "" {
		return nil, fmt.Errorf("missing userID")
	}
	form := url.Values{}
	form.Set("user", uid)
	var out struct {
		slackEnvelope
		User struct {
			ID        string `json:"id"`
			Name      string `json:"name"`
			IsBot     bool   `json:"is_bot"`
			IsAppUser bool   `json:"is_app_user"`
			Profile   struct {
				DisplayName string `json:"display_name"`
				RealName    string `json:"real_name"`
			} `json:"profile"`
		} `json:"user"`
	}
	if err := c.postForm("users.info", form, &out); err != nil {
		return nil, err
	}
	return &UserInfo{
		ID:          strings.TrimSpace(out.User.ID),
		Username:    strings.TrimSpace(out.User.Name),
		DisplayName: strings.TrimSpace(out.User.Profile.DisplayName),
		RealName:    strings.TrimSpace(out.User.Profile.RealName),
		IsBot:       out.User.IsBot,
		IsAppUser:   out.User.IsAppUser,
	}, nil
}

func (c *Client) EmojiList() (map[string]string, error) {
	var out struct {
		slackEnvelope
		Emoji map[string]string `json:"emoji"`
	}
	if err := c.postForm("emoji.list", nil, &out); err != nil {
		return nil, err
	}
	if out.Emoji == nil {
		return map[string]string{}, nil
	}
	return out.Emoji, nil
}

func (c *Client) ChannelHistory(channelID string, limit int, userMap map[string]string) ([]Message, error) {
	if limit <= 0 {
		limit = 80
	}
	form := url.Values{}
	form.Set("channel", channelID)
	form.Set("limit", strconv.Itoa(limit))
	var out struct {
		slackEnvelope
		Messages []rawMessage `json:"messages"`
	}
	if err := c.postForm("conversations.history", form, &out); err != nil {
		return nil, err
	}
	msgs := make([]Message, 0, len(out.Messages))
	for i := len(out.Messages) - 1; i >= 0; i-- {
		m, ok := out.Messages[i].toMessage(userMap)
		if !ok {
			continue
		}
		msgs = append(msgs, m)
	}
	return msgs, nil
}

func (c *Client) ThreadReplies(channelID, threadTS string, limit int, userMap map[string]string) ([]Message, error) {
	if strings.TrimSpace(threadTS) == "" {
		return nil, nil
	}
	if limit <= 0 {
		limit = 80
	}
	form := url.Values{}
	form.Set("channel", channelID)
	form.Set("ts", threadTS)
	form.Set("limit", strconv.Itoa(limit))
	var out struct {
		slackEnvelope
		Messages []rawMessage `json:"messages"`
	}
	if err := c.postForm("conversations.replies", form, &out); err != nil {
		return nil, err
	}
	msgs := make([]Message, 0, len(out.Messages))
	for _, rm := range out.Messages {
		m, ok := rm.toMessage(userMap)
		if !ok {
			continue
		}
		msgs = append(msgs, m)
	}
	return msgs, nil
}

func (c *Client) PostMessage(channelID, text, threadTS string) error {
	form := url.Values{}
	form.Set("channel", channelID)
	form.Set("text", text)
	if strings.TrimSpace(threadTS) != "" {
		form.Set("thread_ts", threadTS)
	}
	var out slackEnvelope
	return c.postForm("chat.postMessage", form, &out)
}

func (c *Client) AddReaction(channelID, timestamp, name string) error {
	form := url.Values{}
	form.Set("channel", channelID)
	form.Set("timestamp", timestamp)
	form.Set("name", strings.Trim(strings.TrimSpace(name), ":"))
	var out slackEnvelope
	return c.postForm("reactions.add", form, &out)
}

func (c *Client) OpenSocketModeURL(appToken string) (string, error) {
	tok := strings.TrimSpace(appToken)
	if tok == "" {
		return "", fmt.Errorf("missing Slack app token")
	}
	var out struct {
		slackEnvelope
		URL string `json:"url"`
	}
	if err := c.postFormWithToken("apps.connections.open", nil, tok, &out); err != nil {
		return "", err
	}
	url := strings.TrimSpace(out.URL)
	if url == "" {
		return "", fmt.Errorf("apps.connections.open returned empty url")
	}
	return url, nil
}

func (c *Client) RTMConnectURL() (string, error) {
	var out struct {
		slackEnvelope
		URL string `json:"url"`
	}
	if err := c.postForm("rtm.connect", nil, &out); err != nil {
		return "", err
	}
	url := strings.TrimSpace(out.URL)
	if url == "" {
		return "", fmt.Errorf("rtm.connect returned empty url")
	}
	return url, nil
}

func (c *Client) FetchPrivateURL(rawURL string) ([]byte, string, error) {
	u := strings.TrimSpace(rawURL)
	if u == "" {
		return nil, "", fmt.Errorf("empty file url")
	}
	req, err := http.NewRequest(http.MethodGet, u, nil)
	if err != nil {
		return nil, "", err
	}
	req.Header.Set("Authorization", "Bearer "+c.token)
	resp, err := c.http.Do(req)
	if err != nil {
		return nil, "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, "", fmt.Errorf("fetch media status %d", resp.StatusCode)
	}
	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, "", err
	}
	return data, resp.Header.Get("Content-Type"), nil
}

func (c *Client) postForm(method string, form url.Values, out any) error {
	return c.postFormWithToken(method, form, c.token, out)
}

func (c *Client) postFormWithToken(method string, form url.Values, token string, out any) error {
	tok := strings.TrimSpace(token)
	if tok == "" {
		return fmt.Errorf("missing Slack token")
	}
	if form == nil {
		form = url.Values{}
	}
	req, err := http.NewRequest(http.MethodPost, c.baseURL+"/"+method, strings.NewReader(form.Encode()))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+tok)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")
	resp, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("slack api %s: status %d", method, resp.StatusCode)
	}
	if err := json.NewDecoder(resp.Body).Decode(out); err != nil {
		return err
	}
	raw, _ := json.Marshal(out)
	var probe slackEnvelope
	if err := json.Unmarshal(raw, &probe); err == nil && !probe.OK {
		if probe.Error == "" {
			probe.Error = "unknown_slack_error"
		}
		return fmt.Errorf("slack api %s: %s", method, probe.Error)
	}
	return nil
}

type rawMessage struct {
	Type        string            `json:"type"`
	User        string            `json:"user"`
	Username    string            `json:"username"`
	Text        string            `json:"text"`
	TS          string            `json:"ts"`
	BotID       string            `json:"bot_id"`
	Subtype     string            `json:"subtype"`
	ThreadTS    string            `json:"thread_ts"`
	ReplyCount  int               `json:"reply_count"`
	Blocks      []json.RawMessage `json:"blocks"`
	UserProfile struct {
		DisplayName string `json:"display_name"`
		RealName    string `json:"real_name"`
		Name        string `json:"name"`
	} `json:"user_profile"`
	BotProfile struct {
		Name string `json:"name"`
	} `json:"bot_profile"`
	Files       []rawFile       `json:"files"`
	Attachments []rawAttachment `json:"attachments"`
	Reactions   []struct {
		Name  string   `json:"name"`
		Count int      `json:"count"`
		Users []string `json:"users"`
	} `json:"reactions"`
}

type rawFile struct {
	ID                 string `json:"id"`
	Name               string `json:"name"`
	MimeType           string `json:"mimetype"`
	FileType           string `json:"filetype"`
	URLPrivate         string `json:"url_private"`
	URLPrivateDownload string `json:"url_private_download"`
	Thumb360           string `json:"thumb_360"`
	Thumb480           string `json:"thumb_480"`
	Thumb720           string `json:"thumb_720"`
	Thumb800           string `json:"thumb_800"`
	Thumb960           string `json:"thumb_960"`
	Thumb1024          string `json:"thumb_1024"`
	IsExternal         bool   `json:"is_external"`
	Permalink          string `json:"permalink"`
	PermalinkPublic    string `json:"permalink_public"`
}

type rawAttachment struct {
	Text       string            `json:"text"`
	Pretext    string            `json:"pretext"`
	Fallback   string            `json:"fallback"`
	Title      string            `json:"title"`
	TitleLink  string            `json:"title_link"`
	AuthorName string            `json:"author_name"`
	Color      string            `json:"color"`
	Footer     string            `json:"footer"`
	ImageURL   string            `json:"image_url"`
	Blocks     []json.RawMessage `json:"blocks"`
}

func (rm rawMessage) toMessage(userMap map[string]string) (Message, bool) {
	if strings.TrimSpace(rm.TS) == "" {
		return Message{}, false
	}
	username := ""
	if userMap != nil {
		username = userMap[rm.User]
	}
	if strings.TrimSpace(username) == "" {
		username = strings.TrimSpace(rm.UserProfile.DisplayName)
	}
	if strings.TrimSpace(username) == "" {
		username = strings.TrimSpace(rm.UserProfile.RealName)
	}
	if strings.TrimSpace(username) == "" {
		username = strings.TrimSpace(rm.UserProfile.Name)
	}
	if strings.TrimSpace(username) == "" {
		username = strings.TrimSpace(rm.Username)
	}
	if strings.TrimSpace(username) == "" {
		username = strings.TrimSpace(rm.BotProfile.Name)
	}
	files := make([]File, 0, len(rm.Files))
	for _, f := range rm.Files {
		files = append(files, File{
			ID:                 f.ID,
			Name:               f.Name,
			MimeType:           f.MimeType,
			FileType:           f.FileType,
			URLPrivate:         f.URLPrivate,
			URLPrivateDownload: f.URLPrivateDownload,
			Thumb360:           f.Thumb360,
			Thumb480:           f.Thumb480,
			Thumb720:           f.Thumb720,
			Thumb800:           f.Thumb800,
			Thumb960:           f.Thumb960,
			Thumb1024:          f.Thumb1024,
			IsExternal:         f.IsExternal,
			Permalink:          f.Permalink,
			PermalinkPublic:    f.PermalinkPublic,
		})
	}
	reactions := make([]Reaction, 0, len(rm.Reactions))
	for _, r := range rm.Reactions {
		name := strings.TrimSpace(r.Name)
		if name == "" {
			continue
		}
		users := make([]string, 0, len(r.Users))
		for _, u := range r.Users {
			u = strings.TrimSpace(u)
			if u == "" {
				continue
			}
			users = append(users, u)
		}
		reactions = append(reactions, Reaction{Name: name, Count: r.Count, Users: users})
	}
	text := renderBlocks(rm.Blocks)
	if strings.TrimSpace(text) == "" {
		text = rm.Text
	}
	cards := attachmentsToCards(rm.Attachments)
	inlineImages := attachmentInlineImages(rm.Attachments)
	forwarded := ""
	if len(cards) == 0 && len(inlineImages) == 0 {
		forwarded = extractForwardedText(rm.Attachments)
	}
	return Message{
		TS:            rm.TS,
		ThreadTS:      rm.ThreadTS,
		UserID:        rm.User,
		Username:      username,
		Text:          text,
		ForwardedText: forwarded,
		BotID:         rm.BotID,
		Subtype:       rm.Subtype,
		Time:          ParseSlackTS(rm.TS),
		Files:         files,
		Cards:         cards,
		InlineImages:  inlineImages,
		ReplyCount:    rm.ReplyCount,
		Reactions:     reactions,
	}, true
}

func renderBlocks(blocks []json.RawMessage) string {
	var out []string
	for _, raw := range blocks {
		var block map[string]any
		if err := json.Unmarshal(raw, &block); err != nil {
			continue
		}
		switch getString(block, "type") {
		case "section":
			if text := renderTextObject(block["text"]); text != "" {
				out = append(out, text)
			}
			for _, field := range getSlice(block, "fields") {
				if text := renderTextObject(field); text != "" {
					out = append(out, text)
				}
			}
		case "header":
			if text := renderTextObject(block["text"]); text != "" {
				out = append(out, "*"+text+"*")
			}
		case "context":
			var parts []string
			for _, el := range getSlice(block, "elements") {
				if text := renderTextObject(el); text != "" {
					parts = append(parts, text)
				}
			}
			if len(parts) > 0 {
				out = append(out, strings.Join(parts, " · "))
			}
		case "divider":
			out = append(out, "-----")
		case "image":
			var parts []string
			if title := renderTextObject(block["title"]); title != "" {
				parts = append(parts, title)
			}
			if alt := getString(block, "alt_text"); alt != "" {
				parts = append(parts, alt)
			}
			if imageURL := getString(block, "image_url"); imageURL != "" {
				parts = append(parts, "<"+imageURL+">")
			}
			if len(parts) > 0 {
				out = append(out, "[image] "+strings.Join(parts, " - "))
			}
		case "rich_text":
			if text := renderRichTextBlocks(getSlice(block, "elements")); text != "" {
				out = append(out, text)
			}
		}
	}
	return strings.Join(out, "\n")
}

func renderTextObject(v any) string {
	m, ok := v.(map[string]any)
	if !ok {
		return ""
	}
	return strings.TrimSpace(getString(m, "text"))
}

func renderRichTextBlocks(blocks []any) string {
	var out []string
	for _, raw := range blocks {
		block, ok := raw.(map[string]any)
		if !ok {
			continue
		}
		switch getString(block, "type") {
		case "rich_text_section":
			if s := renderRichTextElements(getSlice(block, "elements")); s != "" {
				out = append(out, s)
			}
		case "rich_text_list":
			style := getString(block, "style")
			for i, item := range getSlice(block, "elements") {
				prefix := "- "
				if style == "ordered" {
					prefix = strconv.Itoa(i+1) + ". "
				}
				if section, ok := item.(map[string]any); ok {
					if s := renderRichTextElements(getSlice(section, "elements")); s != "" {
						out = append(out, prefix+s)
					}
				}
			}
		case "rich_text_quote":
			if s := renderRichTextElements(getSlice(block, "elements")); s != "" {
				for _, line := range strings.Split(s, "\n") {
					out = append(out, "> "+line)
				}
			}
		case "rich_text_preformatted":
			if s := renderRichTextElements(getSlice(block, "elements")); s != "" {
				out = append(out, "```\n"+s+"\n```")
			}
		}
	}
	return strings.Join(out, "\n")
}

func renderRichTextElements(elements []any) string {
	var b strings.Builder
	for _, raw := range elements {
		el, ok := raw.(map[string]any)
		if !ok {
			continue
		}
		switch getString(el, "type") {
		case "text":
			text := getRawString(el, "text")
			if style, ok := el["style"].(map[string]any); ok {
				if getBool(style, "code") {
					text = "`" + text + "`"
				}
				if getBool(style, "bold") {
					text = "*" + text + "*"
				}
				if getBool(style, "italic") {
					text = "_" + text + "_"
				}
				if getBool(style, "strike") {
					text = "~" + text + "~"
				}
			}
			b.WriteString(text)
		case "link":
			url := getString(el, "url")
			if label := getString(el, "text"); label != "" {
				b.WriteString("<" + url + "|" + label + ">")
			} else if url != "" {
				b.WriteString("<" + url + ">")
			}
		case "emoji":
			if name := getString(el, "name"); name != "" {
				b.WriteString(":" + name + ":")
			}
		case "user":
			if id := getString(el, "user_id"); id != "" {
				b.WriteString("<@" + id + ">")
			}
		case "channel":
			if id := getString(el, "channel_id"); id != "" {
				b.WriteString("<#" + id + ">")
			}
		case "usergroup":
			if id := getString(el, "usergroup_id"); id != "" {
				b.WriteString("<!subteam^" + id + ">")
			}
		case "broadcast":
			if r := getString(el, "range"); r != "" {
				b.WriteString("<!" + r + ">")
			}
		}
	}
	return b.String()
}

func attachmentsToCards(attachments []rawAttachment) []AttachmentCard {
	out := make([]AttachmentCard, 0, len(attachments))
	for _, att := range attachments {
		body := renderBlocks(att.Blocks)
		if strings.TrimSpace(body) == "" {
			body = strings.TrimSpace(att.Text)
		}
		if strings.TrimSpace(body) == "" {
			body = trimFallback(att.Fallback)
		}
		card := AttachmentCard{
			Color:     strings.TrimSpace(att.Color),
			Author:    strings.TrimSpace(att.AuthorName),
			Title:     strings.TrimSpace(att.Title),
			TitleLink: strings.TrimSpace(att.TitleLink),
			Pretext:   strings.TrimSpace(att.Pretext),
			Body:      strings.TrimSpace(body),
			Footer:    strings.TrimSpace(att.Footer),
		}
		if card.Author == "" && card.Title == "" && card.Pretext == "" && card.Body == "" && card.Footer == "" {
			continue
		}
		out = append(out, card)
	}
	return out
}

func attachmentInlineImages(attachments []rawAttachment) []InlineImage {
	out := make([]InlineImage, 0, len(attachments))
	for _, att := range attachments {
		u := strings.TrimSpace(att.ImageURL)
		if u == "" {
			continue
		}
		name := strings.TrimSpace(att.Title)
		if name == "" {
			name = "image"
		}
		out = append(out, InlineImage{URL: u, Name: name})
	}
	return out
}

func trimFallback(s string) string {
	s = strings.TrimSpace(s)
	if len([]rune(s)) <= 400 {
		return s
	}
	r := []rune(s)
	return string(r[:400]) + "..."
}

func getString(m map[string]any, key string) string {
	return strings.TrimSpace(getRawString(m, key))
}

func getRawString(m map[string]any, key string) string {
	s, _ := m[key].(string)
	return s
}

func getBool(m map[string]any, key string) bool {
	b, _ := m[key].(bool)
	return b
}

func getSlice(m map[string]any, key string) []any {
	s, _ := m[key].([]any)
	return s
}

func extractForwardedText(attachments []rawAttachment) string {
	for _, att := range attachments {
		for _, candidate := range []string{att.Text, att.Pretext, att.Fallback, att.Title} {
			if s := strings.TrimSpace(candidate); s != "" {
				return s
			}
		}
	}
	return ""
}

// ParseSlackTS parses a Slack timestamp string into a time.Time.
// Returns time.Now() if the string is empty or malformed (safe default for message timestamps).
func ParseSlackTS(ts string) time.Time {
	t, ok := parseSlackTSInner(ts)
	if !ok {
		return time.Now()
	}
	return t
}

// ParseSlackTSOrZero parses a Slack timestamp string into a time.Time.
// Returns time.Time{} if the string is empty or malformed (suitable for sorting/comparison).
func ParseSlackTSOrZero(ts string) time.Time {
	t, ok := parseSlackTSInner(ts)
	if !ok {
		return time.Time{}
	}
	return t
}

func parseSlackTSInner(ts string) (time.Time, bool) {
	parts := strings.SplitN(strings.TrimSpace(ts), ".", 2)
	if len(parts) == 0 || parts[0] == "" {
		return time.Time{}, false
	}
	sec, err := strconv.ParseInt(parts[0], 10, 64)
	if err != nil {
		return time.Time{}, false
	}
	nsec := int64(0)
	if len(parts) == 2 && parts[1] != "" {
		frac := parts[1]
		if len(frac) > 9 {
			frac = frac[:9]
		}
		for len(frac) < 9 {
			frac += "0"
		}
		nsec, _ = strconv.ParseInt(frac, 10, 64)
	}
	return time.Unix(sec, nsec), true
}
