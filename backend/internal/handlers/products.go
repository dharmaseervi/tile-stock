package handlers

import (
	"net/http"

	"tiles-stock/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type ProductHandler struct{ DB *sqlx.DB }

type productReq struct {
	Brand        string  `json:"brand" binding:"required"`
	SeriesName   string  `json:"series_name" binding:"required"`
	Size         string  `json:"size" binding:"required"`
	Finish       string  `json:"finish"`
	HSNCode      string  `json:"hsn_code"`
	PiecesPerBox int     `json:"pieces_per_box" binding:"required,min=1"`
	SqftPerBox   float64 `json:"sqft_per_box"`
	ReorderLevel int     `json:"reorder_level"`
	PricePerBox  float64 `json:"price_per_box"`
	ImageURL     string  `json:"image_url"`
}

func (h *ProductHandler) Create(c *gin.Context) {
	orgID := c.GetString("org_id")
	var req productReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	id := uuid.NewString()
	_, err := h.DB.Exec(
		`INSERT INTO products (id, org_id, brand, series_name, size, finish, hsn_code, pieces_per_box, sqft_per_box, reorder_level, price_per_box, image_url)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
		id, orgID, req.Brand, req.SeriesName, req.Size, req.Finish, req.HSNCode, req.PiecesPerBox, req.SqftPerBox, req.ReorderLevel, req.PricePerBox, req.ImageURL,
	)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "product already exists for this brand/series/size/finish"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"id": id})
}

func (h *ProductHandler) List(c *gin.Context) {
	orgID := c.GetString("org_id")
	var products []models.Product
	err := h.DB.Select(&products, `
    SELECT id, org_id, brand, series_name, size, finish, hsn_code,
           pieces_per_box, sqft_per_box, reorder_level, price_per_box, image_url, created_at
    FROM products WHERE org_id=$1 ORDER BY brand, series_name`, orgID)
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
	err := h.DB.Get(&product,
		`SELECT id, org_id, brand, series_name, size, finish, hsn_code,
            pieces_per_box, sqft_per_box, reorder_level, price_per_box, image_url, created_at
     FROM products WHERE id=$1 AND org_id=$2`, id, orgID)
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
		`UPDATE products SET brand=$1, series_name=$2, size=$3, finish=$4, hsn_code=$5,
		 pieces_per_box=$6, sqft_per_box=$7, reorder_level=$8, price_per_box=$9,
		 image_url=COALESCE(NULLIF($10,''), image_url)
		 WHERE id=$11 AND org_id=$12`,
		req.Brand, req.SeriesName, req.Size, req.Finish, req.HSNCode,
		req.PiecesPerBox, req.SqftPerBox, req.ReorderLevel, req.PricePerBox,
		req.ImageURL, id, orgID,
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
