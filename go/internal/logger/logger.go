package logger

import (
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"time"
)

// LogOutput represents different output destinations
type LogOutput int

const (
	LogOutputFile LogOutput = iota
	LogOutputStdout
	LogOutputBoth
)

// Logger provides structured logging functionality
type Logger struct {
	fileLogger   *log.Logger
	stdoutLogger *log.Logger
	output       LogOutput
	logFile      *os.File
}

// New creates a new logger instance
func New(outputs ...LogOutput) *Logger {
	output := LogOutputBoth
	if len(outputs) > 0 {
		output = outputs[0]
	}

	logger := &Logger{
		output: output,
	}

	// Set up stdout logger
	if output == LogOutputStdout || output == LogOutputBoth {
		logger.stdoutLogger = log.New(os.Stdout, "", 0)
	}

	// Set up file logger
	if output == LogOutputFile || output == LogOutputBoth {
		if err := logger.setupFileLogger(); err != nil {
			// Fallback to stdout if file logging fails
			logger.stdoutLogger = log.New(os.Stdout, "", 0)
			logger.output = LogOutputStdout
			logger.Error("Failed to setup file logger:", err)
		}
	}

	return logger
}

// setupFileLogger initializes file-based logging
func (l *Logger) setupFileLogger() error {
	logPath := filepath.Join(".", "dlm.log")
	
	file, err := os.OpenFile(logPath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
	if err != nil {
		return err
	}

	l.logFile = file
	l.fileLogger = log.New(file, "", 0)
	return nil
}

// formatMessage formats a log message with timestamp
func (l *Logger) formatMessage(level string, args ...interface{}) string {
	timestamp := time.Now().Format("2006-01-02T15:04:05.000Z")
	message := fmt.Sprint(args...)
	if level != "" {
		return fmt.Sprintf("[%s] [%s] %s", timestamp, level, message)
	}
	return fmt.Sprintf("[%s] %s", timestamp, message)
}

// Log writes a general log message
func (l *Logger) Log(args ...interface{}) {
	message := l.formatMessage("INFO", args...)
	l.write(message)
}

// Error writes an error log message
func (l *Logger) Error(args ...interface{}) {
	message := l.formatMessage("ERROR", args...)
	l.write(message)
}

// Debug writes a debug log message
func (l *Logger) Debug(args ...interface{}) {
	message := l.formatMessage("DEBUG", args...)
	l.write(message)
}

// Info writes an info log message (alias for Log)
func (l *Logger) Info(args ...interface{}) {
	l.Log(args...)
}

// write outputs the message to the configured destinations
func (l *Logger) write(message string) {
	switch l.output {
	case LogOutputFile:
		if l.fileLogger != nil {
			l.fileLogger.Println(message)
		}
	case LogOutputStdout:
		if l.stdoutLogger != nil {
			l.stdoutLogger.Println(message)
		}
	case LogOutputBoth:
		if l.fileLogger != nil {
			l.fileLogger.Println(message)
		}
		if l.stdoutLogger != nil {
			l.stdoutLogger.Println(message)
		}
	}
}

// Close closes the log file if it's open
func (l *Logger) Close() error {
	if l.logFile != nil {
		return l.logFile.Close()
	}
	return nil
}

// WriteToFile writes a message directly to a specific file
func WriteToFile(filename, message string) error {
	file, err := os.OpenFile(filename, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
	if err != nil {
		return err
	}
	defer file.Close()

	timestamp := time.Now().Format("2006-01-02T15:04:05.000Z")
	_, err = io.WriteString(file, fmt.Sprintf("[%s] %s\n", timestamp, message))
	return err
}

// Default logger instance
var defaultLogger = New()

// Package-level convenience functions
func Log(args ...interface{}) {
	defaultLogger.Log(args...)
}

func Error(args ...interface{}) {
	defaultLogger.Error(args...)
}

func Debug(args ...interface{}) {
	defaultLogger.Debug(args...)
}

func Info(args ...interface{}) {
	defaultLogger.Info(args...)
}
