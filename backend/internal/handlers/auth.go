package handlers

import (
	"crypto/sha256"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct{ DB *sqlx.DB }

// sessionExpiry must match issueToken's exp duration so both stay in sync.
const sessionExpiry = 30 * 24 * time.Hour

func hashToken(token string) string {
	h := sha256.Sum256([]byte(token))
	return fmt.Sprintf("%x", h)
}

func (h *AuthHandler) createSession(userID, orgID, token string) error {
	_, err := h.DB.Exec(`
		INSERT INTO sessions (user_id, org_id, token_hash, expires_at)
		VALUES ($1, $2, $3, $4)
	`, userID, orgID, hashToken(token), time.Now().Add(sessionExpiry))
	return err
}

type signupReq struct {
	OrgName  string `json:"org_name" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
}

func (h *AuthHandler) Signup(c *gin.Context) {
	var req signupReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "hashing failed"})
		return
	}

	tx := h.DB.MustBegin()
	orgID := uuid.NewString()
	tx.MustExec(`INSERT INTO orgs (id, name) VALUES ($1, $2)`, orgID, req.OrgName)

	userID := uuid.NewString()
	_, err = tx.Exec(
		`INSERT INTO users (id, org_id, email, password_hash, role) VALUES ($1,$2,$3,$4,'owner')`,
		userID, orgID, req.Email, string(hash),
	)
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusConflict, gin.H{"error": "email already in use"})
		return
	}
	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "signup failed"})
		return
	}

	token, err := issueToken(userID, orgID, "owner")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "token issue failed"})
		return
	}

	if err := h.createSession(userID, orgID, token); err != nil {
		fmt.Println("session insert error:", err)
	}

	c.JSON(http.StatusCreated, gin.H{"token": token})
}

type loginReq struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req loginReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	var user struct {
		ID           string `db:"id"`
		OrgID        string `db:"org_id"`
		PasswordHash string `db:"password_hash"`
		Role         string `db:"role"`
	}
	err := h.DB.Get(&user, `SELECT id, org_id, password_hash, role FROM users WHERE email=$1`, req.Email)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	if bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)) != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	token, err := issueToken(user.ID, user.OrgID, user.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "token issue failed"})
		return
	}

	if err := h.createSession(user.ID, user.OrgID, token); err != nil {
		fmt.Println("session insert error:", err)
	}

	c.JSON(http.StatusOK, gin.H{"token": token})
}

func (h *AuthHandler) Logout(c *gin.Context) {
	raw := strings.TrimPrefix(c.GetHeader("Authorization"), "Bearer ")
	if raw == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no token"})
		return
	}
	_, err := h.DB.Exec(`
		UPDATE sessions SET revoked_at = NOW()
		WHERE token_hash = $1
	`, hashToken(raw))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "logout failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "logged out"})
}

func issueToken(userID, orgID, role string) (string, error) {
	claims := jwt.MapClaims{
		"user_id": userID,
		"org_id":  orgID,
		"role":    role,
		"exp":     time.Now().Add(sessionExpiry).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(os.Getenv("JWT_SECRET")))
}
