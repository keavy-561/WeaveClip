package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/weaveclip/server/internal/middleware"
	"github.com/weaveclip/server/internal/service"
)

// AuthHandler handles auth endpoints.
type AuthHandler struct {
	authService *service.AuthService
}

// NewAuthHandler creates a new AuthHandler.
func NewAuthHandler(authService *service.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

// Register handles POST /api/auth/register.
func (h *AuthHandler) Register(c *gin.Context) {
	var req struct {
		Email    string `json:"email" binding:"required"`
		Password string `json:"password" binding:"required"`
		Name     string `json:"name"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		BadRequest(c, "invalid request body")
		return
	}
	user, err := h.authService.Register(req.Email, req.Password, req.Name)
	if err != nil {
		BadRequest(c, err.Error())
		return
	}
	c.JSON(http.StatusCreated, gin.H{"user": user})
}

// Login handles POST /api/auth/login.
func (h *AuthHandler) Login(c *gin.Context) {
	var req struct {
		Email    string `json:"email" binding:"required"`
		Password string `json:"password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		BadRequest(c, "invalid request body")
		return
	}
	user, err := h.authService.Login(req.Email, req.Password)
	if err != nil {
		Unauthorized(c, err.Error())
		return
	}
	token, err := middleware.GenerateToken(user.ID)
	if err != nil {
		InternalError(c, "failed to generate token")
		return
	}
	c.JSON(http.StatusOK, gin.H{"token": token, "user": user})
}

// Me handles GET /api/auth/me.
func (h *AuthHandler) Me(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		Unauthorized(c, "missing user context")
		return
	}
	uid, _ := userID.(uint)
	user, err := h.authService.GetUserByID(uid)
	if err != nil {
		InternalError(c, "failed to fetch user")
		return
	}
	if user == nil {
		NotFound(c, "user not found")
		return
	}
	c.JSON(http.StatusOK, gin.H{"user": user})
}
