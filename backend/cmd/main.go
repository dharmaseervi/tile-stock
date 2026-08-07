package main

import (
	"log"
	"os"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	"github.com/joho/godotenv"

	"tiles-stock/internal/db"
	"tiles-stock/internal/handlers"
	"tiles-stock/internal/middleware"
)

func main() {
	_ = godotenv.Load()
	// Migrations run automatically on startup from
	// backend/internal/db/migrations/*.sql — add new .sql files there.
	dbx := db.Connect()
	defer dbx.Close()

	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:3000"
	}

	r := gin.Default()
	r.Use(middleware.SecurityHeaders())
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{frontendURL},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE"},
		AllowHeaders:     []string{"Authorization", "Content-Type"},
		AllowCredentials: true,
	}))

	// Rate limiters
	authLimiter := middleware.NewRateLimiter(10, time.Minute) // 10 auth attempts/min
	apiLimiter := middleware.NewRateLimiter(300, time.Minute) // 300 API calls/min

	// Subscription check function
	subCheck := func(orgID string) bool {
		var status string
		var trialEnd *time.Time
		err := dbx.QueryRow(
			`SELECT status, trial_ends_at FROM subscriptions WHERE org_id=$1`, orgID,
		).Scan(&status, &trialEnd)
		if err != nil {
			return true
		} // if no subscription row, allow (backwards compat)
		if status == "active" {
			if trialEnd != nil && time.Now().After(*trialEnd) {
				return false
			}
			return true
		}
		return false
	}

	h := buildHandlers(dbx)
	api := r.Group("/api")
	{
		// Public — rate limited
		api.POST("/auth/signup", authLimiter.Middleware(), h.auth.Signup)
		api.POST("/auth/login", authLimiter.Middleware(), h.auth.Login)
		api.POST("/invites/accept", authLimiter.Middleware(), h.invites.Accept)
		api.GET("/public/:org_id/products", h.public.GetPriceList)

		authed := api.Group("/")
		authed.Use(middleware.AuthRequired(), apiLimiter.Middleware())
		{
			// Products
			authed.GET("/products", h.products.List)
			authed.GET("/products/:id", h.products.GetOne)
			authed.GET("/products/:id/batches", h.batches.ListForProduct)
			authed.POST("/products", middleware.SubscriptionRequired(subCheck), h.products.Create)
			authed.PUT("/products/:id", h.products.Update)
			authed.DELETE("/products/:id", middleware.OwnerOnly(), h.products.Delete)

			// Batches
			authed.POST("/batches", h.batches.Create)

			// Stock
			authed.POST("/stock/movements", h.stock.RecordMovement)
			authed.GET("/stock/current", h.stock.CurrentStock)
			authed.GET("/stock/low", h.stock.LowStock)
			authed.GET("/stock/history", h.stock.History)
			authed.GET("/stock/analytics", h.stock.Analytics)
			authed.GET("/stock/export.csv", h.stock.ExportCSV)
			authed.GET("/stock/dashboard-stats", h.stock.DashboardStats)

			// PDF downloads
			authed.GET("/orders/:id/pdf", h.pdf.OrderPDF)
			authed.GET("/stock/report.pdf", h.pdf.StockReportPDF)
			authed.POST("/reorder/po-pdf", h.pdf.PurchaseOrderPDF)

			// Orders / Challans
			authed.GET("/orders", h.orders.List)
			authed.POST("/orders", h.orders.Create)
			authed.GET("/orders/:id", h.orders.GetOne)
			authed.PATCH("/orders/:id/status", h.orders.UpdateStatus)
			authed.PATCH("/orders/:id/items/:item_id/loaded", h.orders.ToggleLoaded)

			// Branches
			authed.GET("/branches", h.branches.List)
			authed.POST("/branches", middleware.OwnerOnly(), h.branches.Create)
			authed.DELETE("/branches/:id", middleware.OwnerOnly(), h.branches.Delete)

			// Customers
			authed.GET("/customers", h.customers.List)
			authed.POST("/customers", h.customers.Create)
			authed.PUT("/customers/:id", h.customers.Update)
			authed.GET("/customers/:id/ledger", h.customers.GetLedger)

			// Suppliers
			authed.GET("/suppliers", h.suppliers.List)
			authed.POST("/suppliers", middleware.OwnerOnly(), h.suppliers.Create)
			authed.PUT("/suppliers/:id", middleware.OwnerOnly(), h.suppliers.Update)
			authed.DELETE("/suppliers/:id", middleware.OwnerOnly(), h.suppliers.Delete)

			// Staff — owner only
			authed.GET("/staff", middleware.OwnerOnly(), h.invites.ListStaff)
			authed.POST("/invites", middleware.OwnerOnly(), h.invites.Create)

			// Reorder
			authed.GET("/reorder/suggestions", h.reorder.Suggestions)

			// Subscription
			authed.GET("/subscription", h.subscription.Get)
			authed.POST("/subscription/order", middleware.OwnerOnly(), h.subscription.CreateOrder)

			// Activity log — owner only
			authed.GET("/activity", middleware.OwnerOnly(), h.activity.GetActivityLog)
		}
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("listening on :%s", port)
	r.Run(":" + port)
}

type allHandlers struct {
	auth         *handlers.AuthHandler
	products     *handlers.ProductHandler
	batches      *handlers.BatchHandler
	stock        *handlers.StockHandler
	invites      *handlers.InviteHandler
	branches     *handlers.BranchHandler
	customers    *handlers.CustomerHandler
	orders       *handlers.OrderHandler
	suppliers    *handlers.SupplierHandler
	subscription *handlers.SubscriptionHandler
	reorder      *handlers.ReorderHandler
	public       *handlers.PublicHandler
	pdf          *handlers.PDFHandler
	activity     *handlers.ActivityHandler
}

func buildHandlers(dbx *sqlx.DB) allHandlers {
	return allHandlers{
		auth:         &handlers.AuthHandler{DB: dbx},
		products:     &handlers.ProductHandler{DB: dbx},
		batches:      &handlers.BatchHandler{DB: dbx},
		stock:        &handlers.StockHandler{DB: dbx},
		invites:      &handlers.InviteHandler{DB: dbx},
		branches:     &handlers.BranchHandler{DB: dbx},
		customers:    &handlers.CustomerHandler{DB: dbx},
		orders:       &handlers.OrderHandler{DB: dbx},
		suppliers:    &handlers.SupplierHandler{DB: dbx},
		subscription: &handlers.SubscriptionHandler{DB: dbx},
		reorder:      &handlers.ReorderHandler{DB: dbx},
		public:       &handlers.PublicHandler{DB: dbx},
		pdf:          &handlers.PDFHandler{DB: dbx},
		activity:     &handlers.ActivityHandler{DB: dbx},
	}
}
