package models

// Requirement defines a condition that UserData must meet for an Offer.
type Requirement struct {
	FieldName    string `json:"field_name"`
	MatchValue   string `json:"match_value"`
	IsObligatory bool   `json:"is_obligatory"`
	IsMustNot    bool   `json:"is_must_not"`
	Score        int    `json:"score"`
}

// Offer represents a digital or physical fitness offering (or both).
type Offer struct {
	ID           string        `json:"id"`
	Name         string        `json:"name"`
	Description  string        `json:"description"`
	Requirements []Requirement `json:"requirements"`
}

// OfferResult represents an offer with its calculated compatibility score.
type OfferResult struct {
	Offer
	Score int `json:"score"`
}
