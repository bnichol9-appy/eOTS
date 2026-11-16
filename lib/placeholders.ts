/** Holiday sample photos shown where a room has no photo of its own yet. Always labelled as an example in the UI. */
const SAMPLES: { file: string; words: RegExp }[] = [
  { file: "kids-room", words: /kid|child|nursery|bedroom|playroom|\broom\b.*(boy|girl)|toy/ },
  { file: "kitchen", words: /kitchen|pantry|dining|breakfast|larder/ },
  { file: "bathroom", words: /bath|shower|toilet|loo|wc|washroom|cloakroom/ },
  { file: "hallway", words: /hall|stair|landing|entr|porch|foyer|corridor|door|boot|mud/ },
  { file: "living-room", words: /living|lounge|sitting|family room|den|snug|front room|fireplace|tree|playroom|office|study/ },
];

export function samplePhoto(roomName: string | null | undefined, isKidsRoom = false): string {
  if (isKidsRoom) return "/placeholders/kids-room.jpg";
  const name = (roomName ?? "").toLowerCase();
  const hit = name && SAMPLES.find((s) => s.words.test(name));
  return `/placeholders/${hit ? hit.file : "house"}.jpg`;
}
