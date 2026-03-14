package models

// Action represents a state mutation applied when traversing an edge.
// Type determines how Value is applied to FieldName:
//   - "delta": adds Value to the current field value (numeric) or toggles (bool)
//   - "set":   directly sets the field to Value
//
// This is extensible — add new Type values + logic in store.ApplyActions.
type Action struct {
	Type      string      `json:"type"`       // "delta", "set", etc.
	FieldName string      `json:"field_name"`
	Value     interface{} `json:"value"`
}

// Edge connects two nodes and is activated by a matching answer.
type Edge struct {
	MatchValue string   `json:"match_value"`
	Actions    []Action `json:"actions"`
	ToNodeID   string   `json:"to_node_id"`
}

// Node is a single step in the DAG — either a question or informational message.
type Node struct {
	ID      string `json:"id"`
	Type    string `json:"type"`    // "question" or "info"
	Content string `json:"content"`
	Edges   []Edge `json:"edges"`
}
