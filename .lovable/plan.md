## Mål
Förvandla den nuvarande Fyne-baserade Slack-klienten så att den matchar `Design Spark`-mocken: djupare bakgrund, ljusare typografi, en smal vänsterrail med workspace-ikon, en stilren kanalsidebar med badges, en topp-header med Single/Split/Cozy/Compact-knappar, samt en ny channel-header och meddelande-/composer-design. `Compact` blir default men `Cozy` finns som toggle.

## Vad ändras (i kod)

```text
gui/
├── palette.go         tokens utökade (rail, sidebar, badges, channel-tile, composer)
├── theme.go           djupare bakgrund #0f1118 / #16171e, sidebar-bg, brytpunkter
├── app.go             ny root-layout: workspace-rail | sidebar | main; topp-header
│                      med titel + Single/Split/Cozy/Compact + tema-toggle
├── workspace_rail.go  (NY) 56px-kolumn: workspace-tile + Home/Chat/Bell-ikoner
├── sidebar_ui.go      (NY) styling-helpers: section header med chevron,
│                      unread-pill (grå/röd/blå), "+ Add channel"-rad, DM-presence
├── channel_header.go  (NY) #-tile + namn + topic + 18-member-chip + search/info
├── message_view.go    avatar-tile (rounded square), mention-rad med
│                      amber left-bar + tinted bg, inline code som pill-chip,
│                      compact-spacing (3px) vs cozy (8px) padding
├── composer.go        (NY) formatterings-toolbar (B/I/S | link | emoji) +
│                      stor inputruta + primärblå send-knapp med pil
└── reaction_ui.go     små justeringar: chip-storlek följer compact/cozy
```

## Designtokens (palette.go)
```text
RailBG          #0a0c12
SidebarBG       #0f1118
SidebarHover    rgba(255,255,255,0.04)
SidebarSelBG    rgba(91,141,255,0.14)
SidebarSelText  #ffffff
SectionLabel    #6b7185           (uppercase, letter-spacing)
BadgeMutedBG    rgba(255,255,255,0.10)   text #c8cad1
BadgeMentionBG  #e0566b                  text #ffffff   (röd pill)
BadgeHighlightBG#3b82f6                  text #ffffff   (blå pill)
ChannelTileBG   rgba(167,139,250,0.18)   (lila # ikon-bakgrund)
ChannelTileFG   #a78bfa
ComposerBG      #1a1d28
ComposerBorder  rgba(255,255,255,0.06)
SendButtonBG    #3b82f6
SendButtonFG    #ffffff
PresenceOnline  #4ade80
MentionAmber    #f2c744  (left-bar + tonad amber-bakgrund för @mentions)
```

## Komponenter

**Workspace-rail (vänster, 56px)**
- Översta tile: rundad färgad square (gradient blå/lila) med workspace-initialer (`DS`), 40×40, hörnradie 10.
- Under: Home, Chats, Bell-ikoner som ghost-knappar. Aktiv ikon med ljus fyllning. Notifikationsprick på Bell.
- Längst ner: användar-avatar (`Yo`-tile).

**Sidebar (240–280px)**
- Header: `Acme Design` (bold) + `+`-knapp (kanal/DM-meny).
- Sökruta med ⌘K-hint, transparent bakgrund, hairline border.
- Snabbrader: Threads, Mentions, Drafts — med ikon, label och badge till höger.
- Sektionsrubriker med chevron (`v CHANNELS`) — klickbara för collapse, redan stöd via `sectionCollapsed`.
- Kanalrad: `#`-ikon (muted), namn, badge höger. Vald kanal = `SidebarSelBG` + fet text.
- DM-rad: avatar-tile + namn + presence-prick + ev. badge.
- `+ Add channel` som mjuk knapp längst ner i sektionen.

**Topp-header (hela appens topp, 44px)**
- Vänster: `Design Spark` (bold) + dimmed undertitel `Slack desktop client`.
- Höger: två segmenterade knappgrupper:
  - Layout: `Single | Split` (kopplas till befintlig `paneManager.setLayout`)
  - Densitet: `Cozy | Compact` (kopplas till `compactTheme.compactMode`)
- Längst höger: tema-toggle (sol/måne, kopplas till `appTheme.dark`).

**Channel-header**
- Stort `#`-tile 44×44 (`ChannelTileBG/FG`).
- Stack: kanalnamn (bold, 18pt) + topic (muted, en rad ellipsis).
- Höger: 18-member-chip, search-ikon, info-ikon. Allt hairline-pillar.

**Meddelande-rad**
- Avatar: 36×36 rundad square (radius 8), färgad gradient + initialer.
- Header: namn (bold) + tidsstämpel (muted, mindre). App-bot får en liten `APP`-badge.
- Brödtext: 14px (compact) / 15px (cozy), line-height 1.45.
- Inline `code`: pill, mono, `#1f222b` bg, 2px radius, 3px horiz padding.
- Mention-rad (om `MentionedMe`): 3px amber left-bar + svagt amber bg (`rgba(242,199,68,0.06)`).
- Compact-mode: 3px padding mellan rader; Cozy: 8px.
- Group-spacing mellan olika avsändare: 10px compact / 16px cozy.

**Composer (botten)**
- Wrapper med rundad bakgrund `ComposerBG`, hairline border, padding 8px.
- Toolbar-rad (top): B, I, S | länk | emoji — alla ikonknappar 22×22.
- Inputfält: multi-line, transparent bakgrund, placeholder `Message #design-spark`.
- Send-knapp: 32×32 fyrkant med radius 8, `SendButtonBG`, vit pil-ikon.

## Toggles & state
- `compactTheme.compactMode` styr densitet; toggle i topp-header skriver `a.appTheme.compactMode` och triggar `paneManager.refreshAll()`.
- Layout-toggle (Single/Split) kopplas till befintlig pane-logik (`a.showPaneSeparators` + ev. `paneManager.setSingleMode`).
- Tema-toggle växlar `a.appTheme.dark` och anropar `fyneApp.Settings().SetTheme`.
- Alla val sparas via befintlig `saveUIState`/`loadUIState`.

## Inte med i denna runda (medvetet)
- Faktisk implementation av Threads/Mentions/Drafts-vyer (rutan finns redan delvis — bara nytt visuellt skal).
- Faktisk formattering i composern (B/I/S-knapparna wrappar markdown men ingen rich-text-engine byggs).
- Workspace-switcher (railen visar bara aktuell workspace).

## Validering
- `go vet ./...` och `go test ./...` ska vara gröna.
- Manuell rök-test: bygg, öppna kanal, växla Cozy/Compact, växla tema, posta meddelande, reagera.
