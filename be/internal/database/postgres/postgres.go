package postgres

import (
	"encoding/json"
	"fmt"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"github.com/chivta/int20h_unemployable/internal/database"
)

// PgDB implements database.DB using GORM + PostgreSQL.
type PgDB struct {
	db *gorm.DB
}

// New opens a PostgreSQL connection and auto-migrates the schema.
func New(dsn string) (database.DB, error) {
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	if err := database.Migrate(db); err != nil {
		return nil, fmt.Errorf("failed to migrate database: %w", err)
	}

	return &PgDB{db: db}, nil
}

// ── Sessions ──

func (p *PgDB) CreateSession(session *database.QuizSession) error {
	return p.db.Create(session).Error
}

func (p *PgDB) UpdateSession(session *database.QuizSession) error {
	return p.db.Save(session).Error
}

func (p *PgDB) GetSession(id string) (*database.QuizSession, error) {
	var session database.QuizSession
	if err := p.db.Preload("Events").First(&session, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &session, nil
}

// ── Events ──

func (p *PgDB) CreateEvent(event *database.UserEvent) error {
	return p.db.Create(event).Error
}

// ── Config Versions ──

func (p *PgDB) SaveConfigVersion(cfg json.RawMessage) (int, error) {
	cv := database.ConfigVersion{Config: cfg}
	if err := p.db.Create(&cv).Error; err != nil {
		return 0, err
	}
	return cv.Version, nil
}

func (p *PgDB) ListConfigVersions() ([]database.ConfigVersion, error) {
	var versions []database.ConfigVersion
	if err := p.db.Order("version desc").Find(&versions).Error; err != nil {
		return nil, err
	}
	return versions, nil
}

func (p *PgDB) GetConfigVersion(version int) (*database.ConfigVersion, error) {
	var cv database.ConfigVersion
	if err := p.db.First(&cv, "version = ?", version).Error; err != nil {
		return nil, err
	}
	return &cv, nil
}
