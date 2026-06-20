package main

import (
	"io"
	"log"
	"os"
	"os/exec"
	"path/filepath"

	"github.com/oovets/slack/api"
	"github.com/oovets/slack/gui"
)

func init() {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		homeDir = "/tmp"
	}
	logFile := filepath.Join(homeDir, ".slack-gui.log")
	f, err := os.OpenFile(logFile, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0600)

	var w io.Writer = os.Stdout
	if err == nil {
		w = io.MultiWriter(os.Stdout, f)
	}
	log.SetOutput(w)
	log.SetFlags(log.LstdFlags | log.Lshortfile)
	log.Println("========== Slack GUI Started ==========")
}

func main() {
	token, appToken, source, err := resolveSlackCredentials()
	if err != nil {
		log.Fatal(err)
	}
	baseURL := os.Getenv("SLACK_API_BASE_URL")
	log.Printf("Using Slack credentials from: %s", source)

	client := api.NewClient(token, baseURL)
	info, err := client.AuthTest()
	if err != nil {
		log.Fatalf("Failed to authenticate to Slack: %v", err)
	}
	log.Printf("Connected to Slack team: %s", info.TeamName)

	slackApp := gui.New(client, info, appToken)
	slackApp.SetInitialOpen(os.Getenv("SLACK_OPEN_CHANNEL_ID"), os.Getenv("SLACK_OPEN_THREAD_TS"))

	if wsNames, cfgPath := workspaceNamesFromConfig(); len(wsNames) > 1 {
		slackApp.SetWorkspaces(wsNames, cfgPath, func(idx int) {
			if err := setActiveWorkspace(cfgPath, idx); err != nil {
				log.Printf("Failed to update active workspace: %v", err)
				return
			}
			exe, err := os.Executable()
			if err != nil {
				log.Printf("Failed to resolve executable: %v", err)
				return
			}
			cmd := exec.Command(exe)
			cmd.Env = os.Environ()
			if err := cmd.Start(); err != nil {
				log.Printf("Failed to launch new instance: %v", err)
				return
			}
		})
	}

	slackApp.Run()
}
