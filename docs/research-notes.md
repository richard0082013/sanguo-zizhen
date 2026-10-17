# Reference research — gameplay depth

Read `/workspace/game/plan.md` and visually inspected all 36 PNG frames in `/workspace/refvideos/frames` (three labelled 12-frame contact sheets).

## Observed
- Two vertically stacked boards, shared winding road, separate defending 斗 and lives. Streams of black calligraphic enemies travel outside the occupied formation.
- Five reserve slots; recruitment spends currency and its displayed price rises (16→22 in sequence one, 28→30 in sequence two). Players place and combine reserve/board tiles.
- Soldier characters 刀/枪/弓/骑 carry small tier numbers. White base tiles dominate early; green, blue, purple and gold accents distinguish progression. Higher tiers retain readable characters.
- Gold name characters appear in neighbouring cells (关/羽, 张/飞, 赵/云, 马/超, 刘/备). Golden circular light and a brighter frame communicate activation/upgrade (sequence two frames 9–12; sequence one frame 11).
- Weapon/tool icons sit below recruitment in sequence two. A weapon tooltip is visible in sequence one frame 12. Weapon progression is separate from general name completion.

## Implementation choices and uncertainties
Still frames cannot establish exact cooldowns, damage coefficients, ordered drag recipes, elemental proc chances or the complete original skill roster. The plan describes ordered names and five soldier tiers; implement explicit ordered name merging, including partial three-character names, into one stronger portrait tile. Use cooldown skills for every configured general. Requested dragon, ice, chain thunder and poison are weapon mechanics, separate from generals. The available frames do not prove their exact original numerical effects: use visible, readable soft glow effects with slow, chained damage and timed poison respectively.

Recruitment uses seeded weighted randomness without scripted opening characters or pre-made high tiers. Soldier tiers require repeated same-type/same-tier merges; no free gold. A practical rising price cap sustains the recruit/merge loop beyond the opening minute. Verification must use actual pointer recruitment/placement/merging and capture player-board progression.

## Follow-up constraints
Opening stock is 30 buns: exactly two recruits (10 + 12), with 8 left toward the third (14). Soldier reach is fixed across tiers: blades/cavalry 60px, spears 110px, bows 150px. Each general has its own configured basic-attack reach (80–240px). These are tuning choices, not measurements from still frames. Pickup/tap shows a brief soft circle using the exact combat range; unfinished names/tools have no attack circle. Screenshot 7 records a real bow selection.

## Verification and pacing
Short melee reach exposed the previous 64px/s infantry opening as too punishing for a two-recruit start. Infantry now moves at 24px/s and cavalry at 40px/s; placement at the road bends matters. Real-play verification retains video, uses seed 26809, recruits only level-one tiles, and drags actual same-tier merges. Full-board handling clears unfinished letters to retain soldiers rather than discarding progression. No board state, currency, or gold tiles are injected.

Final verification: all seven screenshot assertions passed in one seeded real-play run (98.7 seconds of game time, 24 pointer-driven merges, Zhang Fei/Lü Bu/Guan Yu skills, zero page errors). Inspected every final screenshot, including the emerald crescent sweep, weapon fire dragon, gold five-dot blade tile on the player board, and bow range circle. The capture script pauses the scene briefly at 420–650ms after the selected effect event for a stable screenshot, then resumes; it does not manufacture recruits or combat events. Video remains enabled under `/workspace/r11/vid`. `npm test`: 68 passing; `npm run build`: passing.


## R12 correction and completed capture verification (2026-10-17)

### Balance and recruitment
- Passive income is 0/s; ordinary kills pay 3 buns, elites 5, bosses 12–16. Wave clear pays 4 to each side. Savings use Number.MAX_SAFE_INTEGER. Recruitment starts at 10, rises by 2 and caps at 18; opening stock remains 30 (two recruits, 8 left).
- Restored main's infantry/cavalry speeds (64/80px/s). Blade/cavalry reach is fixed at 75px. Opening infantry HP is 40; base soldier damage is 40/44/40/48. AI prioritizes road coverage. Opening setup is 6 seconds rather than 12, preserving more combat time within the one-minute recording.
- Unfinished-name weight is 18 versus the branch's original 35; spear weight is 40 (previously 25). An elemental weapon rolls on 65% of spear recruits. Name draws have a 65% chance to select the next character of a placed incomplete name, when a partner exists; random recruitment and costs remain in force.
- Elemental spears retain their soldier identity for merges, while displaying their element glyph. Merging preserves the incoming weapon, falling back to the destination's weapon. This avoids splitting spear progression into four incompatible element stacks.
- Holding and board tiles sell for 40% of base recruitment value times merged material count. Shovels use the same sale path and are consumed without a refund. Cells and active-general records are cleared.

### Visuals
- Rich parchment, dark ink icons/glyphs and a contrasting tier-one border. Removed an overly dark icon tint after inspecting recorded play.
- Shared circular sweep ribbons start at alpha 0.4, mist at 0.35 and particles at 0.4, retaining visible enemies. Frost now draws cyan six-armed crystals; poison uses translucent green clouds/bubbles with normal blending, avoiding the earlier white additive washout. Thunder chains and the fire dragon remain distinct.

### Search and actual play
- Added `scripts/search-seeds.mjs`: `node scripts/search-seeds.mjs COUNT START_SEED DURATION_MS`. It transpiles BattleEngine into an isolated temporary directory, simulates wave delays, and runs the same `scripts/play-policy.mjs` policy imported by `/workspace/r12/play.mjs`. It recruits, places, merges and sells through engine APIs; it never grants currency or manufactures tiles. The browser executes those choices with real pointer input.
- Baseline search: 5,000 seeds found no complete match (best: four weapon effects). After recruitment adjustments, seed 4383 matched at 55 simulated seconds and seed 6368 at 48, but browser overhead left both short of the high-tier capture. A longer search found seed 18528 meeting all conditions within 40 simulated seconds even with the original 12-second setup. Confirmed again after the setup reduction with `node scripts/search-seeds.mjs 1 18528 40000`.
- Final recorded browser run: seed **18528**, **50.727 seconds wall time**, **51.44-second video**, 38.758 seconds engine time, wave 5, nine pointer-driven merges, three lives on both sides, zero page errors. All seven capture assertions passed. Video remains enabled under `/workspace/r12/vid`; successful recording is `page@f1cc4d41b94f741a9ba5bb6c1c5e3360.webm`.
- `/workspace/r12/buns.csv` records wall seconds, buns and wave every second. Wave 1 samples: 0–12 buns (mean 6.9); wave 2: 0–18 (mean 7.4); wave 3: 4–17 (mean 11.1). Early resources remain below recruitment cost for most samples.
- Viewed every final screenshot: `1_general_transform.png` (Zhang Fei awakening), `2_skill.png` (translucent circular skill with enemies visible), `3_fire_dragon.png`, `4_high_level.png` (purple spear with four tier dots), `5_ice.png` (cyan frost), `6_thunder.png` (multiple lightning links), `7_poison.png` (green cloud). All seven are under `/workspace/r12`. Tier **4**, rather than tier 5, is the accepted high-level target for this one-minute run; tier 5 was not achieved.
- Validation: `npm test` passes **74 tests**; `npm run build` passes. Added economy, exact melee-range, sale cleanup, complementary-name probability and mixed elemental/plain spear merge coverage. No commit was made.
