package handlers

import (
	"encoding/json"
	"strconv"

	"github.com/gofiber/fiber/v2"

	"github.com/chivta/int20h_unemployable/internal/actions"
	"github.com/chivta/int20h_unemployable/internal/database"
	"github.com/chivta/int20h_unemployable/internal/models"
	"github.com/chivta/int20h_unemployable/internal/store"
)

// AdminHandler holds the store reference for admin endpoints.
type AdminHandler struct {
	Store *store.Store
	DB    database.DB
}

// ListActionTypes returns all registered action types.
func (h *AdminHandler) ListActionTypes(c *fiber.Ctx) error {
	return c.JSON(actions.Names())
}

// ListFieldSchema returns the dynamic field schema for UserData.
func (h *AdminHandler) ListFieldSchema(c *fiber.Ctx) error {
	return c.JSON(models.GetUserDataSchema())
}

// ListNodes returns all DAG nodes.
func (h *AdminHandler) ListNodes(c *fiber.Ctx) error {
	return c.JSON(h.Store.GetAllNodes())
}

// SaveNode creates or updates a node.
func (h *AdminHandler) SaveNode(c *fiber.Ctx) error {
	var n models.Node
	if err := c.BodyParser(&n); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid JSON"})
	}
	if n.ID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "node id is required"})
	}
	h.Store.SaveNode(n)
	return c.Status(fiber.StatusCreated).JSON(n)
}

// DeleteNode removes a node by ID.
func (h *AdminHandler) DeleteNode(c *fiber.Ctx) error {
	id := c.Query("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "id parameter required"})
	}
	if !h.Store.DeleteNode(id) {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "node not found"})
	}
	return c.JSON(fiber.Map{"deleted": id})
}

// ListOffers returns all Offers.
func (h *AdminHandler) ListOffers(c *fiber.Ctx) error {
	return c.JSON(h.Store.GetAllOffers())
}

// SaveOffer creates or updates an Offer.
func (h *AdminHandler) SaveOffer(c *fiber.Ctx) error {
	var o models.Offer
	if err := c.BodyParser(&o); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid JSON"})
	}
	if o.ID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "offer id is required"})
	}
	h.Store.SaveOffer(o)
	return c.Status(fiber.StatusCreated).JSON(o)
}

// DeleteOffer removes an Offer by ID.
func (h *AdminHandler) DeleteOffer(c *fiber.Ctx) error {
	id := c.Query("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "id parameter required"})
	}
	if !h.Store.DeleteOffer(id) {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "offer not found"})
	}
	return c.JSON(fiber.Map{"deleted": id})
}

// ExportConfig returns the entire backend config state (nodes + offers)
func (h *AdminHandler) ExportConfig(c *fiber.Ctx) error {
	cfg := h.Store.ExportConfig()
	return c.JSON(cfg)
}

// ImportConfig completely overwrites existing nodes and offers, and saves a version snapshot.
func (h *AdminHandler) ImportConfig(c *fiber.Ctx) error {
	var cfg models.Config
	if err := c.BodyParser(&cfg); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid JSON config format"})
	}

	h.Store.ImportConfig(cfg)

	// Persist config version to DB
	resp := fiber.Map{"status": "success", "message": "Configuration successfully imported"}
	if h.DB != nil {
		cfgJSON, err := json.Marshal(cfg)
		if err == nil {
			version, err := h.DB.SaveConfigVersion(cfgJSON)
			if err == nil {
				resp["config_version"] = version
			}
		}
	}

	return c.JSON(resp)
}

// ListConfigVersions returns all stored config version metadata.
func (h *AdminHandler) ListConfigVersions(c *fiber.Ctx) error {
	if h.DB == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": "database not available"})
	}
	versions, err := h.DB.ListConfigVersions()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to list versions"})
	}
	return c.JSON(versions)
}

// GetConfigVersion returns a specific config version by its version number.
func (h *AdminHandler) GetConfigVersion(c *fiber.Ctx) error {
	if h.DB == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": "database not available"})
	}
	vStr := c.Params("version")
	v, err := strconv.Atoi(vStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid version number"})
	}
	cv, err := h.DB.GetConfigVersion(v)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "version not found"})
	}
	return c.JSON(cv)
}
