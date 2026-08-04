package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type SupplierHandler struct{ DB *sqlx.DB }

type supplierReq struct {
	Name        string `json:"name" binding:"required"`
	ContactName string `json:"contact_name"`
	Phone       string `json:"phone"`
	Email       string `json:"email"`
	Address     string `json:"address"`
	Notes       string `json:"notes"`
}

func (h *SupplierHandler) List(c *gin.Context) {
	orgID := c.GetString("org_id")
	var suppliers []struct {
		ID          string  `db:"id" json:"id"`
		Name        string  `db:"name" json:"name"`
		ContactName *string `db:"contact_name" json:"contact_name"`
		Phone       *string `db:"phone" json:"phone"`
		Email       *string `db:"email" json:"email"`
		ProductCount int    `db:"product_count" json:"product_count"`
	}
	h.DB.Select(&suppliers, `
		SELECT s.id, s.name, s.contact_name, s.phone, s.email,
			COUNT(p.id) AS product_count
		FROM suppliers s
		LEFT JOIN products p ON p.supplier_id = s.id
		WHERE s.org_id = $1
		GROUP BY s.id
		ORDER BY s.name
	`, orgID)
	c.JSON(http.StatusOK, suppliers)
}

func (h *SupplierHandler) Create(c *gin.Context) {
	orgID := c.GetString("org_id")
	var req supplierReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	id := uuid.NewString()
	h.DB.Exec(
		`INSERT INTO suppliers (id, org_id, name, contact_name, phone, email, address, notes)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
		id, orgID, req.Name, req.ContactName, req.Phone, req.Email, req.Address, req.Notes,
	)
	c.JSON(http.StatusCreated, gin.H{"id": id})
}

func (h *SupplierHandler) Update(c *gin.Context) {
	orgID := c.GetString("org_id")
	id := c.Param("id")
	var req supplierReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	h.DB.Exec(
		`UPDATE suppliers SET name=$1, contact_name=$2, phone=$3, email=$4, address=$5, notes=$6
		 WHERE id=$7 AND org_id=$8`,
		req.Name, req.ContactName, req.Phone, req.Email, req.Address, req.Notes, id, orgID,
	)
	c.JSON(http.StatusOK, gin.H{"id": id})
}

func (h *SupplierHandler) Delete(c *gin.Context) {
	orgID := c.GetString("org_id")
	id := c.Param("id")
	h.DB.Exec(`DELETE FROM suppliers WHERE id=$1 AND org_id=$2`, id, orgID)
	c.Status(http.StatusNoContent)
}
