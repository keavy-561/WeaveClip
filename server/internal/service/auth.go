package service

import (
	"fmt"
	"regexp"
	"strings"

	"golang.org/x/crypto/bcrypt"

	"github.com/weaveclip/server/internal/model"
)

var emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)

// ValidateRegisterRequest validates email format and password length.
func ValidateRegisterRequest(email, password, name string) error {
	if !emailRegex.MatchString(email) {
		return fmt.Errorf("invalid email format")
	}
	if len(password) < 8 {
		return fmt.Errorf("password must be at least 8 characters")
	}
	if name != "" && len(name) > 255 {
		return fmt.Errorf("name must be at most 255 characters")
	}
	return nil
}

const bcryptCost = 12

// HashPassword hashes a plain text password using bcrypt.
func HashPassword(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcryptCost)
	if err != nil {
		return "", fmt.Errorf("hash password failed: %w", err)
	}
	return string(hash), nil
}

// ComparePassword compares a plain text password with a bcrypt hash.
func ComparePassword(hash, password string) error {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
}

// AuthService provides authentication-related business logic.
type AuthService struct {
	users UserRepository
}

// NewAuthService creates a new AuthService.
func NewAuthService(users UserRepository) *AuthService {
	return &AuthService{users: users}
}

// Register creates a new user.
func (s *AuthService) Register(email, password, name string) (*model.User, error) {
	if err := ValidateRegisterRequest(email, password, name); err != nil {
		return nil, err
	}
	existing, _ := s.users.GetByEmail(email)
	if existing != nil {
		return nil, fmt.Errorf("email already registered")
	}
	hash, err := HashPassword(password)
	if err != nil {
		return nil, err
	}
	user := &model.User{
		Email:        email,
		PasswordHash: hash,
		Name:         name,
	}
	if err := s.users.Create(user); err != nil {
		// 并发同邮箱注册：唯一索引冲突映射为业务错误（前端"该邮箱已被注册"），
		// 而不是 500（工单 WO8-19）
		if isDuplicateKeyError(err) {
			return nil, fmt.Errorf("email already registered")
		}
		return nil, err
	}
	return user, nil
}

// isDuplicateKeyError 判定唯一约束冲突（Postgres duplicate key / unique constraint，工单 WO8-19）。
func isDuplicateKeyError(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "duplicate key") ||
		strings.Contains(msg, "unique constraint") ||
		strings.Contains(msg, "uniqueness constraint")
}

// Login authenticates a user by email and password.
func (s *AuthService) Login(email, password string) (*model.User, error) {
	user, err := s.users.GetByEmail(email)
	if err != nil {
		return nil, fmt.Errorf("invalid email or password")
	}
	if user == nil {
		return nil, fmt.Errorf("invalid email or password")
	}
	if err := ComparePassword(user.PasswordHash, password); err != nil {
		return nil, fmt.Errorf("invalid email or password")
	}
	return user, nil
}

// GetUserByID fetches a user by ID.
func (s *AuthService) GetUserByID(id uint) (*model.User, error) {
	return s.users.GetByID(id)
}

// UserRepository is an interface for user data access.
type UserRepository interface {
	GetByEmail(email string) (*model.User, error)
	Create(user *model.User) error
	GetByID(id uint) (*model.User, error)
}
