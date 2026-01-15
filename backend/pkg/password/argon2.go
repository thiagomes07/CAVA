package password

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"fmt"
	"strings"

	"golang.org/x/crypto/argon2"
)

// Argon2Params contém os parâmetros de configuração do Argon2
type Argon2Params struct {
	Memory      uint32 // Memória em KB
	Iterations  uint32 // Número de iterações
	Parallelism uint8  // Threads paralelas
	SaltLength  uint32 // Tamanho do salt em bytes
	KeyLength   uint32 // Tamanho da chave derivada em bytes
}

// DefaultParams retorna os parâmetros padrão recomendados para Argon2id
func DefaultParams() *Argon2Params {
	return &Argon2Params{
		Memory:      64 * 1024, // 64 MB
		Iterations:  3,
		Parallelism: 2,
		SaltLength:  16,
		KeyLength:   32,
	}
}

// Hasher gerencia operações de hash de senha
type Hasher struct {
	params *Argon2Params
	pepper string // Salt global adicional
}

// NewHasher cria um novo Hasher com parâmetros customizados
func NewHasher(params *Argon2Params, pepper string) *Hasher {
	if params == nil {
		params = DefaultParams()
	}
	return &Hasher{
		params: params,
		pepper: pepper,
	}
}

// Hash gera o hash de uma senha usando Argon2id
func (h *Hasher) Hash(password string) (string, error) {
	// Adicionar pepper à senha
	password = password + h.pepper

	// Gerar salt aleatório
	salt, err := generateRandomBytes(h.params.SaltLength)
	if err != nil {
		return "", fmt.Errorf("erro ao gerar salt: %w", err)
	}

	// Gerar hash usando Argon2id
	hash := argon2.IDKey(
		[]byte(password),
		salt,
		h.params.Iterations,
		h.params.Memory,
		h.params.Parallelism,
		h.params.KeyLength,
	)

	// Codificar hash no formato: $argon2id$v=19$m=65536,t=3,p=2$salt$hash
	encodedHash := h.encodeHash(salt, hash)

	return encodedHash, nil
}

// Verify verifica se uma senha corresponde ao hash
func (h *Hasher) Verify(password, encodedHash string) error {
	// Primeira tentativa: usa o pepper configurado
	if err := h.verifyWithPepper(password, encodedHash, h.pepper); err == nil {
		return nil
	} else {
		// Guardar erro primário para retornar caso fallback também falhe
		primaryErr := err

		// Fallback: tentar sem pepper (compatibilidade com hashes antigos/seeds gerados sem pepper)
		if h.pepper != "" {
			if err := h.verifyWithPepper(password, encodedHash, ""); err == nil {
				return nil
			}
		}

		return primaryErr
	}
}

// verifyWithPepper executa a verificação usando o pepper informado
func (h *Hasher) verifyWithPepper(password, encodedHash, pepper string) error {
	password = password + pepper

	params, salt, hash, err := h.decodeHash(encodedHash)
	if err != nil {
		return fmt.Errorf("erro ao decodificar hash: %w", err)
	}

	otherHash := argon2.IDKey(
		[]byte(password),
		salt,
		params.Iterations,
		params.Memory,
		params.Parallelism,
		params.KeyLength,
	)

	if subtle.ConstantTimeCompare(hash, otherHash) != 1 {
		return fmt.Errorf("senha incorreta")
	}

	return nil
}

// encodeHash codifica o hash no formato padrão
func (h *Hasher) encodeHash(salt, hash []byte) string {
	b64Salt := base64.RawStdEncoding.EncodeToString(salt)
	b64Hash := base64.RawStdEncoding.EncodeToString(hash)

	return fmt.Sprintf(
		"$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s",
		argon2.Version,
		h.params.Memory,
		h.params.Iterations,
		h.params.Parallelism,
		b64Salt,
		b64Hash,
	)
}

// decodeHash decodifica o hash do formato padrão
func (h *Hasher) decodeHash(encodedHash string) (*Argon2Params, []byte, []byte, error) {
	parts := strings.Split(encodedHash, "$")
	if len(parts) != 6 {
		return nil, nil, nil, fmt.Errorf("formato de hash inválido")
	}

	// Verificar algoritmo
	if parts[1] != "argon2id" {
		return nil, nil, nil, fmt.Errorf("algoritmo não suportado")
	}

	// Verificar versão
	var version int
	_, err := fmt.Sscanf(parts[2], "v=%d", &version)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("versão inválida: %w", err)
	}
	if version != argon2.Version {
		return nil, nil, nil, fmt.Errorf("versão incompatível")
	}

	// Extrair parâmetros
	params := &Argon2Params{}
	_, err = fmt.Sscanf(parts[3], "m=%d,t=%d,p=%d", &params.Memory, &params.Iterations, &params.Parallelism)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("parâmetros inválidos: %w", err)
	}

	// Decodificar salt
	salt, err := base64.RawStdEncoding.DecodeString(parts[4])
	if err != nil {
		return nil, nil, nil, fmt.Errorf("salt inválido: %w", err)
	}
	params.SaltLength = uint32(len(salt))

	// Decodificar hash
	hash, err := base64.RawStdEncoding.DecodeString(parts[5])
	if err != nil {
		return nil, nil, nil, fmt.Errorf("hash inválido: %w", err)
	}
	params.KeyLength = uint32(len(hash))

	return params, salt, hash, nil
}

// generateRandomBytes gera bytes aleatórios criptograficamente seguros
func generateRandomBytes(n uint32) ([]byte, error) {
	b := make([]byte, n)
	_, err := rand.Read(b)
	if err != nil {
		return nil, err
	}
	return b, nil
}

// ValidatePasswordStrength valida a força da senha
func ValidatePasswordStrength(password string) error {
	if len(password) < 8 {
		return fmt.Errorf("senha deve ter pelo menos 8 caracteres")
	}

	var (
		hasUpper   bool
		hasLower   bool
		hasNumber  bool
		hasSpecial bool
	)

	for _, char := range password {
		switch {
		case 'A' <= char && char <= 'Z':
			hasUpper = true
		case 'a' <= char && char <= 'z':
			hasLower = true
		case '0' <= char && char <= '9':
			hasNumber = true
		case strings.ContainsRune("!@#$%^&*()_+-=[]{}|;:,.<>?", char):
			hasSpecial = true
		}
	}

	if !hasUpper {
		return fmt.Errorf("senha deve conter pelo menos uma letra maiúscula")
	}

	if !hasNumber {
		return fmt.Errorf("senha deve conter pelo menos um número")
	}

	// hasLower e hasSpecial são opcionais mas recomendados
	_ = hasLower
	_ = hasSpecial

	return nil
}
