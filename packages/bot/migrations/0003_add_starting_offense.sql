-- Add startingOnOffense field to games table for O-line/D-line efficiency stats

ALTER TABLE games ADD COLUMN starting_on_offense INTEGER; -- SQLite uses INTEGER for boolean (0=false, 1=true, NULL=unknown)
