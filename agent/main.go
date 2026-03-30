package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"github.com/getlantern/systray"
	"github.com/ncruces/zenity"
)

const configFile = "config.json"

type Config struct {
	AgentID    string `json:"agent_id"`
	ApiBaseURL string `json:"api_base_url"`
	ApiKey     string `json:"api_key"`
}

// Global runtime context
var globalConfig *Config

type RegisterRequest struct {
	Hostname  string `json:"hostname"`
	OSVersion string `json:"os_version"`
	IPAddress string `json:"ip_address"`
}

type RegisterResponse struct {
	ID string `json:"id"`
}

type Task struct {
	ID      string `json:"id"`
	Package struct {
		Name        string `json:"name"`
		DownloadURL string `json:"download_url"`
		SilentArgs  string `json:"silent_args"`
	} `json:"package"`
}

type ResultRequest struct {
	Status string `json:"status"`
	Logs   string `json:"logs"`
}

// -------------------------------------------------------------
// Application Lifecycle & System Tray UI
// -------------------------------------------------------------

func main() {
	f, err := os.OpenFile("agent.log", os.O_RDWR|os.O_CREATE|os.O_APPEND, 0666)
	if err == nil {
		log.SetOutput(io.MultiWriter(f, os.Stdout))
	}

	log.Println("Initializing Endpoint Management Agent in System Tray Mode...")

	// Spawn the OS-Level System Tray natively 
	systray.Run(onReady, onExit)
}

func onReady() {
	systray.SetIcon(getIcon())
	systray.SetTitle("RMM Agent")
	systray.SetTooltip("Endpoint Management Agent")

	mStatus := systray.AddMenuItem("Initializing...", "Current Status")
	mStatus.Disable()

	systray.AddSeparator()
	mQuit := systray.AddMenuItem("Quit Engine", "Completely shut down all background telemetry")
	go func() {
		startup(mStatus)
	}()
	go func() {
		<-mQuit.ClickedCh
		log.Println("User executed Right-Click Quit command.")
		systray.Quit()
	}()
}

func onExit() {
	log.Println("Agent safely suspended.")
}

func startup(mStatus *systray.MenuItem) {
	config, err := loadConfig()
	if err != nil {
		log.Printf("Configurations absent. Spawning initial Zenity Prompt native GUI workflows.")
		serverUrl, err := zenity.Entry("Enter RMM Server URL / Hostname\n(e.g. http://192.168.1.100:8000 or http://myserver.local:8000):",
			zenity.Title("Network Configuration Setup"),
		)
		if err != nil || serverUrl == "" {
			zenity.Error("Server URL is explicitly required to map background tasks.", zenity.Title("Fatal Shutdown"))
			systray.Quit()
			return
		}
		apiKey, err := zenity.Entry("Enter your Master API Key:",
			zenity.Title("Endpoint Authentication"),
			zenity.HideText(),
		)
		if err != nil || apiKey == "" {
			zenity.Error("API Key is explicitly required to execute commands.", zenity.Title("Fatal Shutdown"))
			systray.Quit()
			return
		}

		serverUrl = strings.TrimSpace(serverUrl)
		if !strings.HasPrefix(serverUrl, "http://") && !strings.HasPrefix(serverUrl, "https://") {
			serverUrl = "http://" + serverUrl
		}

		u, _ := url.Parse(serverUrl)
		if u != nil && u.Port() == "" {
			u.Host = u.Host + ":8000"
			serverUrl = u.String()
		}

		serverUrl = strings.TrimSuffix(serverUrl, "/")
		if !strings.HasSuffix(serverUrl, "/api") {
			serverUrl = serverUrl + "/api"
		}

		globalConfig = &Config{
			ApiBaseURL: serverUrl,
			ApiKey:     apiKey,
		}

		mStatus.SetTitle("Status: Contacting Server...")
		log.Printf("Natively caught credentials. Executing backend bridge handshakes...")

		id, err := registerAgent()
		if err != nil {
			zenity.Error(fmt.Sprintf("Failed to bridge the backend database:\n%v", err), zenity.Title("Registration Failure"))
			systray.Quit()
			return
		}
		
		globalConfig.AgentID = id
		saveConfig(globalConfig)

		zenity.Info("Ws in chat boys", zenity.Title("Success!"))

	} else {
		log.Printf("Configurations seamlessly retrieved for Agent: %s", config.AgentID)
		globalConfig = config
	}

	mStatus.SetTitle("Status: Online & Polling")

	go startHeartbeat(globalConfig.AgentID)
	go startTaskPoller(globalConfig.AgentID)
}

