package db

import (
	"embed"
	"io/fs"
	"log"
	"os"
	"sort"
	"strings"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
)

//go:embed migrations/*.sql
var migrationFiles embed.FS

func Connect() *sqlx.DB {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL not set")
	}
	dbx, err := sqlx.Connect("postgres", dsn)
	if err != nil {
		log.Fatalf("db connect failed: %v", err)
	}
	runMigrations(dbx)
	return dbx
}

func runMigrations(db *sqlx.DB) {
	// Create the migrations tracking table if it doesn't exist.
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			filename TEXT PRIMARY KEY,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
		)
	`)
	if err != nil {
		log.Fatalf("migrations: failed to create tracking table: %v", err)
	}

	// Read which migrations have already been applied.
	var applied []string
	db.Select(&applied, `SELECT filename FROM schema_migrations ORDER BY filename`)
	appliedSet := make(map[string]bool)
	for _, f := range applied {
		appliedSet[f] = true
	}

	// Read all .sql files from the embedded filesystem.
	entries, err := fs.ReadDir(migrationFiles, "migrations")
	if err != nil {
		log.Fatalf("migrations: failed to read directory: %v", err)
	}

	// Sort to ensure 001 < 002 < 003 etc.
	sort.Slice(entries, func(i, j int) bool {
		return entries[i].Name() < entries[j].Name()
	})

	for _, entry := range entries {
		if !strings.HasSuffix(entry.Name(), ".sql") {
			continue
		}
		filename := entry.Name()
		if appliedSet[filename] {
			continue // already applied
		}

		sql, err := migrationFiles.ReadFile("migrations/" + filename)
		if err != nil {
			log.Fatalf("migrations: failed to read %s: %v", filename, err)
		}

		// Run the migration in a transaction so a partial failure doesn't
		// leave the DB in a broken state.
		tx, err := db.Begin()
		if err != nil {
			log.Fatalf("migrations: failed to begin tx for %s: %v", filename, err)
		}

		if _, err := tx.Exec(string(sql)); err != nil {
			tx.Rollback()
			log.Fatalf("migrations: %s failed: %v", filename, err)
		}

		if _, err := tx.Exec(
			`INSERT INTO schema_migrations (filename) VALUES ($1)`, filename,
		); err != nil {
			tx.Rollback()
			log.Fatalf("migrations: failed to record %s: %v", filename, err)
		}

		if err := tx.Commit(); err != nil {
			log.Fatalf("migrations: failed to commit %s: %v", filename, err)
		}

		log.Printf("migrations: applied %s", filename)
	}
}
