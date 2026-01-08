package jwt

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// TokenType representa o tipo de token
type TokenType string

const (
	AccessToken  TokenType = "access"
	RefreshToken TokenType = "refresh"
)

// Claims representa os claims customizados do JWT
type Claims struct {
	UserID     string  `json:"userId"`
	Role       string  `json:"role"`
	IndustryID *string `json:"industryId,omitempty"`
	Type       string  `json:"type"` // "access" ou "refresh"
	jwt.RegisteredClaims
}

// TokenManager gerencia operações com JWT
type TokenManager struct {
	secret                  []byte
	accessTokenDuration     time.Duration
	refreshTokenDuration    time.Duration
}

// NewTokenManager cria um novo TokenManager
func NewTokenManager(secret string, accessDuration, refreshDuration time.Duration) *TokenManager {
	return &TokenManager{
		secret:                  []byte(secret),
		accessTokenDuration:     accessDuration,
		refreshTokenDuration:    refreshDuration,
	}
}

// GenerateAccessToken gera um access token JWT
func (tm *TokenManager) GenerateAccessToken(userID, role string, industryID *string) (string, error) {
	now := time.Now()
	
	claims := &Claims{
		UserID:     userID,
		Role:       role,
		IndustryID: industryID,
		Type:       string(AccessToken),
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        uuid.New().String(),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(tm.accessTokenDuration)),
			NotBefore: jwt.NewNumericDate(now),
			Issuer:    "cava-api",
			Subject:   userID,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	
	return token.SignedString(tm.secret)
}

// GenerateRefreshToken gera um refresh token JWT
func (tm *TokenManager) GenerateRefreshToken(userID string) (string, error) {
	now := time.Now()
	
	claims := &Claims{
		UserID: userID,
		Type:   string(RefreshToken),
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        uuid.New().String(),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(tm.refreshTokenDuration)),
			NotBefore: jwt.NewNumericDate(now),
			Issuer:    "cava-api",
			Subject:   userID,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	
	return token.SignedString(tm.secret)
}

// ValidateToken valida um token JWT e retorna os claims
func (tm *TokenManager) ValidateToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		// Verificar método de assinatura
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("método de assinatura inválido: %v", token.Header["alg"])
		}
		return tm.secret, nil
	})

	if err != nil {
		return nil, fmt.Errorf("erro ao validar token: %w", err)
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("token inválido")
	}

	return claims, nil
}

// ValidateAccessToken valida especificamente um access token
func (tm *TokenManager) ValidateAccessToken(tokenString string) (*Claims, error) {
	claims, err := tm.ValidateToken(tokenString)
	if err != nil {
		return nil, err
	}

	if claims.Type != string(AccessToken) {
		return nil, fmt.Errorf("token não é um access token")
	}

	return claims, nil
}

// ValidateRefreshToken valida especificamente um refresh token
func (tm *TokenManager) ValidateRefreshToken(tokenString string) (*Claims, error) {
	claims, err := tm.ValidateToken(tokenString)
	if err != nil {
		return nil, err
	}

	if claims.Type != string(RefreshToken) {
		return nil, fmt.Errorf("token não é um refresh token")
	}

	return claims, nil
}

// ExtractClaims extrai os claims de um token sem validar assinatura (útil para debugging)
// ATENÇÃO: NÃO usar para validação de autenticação
func (tm *TokenManager) ExtractClaims(tokenString string) (*Claims, error) {
	token, _, err := new(jwt.Parser).ParseUnverified(tokenString, &Claims{})
	if err != nil {
		return nil, fmt.Errorf("erro ao extrair claims: %w", err)
	}

	claims, ok := token.Claims.(*Claims)
	if !ok {
		return nil, fmt.Errorf("claims inválidos")
	}

	return claims, nil
}

// IsExpired verifica se um token está expirado
func (tm *TokenManager) IsExpired(tokenString string) bool {
	claims, err := tm.ExtractClaims(tokenString)
	if err != nil {
		return true
	}

	return claims.ExpiresAt.Before(time.Now())
}

// GetTokenID retorna o ID (jti) de um token
func (tm *TokenManager) GetTokenID(tokenString string) (string, error) {
	claims, err := tm.ExtractClaims(tokenString)
	if err != nil {
		return "", err
	}

	return claims.ID, nil
}

// GetUserID retorna o userID de um token
func (tm *TokenManager) GetUserID(tokenString string) (string, error) {
	claims, err := tm.ValidateToken(tokenString)
	if err != nil {
		return "", err
	}

	return claims.UserID, nil
}

// GetRole retorna o role de um token
func (tm *TokenManager) GetRole(tokenString string) (string, error) {
	claims, err := tm.ValidateToken(tokenString)
	if err != nil {
		return "", err
	}

	return claims.Role, nil
}

// GetIndustryID retorna o industryID de um token (pode ser nil)
func (tm *TokenManager) GetIndustryID(tokenString string) (*string, error) {
	claims, err := tm.ValidateToken(tokenString)
	if err != nil {
		return nil, err
	}

	return claims.IndustryID, nil
}