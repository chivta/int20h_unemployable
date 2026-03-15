package models

import (
	"reflect"
	"strings"
)

// UserData represents the user's current state during DAG traversal.
type UserData struct {
	Age             int    `json:"age"`
	Gender          string `json:"gender" enum:"male,female,unspecified"`
	Goal            string `json:"goal" enum:"weight_loss,strength,endurance,flexibility,stress_relief"`
	Context         string `json:"context" enum:"home,gym,outdoor"`
	Constraints     string `json:"constraints" enum:"none,time,injury,both"`
	Level           string `json:"level" enum:"beginner,intermediate,advanced"`
	Motivation      string `json:"motivation" enum:"health,appearance,energy,performance,mental"`
	Preferences     string `json:"preferences" enum:"cardio,strength,yoga,running,hiit,stretching"`
	Wellbeing       string `json:"wellbeing" enum:"high,mid,low"`
	AgeGroup        string `json:"age_group" enum:"teen,young_adult,adult,middle_aged,senior"`
	Equipment       string `json:"equipment" enum:"none,basic,full"`
	SessionDuration string `json:"session_duration" enum:"micro,short,standard,extended"`
	Schedule        string `json:"schedule" enum:"daily,few_times_week,twice_week,once_week"`
	Barrier         string `json:"barrier" enum:"none,time,discipline,fatigue,pain,cost"`
	StressLevel     string `json:"stress_level" enum:"low,moderate,high"`
	SleepQuality    string `json:"sleep_quality" enum:"good,average,poor"`
	BodyGoal        string `json:"body_goal" enum:"lose_fat,gain_muscle,tone,maintain,improve_posture"`
	ReadinessScore  int    `json:"readiness_score"`
}

// FieldSchema describes a field for the frontend editor
type FieldSchema struct {
	Type    string   `json:"type"`    // "int" or "enum"
	Options []string `json:"options"` // empty if type == "int"
}

// SnakeToPascal converts a snake_case string to PascalCase (e.g. "body_goal" → "BodyGoal").
func SnakeToPascal(s string) string {
	parts := strings.Split(s, "_")
	for i, p := range parts {
		if len(p) > 0 {
			parts[i] = strings.ToUpper(p[:1]) + p[1:]
		}
	}
	return strings.Join(parts, "")
}

// GetUserDataSchema returns the schema for the UI, keyed by snake_case JSON field names.
func GetUserDataSchema() map[string]FieldSchema {
	schema := make(map[string]FieldSchema)
	t := reflect.TypeOf(UserData{})

	for i := 0; i < t.NumField(); i++ {
		field := t.Field(i)
		// Use the JSON tag name (snake_case) as the key
		jsonTag := field.Tag.Get("json")
		name := strings.Split(jsonTag, ",")[0]
		if name == "" || name == "-" {
			continue
		}

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
			schema[name] = FieldSchema{Type: "string"}
		}
	}
	return schema
}
