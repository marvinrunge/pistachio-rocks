# Pistachio — Godot 4 rework

A stand-alone [Godot 4](https://godotengine.org/) port of the Pistachio survival
arcade game that lives in the repository root. It reimplements the same gameplay in
GDScript instead of React + Canvas, and needs nothing from the web project.

## Running

Requires Godot **4.3** or newer (standard build, no C#/.NET).

```bash
godot --path .          # from this folder
```

Or import `project.godot` from the Godot project manager and press <kbd>F5</kbd>.

## Controls

| Action | Keys |
| :----- | :--- |
| Move   | `A` / `D` or `←` / `→` |
| Jump   | `W`, `↑` or `Space` |
| Mute   | `M` |
| Back to menu | `Esc` |

Gamepads are mapped too (left stick / D-pad to move, the bottom face button to jump).
On touch screens, hold the left or right half of the screen to move and swipe up to
jump, just like the web version.

## Layout

```
assets/    Character artwork, shared with the web build
scenes/    Scene files (game world, HUD and the UI screens)
scripts/   Gameplay logic
  consts.gd        Tuning values (mirrors ../constants.ts)
  characters.gd    Playable nuts (mirrors ../game/characters)
  skills.gd        Level-up skill pools (mirrors ../game/skills.ts)
  achievements.gd  In-run achievements and their rewards
  game.gd          Run orchestration: spawning, collisions, seasons, events
  player.gd        Physics and character rendering
  element.gd       Falling rocks, water, snow and meteors
  main.gd          Screen state machine
  sfx.gd           Procedural sound synthesis (autoload)
  save_data.gd     Local settings and high scores (autoload)
```

## Differences from the web build

- High scores are saved locally to `user://savegame.cfg`; there is no online
  leaderboard, so the game works entirely offline.
- Sound effects are synthesised into `AudioStreamWAV` buffers at startup instead of
  using the Web Audio API.

Everything else — characters, skills, achievements, seasons, weather events and the
difficulty curve — follows the same formulas as the web version.
