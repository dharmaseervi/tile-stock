package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type BranchHandler struct{ DB *sqlx.DB }

type branchReq struct {
	Name    string `json:"name" binding:"required"`
	Address string `json:"address"`
}

func (h *BranchHandler) List(c *gin.Context) {
	orgID := c.GetString("org_id")
	var branches []struct {
		ID      string  `db:"id" json:"id"`
		Name    string  `db:"name" json:"name"`
		Address *string `db:"address" json:"address"`
	}
	h.DB.Select(&branches, `SELECT id, name, address FROM branches WHERE org_id=$1 ORDER BY name`, orgID)
	c.JSON(http.StatusOK, branches)
}

func (h *BranchHandler) Create(c *gin.Context) {
	orgID := c.GetString("org_id")
	var req branchReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	id := uuid.NewString()
	_, err := h.DB.Exec(`INSERT INTO branches (id, org_id, name, address) VALUES ($1,$2,$3,$4)`,
		id, orgID, req.Name, req.Address)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "branch name already exists"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"id": id})
}

func (h *BranchHandler) Delete(c *gin.Context) {
	orgID := c.GetString("org_id")
	id := c.Param("id")
	h.DB.Exec(`DELETE FROM branches WHERE id=$1 AND org_id=$2`, id, orgID)
	c.Status(http.StatusNoContent)
}
