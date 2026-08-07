package handlers

import (
	"encoding/csv"
	"fmt"
	"net/http"
	"time"

	"tiles-stock/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type StockHandler struct{ DB *sqlx.DB }

type movementReq struct {
	ProductID    string  `json:"product_id" binding:"required"`
	BatchID      string  `json:"batch_id"`
	MovementType string  `json:"movement_type" binding:"required,oneof=in out adjustment damage"`
	Boxes        float64 `json:"boxes" binding:"required,gt=0"`
	Reference    string  `json:"reference"`
	Reason       string  `json:"reason"`
}

func (h *StockHandler) RecordMovement(c *gin.Context) {
	orgID := c.GetString("org_id")
	userID := c.GetString("user_id")
	var req movementReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// For out/adjustment/damage: check stock won't go negative
	if req.MovementType != "in" {
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
		`INSERT INTO stock_movements
		 (id, org_id, product_id, batch_id, movement_type, boxes, reference, reason, created_by)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
		id, orgID, req.ProductID, batchID, req.MovementType,
		req.Boxes, req.Reference, req.Reason, userID,
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
	err := h.DB.Select(&stock,
		`SELECT * FROM current_stock WHERE org_id=$1 ORDER BY brand, series_name`, orgID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch stock"})
		return
	}
	if stock == nil {
		stock = []models.CurrentStock{}
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
	if stock == nil {
		stock = []models.CurrentStock{}
	}
	c.JSON(http.StatusOK, stock)
}

func (h *StockHandler) History(c *gin.Context) {
	orgID := c.GetString("org_id")
	productID := c.Query("product_id")
	dateFrom := c.Query("from")
	dateTo := c.Query("to")

	query := `
		SELECT id, org_id, product_id, batch_id, movement_type, boxes, reference, reason, created_by, created_at
		FROM stock_movements
		WHERE org_id=$1`
	args := []interface{}{orgID}
	argIdx := 2

	if productID != "" {
		query += fmt.Sprintf(" AND product_id=$%d", argIdx)
		args = append(args, productID)
		argIdx++
	}
	if dateFrom != "" {
		query += fmt.Sprintf(" AND created_at >= $%d", argIdx)
		args = append(args, dateFrom)
		argIdx++
	}
	if dateTo != "" {
		query += fmt.Sprintf(" AND created_at < $%d", argIdx)
		args = append(args, dateTo)
		argIdx++
	}
	query += " ORDER BY created_at DESC LIMIT 500"

	var movements []models.StockMovement
	err := h.DB.Select(&movements, query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch history"})
		return
	}
	if movements == nil {
		movements = []models.StockMovement{}
	}
	c.JSON(http.StatusOK, movements)
}

// ExportCSV streams a CSV of all movements for the requested date range
func (h *StockHandler) ExportCSV(c *gin.Context) {
	orgID := c.GetString("org_id")
	dateFrom := c.Query("from")
	dateTo := c.Query("to")

	query := `
		SELECT
			m.created_at::text,
			m.movement_type,
			p.brand,
			p.series_name,
			p.size,
			p.finish,
			m.boxes,
			m.reference,
			m.reason,
			u.email AS user_email
		FROM stock_movements m
		JOIN products p ON p.id = m.product_id
		LEFT JOIN users u ON u.id = m.created_by
		WHERE m.org_id=$1`
	args := []interface{}{orgID}
	argIdx := 2

	if dateFrom != "" {
		query += fmt.Sprintf(" AND m.created_at >= $%d", argIdx)
		args = append(args, dateFrom)
		argIdx++
	}
	if dateTo != "" {
		query += fmt.Sprintf(" AND m.created_at < $%d", argIdx)
		args = append(args, dateTo)
		argIdx++
	}
	query += " ORDER BY m.created_at DESC"

	rows, err := h.DB.Query(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "export failed"})
		return
	}
	defer rows.Close()

	filename := fmt.Sprintf("stock-movements-%s.csv", time.Now().Format("2006-01-02"))
	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))

	w := csv.NewWriter(c.Writer)
	w.Write([]string{"Date", "Type", "Brand", "Series", "Size", "Finish", "Boxes", "Reference", "Reason", "User"})

	for rows.Next() {
		var (
			createdAt, movType, brand, seriesName, size string
			finish, reference, reason, userEmail        *string
			boxes                                       float64
		)
		rows.Scan(&createdAt, &movType, &brand, &seriesName, &size,
			&finish, &boxes, &reference, &reason, &userEmail)
		row := []string{
			createdAt, movType, brand, seriesName, size,
			str(finish), fmt.Sprintf("%.2f", boxes),
			str(reference), str(reason), str(userEmail),
		}
		w.Write(row)
	}
	w.Flush()
}

func str(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

// DashboardStats returns summary stats with optional date filtering
func (h *StockHandler) DashboardStats(c *gin.Context) {
	orgID := c.GetString("org_id")
	dateFrom := c.Query("from")
	dateTo := c.Query("to")

	var stats struct {
		TotalProducts int     `db:"total_products" json:"total_products"`
		TotalBoxes    float64 `db:"total_boxes" json:"total_boxes"`
		StockValue    float64 `db:"stock_value" json:"stock_value"`
		LowStockCount int     `db:"low_stock_count" json:"low_stock_count"`
		BoxesOut      float64 `db:"boxes_out" json:"boxes_out"`
		Revenue       float64 `db:"revenue" json:"revenue"`
		DamageBoxes   float64 `db:"damage_boxes" json:"damage_boxes"`
	}

	// Current stock stats (always all-time, it's a snapshot)
	h.DB.Get(&stats.TotalProducts,
		`SELECT COUNT(*) FROM products WHERE org_id=$1`, orgID)
	h.DB.Get(&stats.TotalBoxes,
		`SELECT COALESCE(SUM(boxes_in_stock),0) FROM current_stock WHERE org_id=$1`, orgID)
	h.DB.Get(&stats.StockValue,
		`SELECT COALESCE(SUM(stock_value),0) FROM current_stock WHERE org_id=$1`, orgID)
	h.DB.Get(&stats.LowStockCount,
		`SELECT COUNT(*) FROM current_stock WHERE org_id=$1 AND boxes_in_stock <= reorder_level`, orgID)

	// Period-based stats
	periodQuery := `SELECT
		COALESCE(SUM(CASE WHEN movement_type='out' THEN boxes ELSE 0 END), 0) AS boxes_out,
		COALESCE(SUM(CASE WHEN movement_type='damage' THEN boxes ELSE 0 END), 0) AS damage_boxes
		FROM stock_movements m
		JOIN products p ON p.id = m.product_id
		WHERE m.org_id=$1`
	args := []interface{}{orgID}
	argIdx := 2
	if dateFrom != "" {
		periodQuery += fmt.Sprintf(" AND m.created_at >= $%d", argIdx)
		args = append(args, dateFrom)
		argIdx++
	}
	if dateTo != "" {
		periodQuery += fmt.Sprintf(" AND m.created_at < $%d", argIdx)
		args = append(args, dateTo)
	}

	var period struct {
		BoxesOut    float64 `db:"boxes_out"`
		DamageBoxes float64 `db:"damage_boxes"`
	}
	h.DB.Get(&period, periodQuery, args...)
	stats.BoxesOut = period.BoxesOut
	stats.DamageBoxes = period.DamageBoxes

	// Revenue = boxes out * price_per_box
	revenueQuery := `SELECT COALESCE(SUM(m.boxes * p.price_per_box),0)
		FROM stock_movements m
		JOIN products p ON p.id = m.product_id
		WHERE m.org_id=$1 AND m.movement_type='out'`
	revenueArgs := []interface{}{orgID}
	revenueIdx := 2
	if dateFrom != "" {
		revenueQuery += fmt.Sprintf(" AND m.created_at >= $%d", revenueIdx)
		revenueArgs = append(revenueArgs, dateFrom)
		revenueIdx++
	}
	if dateTo != "" {
		revenueQuery += fmt.Sprintf(" AND m.created_at < $%d", revenueIdx)
		revenueArgs = append(revenueArgs, dateTo)
	}
	h.DB.Get(&stats.Revenue, revenueQuery, revenueArgs...)

	c.JSON(http.StatusOK, stats)
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
	dateFrom := c.Query("from")
	dateTo := c.Query("to")

	// Build date filter for movements
	movFilter := ""
	movArgs := []interface{}{orgID}
	if dateFrom != "" {
		movFilter += fmt.Sprintf(" AND m.created_at >= $%d", len(movArgs)+1)
		movArgs = append(movArgs, dateFrom)
	}
	if dateTo != "" {
		movFilter += fmt.Sprintf(" AND m.created_at < $%d", len(movArgs)+1)
		movArgs = append(movArgs, dateTo)
	}

	query := fmt.Sprintf(`
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
		LEFT JOIN stock_movements m ON m.product_id = p.id AND m.org_id = $1%s
		WHERE p.org_id = $1
		GROUP BY p.id
		ORDER BY turnover DESC
	`, movFilter)

	var stats []productStat
	err := h.DB.Select(&stats, query, movArgs...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "analytics failed"})
		return
	}
	if stats == nil {
		stats = []productStat{}
	}

	totalRevenue := 0.0
	for _, s := range stats {
		totalRevenue += s.Revenue
	}

	c.JSON(http.StatusOK, gin.H{
		"products":       stats,
		"total_revenue":  totalRevenue,
		"total_products": len(stats),
	})
}
