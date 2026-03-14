package store

import (
	"reflect"
	"sync"

	"github.com/chivta/int20h_unemployable/internal/actions"
	"github.com/chivta/int20h_unemployable/internal/models"
)

// Store provides thread-safe in-memory storage for DAG nodes and user state.
type Store struct {
	mu        sync.RWMutex
	nodes     map[string]models.Node
	userState models.UserData
	offers    map[string]models.Offer
}

// New creates a Store with default user state and a pre-created empty "start" node.
func New() *Store {
	s := &Store{
		nodes:     make(map[string]models.Node),
		userState: models.UserData{Age: 0},
		offers:    make(map[string]models.Offer),
	}
	// Pre-create the start node (empty, ready to be configured by admin)
	s.nodes["start"] = models.Node{
		ID:      "start",
		Type:    "question",
		Content: "",
		Edges:   []models.Edge{},
	}
	
	// Pre-seed some default offers based on the initial requirements
	s.seedDefaultOffers()
	
	return s
}

func (s *Store) seedDefaultOffers() {
	defaultOffers := []models.Offer{
		{
			ID: "offer_1", Name: "Weight Loss Starter (Home) — 4 тижні",
			Description: "Digital: план схуднення вдома (20–30 хв)\nPhysical wellness kit: Home Fat-Burn Kit (resistance bands, скакалка, шейкер/пляшка, електроліти + healthy snack)",
			Requirements: []models.Requirement{
				{FieldName: "goal", MatchValue: "weight_loss", IsObligatory: true, Score: 10},
				{FieldName: "context", MatchValue: "home", IsObligatory: false, Score: 5},
			},
		},
		{
			ID: "offer_2", Name: "Lean Strength Builder (Gym) — силові + прогресія",
			Description: "Digital: програма для залу\nPhysical wellness kit: Gym Support Kit (wrist wraps/straps, mini loop band, компактний рушник, електроліти/протеїн-снек)",
			Requirements: []models.Requirement{
				{FieldName: "goal", MatchValue: "strength", IsObligatory: true, Score: 10},
				{FieldName: "context", MatchValue: "gym", IsObligatory: false, Score: 5},
			},
		},
		{
			ID: "offer_3", Name: "Low-Impact Fat Burn — “суглоби friendly”",
			Description: "Digital: low-impact план (коліна/спина friendly)\nPhysical wellness kit: Joint-Friendly Kit (knee sleeve/бандаж, massage ball, mini loop bands, cooling patch/recovery gel)",
			Requirements: []models.Requirement{
				{FieldName: "goal", MatchValue: "weight_loss", IsObligatory: false, Score: 5},
				{FieldName: "constraints", MatchValue: "injury", IsObligatory: true, Score: 10},
			},
		},
		{
			ID: "offer_4", Name: "Run Your First 5K (Outdoor) — бігова програма",
			Description: "Digital: підготовка до 5K (3 рази/тиж)\nPhysical wellness kit: Runner Starter Kit (electrolytes, reflective armband/safety light, blister kit, running belt)",
			Requirements: []models.Requirement{
				{FieldName: "goal", MatchValue: "endurance", IsObligatory: true, Score: 10},
				{FieldName: "context", MatchValue: "outdoor", IsObligatory: false, Score: 5},
			},
		},
		{
			ID: "offer_5", Name: "Yoga & Mobility (Home) — гнучкість + спина/постава",
			Description: "Digital: йога/мобільність 10–25 хв\nPhysical wellness kit: Mobility Kit (travel yoga mat або yoga strap, massage ball, mini foam roller)",
			Requirements: []models.Requirement{
				{FieldName: "goal", MatchValue: "flexibility", IsObligatory: true, Score: 10},
				{FieldName: "preferences", MatchValue: "yoga", IsObligatory: false, Score: 5},
			},
		},
		{
			ID: "offer_6", Name: "Stress Reset Program — ментальний ресет + мікрозвички",
			Description: "Digital: дихання/медитації/антистрес рутини\nPhysical wellness kit: Calm-Now Kit (eye mask, aroma roll-on/mini candle, tea sticks, stress ball/fidget, quick reset card)",
			Requirements: []models.Requirement{
				{FieldName: "goal", MatchValue: "stress_relief", IsObligatory: true, Score: 10},
				{FieldName: "wellbeing", MatchValue: "poor", IsObligatory: false, Score: 5},
			},
		},
		{
			ID: "offer_7", Name: "Quick Fit Micro-Workouts — 10–15 хв щодня",
			Description: "Digital: короткі щоденні тренування\nPhysical wellness kit: Micro-Workout Kit (slider discs, mini loop bands, шейкер/пляшка, mini routine card)",
			Requirements: []models.Requirement{
				{FieldName: "constraints", MatchValue: "time", IsObligatory: true, Score: 10},
			},
		},
	}
	
	for _, o := range defaultOffers {
		s.offers[o.ID] = o
	}
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
	s.userState = models.UserData{Age: 0}
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

// GetAllOffers returns a slice of all offers.
func (s *Store) GetAllOffers() []models.Offer {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]models.Offer, 0, len(s.offers))
	for _, v := range s.offers {
		out = append(out, v)
	}
	return out
}

// SaveOffer creates or updates an offer.
func (s *Store) SaveOffer(o models.Offer) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.offers[o.ID] = o
}

// DeleteOffer removes an offer by ID. Returns true if it existed.
func (s *Store) DeleteOffer(id string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, ok := s.offers[id]
	if ok {
		delete(s.offers, id)
	}
	return ok
}

// ExportConfig returns the entire config state
func (s *Store) ExportConfig() models.Config {
	s.mu.RLock()
	defer s.mu.RUnlock()

	cfg := models.Config{
		Nodes:  make(map[string]models.Node),
		Offers: make(map[string]models.Offer),
	}

	for k, v := range s.nodes {
		cfg.Nodes[k] = v
	}
	for k, v := range s.offers {
		cfg.Offers[k] = v
	}

	return cfg
}

// ImportConfig completely overwrites existing nodes and offers
func (s *Store) ImportConfig(cfg models.Config) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Clear existing
	s.nodes = make(map[string]models.Node)
	s.offers = make(map[string]models.Offer)

	for k, v := range cfg.Nodes {
		s.nodes[k] = v
	}
	for k, v := range cfg.Offers {
		s.offers[k] = v
	}
}
