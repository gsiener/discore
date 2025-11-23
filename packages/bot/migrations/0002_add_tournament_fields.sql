-- Add tournament organization fields to games table

-- Add new columns
ALTER TABLE games ADD COLUMN tournament_name TEXT;
ALTER TABLE games ADD COLUMN game_date TEXT; -- YYYY-MM-DD format for consistent sorting
ALTER TABLE games ADD COLUMN game_order INTEGER DEFAULT 0; -- Order within the same day/tournament

-- Add indices for efficient querying
CREATE INDEX idx_games_date ON games(game_date DESC);
CREATE INDEX idx_games_tournament ON games(tournament_name);
