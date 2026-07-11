# Scorebot

Live score tracking for KC Ultimate (Tech) games, fed by WhatsApp chat messages. This glossary is the canonical language for game and stats concepts across bot, shared, and web packages.

## Language

### Game structure

**Game**:
One tracked match between our team and an opponent, made up of an ordered list of events.

**Event**:
A single recorded happening in a game: a goal, halftime, timeout, note, game start, or game end.

**Point**:
One unit of play from a pull to a goal. Every goal event ends exactly one point.
_Avoid_: possession, rally

**Point Ledger**:
The derived, per-point account of a game: for each point, who scored, whether it was a hold or a break, which of our lines played it, and whether we forced a turn. All break/hold and line questions are answered from the ledger.

**Starting on Offense**:
Whether our team received the first pull. Determines possession at the start of each half; the receiving team flips at halftime.

### Point outcomes

**Hold**:
A point won by the team that started it on offense.

**Break**:
A point won by the team that started it on defense.

**Dirty Hold**:
A hold where our O-line first lost possession and had to force a turn to win the point back. Counts as a hold, signals sloppy offense.

**Failed Conversion**:
A D-line point where we forced at least one turn but still conceded the goal.

**Forced Turn**:
A change of possession our defense caused (block or steal), as opposed to an opponent's unforced error. Only our own forced turns are logged.

**Inferred Result**:
A hold/break call made without knowing starting possession, guessed from consecutive scoring. Display-only: shown on the timeline, excluded from efficiency stats.

### Lines

**O-line**:
The lineup fielded when we start a point on offense.

**D-line**:
The lineup fielded when we start a point on defense.
