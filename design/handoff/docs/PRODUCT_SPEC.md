# Product spec: Trick or Tinsel

## 1. Problem and promise

Parents run out of Elf-on-the-Shelf ideas by around night 5, and they do the set-up late at night when they're tired. The app gives them **one ready-to-go idea per night**:

- It fits **their own rooms**, their **kids' ages**, how **spooky** they want it and how much **time** they have.
- It tells them what they'll need **days in advance**.
- It can pass the shopping and reminders to their AI assistant.

## 2. Users and context

- **Main user:** a parent, using the app from about 9pm to midnight, often one-handed and in the dark.
- **Households:** one or more children, with ages from under 5 up to 12. They have **one to three elves**; the designs show two (Pip and Moss).
- **Season:** usually 1 to 24 December. Both the start date and the end date can be changed.

## 3. Screens (see `design/screens` and `design/screenshots`)

| # | Screen | Purpose | Key elements |
|---|---|---|---|
| 01 | Onboarding (4 steps; step 2 shown) | Set up the household | Elf names (add up to 3), kids' age bands (choose several), a 5-step spook dial, a time limit per night (5/10/20 min). The other steps: 1 = welcome; 3 = first room upload; 4 = assistant setup (can be skipped) |
| 02 | Rooms | Manage the house | A grid of room cards (photo, number of spots, times used). Kids' room marked "Sparingly". An "Add a room" tile |
| 03 | Add room | Upload a photo and review the spots the AI found | Room name field, photo with numbered pins, a checklist of spots (how many elves each fits, height), and blocked unsafe spots that can't be ticked |
| 04 | Tonight | The home screen | 5-day date strip, night number, room, format badge (duo/split), photo with one pin per elf, idea title, story, set-up time/mess/spook, kit status, "Remind me 9pm", Shuffle, "Mark as set up" |
| 05 | Kit bag | Supplies for the next 4 nights | Counts of items already at home and items to buy, a checklist grouped by night with each item tagged to an elf, "Ask my assistant to buy these", "Copy to shopping list instead" |
| 06 | Send to my assistant | Bottom sheet | WhatsApp/iMessage switch, recipient, a preview of the message as it will be sent, a "also remind me" checkbox, "Open in {app}". The note under the button says the parent taps send |
| 07 | Calendar | Plan the month | 7-column grid; each day shows its number, a dot per elf and a room tag. Big nights (arrival and farewell) have a solid outline. Tapping a day shows its details plus "Text me a reminder the night before" |
| 08 | Idea library | Browse and generate ideas | Search, filters (Duo, Split, Under 5 min, Nothing to buy), idea cards, a save button, "Dream up 3 more for my house" |
| 09 | Settings | Preferences | Appearance (Light / Dark / Match phone), elves (each with a personality line), assistant channel, number and which jobs it handles |

**Navigation:** a bottom tab bar with Tonight, Calendar, Rooms and Ideas. Settings opens from the button in the Tonight header. Kit bag opens from Tonight. The assistant sheet opens from Tonight, Kit bag and Calendar.

## 4. Scheduling rules (the core logic; unit-test each one)

**Night formats**

- Every night has a **format**:
  - **duo:** all elves in one room, in a scene that uses each elf's character.
  - **split:** each elf in a different room, with linked or separate stories.
  - **solo:** one elf does a scene while the other "sits it out", with a small joke prop.
- **Default mix with 2 elves:** about 60% duo, 30% split, 10% solo. Never have the same format more than three nights running.
- **Big nights:** night 1 (arrival) and the last night (farewell) are always duo, and use the "big night" style of idea.

**Rooms and spots**

- **No repeat room:** no elf uses the same room two nights running. On split nights, the elves must be in different rooms.
- **Kids' bedrooms:** these rooms carry a `maxNights` limit, defaulting to 2 for the whole season. Never schedule them two nights in a row.
- **Spot fit:** a duo night needs a spot marked `fitsElves >= 2`, or two spots next to each other in the same room.
- **Unsafe spots** are excluded and the parent can't override this. Examples: open flames and log burners, hobs and ovens, toasters, inside fridges or freezers, plug sockets or anything near water and electrics, ceiling lights, and anywhere above a child's bed.

**Fitting the ideas to the family**

- **Spook level:** an idea's `spook` score can't be higher than the household setting. If any child is under 5, cap it at 3, whatever the setting.
- **Time:** `setupMinutes` can't be more than the household's time limit.
- **Busy nights:** the parent can mark any night as busy. That forces `setupMinutes ≤ 5`, `mess = none` and nothing to buy.
- **No repeats:** an idea is never used twice in one season.

