# eOTS

A PIN-locked Elf on the Shelf planner that comes up with big, action-packed overnight setups for **your** house, and learns what your family actually likes from the photos you take of what you built.

No cute elf-holding-a-marshmallow scenes. Toilet-papered hallways, zip lines across the kitchen, sock ropes down the stairs, crime scenes in the living room.

## How it works

1. **House**: photograph areas of your home (hallway, kitchen, bathroom, stairs). Claude builds an inventory of what's there: surfaces, props, hazards and concrete setup hooks for each room.
2. **Tonight**: tap *Plan tonight's mischief* and get three options: a **Full send**, a **Quick hit** (under 10 minutes) and a **Wildcard**. Each has the scene the kids walk into, step-by-step build instructions, supplies, and chaos/mess/time ratings. Remix any option or ask for a fresh batch with a direction ("bathroom", "max chaos", "low mess").
3. **Done, how did it go?**: take a photo of what you actually built, rate the kids' reaction, tag it (bigger next time, messier, never again). Claude analyses the photo and updates a *taste profile* that is fed into every future idea, so the suggestions drift toward what your family really does.
4. **Log**: the season history and the taste profile the elf has built up (editable).

The whole app is behind a PIN. It locks when it goes to the background and always asks for the PIN on a fresh open, so kids grabbing the phone see nothing.

## Run it

You need Node 20+ and an Anthropic API key.

```bash
npm install
cp .env.example .env     # put your ANTHROPIC_API_KEY in .env
npm run build
npm start                # http://localhost:3000
```

For development with hot reload:

```bash
npm run dev              # web on http://localhost:5173, API on :3000
```

To use it on your phone on the same Wi-Fi, open `http://<your-computer-ip>:3000` and use *Add to Home Screen*. The app installs as a standalone icon called **eOTS**.

Everything (PIN, rooms, photos, ideas, the taste profile) lives in `./data`. Back that folder up if you care about it.

## Deploy it

Any host that runs a Node app or a Docker container works (Fly.io, Railway, Render, a Raspberry Pi). Set `ANTHROPIC_API_KEY`, set `EOTS_SECURE_COOKIES=true` once it's behind HTTPS, and mount a persistent volume at the data directory.

```bash
docker build -t eots .
docker run -p 3000:3000 -e ANTHROPIC_API_KEY=sk-ant-... -v eots-data:/data eots
```

## Configuration

| Variable | Default | What it does |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | | Required. |
| `PORT` | `3000` | Port to listen on. |
| `EOTS_DATA_DIR` | `./data` | Where PIN config, the JSON database and photos are stored. |
| `EOTS_MODEL` | `claude-opus-5-5` | Model for idea generation and photo analysis. |
| `EOTS_SECURE_COOKIES` | `false` | Set `true` behind HTTPS. |

## Cost

A night's planning sends the room inventories, the taste profile and the season history as text (roughly 5k to 10k tokens) and gets three ideas back. Photos are downscaled in the browser before upload, so room and result analyses are a few thousand tokens each. Expect a few cents per night.

## Layout

```
server/   Express API: PIN auth, JSON store, Claude calls (server/claude.ts holds the prompts)
web/      React app (Vite), mobile-first, installable
data/     Created at runtime, gitignored
```
