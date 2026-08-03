package db

import (
	"log"
	"os"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
)

func Connect() *sqlx.DB {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL not set")
	}
	dbx, err := sqlx.Connect("postgres", dsn)
	if err != nil {
		log.Fatalf("db connect failed: %v", err)
	}
	return dbx
}
