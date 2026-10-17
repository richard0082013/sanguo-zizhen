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
