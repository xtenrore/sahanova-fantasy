PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'manager' CHECK (role IN ('manager', 'admin')),
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  password_iterations INTEGER NOT NULL DEFAULT 150000,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS app_state (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO app_state(key, value_json) VALUES (
  'config',
  '{"season":"2026/27","gameweek":5,"maxPerClub":3,"initialBudget":100,"scoring":{"appearance":1,"sixtyMinutes":1,"goalGK":6,"goalDEF":6,"goalMID":5,"goalFWD":4,"assist":3,"cleanSheetGK":4,"cleanSheetDEF":4,"cleanSheetMID":1,"cleanSheetFWD":0,"penaltySaved":5,"penaltyMissed":-2,"ownGoal":-2,"yellow":-1,"red":-3,"savesEvery3":1,"captainMultiplier":2}}'
);

INSERT OR IGNORE INTO app_state(key, value_json) VALUES (
  'overrides',
  '{"clubs":{},"players":{},"fixtures":{}}'
);
