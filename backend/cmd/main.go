package main

import (
	"log"
	"os"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	"tiles-stock/internal/db"
	"tiles-stock/internal/handlers"
	"tiles-stock/internal/middleware"
)

func main() {
	_ = godotenv.Load()
	dbx := db.Connect()
	defer dbx.Close()

	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:3000"
	}

	r := gin.Default()
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{frontendURL},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE"},
		AllowHeaders:     []string{"Authorization", "Content-Type"},
		AllowCredentials: true,
	}))

	auth := &handlers.AuthHandler{DB: dbx}
	products := &handlers.ProductHandler{DB: dbx}
	batches := &handlers.BatchHandler{DB: dbx}
	stock := &handlers.StockHandler{DB: dbx}
	invites := &handlers.InviteHandler{DB: dbx}
	branches := &handlers.BranchHandler{DB: dbx}
	customers := &handlers.CustomerHandler{DB: dbx}
	orders := &handlers.OrderHandler{DB: dbx}
	pdfh := &handlers.PDFHandler{DB: dbx}
	suppliers := &handlers.SupplierHandler{DB: dbx}
	subscription := &handlers.SubscriptionHandler{DB: dbx}
	reorder := &handlers.ReorderHandler{DB: dbx}
	public := &handlers.PublicHandler{DB: dbx}

	api := r.Group("/api")
	{
		// Public routes
		api.POST("/auth/signup", auth.Signup)
		api.POST("/auth/login", auth.Login)
		api.POST("/invites/accept", invites.Accept)
		api.GET("/public/:org_id/products", public.GetPriceList)

		// Authenticated routes
		authed := api.Group("/")
		authed.Use(middleware.AuthRequired())
		{
			// Products
			authed.POST("/products", products.Create)
			authed.GET("/products", products.List)
			authed.GET("/products/:id", products.GetOne)
			authed.PUT("/products/:id", products.Update)
			authed.DELETE("/products/:id", products.Delete)

			// Batches
			authed.POST("/batches", batches.Create)
			authed.GET("/products/:id/batches", batches.ListForProduct)

			// Stock
			authed.POST("/stock/movements", stock.RecordMovement)
			authed.GET("/stock/current", stock.CurrentStock)
			authed.GET("/stock/low", stock.LowStock)
			authed.GET("/stock/history", stock.History)
			authed.GET("/stock/analytics", stock.Analytics)

			// Branches
			authed.GET("/branches", branches.List)
			authed.POST("/branches", branches.Create)
			authed.DELETE("/branches/:id", branches.Delete)

			// Customers
			authed.GET("/customers", customers.List)
			authed.POST("/customers", customers.Create)
			authed.PUT("/customers/:id", customers.Update)
			authed.GET("/customers/:id/ledger", customers.GetLedger)

			// Orders / Challans
			authed.GET("/orders/:id/pdf", pdfh.OrderPDF)
			authed.GET("/stock/report.pdf", pdfh.StockReportPDF)
			authed.POST("/reorder/po-pdf", pdfh.PurchaseOrderPDF)
			authed.GET("/orders", orders.List)
			authed.POST("/orders", orders.Create)
			authed.GET("/orders/:id", orders.GetOne)
			authed.PATCH("/orders/:id/status", orders.UpdateStatus)
			authed.PATCH("/orders/:id/items/:item_id/loaded", orders.ToggleLoaded)

			// Suppliers
			authed.GET("/suppliers", suppliers.List)
			authed.POST("/suppliers", suppliers.Create)
			authed.PUT("/suppliers/:id", suppliers.Update)
			authed.DELETE("/suppliers/:id", suppliers.Delete)

			// Staff
			authed.GET("/staff", invites.ListStaff)
			authed.POST("/invites", invites.Create)

			// Subscription & reorder
			authed.GET("/subscription", subscription.Get)
			authed.POST("/subscription/order", subscription.CreateOrder)
			authed.GET("/reorder/suggestions", reorder.Suggestions)
		}
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("listening on :%s", port)
	r.Run(":" + port)
}
