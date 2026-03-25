-- Add lineups column to store per-point lineup data as JSON
ALTER TABLE games ADD COLUMN lineups TEXT;
