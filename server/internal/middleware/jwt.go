package middleware

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/weaveclip/server/internal/config"
)

var jwtSecret []byte
var jwtExpiry time.Duration

func InitJWT(secret string, expiry time.Duration) {
	jwtSecret = []byte(secret)
	jwtExpiry = expiry
}

func EnsureJWTInitialized(cfg *config.Config) {
	if len(jwtSecret) == 0 {
		jwtSecret = []byte(cfg.JWT.Secret)
	}
	if jwtExpiry == 0 {
		jwtExpiry = cfg.JWT.Expiry
	}
}

// Claims represents the JWT claims.
type Claims struct {
	UserID uint `json:"user_id"`
	jwt.RegisteredClaims
}

// GenerateToken creates a JWT for the given user ID.
func GenerateToken(userID uint) (string, error) {
	if len(jwtSecret) == 0 {
		return "", errors.New("jwt secret not initialized")
	}
	claims := Claims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(jwtExpiry)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

// ParseToken validates a JWT and returns the user ID.
func ParseToken(tokenString string) (uint, error) {
	if len(jwtSecret) == 0 {
		return 0, errors.New("jwt secret not initialized")
	}
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		return jwtSecret, nil
	})
	if err != nil {
		return 0, err
	}
	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims.UserID, nil
	}
	return 0, errors.New("invalid token")
}
