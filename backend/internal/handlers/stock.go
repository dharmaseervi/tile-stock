package handlers

import (
	"net/http"

	"tiles-stock/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type StockHandler struct{ DB *sqlx.DB }

type movementReq struct {
	ProductID    string  `json:"product_id" binding:"required"`
	BatchID      string  `json:"batch_id"`
	MovementType string  `json:"movement_type" binding:"required,oneof=in out"`
	Boxes        float64 `json:"boxes" binding:"required,gt=0"`
	Reference    string  `json:"reference"`
}

// RecordMovement handles both stock-in and stock-out. For 'out' movements,
// we check current stock first so we never let boxes go negative.
func (h *StockHandler) RecordMovement(c *gin.Context) {
	orgID := c.GetString("org_id")
	userID := c.GetString("user_id")
	var req movementReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.MovementType == "out" {
		var current float64
		err := h.DB.Get(&current,
			`SELECT COALESCE(SUM(CASE WHEN movement_type='in' THEN boxes ELSE -boxes END),0)
			 FROM stock_movements WHERE product_id=$1 AND org_id=$2`,
			req.ProductID, orgID,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "stock check failed"})
			return
		}
		if current < req.Boxes {
			c.JSON(http.StatusBadRequest, gin.H{"error": "insufficient stock", "available_boxes": current})
			return
		}
	}

	id := uuid.NewString()
	var batchID interface{}
	if req.BatchID != "" {
		batchID = req.BatchID
	}
	_, err := h.DB.Exec(
		`INSERT INTO stock_movements (id, org_id, product_id, batch_id, movement_type, boxes, reference, created_by)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
		id, orgID, req.ProductID, batchID, req.MovementType, req.Boxes, req.Reference, userID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to record movement"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"id": id})
}

func (h *StockHandler) CurrentStock(c *gin.Context) {
	orgID := c.GetString("org_id")
	stock := []models.CurrentStock{}
	err := h.DB.Select(&stock, `SELECT * FROM current_stock WHERE org_id=$1 ORDER BY brand, series_name`, orgID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch stock"})
		return
	}
	c.JSON(http.StatusOK, stock)
}

func (h *StockHandler) LowStock(c *gin.Context) {
	orgID := c.GetString("org_id")
	stock := []models.CurrentStock{}
	err := h.DB.Select(&stock,
		`SELECT * FROM current_stock WHERE org_id=$1 AND boxes_in_stock <= reorder_level ORDER BY boxes_in_stock ASC`,
		orgID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch low stock"})
		return
	}
	c.JSON(http.StatusOK, stock)
}

func (h *StockHandler) History(c *gin.Context) {
	orgID := c.GetString("org_id")
	productID := c.Query("product_id")
	movements := []models.StockMovement{}
	var err error
	if productID != "" {
		err = h.DB.Select(&movements,
			`SELECT * FROM stock_movements WHERE org_id=$1 AND product_id=$2 ORDER BY created_at DESC LIMIT 200`,
			orgID, productID,
		)
	} else {
		err = h.DB.Select(&movements,
			`SELECT * FROM stock_movements WHERE org_id=$1 ORDER BY created_at DESC LIMIT 200`,
			orgID,
		)
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch history"})
		return
	}
	c.JSON(http.StatusOK, movements)
}
