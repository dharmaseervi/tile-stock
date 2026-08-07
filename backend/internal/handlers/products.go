package handlers

import (
	"log"
	"net/http"
	"strconv"

	"tiles-stock/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type ProductHandler struct{ DB *sqlx.DB }

type productReq struct {
	Category     string      `json:"category"`
	Brand        string      `json:"brand" binding:"required"`
	SeriesName   string      `json:"series_name" binding:"required"`
	Size         string      `json:"size"`
	Finish       string      `json:"finish"`
	HSNCode      string      `json:"hsn_code"`
	Unit         string      `json:"unit"`
	Location     string      `json:"location"`
	PiecesPerBox int         `json:"pieces_per_box"`
	SqftPerBox   interface{} `json:"sqft_per_box"`
	ReorderLevel interface{} `json:"reorder_level"`
	PricePerBox  interface{} `json:"price_per_box"`
	CostPrice    interface{} `json:"cost_price"`
	ImageURL     string      `json:"image_url"`
}

func toFloat(v interface{}) float64 {
	switch val := v.(type) {
	case float64:
		return val
	case string:
		f, _ := strconv.ParseFloat(val, 64)
		return f
	}
	return 0
}

func toInt(v interface{}) int {
	switch val := v.(type) {
	case float64:
		return int(val)
	case string:
		i, _ := strconv.Atoi(val)
		return i
	}
	return 0
}

func (h *ProductHandler) Create(c *gin.Context) {
	orgID := c.GetString("org_id")
	var req productReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	log.Printf("create product: category=%q brand=%q series=%q size=%q unit=%q",
		req.Category, req.Brand, req.SeriesName, req.Size, req.Unit)

	category := req.Category
	if category == "" {
		category = "tile"
	}
	unit := req.Unit
	if unit == "" {
		unit = "box"
	}
	pieces := req.PiecesPerBox
	if pieces == 0 {
		pieces = 1
	}
	id := uuid.NewString()
	_, err := h.DB.Exec(
		`INSERT INTO products (id, org_id, category, brand, series_name, size, finish, hsn_code,
		 unit, pieces_per_box, sqft_per_box, reorder_level, price_per_box, cost_price, image_url, location)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
		id, orgID, category,
		req.Brand, req.SeriesName, req.Size, req.Finish, req.HSNCode,
		unit, pieces, toFloat(req.SqftPerBox), toInt(req.ReorderLevel),
		toFloat(req.PricePerBox), toFloat(req.CostPrice), req.ImageURL, req.Location,
	)
	if err != nil {
		log.Printf("INSERT error: %v", err)
		c.JSON(http.StatusConflict, gin.H{"error": "product already exists for this brand/series/size/finish"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"id": id})
}

func (h *ProductHandler) List(c *gin.Context) {
	orgID := c.GetString("org_id")
	var products []models.Product
	err := h.DB.Select(&products, `SELECT * FROM products WHERE org_id=$1 ORDER BY brand, series_name`, orgID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch products"})
		return
	}
	c.JSON(http.StatusOK, products)
}

func (h *ProductHandler) Delete(c *gin.Context) {
	orgID := c.GetString("org_id")
	id := c.Param("id")
	_, err := h.DB.Exec(`DELETE FROM products WHERE id=$1 AND org_id=$2`, id, orgID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "delete failed"})
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *ProductHandler) GetOne(c *gin.Context) {
	orgID := c.GetString("org_id")
	id := c.Param("id")
	var product models.Product
	err := h.DB.Get(&product, `SELECT * FROM products WHERE id=$1 AND org_id=$2`, id, orgID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "product not found"})
		return
	}

	var current models.CurrentStock
	_ = h.DB.Get(&current, `SELECT * FROM current_stock WHERE product_id=$1 AND org_id=$2`, id, orgID)

	c.JSON(http.StatusOK, gin.H{"product": product, "stock": current})
}

func (h *ProductHandler) Update(c *gin.Context) {
	orgID := c.GetString("org_id")
	id := c.Param("id")
	var req productReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	res, err := h.DB.Exec(
		`UPDATE products SET category=$1, brand=$2, series_name=$3, size=$4, finish=$5, hsn_code=$6,
		 unit=$7, pieces_per_box=$8, sqft_per_box=$9, reorder_level=$10, price_per_box=$11, cost_price=$12,
		 image_url=COALESCE(NULLIF($13,''), image_url), location=$14
		 WHERE id=$15 AND org_id=$16`,
		req.Category, req.Brand, req.SeriesName, req.Size, req.Finish, req.HSNCode,
		req.Unit, req.PiecesPerBox, toFloat(req.SqftPerBox), toInt(req.ReorderLevel),
		toFloat(req.PricePerBox), toFloat(req.CostPrice),
		req.ImageURL, req.Location, id, orgID,
	)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "update failed — duplicate brand/series/size/finish?"})
		return
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "product not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"id": id})
}
