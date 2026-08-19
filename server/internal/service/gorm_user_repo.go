package service

import (
	"gorm.io/gorm"

	"github.com/weaveclip/server/internal/model"
)

// GormUserRepo implements UserRepository using GORM.
type GormUserRepo struct {
	db *gorm.DB
}

// NewGormUserRepo creates a new GormUserRepo.
func NewGormUserRepo(db *gorm.DB) *GormUserRepo {
	return &GormUserRepo{db: db}
}

// GetByEmail finds a user by email.
func (r *GormUserRepo) GetByEmail(email string) (*model.User, error) {
	var user model.User
	err := r.db.Where("email = ?", email).First(&user).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &user, nil
}

// Create inserts a new user.
func (r *GormUserRepo) Create(user *model.User) error {
	return r.db.Create(user).Error
}

// GetByID finds a user by ID.
func (r *GormUserRepo) GetByID(id uint) (*model.User, error) {
	var user model.User
	err := r.db.First(&user, id).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &user, nil
}
