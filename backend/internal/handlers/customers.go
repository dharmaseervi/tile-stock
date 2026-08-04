package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type CustomerHandler struct{ DB *sqlx.DB }

type customerReq struct {
	Name        string  `json:"name" binding:"required"`
	Phone       string  `json:"phone"`
	Address     string  `json:"address"`
	CreditLimit float64 `json:"credit_limit"`
	Notes       string  `json:"notes"`
}

func (h *CustomerHandler) List(c *gin.Context) {
	orgID := c.GetString("org_id")
	var customers []struct {
		ID          string  `db:"id" json:"id"`
		Name        string  `db:"name" json:"name"`
		Phone       *string `db:"phone" json:"phone"`
		Address     *string `db:"address" json:"address"`
		CreditLimit float64 `db:"credit_limit" json:"credit_limit"`
		TotalOrders int     `db:"total_orders" json:"total_orders"`
		TotalValue  float64 `db:"total_value" json:"total_value"`
	}
	err := h.DB.Select(&customers, `
		SELECT
			c.id, c.name, c.phone, c.address, c.credit_limit,
			COUNT(DISTINCT o.id) AS total_orders,
			COALESCE(SUM(oi.boxes * oi.price_per_box), 0) AS total_value
		FROM customers c
		LEFT JOIN orders o ON o.customer_id = c.id AND o.status != 'cancelled'
		LEFT JOIN order_items oi ON oi.order_id = o.id
		WHERE c.org_id = $1
		GROUP BY c.id
		ORDER BY c.name
	`, orgID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch customers"})
		return
	}
	c.JSON(http.StatusOK, customers)
}

func (h *CustomerHandler) Create(c *gin.Context) {
	orgID := c.GetString("org_id")
	var req customerReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	id := uuid.NewString()
	_, err := h.DB.Exec(
		`INSERT INTO customers (id, org_id, name, phone, address, credit_limit, notes)
		 VALUES ($1,$2,$3,$4,$5,$6,$7)`,
		id, orgID, req.Name, req.Phone, req.Address, req.CreditLimit, req.Notes,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create customer"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"id": id})
}

func (h *CustomerHandler) Update(c *gin.Context) {
	orgID := c.GetString("org_id")
	id := c.Param("id")
	var req customerReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	h.DB.Exec(
		`UPDATE customers SET name=$1, phone=$2, address=$3, credit_limit=$4, notes=$5 WHERE id=$6 AND org_id=$7`,
		req.Name, req.Phone, req.Address, req.CreditLimit, req.Notes, id, orgID,
	)
	c.JSON(http.StatusOK, gin.H{"id": id})
}

func (h *CustomerHandler) GetLedger(c *gin.Context) {
	orgID := c.GetString("org_id")
	id := c.Param("id")

	var customer struct {
		ID          string  `db:"id" json:"id"`
		Name        string  `db:"name" json:"name"`
		Phone       *string `db:"phone" json:"phone"`
		CreditLimit float64 `db:"credit_limit" json:"credit_limit"`
	}
	if err := h.DB.Get(&customer, `SELECT id, name, phone, credit_limit FROM customers WHERE id=$1 AND org_id=$2`, id, orgID); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "customer not found"})
		return
	}

	var orders []struct {
		ID            string  `db:"id" json:"id"`
		ChallanNumber string  `db:"challan_number" json:"challan_number"`
		Status        string  `db:"status" json:"status"`
		TotalValue    float64 `db:"total_value" json:"total_value"`
		CreatedAt     string  `db:"created_at" json:"created_at"`
	}
	h.DB.Select(&orders, `
		SELECT o.id, o.challan_number, o.status,
			COALESCE(SUM(oi.boxes * oi.price_per_box), 0) AS total_value,
			o.created_at::text
		FROM orders o
		LEFT JOIN order_items oi ON oi.order_id = o.id
		WHERE o.customer_id=$1 AND o.org_id=$2
		GROUP BY o.id
		ORDER BY o.created_at DESC
	`, id, orgID)

	totalValue := 0.0
	for _, o := range orders {
		totalValue += o.TotalValue
	}

	c.JSON(http.StatusOK, gin.H{
		"customer":    customer,
		"orders":      orders,
		"total_value": totalValue,
	})
}
