package main

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/lib/pq"
)

func main() {
	connStr := "postgres://cava_user:cava_password_dev@localhost:5432/cava_db?sslmode=disable"
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatal("Failed to ping DB:", err)
	}

	query := `ALTER TABLE industries ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '[]'::JSONB;`
	_, err = db.Exec(query)
	if err != nil {
		log.Fatal("Failed to alter table:", err)
	}

	fmt.Println("Successfully added social_links column")
}
