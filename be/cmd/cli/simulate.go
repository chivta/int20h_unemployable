package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"sync"
	"sync/atomic"
	"time"

	"github.com/spf13/cobra"
)

var (
	flagBaseURL    string
	flagCount      int
	flagDelay      int
	flagSilent     bool
	flagConcurrent int
)

var simulateCmd = &cobra.Command{
	Use:   "simulate",
	Short: "Simulate random users traversing the DAG via the HTTP API",
	RunE:  runSimulate,
}

func init() {
	simulateCmd.Flags().StringVarP(&flagBaseURL, "url", "u", "http://localhost:8080", "Base URL of the backend API")
	simulateCmd.Flags().IntVarP(&flagCount, "count", "n", 1, "Number of simulated users")
	simulateCmd.Flags().IntVarP(&flagDelay, "delay", "d", 500, "Delay between steps in milliseconds (simulates think time)")
	simulateCmd.Flags().BoolVarP(&flagSilent, "silent", "s", false, "Suppress step-by-step output (useful for bulk load testing)")
	simulateCmd.Flags().IntVarP(&flagConcurrent, "concurrent", "c", 1, "Number of concurrent workers (default 1)")
}

// apiResponse is a generic holder for JSON API responses.
type apiResponse struct {
	Node      *apiNode               `json:"node,omitempty"`
	User      map[string]interface{} `json:"user,omitempty"`
	SessionID string                 `json:"session_id,omitempty"`
	Results   []apiOffer             `json:"results,omitempty"`
	Error     string                 `json:"error,omitempty"`
}

type apiNode struct {
	ID      string    `json:"id"`
	Type    string    `json:"type"`
	Content string    `json:"content"`
	Edges   []apiEdge `json:"edges"`
}

type apiEdge struct {
	MatchValue string `json:"match_value"`
	ToNodeID   string `json:"to_node_id"`
}

type apiOffer struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Score int    `json:"score"`
}

func runSimulate(cmd *cobra.Command, args []string) error {
	var wg sync.WaitGroup
	var successCount int32
	var errorCount int32

	// Channel to feed jobs
	jobs := make(chan int, flagCount)
	for i := 0; i < flagCount; i++ {
		jobs <- i + 1
	}
	close(jobs)

	startTime := time.Now()

	for w := 0; w < flagConcurrent; w++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			for i := range jobs {
				if !flagSilent {
					fmt.Printf("\n━━━ Simulated User %d/%d (Worker %d) ━━━\n", i, flagCount, workerID)
				}
				if err := simulateOneUser(i); err != nil {
					if !flagSilent {
						fmt.Printf("  ❌ Error: %v\n", err)
					}
					atomic.AddInt32(&errorCount, 1)
				} else {
					atomic.AddInt32(&successCount, 1)
				}
			}
		}(w + 1)
	}

	wg.Wait()

	fmt.Printf("\n✅ Simulation complete in %s!\n", time.Since(startTime).Round(time.Millisecond))
	fmt.Printf("📊 Success: %d | Errors: %d\n", successCount, errorCount)
	return nil
}

func simulateOneUser(userID int) error {
	// 1. Start a new session (reset)
	resp, err := postJSON(flagBaseURL+"/api/user/reset", nil)
	if err != nil {
		return fmt.Errorf("reset: %w", err)
	}

	sessionID := resp.SessionID
	if !flagSilent {
		fmt.Printf("  📋 Session: %s\n", sessionID)
	}

	if resp.Node == nil || resp.Node.ID == "" {
		return fmt.Errorf("no start node returned")
	}

	currentNode := resp.Node
	step := 0
	startTime := time.Now()

	// 2. Traverse the DAG
	for {
		step++

		if currentNode == nil || len(currentNode.Edges) == 0 {
			if !flagSilent {
				fmt.Printf("  🏁 Reached end at step %d (node: %s)\n", step, nodeID(currentNode))
			}
			break
		}

		// Pick a random edge
		edge := currentNode.Edges[rand.Intn(len(currentNode.Edges))]
		answer := edge.MatchValue
		if answer == "" {
			answer = "continue"
		}

		if !flagSilent {
			fmt.Printf("  Step %d: [%s] → answer: %q → %s\n", step, currentNode.ID, answer, edge.ToNodeID)
		}

		// Simulate think time
		if flagDelay > 0 {
			time.Sleep(time.Duration(flagDelay) * time.Millisecond)
		}

		// Submit the answer
		body := map[string]string{
			"node_id":    currentNode.ID,
			"answer":     answer,
			"session_id": sessionID,
		}
		resp, err = postJSON(flagBaseURL+"/api/user/process", body)
		if err != nil {
			return fmt.Errorf("process step %d: %w", step, err)
		}

		if resp.Error != "" {
			if !flagSilent {
				fmt.Printf("    ⚠️  API error: %s\n", resp.Error)
			}
			break
		}

		currentNode = resp.Node
	}

	elapsed := time.Since(startTime)
	if !flagSilent {
		fmt.Printf("  ⏱️  Duration: %s (%d steps)\n", elapsed.Round(time.Millisecond), step)
	}

	// 3. Get recommendations
	recURL := fmt.Sprintf("%s/api/user/recommendations?session_id=%s", flagBaseURL, sessionID)
	recResp, err := getJSON(recURL)
	if err != nil {
		if !flagSilent {
			fmt.Printf("    ⚠️  Failed to get recommendations: %v\n", err)
		}
	} else if len(recResp.Results) > 0 {
		if !flagSilent {
			fmt.Printf("  🎯 Top recommendation: %s (score: %d)\n", recResp.Results[0].Name, recResp.Results[0].Score)
			for i, r := range recResp.Results {
				fmt.Printf("      %d. %s (score: %d)\n", i+1, r.Name, r.Score)
			}
		}
	} else {
		if !flagSilent {
			fmt.Println("  📭 No recommendations")
		}
	}

	// 4. Randomly decide to purchase (50% chance)
	if rand.Float64() < 0.5 {
		purchaseBody := map[string]string{"session_id": sessionID}
		_, err := postJSON(flagBaseURL+"/api/user/purchase", purchaseBody)
		if err == nil {
			if !flagSilent {
				fmt.Println("  💰 Purchased!")
			}
		} else {
			if !flagSilent {
				fmt.Printf("    ⚠️  Purchase failed: %v\n", err)
			}
		}
	} else {
		if !flagSilent {
			fmt.Println("  🚫 Did not purchase")
		}
	}

	return nil
}

func nodeID(n *apiNode) string {
	if n == nil {
		return "<nil>"
	}
	return n.ID
}

func postJSON(url string, body interface{}) (*apiResponse, error) {
	var bodyReader io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		bodyReader = bytes.NewReader(b)
	}

	resp, err := http.Post(url, "application/json", bodyReader)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result apiResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return &result, nil
}

func getJSON(url string) (*apiResponse, error) {
	resp, err := http.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result apiResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return &result, nil
}
