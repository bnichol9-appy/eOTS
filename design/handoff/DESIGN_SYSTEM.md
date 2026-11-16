# Design system: Trick or Tinsel

**Concept:** the elves are cheeky night-shift mischief-makers. Halloween's playful spookiness is applied to Christmas: torchlight, moons, ghost stories, a pumpkin-orange accent. The default theme is a **light, warm, festive** one (cream background, deep violet text, orange and pine green, a small bauble-and-star garland above the logo). Dark mode is the original "after midnight" palette.

## Colour (see `tokens.json`)

| Role | Light | Dark | Use |
|---|---|---|---|
| bg | #FBF5EA | #17122B | Screen background |
| surface | #F3E9D8 | #241C40 | Stat tiles, cards, inputs, segmented controls |
| line | #E3D6C0 | #3A3060 | Borders, dividers, empty progress |
| dash | #C9B9A0 | #5A4E85 | Dashed borders for future or planned items |
| text | #241A3D | #F4EBD0 | Headings and main text |
| body | #3D3358 | #D9D1E6 | Body copy |
| muted | #6B5F86 | #B9AFCF | Small labels, metadata, inactive tabs |
| accent | #FF8A3D | #FF8A3D | Main buttons, today's date, elf 1 — **backgrounds only** |
| onAccent | #17122B | #17122B | Text and icons on the accent colour |
| accentText | #A4470B | #FF8A3D | Accent as a text colour: active tab, links, counts |
| pine | #2F7A5B | #9BE3A8 | Elf 2, assistant/messaging actions, "Duo night" badge |

**Contrast:** every text/background pair above passes WCAG AA (4.5:1). Don't put `muted` text on `line`.

**Elf colours:** elf 1 is accent, elf 2 is pine, elf 3 is #C9A7FF. Each elf keeps its colour on its avatar, its photo pin, its calendar dot and its kit-item tags.

## Type

- **Display:** Gloock 400. Used for screen titles (32), idea titles (30), sheet titles (26), card titles (20) and the brand mark (24).
- **Body:** DM Sans in weights 400, 500 and 700. Sizes: body text 15/1.45, small text 13, buttons 15/700.
- **Eyebrow labels:** 12px, uppercase, 2px letter spacing, `muted`. For example "NIGHT 12 · KITCHEN".
- **Line breaks:** idea titles break by hand over two lines when long.

## Layout

- **Phone frame:** 390×844. The screen has 22px padding on each side.
- **Bottom area:** pinned. It holds the main action row (52px buttons) and the tab bar (four tabs; icon 22 plus an 11px label; the active tab is `accentText` and bold).
- **Main actions:**
  - Main button: full rounded pill, accent background.
  - Secondary button: pill with a 1px `line` border.
  - Pairs sit side by side in a 1:2 ratio, secondary on the left.
- **Stat tiles:** three in a row with an 8px gap, on `surface` with a 14px radius. Each has a meta label above a bold value.

## Components

- **ElfAvatar:** a circle (22 small, 28 medium, 32 large) in the elf's colour, showing the elf's initial in bold. Where two overlap they're offset by -10px and have a 2px `bg` ring.
- **Photo pin:** a pill 30px high. The elf's avatar sits on the left, inverted, with the spot label beside it. Numbered pins (28px circles) are used while reviewing a room scan. An **unsafe** pin is an outlined circle with an X.
- **Date strip:** five equal cells. Past dates in `muted`, today filled with accent, future dates with a dashed border.
- **Calendar cell:** 58px high, 12px radius, with the date number, a dot per elf (6px) and a room tag (8px, uppercase). Done nights are `surface` with `muted` text. Tonight is filled accent. Planned nights have a dashed `dash` border. Big nights have a 1.5px solid `text` outline. The selected day is filled `line`.
- **Chip / filter:** 40–44px high, pill shaped. When on: accent background with onAccent bold text. When off: 1px `line` border.
- **Segmented control:** a `surface` track with 4px padding. The selected segment is filled `bg` with a small shadow.
- **Checklist row:** at least 44px high with a 22px checkbox (colour `#E0701F`) and a 1px `line` divider. A "Buy" tag is a small accent pill.
- **Bottom sheet:** 28px top radius, a 40×5 grab handle, over a `scrim`.
- **Assistant message preview:** an outgoing chat bubble on `pine` with `bg` text, radius 18/18/4/18, text wrapping as `pre-line`.
- **Garland (light theme):** a 120×12 SVG strip of a curved line with alternating accent baubles and pine stars, placed above the brand mark on Tonight only.

## Motion (recommended; not in the static designs)

- **Mark as set up:** a moon-to-check morph lasting 300ms, plus a light haptic.
- **Shuffle:** the idea card flips (cross-fades) over 250ms.
- **Bottom sheet:** slides up over 280ms with ease-out.
- **Theme switch:** cross-fades over 200ms.
- **Reduced motion:** if the phone's reduce-motion setting is on, use plain fades.

## Voice

The tone is warm, cheeky and a little spooky, never scary. Speak to a tired parent plainly ("Most time you'll give it at 11pm"). Give the elves personalities (Pip is the storyteller, Moss is the scaredy-cat), and let the comedy come from how they play off each other.
