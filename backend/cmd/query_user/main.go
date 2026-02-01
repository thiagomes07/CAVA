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

	rows, err := db.Query("SELECT email FROM users LIMIT 1")
	if err != nil {
		log.Fatal("Failed to query users:", err)
	}
	defer rows.Close()

	if rows.Next() {
		var email string
		if err := rows.Scan(&email); err != nil {
			log.Fatal(err)
		}
		fmt.Println("Found user:", email)
	} else {
		fmt.Println("No users found")
	}
}
