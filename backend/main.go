package main

import (
	"log/slog"
	"os"

	"order-system/config"
	"order-system/server"
)

func main() {
	if err := config.ValidateJWTSecret(os.Getenv("JWT_SECRET")); err != nil {
		slog.Error("invalid JWT configuration", "err", err)
		os.Exit(1)
	}

	db, err := server.InitDB()
	if err != nil {
		slog.Error("failed to initialize database", "err", err)
		return
	}

	config.SeedMenus(db)
	if err := config.SeedAdmin(db); err != nil {
		slog.Error("failed to seed admin", "err", err)
		return
	}

	if err := server.Run(db); err != nil {
		slog.Error("failed to run server", "err", err)
	}
}
