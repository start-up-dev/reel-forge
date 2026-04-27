# Prompt Registry

All Claude prompts live in this directory. `claude.ts` only makes API calls — it imports everything from here.

## Files

| File | Purpose |
|------|---------|
| `utils.ts` | `projectContext()` and `isBengali()` — shared helpers used by all builders |
| `ideas.ts` | Idea generation — 3 viral video ideas from a topic |
| `script.ts` | Script writing — spoken voiceover from a selected idea. Contains `BENGALI_SCRIPT_SYSTEM` and `RENDER_STYLE_SCRIPT_MODIFIERS` |
| `scenes.ts` | Scene direction for generated videos — cinematic B-roll, per-render-style overrides |
| `character.ts` | Character sheet generation for cartoon/mascot style consistency |
| `talking.ts` | Scene direction for talking videos — lipsync, per-subtype modifiers |
| `index.ts` | Re-exports everything + `PROMPT_REGISTRY` metadata |

## How to edit a prompt

1. Open the relevant file above.
2. Edit the string constants or builder functions directly.
3. Run `pnpm --filter @repo/api check-types` to verify nothing broke.
4. No changes needed in `claude.ts` — it only calls the builders.

## How to add a new render style (generated video)

1. Add a `"your_style"` entry to `RENDER_STYLE_SCENE_SYSTEMS` in `scenes.ts` with a complete system prompt.
2. Add a `"your_style"` entry to `RENDER_STYLE_SCRIPT_MODIFIERS` in `script.ts` with a short writing style note.
3. Add the style to the `renderStyle` union type in `@repo/types`.
4. Update `PROMPT_REGISTRY` in `index.ts` if the style needs its own registry entry.

## How to add a new language

1. Add a new `${LANGUAGE}_SCRIPT_SYSTEM` constant to `script.ts`.
2. Add the language check to `buildScriptMessages` and `buildIdeasMessages` (follow the `isBengali` pattern).
3. Add a sample text to `LANGUAGE_SAMPLE_TEXTS` in `elevenlabs.ts` for voice previews.

## How to add a new talking video subtype

1. Add an entry to `TALKING_SUBTYPE_MODIFIERS` in `talking.ts` with `visual` and `motion` strings.
2. Add the subtype to the `talkingSubtype` enum in `apps/api/lib/db/schema.ts`.
3. The modifier is automatically injected by `buildTalkingSceneMessages`.

## Admin API

`GET /api/admin/prompts` (requires `X-Operator-Secret` header) returns the `PROMPT_REGISTRY` — a list of all prompt families with their labels, descriptions, and source file paths.
