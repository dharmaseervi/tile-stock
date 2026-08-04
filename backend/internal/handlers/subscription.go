package handlers

import (
	"log"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

type SubscriptionHandler struct{ DB *sqlx.DB }

func (h *SubscriptionHandler) Get(c *gin.Context) {
	orgID := c.GetString("org_id")
	var sub struct {
		Plan             string  `db:"plan" json:"plan"`
		Status           string  `db:"status" json:"status"`
		TrialEndsAt      *string `db:"trial_ends_at" json:"trial_ends_at"`
		CurrentPeriodEnd *string `db:"current_period_end" json:"current_period_end"`
	}
	err := h.DB.Get(&sub,
		`SELECT plan, status, trial_ends_at::text, current_period_end::text
		 FROM subscriptions WHERE org_id=$1`, orgID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "no subscription found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"subscription":    sub,
		"razorpay_key_id": os.Getenv("RAZORPAY_KEY_ID"),
		"monthly_price":   49900,  // paise (₹499)
		"yearly_price":    499900, // paise (₹4999)
	})
}

// CreateOrder creates a Razorpay order for upgrade
// (Real Razorpay integration would use their SDK — this is the hook)
func (h *SubscriptionHandler) CreateOrder(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"message": "Razorpay integration — connect your Razorpay key to enable payments",
	})
}

type ReorderHandler struct{ DB *sqlx.DB }

func (h *ReorderHandler) Suggestions(c *gin.Context) {
	orgID := c.GetString("org_id")
	var suggestions []struct {
		ProductID           string   `db:"product_id" json:"product_id"`
		OrgID               string   `db:"org_id" json:"org_id"`
		Brand               string   `db:"brand" json:"brand"`
		SeriesName          string   `db:"series_name" json:"series_name"`
		Size                string   `db:"size" json:"size"`
		Finish              *string  `db:"finish" json:"finish"`
		BoxesInStock        float64  `db:"boxes_in_stock" json:"boxes_in_stock"`
		ReorderLevel        int      `db:"reorder_level" json:"reorder_level"`
		PricePerBox         float64  `db:"price_per_box" json:"price_per_box"`
		BoxesPerWeek        float64  `db:"boxes_per_week" json:"boxes_per_week"`
		WeeksOfStock        *float64 `db:"weeks_of_stock" json:"weeks_of_stock"`
		SuggestedReorderQty float64  `db:"suggested_reorder_qty" json:"suggested_reorder_qty"`
	}
	err := h.DB.Select(&suggestions, `
    SELECT
        product_id, org_id, brand, series_name, size, finish,
        boxes_in_stock::float8,
        reorder_level,
        price_per_box::float8,
        boxes_per_week::float8,
        weeks_of_stock::float8,
        suggested_reorder_qty::float8
    FROM reorder_suggestions
    WHERE org_id=$1
    ORDER BY boxes_in_stock ASC
`, orgID)
	if err != nil {
		log.Printf("reorder suggestions error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, suggestions)
}

type PublicHandler struct{ DB *sqlx.DB }

// GetPublicPriceList returns a public (no-auth) price list for an org
// accessed via /public/:org_id/products
func (h *PublicHandler) GetPriceList(c *gin.Context) {
	orgID := c.Param("org_id")
	var org struct {
		Name string `db:"name" json:"name"`
	}
	if err := h.DB.Get(&org, `SELECT name FROM orgs WHERE id=$1`, orgID); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	var products []struct {
		ID          string   `db:"id" json:"id"`
		Brand       string   `db:"brand" json:"brand"`
		SeriesName  string   `db:"series_name" json:"series_name"`
		Size        string   `db:"size" json:"size"`
		Finish      *string  `db:"finish" json:"finish"`
		SqftPerBox  *float64 `db:"sqft_per_box" json:"sqft_per_box"`
		PricePerBox float64  `db:"price_per_box" json:"price_per_box"`
		ImageURL    *string  `db:"image_url" json:"image_url"`
		InStock     float64  `db:"boxes_in_stock" json:"in_stock"`
	}
	h.DB.Select(&products, `
		SELECT p.id, p.brand, p.series_name, p.size, p.finish, p.sqft_per_box,
			p.price_per_box, p.image_url,
			COALESCE(cs.boxes_in_stock, 0) AS boxes_in_stock
		FROM products p
		LEFT JOIN current_stock cs ON cs.product_id = p.id
		WHERE p.org_id=$1 AND p.price_per_box > 0
		ORDER BY p.brand, p.series_name
	`, orgID)
	c.JSON(http.StatusOK, gin.H{"org": org, "products": products})
}
