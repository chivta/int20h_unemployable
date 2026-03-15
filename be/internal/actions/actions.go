package actions

import (
	"reflect"
	"sort"
	"sync"

	"github.com/chivta/int20h_unemployable/internal/models"
)

// Applier is a function that applies a single action to a reflect.Value field.
// It receives the target field and the action containing the value.
type Applier func(field reflect.Value, action models.Action)

var (
	registryMu sync.RWMutex
	registry   = make(map[string]Applier)
)

func init() {
	// Register the built-in appliers automatically
	Register("set", ApplySet)
}

// Register adds or overrides an action applier by name.
func Register(name string, fn Applier) {
	registryMu.Lock()
	defer registryMu.Unlock()
	registry[name] = fn
}

// Get returns the applier function registered for the given name.
func Get(name string) (Applier, bool) {
	registryMu.RLock()
	defer registryMu.RUnlock()
	fn, ok := registry[name]
	return fn, ok
}

// Names returns a sorted list of all registered action types.
func Names() []string {
	registryMu.RLock()
	defer registryMu.RUnlock()
	names := make([]string, 0, len(registry))
	for k := range registry {
		names = append(names, k)
	}
	sort.Strings(names)
	return names
}

// ApplySet directly sets the field to Value
func ApplySet(field reflect.Value, action models.Action) {
	switch field.Kind() {
	case reflect.Int:
		if f, ok := action.Value.(float64); ok {
			field.SetInt(int64(f))
		}
	case reflect.Bool:
		if b, ok := action.Value.(bool); ok {
			field.SetBool(b)
		}
	case reflect.String:
		if s, ok := action.Value.(string); ok {
			field.SetString(s)
		}
	}
}
