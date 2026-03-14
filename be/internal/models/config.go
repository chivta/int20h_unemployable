package models

// Config represents the application's entire configurable state.
type Config struct {
	Nodes  map[string]Node        `json:"nodes"`
	Offers map[string]Offer       `json:"offers"`
	Layout map[string]interface{} `json:"layout,omitempty"` // Frontend graph positions mapped by node ID
}
