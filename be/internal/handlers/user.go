package handlers

import (
	"github.com/gofiber/fiber/v2"

	"github.com/chivta/int20h_unemployable/internal/engine"
	"github.com/chivta/int20h_unemployable/internal/store"
)

// UserHandler holds the store reference for user endpoints.
type UserHandler struct {
	Store *store.Store
}

type processInput struct {
	NodeID string `json:"node_id"`
	Answer string `json:"answer"`
}

// GetState returns the start node and current user state.
func (h *UserHandler) GetState(c *fiber.Ctx) error {
	startNode, _ := h.Store.GetNode("start")
	return c.JSON(fiber.Map{
		"node": startNode,
		"user": h.Store.GetUserState(),
	})
}

// Process handles DAG traversal: receives an answer and returns the next node + updated state.
func (h *UserHandler) Process(c *fiber.Ctx) error {
	var input processInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid JSON"})
	}

	currentNode, ok := h.Store.GetNode(input.NodeID)
	if !ok {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "node not found"})
	}

	for _, edge := range currentNode.Edges {
		if edge.MatchValue == "" || edge.MatchValue == input.Answer {
			userState := h.Store.ApplyActions(edge.Actions)
			nextNode, _ := h.Store.GetNode(edge.ToNodeID)
			return c.JSON(fiber.Map{
				"node": nextNode,
				"user": userState,
			})
		}
	}

	// No matching edge
	return c.JSON(fiber.Map{
		"node":  currentNode,
		"user":  h.Store.GetUserState(),
		"error": "no matching edge for this answer",
	})
}

// Reset resets the user state and returns the start node.
func (h *UserHandler) Reset(c *fiber.Ctx) error {
	userState := h.Store.ResetUserState()
	startNode, _ := h.Store.GetNode("start")
	return c.JSON(fiber.Map{
		"node": startNode,
		"user": userState,
	})
}

// GetRecommendations returns the calculated tier list of offers for the user.
func (h *UserHandler) GetRecommendations(c *fiber.Ctx) error {
	userState := h.Store.GetUserState()
	offers := h.Store.GetAllOffers()
	
	results := engine.CalculateRecommendations(userState, offers)
	
	return c.JSON(fiber.Map{
		"results": results,
	})
}
