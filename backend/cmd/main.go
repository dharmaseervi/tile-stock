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
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE"},
		AllowHeaders:     []string{"Authorization", "Content-Type"},
		AllowCredentials: true,
	}))

	auth := &handlers.AuthHandler{DB: dbx}
	products := &handlers.ProductHandler{DB: dbx}
	batches := &handlers.BatchHandler{DB: dbx}
	stock := &handlers.StockHandler{DB: dbx}

	api := r.Group("/api")
	{
		api.POST("/auth/signup", auth.Signup)
		api.POST("/auth/login", auth.Login)

		authed := api.Group("/")
		authed.Use(middleware.AuthRequired())
		{
			authed.POST("/products", products.Create)
			authed.GET("/products", products.List)
			authed.DELETE("/products/:id", products.Delete)

			authed.POST("/batches", batches.Create)
			authed.GET("/products/:product_id/batches", batches.ListForProduct)

			authed.POST("/stock/movements", stock.RecordMovement)
			authed.GET("/stock/current", stock.CurrentStock)
			authed.GET("/stock/low", stock.LowStock)
			authed.GET("/stock/history", stock.History)
		}
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("listening on :%s", port)
	r.Run(":" + port)
}
