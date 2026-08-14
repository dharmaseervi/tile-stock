package middleware

import (
	"crypto/sha256"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/jmoiron/sqlx"
)

func hashToken(token string) string {
	h := sha256.Sum256([]byte(token))
	return fmt.Sprintf("%x", h)
}

// AuthRequired validates the JWT, checks the session table, and sets
// org_id + user_id in context.
func AuthRequired(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if !strings.HasPrefix(header, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing token"})
			return
		}
		tokenStr := strings.TrimPrefix(header, "Bearer ")

		token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
			return []byte(os.Getenv("JWT_SECRET")), nil
		})
		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid claims"})
			return
		}

		// Check session table — catches revoked tokens even if JWT is still valid
		var session struct {
			RevokedAt *time.Time `db:"revoked_at"`
		}
		err = db.Get(&session, `
			SELECT revoked_at FROM sessions
			WHERE token_hash = $1
			AND expires_at > NOW()
		`, hashToken(tokenStr))

		log.Printf("session check: err=%v revoked=%v", err, session.RevokedAt)

		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "session not found"})
			return
		}
		if session.RevokedAt != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "session revoked"})
			return
		}

		c.Set("org_id", claims["org_id"])
		c.Set("user_id", claims["user_id"])
		c.Set("role", claims["role"])
		c.Next()
	}
}
