package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "log"
    "net/http"
)

const (
    openaiURL = "https://api.openai.com/v1/webhooks/rest/your-webhook-id"
    openaiKey = "your-api-key"
)

type Request struct {
    Text string `json:"text"`
}

type Response struct {
    Choices []struct {
        Text string `json:"text"`
    } `json:"choices"`
}

func main() {
    http.HandleFunc("/chat", handleChat)
    log.Fatal(http.ListenAndServe(":8080", nil))
}

func handleChat(w http.ResponseWriter, r *http.Request) {
    if r.Method != "POST" {
        http.Error(w, "Invalid request method.", http.StatusMethodNotAllowed)
        return
    }

    var req Request
    err := json.NewDecoder(r.Body).Decode(&req)
    if err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    data := map[string]interface{}{
        "prompt": req.Text,
        "temperature": 0.5,
        "max_tokens": 50,
    }
    jsonData, err := json.Marshal(data)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    client := &http.Client{}
    req, err := http.NewRequest("POST", openaiURL, bytes.NewBuffer(jsonData))
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", openaiKey))

    resp, err := client.Do(req)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    defer resp.Body.Close()

    var res Response
    err = json.NewDecoder(resp.Body).Decode(&res)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(res.Choices[0].Text)
}
