package engine

import (
	"reflect"
	"sort"
	"strings"

	"github.com/chivta/int20h_unemployable/internal/models"
)

// CalculateRecommendations takes the user's current state and a list of all available
// offers, evaluates the requirements for each offer, and returns a sorted list of
// recommended offers (highest score first). Offers with failing obligatory requirements
// are excluded.
func CalculateRecommendations(user models.UserData, offers []models.Offer) []models.OfferResult {
	var results []models.OfferResult
	
	// Use reflection to dynamically check fields on UserData
	userVal := reflect.ValueOf(user)

	for _, offer := range offers {
		score := 0
		disqualified := false

		for _, req := range offer.Requirements {
			// Find the field in UserData (case-insensitive approximation)
			// Assuming field names in requirements match the JSON tags, e.g., "goal" -> "Goal"
			var fieldName string
			// Simple Title case since our struct fields are capitalized
			if len(req.FieldName) > 0 {
				fieldName = strings.ToUpper(req.FieldName[:1]) + req.FieldName[1:]
			}

			field := userVal.FieldByName(fieldName)
			if !field.IsValid() {
				// Field not found in struct - treat as not matching
				if req.IsObligatory {
					disqualified = true
					break
				}
				continue
			}

			// Value comparison (we know they are mostly strings or ints)
			matches := false
			if field.Kind() == reflect.String {
				matches = (field.String() == req.MatchValue)
			} else if field.Kind() == reflect.Int {
				// Might need parsing if req.MatchValue is a string representation of int
				// For now assuming strings
			}

			if matches {
				score += req.Score
			} else {
				if req.IsObligatory {
					disqualified = true
					break
				}
			}
		}

		if !disqualified {
			results = append(results, models.OfferResult{
				Offer: offer,
				Score: score,
			})
		}
	}

	// Sort results descending by score
	sort.Slice(results, func(i, j int) bool {
		return results[i].Score > results[j].Score
	})

	return results
}
