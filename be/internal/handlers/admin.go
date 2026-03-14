package handlers

import (
	"github.com/gofiber/fiber/v2"

	"github.com/deu/hack/internal/actions"
	"github.com/deu/hack/internal/models"
	"github.com/deu/hack/internal/store"
)

// AdminHandler holds the store reference for admin endpoints.
type AdminHandler struct {
	Store *store.Store
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
