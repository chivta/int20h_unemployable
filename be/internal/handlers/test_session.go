package handlers

import (
	"reflect"
	"sync"

	"github.com/chivta/int20h_unemployable/internal/actions"
	"github.com/chivta/int20h_unemployable/internal/engine"
	"github.com/chivta/int20h_unemployable/internal/models"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type testSession struct {
	Config   models.Config
	UserData models.UserData
}

var (
	testSessions   = map[string]*testSession{}
	testSessionsMu sync.Mutex
)

// applyActionsToUserData applies actions to a UserData copy and returns the result.
func applyActionsToUserData(userData models.UserData, acts []models.Action) models.UserData {
	v := reflect.ValueOf(&userData).Elem()
	for _, action := range acts {
		if action.Value == nil || action.FieldName == "" {
			continue
		}
		fieldName := models.SnakeToPascal(action.FieldName)
		field := v.FieldByName(fieldName)
		if !field.IsValid() || !field.CanSet() {
			continue
		}
		actionType := action.Type
		if actionType == "" {
			actionType = "delta"
		}
		if applier, ok := actions.Get(actionType); ok {
			applier(field, action)
		}
	}
	return userData
}

// TestReset creates a new in-memory test session from the provided config.
// POST /api/user/test/reset
func (h *UserHandler) TestReset(c *fiber.Ctx) error {
	var body struct {
		Config    models.Config `json:"config"`
		SessionID string        `json:"session_id"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid JSON"})
	}

	sessionID := uuid.New().String()

	testSessionsMu.Lock()
	testSessions[sessionID] = &testSession{
		Config:   body.Config,
		UserData: models.UserData{},
	}
	testSessionsMu.Unlock()

	rootNode := body.Config.Nodes[body.Config.Root]

	return c.JSON(fiber.Map{
		"node":       rootNode,
		"session_id": sessionID,
		"user":       models.UserData{},
	})
}

// TestProcess advances the test session DAG by one step.
// POST /api/user/test/process
func (h *UserHandler) TestProcess(c *fiber.Ctx) error {
	var input struct {
		NodeID    string `json:"node_id"`
		Answer    string `json:"answer"`
		SessionID string `json:"session_id"`
	}
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid JSON"})
	}

	testSessionsMu.Lock()
	session, ok := testSessions[input.SessionID]
	testSessionsMu.Unlock()

	if !ok {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "session not found"})
	}

	currentNode, exists := session.Config.Nodes[input.NodeID]
	if !exists {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "node not found"})
	}

	// First pass: exact match (specific answer always wins over wildcard)
	var matchedEdge *models.Edge
	for i := range currentNode.Edges {
		if currentNode.Edges[i].MatchValue == input.Answer {
			matchedEdge = &currentNode.Edges[i]
			break
		}
	}
	// Second pass: wildcard fallback (empty match_value)
	if matchedEdge == nil {
		for i := range currentNode.Edges {
			if currentNode.Edges[i].MatchValue == "" {
				matchedEdge = &currentNode.Edges[i]
				break
			}
		}
	}

	if matchedEdge != nil {
		updatedUserData := applyActionsToUserData(session.UserData, matchedEdge.Actions)

		testSessionsMu.Lock()
		session.UserData = updatedUserData
		testSessionsMu.Unlock()

		nextNode := session.Config.Nodes[matchedEdge.ToNodeID]
		return c.JSON(fiber.Map{
			"node": nextNode,
			"user": updatedUserData,
		})
	}

	return c.JSON(fiber.Map{
		"node":  currentNode,
		"user":  session.UserData,
		"error": "no matching edge for this answer",
	})
}

// TestRecommendations calculates recommendations for the test session and cleans it up.
// GET /api/user/test/recommendations?session_id=xxx
func (h *UserHandler) TestRecommendations(c *fiber.Ctx) error {
	sessionID := c.Query("session_id")
	if sessionID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "session_id required"})
	}

	testSessionsMu.Lock()
	session, ok := testSessions[sessionID]
	testSessionsMu.Unlock()

	if !ok {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "session not found"})
	}

	offers := make([]models.Offer, 0, len(session.Config.Offers))
	for _, offer := range session.Config.Offers {
		offers = append(offers, offer)
	}

	results := engine.CalculateRecommendations(session.UserData, offers)

	testSessionsMu.Lock()
	delete(testSessions, sessionID)
	testSessionsMu.Unlock()

	return c.JSON(fiber.Map{
		"results": results,
	})
}
