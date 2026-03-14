package database

import (
	"encoding/json"
	"time"

	"gorm.io/gorm"
)

// QuizSession represents a single quiz run by a user.
type QuizSession struct {
	ID                 string          `json:"id" gorm:"type:uuid;primaryKey"`
	StartedAt          time.Time       `json:"started_at"`
	CompletedAt        *time.Time      `json:"completed_at,omitempty"`
	DurationSec        *int            `json:"duration_sec,omitempty"`
	Purchased          bool            `json:"purchased" gorm:"default:false"`
	RecommendedOfferID string          `json:"recommended_offer_id,omitempty"`
	FinalUserData      json.RawMessage `json:"final_user_data,omitempty" gorm:"type:jsonb"`
	Events             []UserEvent     `json:"events,omitempty" gorm:"foreignKey:SessionID"`
}

// UserEvent represents a single user choice during a quiz session.
type UserEvent struct {
	ID        uint      `json:"id" gorm:"primaryKey;autoIncrement"`
	SessionID string    `json:"session_id" gorm:"type:uuid;index"`
	NodeID    string    `json:"node_id"`
	Answer    string    `json:"answer"`
	CreatedAt time.Time `json:"created_at"`
}

// ConfigVersion stores a versioned snapshot of the full application config.
type ConfigVersion struct {
	Version   int             `json:"version" gorm:"primaryKey;autoIncrement"`
	Config    json.RawMessage `json:"config" gorm:"type:jsonb;not null"`
	CreatedAt time.Time       `json:"created_at"`
}

// Migrate runs auto-migration for all DB models.
func Migrate(db *gorm.DB) error {
	return db.AutoMigrate(&QuizSession{}, &UserEvent{}, &ConfigVersion{})
}
