package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

type ActivityHandler struct{ DB *sqlx.DB }

// GetActivityLog returns recent stock movements with user info — the audit trail
// showing which staff member recorded each movement.
func (h *ActivityHandler) GetActivityLog(c *gin.Context) {
	orgID := c.GetString("org_id")
	limit := 100

	var log []struct {
		ID           string  `db:"id" json:"id"`
		MovementType string  `db:"movement_type" json:"movement_type"`
		Boxes        float64 `db:"boxes" json:"boxes"`
		Reference    *string `db:"reference" json:"reference"`
		Brand        string  `db:"brand" json:"brand"`
		SeriesName   string  `db:"series_name" json:"series_name"`
		Size         string  `db:"size" json:"size"`
		UserEmail    *string `db:"user_email" json:"user_email"`
		CreatedAt    string  `db:"created_at" json:"created_at"`
	}
	err := h.DB.Select(&log, `
		SELECT
			m.id,
			m.movement_type,
			m.boxes,
			m.reference,
			p.brand,
			p.series_name,
			p.size,
			u.email AS user_email,
			m.created_at::text
		FROM stock_movements m
		JOIN products p ON p.id = m.product_id
		LEFT JOIN users u ON u.id = m.created_by
		WHERE m.org_id = $1
		ORDER BY m.created_at DESC
		LIMIT $2
	`, orgID, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch activity log"})
		return
	}
	if log == nil {
		log = []struct {
			ID           string  `db:"id" json:"id"`
			MovementType string  `db:"movement_type" json:"movement_type"`
			Boxes        float64 `db:"boxes" json:"boxes"`
			Reference    *string `db:"reference" json:"reference"`
			Brand        string  `db:"brand" json:"brand"`
			SeriesName   string  `db:"series_name" json:"series_name"`
			Size         string  `db:"size" json:"size"`
			UserEmail    *string `db:"user_email" json:"user_email"`
			CreatedAt    string  `db:"created_at" json:"created_at"`
		}{}
	}
	c.JSON(http.StatusOK, log)
}
