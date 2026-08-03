package handlers

import (
	"net/http"

	"tiles-stock/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type BatchHandler struct{ DB *sqlx.DB }

type batchReq struct {
	ProductID  string `json:"product_id" binding:"required"`
	LotNumber  string `json:"lot_number" binding:"required"`
	ReceivedAt string `json:"received_at"` // YYYY-MM-DD, optional
}

func (h *BatchHandler) Create(c *gin.Context) {
	orgID := c.GetString("org_id")
	var req batchReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	id := uuid.NewString()
	var err error
	if req.ReceivedAt != "" {
		_, err = h.DB.Exec(
			`INSERT INTO batches (id, org_id, product_id, lot_number, received_at) VALUES ($1,$2,$3,$4,$5)`,
			id, orgID, req.ProductID, req.LotNumber, req.ReceivedAt,
		)
	} else {
		_, err = h.DB.Exec(
			`INSERT INTO batches (id, org_id, product_id, lot_number) VALUES ($1,$2,$3,$4)`,
			id, orgID, req.ProductID, req.LotNumber,
		)
	}
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "batch/lot already exists for this product"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"id": id})
}

func (h *BatchHandler) ListForProduct(c *gin.Context) {
	orgID := c.GetString("org_id")
	productID := c.Param("product_id")
	batches := []models.Batch{}
	err := h.DB.Select(&batches,
		`SELECT * FROM batches WHERE org_id=$1 AND product_id=$2 ORDER BY created_at DESC`,
		orgID, productID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch batches"})
		return
	}
	c.JSON(http.StatusOK, batches)
}
