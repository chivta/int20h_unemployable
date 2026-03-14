package models

import (
	"reflect"
	"strings"
)

// Gender represents user's gender
type Gender string
const (
	GenderMale       Gender = "male"
	GenderFemale     Gender = "female"
	GenderUnspecified Gender = "unspecified"
)

// Goal represents the primary fitness goal
type Goal string
const (
	GoalWeightLoss   Goal = "weight_loss"
	GoalStrength     Goal = "strength"
	GoalEndurance    Goal = "endurance"
	GoalFlexibility  Goal = "flexibility"
	GoalStressRelief Goal = "stress_relief"
)

// Context represents where they work out
type Context string
const (
	ContextHome    Context = "home"
	ContextGym     Context = "gym"
	ContextOutdoor Context = "outdoor"
)

// Constraints represents limitations
type Constraints string
const (
	ConstraintTime   Constraints = "time"
	ConstraintInjury Constraints = "injury"
	ConstraintNone   Constraints = "none"
)

// Level represents fitness experience
type Level string
const (
	LevelBeginner     Level = "beginner"
	LevelIntermediate Level = "intermediate"
	LevelAdvanced     Level = "advanced"
)

// Motivation represents why they are starting now
type Motivation string
const (
	MotivationHealth     Motivation = "health"
	MotivationAppearance Motivation = "appearance"
	MotivationEnergy     Motivation = "energy"
)

// Preferences represents what kind of workouts they like
type Preferences string
const (
	PreferenceCardio Preferences = "cardio"
	PreferenceStrength Preferences = "strength"
	PreferenceYoga   Preferences = "yoga"
)

// Wellbeing represents self-reported current state
type Wellbeing string
const (
	WellbeingGood Wellbeing = "good"
	WellbeingOkay Wellbeing = "okay"
	WellbeingPoor Wellbeing = "poor"
)

// UserData represents the user's current state during DAG traversal.
type UserData struct {
	Age         int         `json:"age"`
	Gender      Gender      `json:"gender" enum:"male,female,unspecified"`
	Goal        Goal        `json:"goal" enum:"weight_loss,strength,endurance,flexibility,stress_relief"`
	Context     Context     `json:"context" enum:"home,gym,outdoor"`
	Constraints Constraints `json:"constraints" enum:"time,injury,none"`
	Level       Level       `json:"level" enum:"beginner,intermediate,advanced"`
	Motivation  Motivation  `json:"motivation" enum:"health,appearance,energy"`
	Preferences Preferences `json:"preferences" enum:"cardio,strength,yoga"`
	Wellbeing   Wellbeing   `json:"wellbeing" enum:"good,okay,poor"`
}

// FieldSchema describes a field for the frontend editor
type FieldSchema struct {
	Type    string   `json:"type"`    // "int" or "enum"
	Options []string `json:"options"` // empty if type == "int"
}

// GetUserDataSchema returns the schema for the UI
func GetUserDataSchema() map[string]FieldSchema {
	schema := make(map[string]FieldSchema)
	t := reflect.TypeOf(UserData{})

	for i := 0; i < t.NumField(); i++ {
		field := t.Field(i)
		name := field.Name

		if field.Type.Kind() == reflect.Int {
			schema[name] = FieldSchema{Type: "int"}
			continue
		}

		if enumTag := field.Tag.Get("enum"); enumTag != "" {
			schema[name] = FieldSchema{
				Type:    "enum",
				Options: strings.Split(enumTag, ","),
			}
		} else {
			// Fallback for types without an enum tag
			schema[name] = FieldSchema{Type: "string"}
		}
	}
	return schema
}

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
