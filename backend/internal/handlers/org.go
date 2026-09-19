package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

type OrgHandler struct{ DB *sqlx.DB }

// Get returns the signed-in user's shop, so clients can show its name.
func (h *OrgHandler) Get(c *gin.Context) {
	orgID := c.GetString("org_id")
	var org struct {
		ID   string `db:"id" json:"id"`
		Name string `db:"name" json:"name"`
	}
	if err := h.DB.Get(&org, `SELECT id, name FROM orgs WHERE id=$1`, orgID); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "shop not found"})
		return
	}
	c.JSON(http.StatusOK, org)
}