// -------------------------------------------------------------
// Network Bridge Architectures
// -------------------------------------------------------------

func doRequest(method, endpoint string, bodyData []byte) (*http.Response, error) {
	var req *http.Request
	var err error

	if bodyData != nil {
		req, err = http.NewRequest(method, globalConfig.ApiBaseURL+endpoint, bytes.NewBuffer(bodyData))
		req.Header.Set("Content-Type", "application/json")
	} else {
		req, err = http.NewRequest(method, globalConfig.ApiBaseURL+endpoint, nil)
	}

	if err != nil {
		return nil, err
	}

	req.Header.Set("X-API-Key", globalConfig.ApiKey)

	client := &http.Client{Timeout: 60 * time.Second}
	return client.Do(req)
}

func loadConfig() (*Config, error) {
	data, err := os.ReadFile(configFile)
	if err != nil {
		return nil, err
	}
	var config Config
	if err := json.Unmarshal(data, &config); err != nil {
		return nil, err
	}
	if config.AgentID == "" || config.ApiBaseURL == "" || config.ApiKey == "" {
		return nil, fmt.Errorf("crucial dependencies randomly absent from config")
	}
	return &config, nil
}

func saveConfig(config *Config) error {
	data, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(configFile, data, 0644)
}

func gatherSystemInfo() (hostname, osVersion, ipAddress string) {
	hostname, _ = os.Hostname()
	osVersion = runtime.GOOS + " " + runtime.GOARCH

	ipAddress = "Unknown"
	addrs, err := net.InterfaceAddrs()
	if err == nil {
		for _, address := range addrs {
			if ipnet, ok := address.(*net.IPNet); ok && !ipnet.IP.IsLoopback() {
				if ipnet.IP.To4() != nil {
					ipAddress = ipnet.IP.String()
					break
				}
			}
		}
	}
	return
}

func registerAgent() (string, error) {
	hostname, osVersion, ipAddress := gatherSystemInfo()
	reqBody := RegisterRequest{
		Hostname:  hostname,
		OSVersion: osVersion,
		IPAddress: ipAddress,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return "", err
	}

	resp, err := doRequest("POST", "/agent/register", jsonData)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("unexpected backend mapping rejection code %d: %s", resp.StatusCode, string(bodyBytes))
	}

	var regResp RegisterResponse
	if err := json.NewDecoder(resp.Body).Decode(&regResp); err != nil {
		return "", err
	}

	return regResp.ID, nil
}

func startHeartbeat(agentID string) {
	ticker := time.NewTicker(2 * time.Minute)
	defer ticker.Stop()
	sendHeartbeat(agentID)
	for range ticker.C {
		sendHeartbeat(agentID)
	}
}

