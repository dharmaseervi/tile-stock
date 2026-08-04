package handlers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type OrderHandler struct{ DB *sqlx.DB }

type orderItemInput struct {
	ProductID   string  `json:"product_id" binding:"required"`
	Boxes       float64 `json:"boxes" binding:"required,gt=0"`
	PricePerBox float64 `json:"price_per_box"`
	Notes       string  `json:"notes"`
}

type createOrderReq struct {
	CustomerID      string           `json:"customer_id"`
	BranchID        string           `json:"branch_id"`
	DeliveryAddress string           `json:"delivery_address"`
	Notes           string           `json:"notes"`
	Items           []orderItemInput `json:"items" binding:"required,min=1"`
}

// generateChallanNumber creates a sequential challan number like CH-2024-0001
func generateChallanNumber(db *sqlx.DB, orgID string) string {
	var count int
	db.Get(&count, `SELECT COUNT(*) FROM orders WHERE org_id=$1`, orgID)
	year := time.Now().Year()
	return fmt.Sprintf("CH-%d-%04d", year, count+1)
}

func (h *OrderHandler) Create(c *gin.Context) {
	orgID := c.GetString("org_id")
	userID := c.GetString("user_id")
	var req createOrderReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tx := h.DB.MustBegin()
	orderID := uuid.NewString()
	challanNum := generateChallanNumber(h.DB, orgID)

	var customerID, branchID interface{}
	if req.CustomerID != "" {
		customerID = req.CustomerID
	}
	if req.BranchID != "" {
		branchID = req.BranchID
	}

	_, err := tx.Exec(
		`INSERT INTO orders (id, org_id, customer_id, branch_id, challan_number, delivery_address, notes, created_by)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
		orderID, orgID, customerID, branchID, challanNum, req.DeliveryAddress, req.Notes, userID,
	)
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create order"})
		return
	}

	for _, item := range req.Items {
		itemID := uuid.NewString()
		_, err := tx.Exec(
			`INSERT INTO order_items (id, order_id, product_id, boxes, price_per_box, notes)
			 VALUES ($1,$2,$3,$4,$5,$6)`,
			itemID, orderID, item.ProductID, item.Boxes, item.PricePerBox, item.Notes,
		)
		if err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to add order item"})
			return
		}
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "order commit failed"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"id": orderID, "challan_number": challanNum})
}

func (h *OrderHandler) List(c *gin.Context) {
	orgID := c.GetString("org_id")
	var orders []struct {
		ID            string  `db:"id" json:"id"`
		ChallanNumber string  `db:"challan_number" json:"challan_number"`
		Status        string  `db:"status" json:"status"`
		CustomerName  *string `db:"customer_name" json:"customer_name"`
		TotalBoxes    float64 `db:"total_boxes" json:"total_boxes"`
		TotalValue    float64 `db:"total_value" json:"total_value"`
		CreatedAt     string  `db:"created_at" json:"created_at"`
	}
	h.DB.Select(&orders, `
		SELECT o.id, o.challan_number, o.status, cu.name AS customer_name,
			COALESCE(SUM(oi.boxes), 0) AS total_boxes,
			COALESCE(SUM(oi.boxes * oi.price_per_box), 0) AS total_value,
			o.created_at::text
		FROM orders o
		LEFT JOIN customers cu ON cu.id = o.customer_id
		LEFT JOIN order_items oi ON oi.order_id = o.id
		WHERE o.org_id = $1
		GROUP BY o.id, cu.name
		ORDER BY o.created_at DESC
		LIMIT 100
	`, orgID)
	c.JSON(http.StatusOK, orders)
}

func (h *OrderHandler) GetOne(c *gin.Context) {
	orgID := c.GetString("org_id")
	id := c.Param("id")

	var order struct {
		ID              string  `db:"id" json:"id"`
		ChallanNumber   string  `db:"challan_number" json:"challan_number"`
		Status          string  `db:"status" json:"status"`
		CustomerID      *string `db:"customer_id" json:"customer_id"`
		CustomerName    *string `db:"customer_name" json:"customer_name"`
		CustomerPhone   *string `db:"customer_phone" json:"customer_phone"`
		DeliveryAddress *string `db:"delivery_address" json:"delivery_address"`
		Notes           *string `db:"notes" json:"notes"`
		CreatedAt       string  `db:"created_at" json:"created_at"`
	}
	err := h.DB.Get(&order, `
		SELECT o.id, o.challan_number, o.status, o.customer_id, o.delivery_address, o.notes, o.created_at::text,
			cu.name AS customer_name, cu.phone AS customer_phone
		FROM orders o
		LEFT JOIN customers cu ON cu.id = o.customer_id
		WHERE o.id=$1 AND o.org_id=$2
	`, id, orgID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
		return
	}

	var items []struct {
		ID          string  `db:"id" json:"id"`
		ProductID   string  `db:"product_id" json:"product_id"`
		Brand       string  `db:"brand" json:"brand"`
		SeriesName  string  `db:"series_name" json:"series_name"`
		Size        string  `db:"size" json:"size"`
		Finish      *string `db:"finish" json:"finish"`
		Boxes       float64 `db:"boxes" json:"boxes"`
		PricePerBox float64 `db:"price_per_box" json:"price_per_box"`
		Loaded      bool    `db:"loaded" json:"loaded"`
		Notes       *string `db:"notes" json:"notes"`
	}
	h.DB.Select(&items, `
		SELECT oi.id, oi.product_id, p.brand, p.series_name, p.size, p.finish,
			oi.boxes, oi.price_per_box, oi.loaded, oi.notes
		FROM order_items oi
		JOIN products p ON p.id = oi.product_id
		WHERE oi.order_id=$1
		ORDER BY p.brand, p.series_name
	`, id)

	c.JSON(http.StatusOK, gin.H{"order": order, "items": items})
}

// ToggleLoaded lets workers tick/untick individual line items as they load
func (h *OrderHandler) ToggleLoaded(c *gin.Context) {
	orgID := c.GetString("org_id")
	orderID := c.Param("id")
	itemID := c.Param("item_id")

	var loaded bool
	err := h.DB.Get(&loaded,
		`SELECT oi.loaded FROM order_items oi JOIN orders o ON o.id=oi.order_id
		 WHERE oi.id=$1 AND oi.order_id=$2 AND o.org_id=$3`,
		itemID, orderID, orgID,
	)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "item not found"})
		return
	}
	h.DB.Exec(`UPDATE order_items SET loaded=$1 WHERE id=$2`, !loaded, itemID)
	c.JSON(http.StatusOK, gin.H{"loaded": !loaded})
}

// UpdateStatus moves order through workflow;
// dispatching auto-creates stock-out movements
func (h *OrderHandler) UpdateStatus(c *gin.Context) {
	orgID := c.GetString("org_id")
	userID := c.GetString("user_id")
	id := c.Param("id")
	var req struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Status == "dispatched" {
		var items []struct {
			ProductID string  `db:"product_id"`
			Boxes     float64 `db:"boxes"`
		}
		h.DB.Select(&items, `
			SELECT oi.product_id, oi.boxes FROM order_items oi
			JOIN orders o ON o.id=oi.order_id
			WHERE oi.order_id=$1 AND o.org_id=$2
		`, id, orgID)

		tx := h.DB.MustBegin()
		for _, item := range items {
			ref := "Order " + id
			mvID := uuid.NewString()
			tx.Exec(
				`INSERT INTO stock_movements (id, org_id, product_id, movement_type, boxes, reference, created_by)
				 VALUES ($1,$2,$3,'out',$4,$5,$6)`,
				mvID, orgID, item.ProductID, item.Boxes, ref, userID,
			)
		}
		tx.Exec(`UPDATE orders SET status=$1 WHERE id=$2 AND org_id=$3`, req.Status, id, orgID)
		if err := tx.Commit(); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "dispatch failed"})
			return
		}
	} else {
		h.DB.Exec(`UPDATE orders SET status=$1 WHERE id=$2 AND org_id=$3`, req.Status, id, orgID)
	}

	c.JSON(http.StatusOK, gin.H{"status": req.Status})
}
