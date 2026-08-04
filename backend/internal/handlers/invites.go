package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"golang.org/x/crypto/bcrypt"
)

type InviteHandler struct{ DB *sqlx.DB }

type inviteReq struct {
	Email string `json:"email" binding:"required,email"`
	Role  string `json:"role"`
}

func (h *InviteHandler) Create(c *gin.Context) {
	orgID := c.GetString("org_id")
	role := c.GetString("role")
	if role != "owner" {
		c.JSON(http.StatusForbidden, gin.H{"error": "only owners can invite staff"})
		return
	}
	var req inviteReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.Role == "" {
		req.Role = "staff"
	}

	tokenBytes := make([]byte, 16)
	rand.Read(tokenBytes)
	token := hex.EncodeToString(tokenBytes)

	id := uuid.NewString()
	_, err := h.DB.Exec(
		`INSERT INTO invites (id, org_id, email, role, token) VALUES ($1,$2,$3,$4,$5)
		 ON CONFLICT (email) DO UPDATE SET token=$5, role=$4, accepted_at=NULL`,
		id, orgID, req.Email, req.Role, token,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create invite"})
		return
	}

	frontendURL := os.Getenv("FRONTEND_URL")
	inviteLink := frontendURL + "/accept-invite?token=" + token
	c.JSON(http.StatusCreated, gin.H{"invite_link": inviteLink, "token": token})
}

type acceptInviteReq struct {
	Token    string `json:"token" binding:"required"`
	Password string `json:"password" binding:"required,min=8"`
}

func (h *InviteHandler) Accept(c *gin.Context) {
	var req acceptInviteReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var invite struct {
		ID         string     `db:"id"`
		OrgID      string     `db:"org_id"`
		Email      string     `db:"email"`
		Role       string     `db:"role"`
		AcceptedAt *time.Time `db:"accepted_at"`
	}
	err := h.DB.Get(&invite, `SELECT id, org_id, email, role, accepted_at FROM invites WHERE token=$1`, req.Token)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "invite not found or expired"})
		return
	}
	if invite.AcceptedAt != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "invite already accepted"})
		return
	}

	hash, _ := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	userID := uuid.NewString()
	_, err = h.DB.Exec(
		`INSERT INTO users (id, org_id, email, password_hash, role) VALUES ($1,$2,$3,$4,$5)`,
		userID, invite.OrgID, invite.Email, string(hash), invite.Role,
	)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "email already registered"})
		return
	}

	h.DB.Exec(`UPDATE invites SET accepted_at=now() WHERE id=$1`, invite.ID)

	claims := jwt.MapClaims{
		"user_id": userID,
		"org_id":  invite.OrgID,
		"role":    invite.Role,
		"exp":     time.Now().Add(7 * 24 * time.Hour).Unix(),
	}
	jwtToken := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, _ := jwtToken.SignedString([]byte(os.Getenv("JWT_SECRET")))
	c.JSON(http.StatusCreated, gin.H{"token": signed})
}

func (h *InviteHandler) ListStaff(c *gin.Context) {
	orgID := c.GetString("org_id")
	var users []struct {
		ID        string `db:"id" json:"id"`
		Email     string `db:"email" json:"email"`
		Role      string `db:"role" json:"role"`
		CreatedAt string `db:"created_at" json:"created_at"`
	}
	h.DB.Select(&users, `SELECT id, email, role, created_at::text FROM users WHERE org_id=$1 ORDER BY created_at`, orgID)
	c.JSON(http.StatusOK, users)
}