func sendHeartbeat(agentID string) {
	endpoint := fmt.Sprintf("/agent/%s/heartbeat", agentID)
	resp, err := doRequest("POST", endpoint, nil)
	if err != nil {
		log.Printf("[Heartbeat] Endpoint Refusal: %v", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("[Heartbeat] Rejected Exit Code %d", resp.StatusCode)
	}
}

func startTaskPoller(agentID string) {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()
	pollForTasks(agentID)
	for range ticker.C {
		pollForTasks(agentID)
	}
}

func pollForTasks(agentID string) {
	endpoint := fmt.Sprintf("/agent/%s/tasks", agentID)
	resp, err := doRequest("GET", endpoint, nil)
	if err != nil {
		log.Printf("[Poller] Pipeline Drop: %v", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound || resp.StatusCode == http.StatusNoContent {
		return
	}

	if resp.StatusCode != http.StatusOK {
		log.Printf("[Poller] Rejection Code %d", resp.StatusCode)
		return
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil || len(body) == 0 || string(body) == "null" {
		return
	}

	var task Task
	if err := json.Unmarshal(body, &task); err != nil {
		log.Printf("[Poller] JSON mapping corruption: %v", err)
		return
	}

	if task.ID != "" {
		executeTask(task)
	}
}

func executeTask(task Task) {
	log.Printf("[Execution Context] Pulled Sequence %s (Name: %s)", task.ID, task.Package.Name)
	tempFile, ext, err := downloadFile(task.Package.DownloadURL)
	if err != nil {
		msg := fmt.Sprintf("Corrupt transit blob streaming mapping: %v", err)
		log.Println(msg)
		sendTaskResult(task.ID, "FAILED", msg)
		return
	}
	defer os.Remove(tempFile)

	var cmd *exec.Cmd
	args := strings.Fields(task.Package.SilentArgs)
	extLower := strings.ToLower(ext)

	if extLower == ".msi" {
		cmd = exec.Command("msiexec", append([]string{"/i", tempFile, "/qn"}, args...)...)
	} else if extLower == ".ps1" {
		cmd = exec.Command("powershell.exe", append([]string{"-ExecutionPolicy", "Bypass", "-NoProfile", "-File", tempFile}, args...)...)
	} else {
		if len(args) > 0 {
			cmd = exec.Command(tempFile, args...)
		} else {
			cmd = exec.Command(tempFile)
		}
	}

	log.Printf("[Execution Context] Subprocess Initiated. Target: %s", filepath.Base(tempFile))
	output, err := cmd.CombinedOutput()
	logs := string(output)

	if err != nil {
		msg := fmt.Sprintf("Child Process Fatal Exit %v - STDOUT:\n%s", err, logs)
		log.Println(msg)
		sendTaskResult(task.ID, "FAILED", msg)
		return
	}

	msg := fmt.Sprintf("Process Execution Cleanly Completed. STDOUT:\n%s", logs)
	log.Println(msg)
	sendTaskResult(task.ID, "SUCCESS", msg)
}

func downloadFile(downloadUrl string) (string, string, error) {
	var req *http.Request
	var err error

	req, err = http.NewRequest("GET", downloadUrl, nil)
	if err != nil {
		return "", "", err
	}
	
	if strings.Contains(downloadUrl, strings.TrimSuffix(globalConfig.ApiBaseURL, "/api")) {
		req.Header.Set("X-API-Key", globalConfig.ApiKey)
	}

	client := &http.Client{Timeout: 300 * time.Second} 
	resp, err := client.Do(req)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", "", fmt.Errorf("status response completely rejected: %s", resp.Status)
	}

	ext := ".exe"
	parsedUrl, err := url.Parse(downloadUrl)
	if err == nil {
		if e := filepath.Ext(parsedUrl.Path); e != "" {
			ext = e
		}
	}

	tmpFile, err := os.CreateTemp("", fmt.Sprintf("rmm_task_*%s", ext))
	if err != nil {
		return "", "", err
	}
	defer tmpFile.Close()

	if _, err := io.Copy(tmpFile, resp.Body); err != nil {
		return "", "", err
	}
	return tmpFile.Name(), ext, nil
}

func sendTaskResult(taskID, status, logs string) {
	endpoint := fmt.Sprintf("/agent/tasks/%s/result", taskID)
	req := ResultRequest{Status: status, Logs: logs}
	
	jsonData, _ := json.Marshal(req)
	resp, err := doRequest("POST", endpoint, jsonData)
	if err != nil {
		log.Printf("[Results Tracking] Remote Push Failure: %v", err)
		return
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		log.Printf("[Results Tracking] Backend Context Rejected Sequence Payload - HTTP %d", resp.StatusCode)
	}
}

// getIcon outputs a purely generated 16x16 minimal base64 physical struct to avoid external `.ico` dependencies natively 
func getIcon() []byte {

	return []byte{
		0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x10, 0x10, 0x00, 0x00,
		0x01, 0x00, 0x20, 0x00, 0x68, 0x04, 0x00, 0x00, 0x16, 0x00,
		0x00, 0x00, 0x28, 0x00, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00,
		// Trailing zeros cleanly instruct Windows Tray parsing it securely and filling a generic blue tint natively usually.
	}
}
