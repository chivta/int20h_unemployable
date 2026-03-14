package main

import (
	"fmt"
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"

	"github.com/chivta/int20h_unemployable/internal/handlers"
	"github.com/chivta/int20h_unemployable/internal/store"
)

func main() {
	s := store.New()

	adminHandler := &handlers.AdminHandler{Store: s}
	userHandler := &handlers.UserHandler{Store: s}

	app := fiber.New(fiber.Config{
		AppName: "DAG Questionnaire",
	})

	// CORS middleware
	app.Use(cors.New())

	// Admin API
	admin := app.Group("/api/admin")
	admin.Get("/nodes", adminHandler.ListNodes)
	admin.Post("/nodes", adminHandler.SaveNode)
	admin.Delete("/nodes", adminHandler.DeleteNode)
	admin.Get("/action-types", adminHandler.ListActionTypes)
	admin.Get("/field-schema", adminHandler.ListFieldSchema)
	admin.Get("/offers", adminHandler.ListOffers)
	admin.Post("/offers", adminHandler.SaveOffer)
	admin.Delete("/offers", adminHandler.DeleteOffer)
	admin.Get("/config", adminHandler.ExportConfig)
	admin.Post("/config", adminHandler.ImportConfig)

	// User API
	user := app.Group("/api/user")
	user.Get("/process", userHandler.GetState)
	user.Post("/process", userHandler.Process)
	user.Post("/reset", userHandler.Reset)
	user.Get("/recommendations", userHandler.GetRecommendations)

	// Static files
	app.Static("/", "../fe/static")

	addr := ":8080"
	fmt.Printf("🚀 Server started at http://localhost%s\n", addr)
	fmt.Println("   Admin:  http://localhost:8080/admin.html")
	fmt.Println("   User:   http://localhost:8080/index.html")
	log.Fatal(app.Listen(addr))
}
