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
	var stock []models.CurrentStock
	err := h.DB.Select(&stock, `SELECT * FROM current_stock WHERE org_id=$1 ORDER BY brand, series_name`, orgID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch stock"})
		return
	}
	c.JSON(http.StatusOK, stock)
}

func (h *StockHandler) LowStock(c *gin.Context) {
	orgID := c.GetString("org_id")
	var stock []models.CurrentStock
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
	var movements []models.StockMovement
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

type productStat struct {
	ProductID   string  `db:"product_id" json:"product_id"`
	Brand       string  `db:"brand" json:"brand"`
	SeriesName  string  `db:"series_name" json:"series_name"`
	Size        string  `db:"size" json:"size"`
	Finish      *string `db:"finish" json:"finish"`
	TotalIn     float64 `db:"total_in" json:"total_in"`
	TotalOut    float64 `db:"total_out" json:"total_out"`
	InStock     float64 `db:"in_stock" json:"in_stock"`
	Turnover    float64 `db:"turnover" json:"turnover"`
	Revenue     float64 `db:"revenue" json:"revenue"`
	LastMovedAt *string `db:"last_moved_at" json:"last_moved_at"`
}

func (h *StockHandler) Analytics(c *gin.Context) {
	orgID := c.GetString("org_id")

	var stats []productStat
	err := h.DB.Select(&stats, `
		SELECT
			p.id AS product_id,
			p.brand,
			p.series_name,
			p.size,
			p.finish,
			COALESCE(SUM(CASE WHEN m.movement_type='in' THEN m.boxes ELSE 0 END), 0) AS total_in,
			COALESCE(SUM(CASE WHEN m.movement_type='out' THEN m.boxes ELSE 0 END), 0) AS total_out,
			COALESCE(SUM(CASE WHEN m.movement_type='in' THEN m.boxes ELSE -m.boxes END), 0) AS in_stock,
			COALESCE(SUM(CASE WHEN m.movement_type='out' THEN m.boxes ELSE 0 END), 0) AS turnover,
			COALESCE(SUM(CASE WHEN m.movement_type='out' THEN m.boxes ELSE 0 END), 0) * p.price_per_box AS revenue,
			MAX(m.created_at::text) AS last_moved_at
		FROM products p
		LEFT JOIN stock_movements m ON m.product_id = p.id AND m.org_id = $1
		WHERE p.org_id = $1
		GROUP BY p.id
		ORDER BY turnover DESC
	`, orgID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "analytics failed"})
		return
	}

	// Summary totals
	var totalRevenue float64
	var totalProducts int
	for _, s := range stats {
		totalRevenue += s.Revenue
		totalProducts++
		_ = s
	}

	c.JSON(http.StatusOK, gin.H{
		"products":       stats,
		"total_revenue":  totalRevenue,
		"total_products": totalProducts,
	})
}