**Supplies**

- **Buy items:** if an idea needs something marked `have = false`, plan it at least 2 days ahead. The deadline for buying is the night before it's needed.

**Planning approach**

- **Default (assumption — check with the product owner):** a rolling plan for the next 4 nights, locked in when you open the Kit bag or tap "Plan the week".
- Nights further ahead get a room but no idea yet.
- Shuffle on Tonight changes only that night's idea. It keeps the room, unless the parent picks a different room.

## 5. The assistant hand-off

An app **can't send iMessage or WhatsApp messages silently**. Version 1 opens the messaging app with the text already filled in, and the parent taps send.

- **WhatsApp:** `https://wa.me/{E164 number without +}?text={urlencoded}`
- **iMessage/SMS:** use `expo-sms` `sendSMSAsync([number], body)` to open the Messages composer.
- **Message templates.** These are plain text, written so the assistant can act on them, with dates written out in full:
  - **Buy:** "Please order for delivery by {date}: • {item} ({qty/spec}) … Budget up to £{n}. Deliver to home, mark "elf supplies" so the kids don't open it."
  - **Remind:** "Remind me at {time} tonight: elf set-up, {idea title} in the {room}. Kit: {items}."
  - **Night-before:** "Remind me tomorrow at {time}: {idea title}. Needs {items}."
- **Budget** is estimated from the price bands of the kit items (`estPriceGBP` on each item), rounded up to the next £5.
- **Local reminder fallback:** schedule a push notification at the parent's set-up time (default 9pm) whether or not the assistant is used.
- **Later options:** if the assistant has an email address, webhook or MCP endpoint, the hand-off can send directly from the server. Leave a gap in the code (an `AssistantChannel` interface) so a direct channel can be added later.

## 6. Data model (Postgres/Supabase)

```
household(id, owner_user_id, season_start date, season_end date, spook_level 1-5,
          max_setup_minutes int, child_age_bands text[] /* 'under5','5to8','9to12' */,
          theme 'light'|'dark'|'system', setup_reminder_time time default '21:00')

elf(id, household_id, name, color_token 'elf1'|'elf2'|'elf3', personality text, sort int)

room(id, household_id, name, photo_path, is_kids_room bool, max_nights int null, created_at)

spot(id, room_id, label, x float /*0-1*/, y float /*0-1*/, fits_elves int, height 'low'|'mid'|'high',
     enabled bool, unsafe bool, unsafe_reason text null)

idea(id, household_id null /*null = shared library*/, title, story, format 'duo'|'split'|'solo',
     roles jsonb /*[{elfSlot, action, roomId?, spotId?}]*/, setup_minutes int,
     mess 'none'|'low'|'medium', spook 1-5, min_age_band text, steps text[],
     kit jsonb /*[{name, qty, elfSlot?, commonlyAtHome bool, estPriceGBP}]*/,
     source 'library'|'generated', saved bool)

night(id, household_id, date, number int, format, idea_id null, is_busy bool, is_big bool,
      status 'unplanned'|'planned'|'set_up'|'done', assignments jsonb /*[{elfId, roomId, spotId}]*/)

kit_item(id, household_id, night_id, name, qty, elf_id null, have bool, need_by date,
         sent_to_assistant_at timestamptz null)

assistant_settings(household_id, channel 'whatsapp'|'imessage', phone_e164,
                   auto_buy bool, remind_setup bool, warn_busy bool)
```

## 7. Edge cases

- **Only one room uploaded:** let the room repeat, but vary the spot. Show a prompt to add more rooms.
- **One elf:** hide the format badges and the Duo/Split filters, and the copy uses the singular.
- **Three elves:** a split night can use two rooms, with two elves together in one of them.
- **Missed night** (not marked as set up by 7am): offer a "the elves slept in" note as a fallback.
- **Photo privacy:** room photos stay private to the household. Remove location data (EXIF) when uploading, and never use the photos to train models.
- **No network at set-up time:** cache the next 4 nights, including the photos and steps.

## 8. Open decisions for the product owner

1. Planning approach: rolling 4 nights (current default) or choosing on the night.
2. Seasons that start before 1 December, such as late-November arrivals.
3. Whether to add a "Morning reveal" photo diary of each night's set-up, which could become a memory book at the end of the season.
