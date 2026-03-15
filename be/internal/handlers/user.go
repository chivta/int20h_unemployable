package handlers

import (
	"encoding/json"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"github.com/chivta/int20h_unemployable/internal/database"
	"github.com/chivta/int20h_unemployable/internal/engine"
	"github.com/chivta/int20h_unemployable/internal/store"
)

// UserHandler holds the store reference for user endpoints.
type UserHandler struct {
	Store *store.Store
	DB    database.DB
}

type processInput struct {
	NodeID    string `json:"node_id"`
	Answer    string `json:"answer"`
	SessionID string `json:"session_id"`
}

// GetState returns the start node and current user state.
func (h *UserHandler) GetState(c *fiber.Ctx) error {
	startNode, _ := h.Store.GetNode(h.Store.GetRootNodeID())
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

	// Record the user event
	if h.DB != nil && input.SessionID != "" {
		_ = h.DB.CreateEvent(&database.UserEvent{
			SessionID: input.SessionID,
			NodeID:    input.NodeID,
			Answer:    input.Answer,
			CreatedAt: time.Now(),
		})
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

// StartSession creates a new quiz session and resets user state.
func (h *UserHandler) StartSession(c *fiber.Ctx) error {
	userState := h.Store.ResetUserState()
	startNode, _ := h.Store.GetNode(h.Store.GetRootNodeID())

	sessionID := uuid.New().String()

	// Count question nodes (nodes that have at least one outgoing edge)
	allNodes := h.Store.GetAllNodes()
	totalQuestions := 0
	for _, n := range allNodes {
		if len(n.Edges) > 0 {
			totalQuestions++
		}
	}

	if h.DB != nil {
		_ = h.DB.CreateSession(&database.QuizSession{
			ID:        sessionID,
			StartedAt: time.Now(),
		})
	}

	return c.JSON(fiber.Map{
		"node":            startNode,
		"user":            userState,
		"session_id":      sessionID,
		"total_questions": totalQuestions,
	})
}

// Reset resets the user state and returns the start node (backwards compat).
func (h *UserHandler) Reset(c *fiber.Ctx) error {
	return h.StartSession(c)
}

// GetRecommendations returns the calculated tier list of offers for the user.
func (h *UserHandler) GetRecommendations(c *fiber.Ctx) error {
	userState := h.Store.GetUserState()
	offers := h.Store.GetAllOffers()

	results := engine.CalculateRecommendations(userState, offers)

	// Finalize session if session_id provided
	sessionID := c.Query("session_id")
	if h.DB != nil && sessionID != "" {
		session, err := h.DB.GetSession(sessionID)
		if err == nil && session != nil {
			now := time.Now()
			duration := int(now.Sub(session.StartedAt).Seconds())
			userData, _ := json.Marshal(userState)

			topOffer := ""
			if len(results) > 0 {
				topOffer = results[0].ID
			}

			session.CompletedAt = &now
			session.DurationSec = &duration
			session.FinalUserData = userData
			session.RecommendedOfferID = topOffer
			_ = h.DB.UpdateSession(session)
		}
	}

	return c.JSON(fiber.Map{
		"results": results,
	})
}

// MarkPurchase marks a session as purchased.
func (h *UserHandler) MarkPurchase(c *fiber.Ctx) error {
	var input struct {
		SessionID string `json:"session_id"`
	}
	if err := c.BodyParser(&input); err != nil || input.SessionID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "session_id required"})
	}

	if h.DB == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": "database not available"})
	}

	session, err := h.DB.GetSession(input.SessionID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "session not found"})
	}

	session.Purchased = true
	if err := h.DB.UpdateSession(session); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update session"})
	}

	return c.JSON(fiber.Map{"status": "success"})
}
