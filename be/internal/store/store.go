package store

import (
	"reflect"
	"sync"

	"github.com/deu/hack/internal/actions"
	"github.com/deu/hack/internal/models"
)

// Store provides thread-safe in-memory storage for DAG nodes and user state.
type Store struct {
	mu        sync.RWMutex
	nodes     map[string]models.Node
	userState models.UserData
}

// New creates a Store with default user state and a pre-created empty "start" node.
func New() *Store {
	s := &Store{
		nodes:     make(map[string]models.Node),
		userState: models.UserData{Age: 20, Happiness: 50, Mood: false},
	}
	// Pre-create the start node (empty, ready to be configured by admin)
	s.nodes["start"] = models.Node{
		ID:      "start",
		Type:    "question",
		Content: "",
		Edges:   []models.Edge{},
	}
	return s
}

// SaveNode creates or updates a node in the DAG.
func (s *Store) SaveNode(n models.Node) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.nodes[n.ID] = n
}

// GetNode returns a single node by ID.
func (s *Store) GetNode(id string) (models.Node, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	n, ok := s.nodes[id]
	return n, ok
}

// GetAllNodes returns a copy of all nodes.
func (s *Store) GetAllNodes() map[string]models.Node {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make(map[string]models.Node, len(s.nodes))
	for k, v := range s.nodes {
		out[k] = v
	}
	return out
}

// DeleteNode removes a node by ID. Returns true if the node existed.
func (s *Store) DeleteNode(id string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, ok := s.nodes[id]
	if ok {
		delete(s.nodes, id)
	}
	return ok
}

// GetUserState returns the current user state.
func (s *Store) GetUserState() models.UserData {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.userState
}

// ResetUserState resets the user state to defaults.
func (s *Store) ResetUserState() models.UserData {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.userState = models.UserData{Age: 20, Happiness: 50, Mood: false}
	return s.userState
}

// ApplyActions mutates the user state according to the given actions.
// It delegates each action to the corresponding applier in the actions registry.
func (s *Store) ApplyActions(incomingActions []models.Action) models.UserData {
	s.mu.Lock()
	defer s.mu.Unlock()

	v := reflect.ValueOf(&s.userState).Elem()
	for _, action := range incomingActions {
		if action.Value == nil || action.FieldName == "" {
			continue
		}
		field := v.FieldByName(action.FieldName)
		if !field.IsValid() || !field.CanSet() {
			continue
		}

		actionType := action.Type
		if actionType == "" {
			actionType = "delta" // default for backwards compatibility
		}

		if applier, ok := actions.Get(actionType); ok {
			applier(field, action)
		}
	}
	return s.userState
}
