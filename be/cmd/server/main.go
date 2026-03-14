package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"

	"github.com/chivta/int20h_unemployable/internal/database"
	"github.com/chivta/int20h_unemployable/internal/database/postgres"
	"github.com/chivta/int20h_unemployable/internal/handlers"
	"github.com/chivta/int20h_unemployable/internal/models"
	"github.com/chivta/int20h_unemployable/internal/store"
)

func main() {
	s := store.New()

	// Load initial config from file if CONFIG_PATH is set
	if cfgPath := os.Getenv("CONFIG_PATH"); cfgPath != "" {
		if err := loadConfigFromFile(s, cfgPath); err != nil {
			log.Printf("⚠️  Failed to load config from %s: %v", cfgPath, err)
		} else {
			log.Printf("✅ Loaded initial config from %s", cfgPath)
		}
	}

	// Connect to PostgreSQL (optional — app works without it)
	var db database.DB
	dsn := os.Getenv("DATABASE_URL")
	if dsn != "" {
		var err error
		db, err = postgres.New(dsn)
		if err != nil {
			log.Printf("⚠️  Database connection failed: %v (continuing without persistence)", err)
		} else {
			log.Println("✅ Connected to PostgreSQL")
		}
	} else {
		log.Println("ℹ️  DATABASE_URL not set — running without persistence")
	}

	adminHandler := &handlers.AdminHandler{Store: s, DB: db}
	userHandler := &handlers.UserHandler{Store: s, DB: db}

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
	admin.Get("/config/versions", adminHandler.ListConfigVersions)
	admin.Get("/config/versions/:version", adminHandler.GetConfigVersion)

	// User API
	user := app.Group("/api/user")
	user.Get("/process", userHandler.GetState)
	user.Post("/process", userHandler.Process)
	user.Post("/reset", userHandler.Reset)
	user.Get("/recommendations", userHandler.GetRecommendations)
	user.Post("/purchase", userHandler.MarkPurchase)


	addr := ":8080"
	fmt.Printf("🚀 Server started at http://localhost%s\n", addr)

	log.Fatal(app.Listen(addr))
}

// loadConfigFromFile reads a JSON config file and imports it into the in-memory store.
func loadConfigFromFile(s *store.Store, path string) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return fmt.Errorf("read file: %w", err)
	}

	var cfg models.Config
	if err := json.Unmarshal(data, &cfg); err != nil {
		return fmt.Errorf("parse JSON: %w", err)
	}

	s.ImportConfig(cfg)
	return nil
}
