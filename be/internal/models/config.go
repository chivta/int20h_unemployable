package models

// Config represents the application's entire configurable state.
type Config struct {
	Root   string                 `json:"root,omitempty"`   // ID of the root/start node
	Nodes  map[string]Node        `json:"nodes"`
	Offers map[string]Offer       `json:"offers"`
	Layout map[string]interface{} `json:"layout,omitempty"` // Frontend graph positions mapped by node ID
}
