package database

import "encoding/json"

// DB is the high-level interface for persistence operations.
// Implementations can use GORM/PostgreSQL, SQLite, or even an in-memory mock.
type DB interface {
	// Sessions
	CreateSession(session *QuizSession) error
	UpdateSession(session *QuizSession) error
	GetSession(id string) (*QuizSession, error)

	// Events
	CreateEvent(event *UserEvent) error

	// Config versions
	SaveConfigVersion(cfg json.RawMessage) (int, error) // returns the new version number
	ListConfigVersions() ([]ConfigVersion, error)
	GetConfigVersion(version int) (*ConfigVersion, error)
}
