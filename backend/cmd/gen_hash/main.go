package main

import (
	"fmt"
	"os"

	"github.com/thiagomes07/CAVA/backend/pkg/password"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Println("Uso: go run main.go <senha>")
		os.Exit(1)
	}

	pwd := os.Args[1]
	pepper := os.Getenv("PASSWORD_PEPPER")

	hasher := password.NewHasher(password.DefaultParams(), pepper)
	hash, err := hasher.Hash(pwd)
	if err != nil {
		fmt.Printf("Erro ao gerar hash: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("Senha: %s\n", pwd)
	fmt.Printf("Hash: %s\n", hash)
}
