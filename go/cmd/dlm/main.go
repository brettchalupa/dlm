package main

import (
	"bufio"
	"fmt"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"

	"github.com/brettchalupa/dlm-go/internal/config"
	"github.com/brettchalupa/dlm-go/internal/database"
	"github.com/brettchalupa/dlm-go/internal/downloader"
	"github.com/brettchalupa/dlm-go/internal/logger"
	"github.com/brettchalupa/dlm-go/internal/models"
	"github.com/brettchalupa/dlm-go/internal/web"
	"github.com/brettchalupa/dlm-go/internal/daemon"
)

func main() {
	log := logger.New()
	defer log.Close()

	if len(os.Args) < 2 {
		printUsage()
		return
	}

	command := os.Args[1]

	switch command {
	case "serve":
		runServer(log)
	case "add":
		runAdd(log)
	case "dl":
		runDownload(log)
	case "count":
		runCount(log)
	case "dd":
		runDaemon(log)
	case "init":
		runInit(log)
	default:
		log.Error(fmt.Sprintf("Unsupported command: %s", command))
		printUsage()
		os.Exit(1)
	}
}

func printUsage() {
	fmt.Println("dlm - Download Manager")
	fmt.Println("Commands:")
	fmt.Println("  serve [--with-daemon]  - Start web server")
	fmt.Println("  add URL1 URL2...       - Add URLs to download queue")
	fmt.Println("  add -                  - Read URLs from stdin")
	fmt.Println("  dl [LIMIT]             - Download pending items")
	fmt.Println("  count                  - Show download counts by status")
	fmt.Println("  dd [MINUTES] [LIMIT]   - Run daemon (default: 5 min, 3 downloads)")
	fmt.Println("  init                   - Create default configuration file")
}

func runServer(log *logger.Logger) {
	db, err := database.New("")
	if err != nil {
		log.Error("Failed to initialize database:", err)
		os.Exit(1)
	}
	defer db.Close()

	processor := downloader.New(db, log)
	server := web.New(db, processor, log)

	// Check if daemon should be started
	withDaemon := len(os.Args) > 2 && os.Args[2] == "--with-daemon"
	if withDaemon {
		daemonWorker := daemon.New(db, processor, log)
		go daemonWorker.Start(2, 2) // 2 minutes, 2 downloads per run
	}

	log.Log("Starting web server on port 8001...")
	if err := server.Start(8001); err != nil {
		log.Error("Failed to start server:", err)
		os.Exit(1)
	}
}

func runAdd(log *logger.Logger) {
	db, err := database.New("")
	if err != nil {
		log.Error("Failed to initialize database:", err)
		os.Exit(1)
	}
	defer db.Close()

	processor := downloader.New(db, log)

	var urls []string

	if len(os.Args) > 2 {
		if os.Args[2] == "-" {
			// Read from stdin
			urls = append(urls, os.Args[3:]...)
			scanner := bufio.NewScanner(os.Stdin)
			for scanner.Scan() {
				line := strings.TrimSpace(scanner.Text())
				if line != "" {
					urls = append(urls, line)
				}
			}
		} else {
			urls = os.Args[2:]
		}
	}

	if len(urls) == 0 {
		log.Error("No URLs provided")
		os.Exit(1)
	}

	if err := processor.AddURLs(urls); err != nil {
		log.Error("Failed to add URLs:", err)
		os.Exit(1)
	}
}

func runDownload(log *logger.Logger) {
	db, err := database.New("")
	if err != nil {
		log.Error("Failed to initialize database:", err)
		os.Exit(1)
	}
	defer db.Close()

	processor := downloader.New(db, log)

	limit := 0
	if len(os.Args) > 2 {
		if l, err := strconv.Atoi(os.Args[2]); err == nil {
			limit = l
		}
	}

	downloads, err := db.GetDownloadsByStatus(models.StatusPending, limit)
	if err != nil {
		log.Error("Failed to get pending downloads:", err)
		os.Exit(1)
	}

	if len(downloads) == 0 {
		log.Log("No pending downloads found")
		return
	}

	log.Log(fmt.Sprintf("Processing %d downloads...", len(downloads)))
	if err := processor.ProcessDownloads(downloads); err != nil {
		log.Error("Failed to process downloads:", err)
		os.Exit(1)
	}
}

func runCount(log *logger.Logger) {
	db, err := database.New("")
	if err != nil {
		log.Error("Failed to initialize database:", err)
		os.Exit(1)
	}
	defer db.Close()

	counts, err := db.CountDownloads()
	if err != nil {
		log.Error("Failed to count downloads:", err)
		os.Exit(1)
	}

	log.Log("downloads in db:")
	for _, count := range counts {
		log.Log(fmt.Sprintf("%s: %d", count.Status, count.Count))
	}
}

func runDaemon(log *logger.Logger) {
	db, err := database.New("")
	if err != nil {
		log.Error("Failed to initialize database:", err)
		os.Exit(1)
	}
	defer db.Close()

	processor := downloader.New(db, log)

	minutes := 5
	downloadsPerRun := 3

	if len(os.Args) > 2 {
		if m, err := strconv.Atoi(os.Args[2]); err == nil {
			minutes = m
		}
	}

	if len(os.Args) > 3 {
		if d, err := strconv.Atoi(os.Args[3]); err == nil {
			downloadsPerRun = d
		}
	}

	daemonWorker := daemon.New(db, processor, log)

	// Handle graceful shutdown
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-c
		log.Log("Shutting down daemon...")
		daemonWorker.Stop()
		os.Exit(0)
	}()

	log.Log(fmt.Sprintf("Starting daemon: check every %d minutes, download %d items per run", minutes, downloadsPerRun))
	log.Log("Press Ctrl+C to stop")

	daemonWorker.Start(minutes, downloadsPerRun)
}

func runInit(log *logger.Logger) {
	filename := "dlm.yml"
	if len(os.Args) > 2 {
		filename = os.Args[2]
	}

	if err := config.CreateDefaultConfig(filename); err != nil {
		log.Error("Failed to create config file:", err)
		os.Exit(1)
	}

	log.Log(fmt.Sprintf("Created default configuration file: %s", filename))
	log.Log("Edit the file to configure your download collections")
}
