package main

import (
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"time"

	"github.com/getlantern/systray"
	"github.com/ncruces/zenity"
)

var backendCmd *exec.Cmd
var frontendCmd *exec.Cmd

func main() {
	f, err := os.OpenFile("rmm_manager.log", os.O_RDWR|os.O_CREATE|os.O_APPEND, 0666)
	if err == nil {
		log.SetOutput(f)
	}
	systray.Run(onReady, onExit)
}

func onReady() {
	systray.SetIcon(getIcon())
	systray.SetTitle("RMM Control Center")
	systray.SetTooltip("Master System Tray Manager")

	mOpen := systray.AddMenuItem("Open Dashboard", "Open Dashboard in Google Chrome")
	mQuit := systray.AddMenuItem("Stop Servers & Quit", "Kill running PyInstaller and Next.js child processes")

	exePath, _ := os.Executable()
	baseDir := filepath.Dir(exePath)

	log.Println("Spinning up the local Docker Postgres Database internally...")
	dbCmd := exec.Command("docker-compose", "up", "-d")
	dbCmd.Dir = baseDir
	if err := dbCmd.Run(); err != nil {
		log.Println("WARNING: Failed to start docker-compose. Is Docker Desktop running?", err)
		zenity.Warning("Failed to automatically boot the Docker Database! Make sure Docker Desktop is open.", zenity.Title("Database Warning"))
	}

	log.Println("Spinning up Backend Application Server Executable...")
	backendPath := filepath.Join(baseDir, "backend-server.exe")
	backendCmd = exec.Command(backendPath)
	backendCmd.Dir = baseDir
	
	// Physically capture traceback data out of the PyInstaller node seamlessly!
	backendCmd.Stdout = log.Writer()
	backendCmd.Stderr = log.Writer()
	
	if err := backendCmd.Start(); err != nil {
		zenity.Error("Failed to spawn the Python executable! Did you build it yet? Error:\n"+err.Error(), zenity.Title("Runtime Error"))
	}

	log.Println("Spinning up Next.js GUI Nodes...")
	frontendDir := filepath.Join(baseDir, "frontend")
	frontendCmd = exec.Command("cmd", "/C", "npm start")
	frontendCmd.Dir = frontendDir
	if err := frontendCmd.Start(); err != nil {
		zenity.Error("Failed to spin up Frontend server UI context: "+err.Error(), zenity.Title("Runtime Error"))
	}

	// Trigger browser seamlessly 
	time.AfterFunc(3*time.Second, func() {
		exec.Command("cmd", "/C", "start http://localhost:3000").Start()
	})

	go func() {
		for {
			select {
			case <-mOpen.ClickedCh:
				exec.Command("cmd", "/C", "start http://localhost:3000").Start()
			case <-mQuit.ClickedCh:
				systray.Quit()
				return
			}
		}
	}()
}

func onExit() {
	log.Println("Tearing down the application runtime instances natively via PID signals...")
	if backendCmd != nil && backendCmd.Process != nil {
		backendCmd.Process.Kill()
	}
	if frontendCmd != nil && frontendCmd.Process != nil {
		// Target explicit CMD trees cleanly on Windows so Next.js shuts down absolutely 
		exec.Command("taskkill", "/T", "/F", "/PID", fmt.Sprintf("%d", frontendCmd.Process.Pid)).Run()
	}
}

func getIcon() []byte {
	return []byte{
		0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x10, 0x10, 0x00, 0x00,
		0x01, 0x00, 0x20, 0x00, 0x68, 0x04, 0x00, 0x00, 0x16, 0x00,
		0x00, 0x00, 0x28, 0x00, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00,
	}
}
