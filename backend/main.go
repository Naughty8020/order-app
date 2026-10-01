package main

import (
	"log/slog"

	"order-system/config"
	"order-system/server"
)

func main() {
	db, err := server.InitDB()
	if err != nil {
		slog.Error("failed to initialize database", "err", err)
		return
	}

	config.SeedMenus(db)

	if err := server.Run(db); err != nil {
		slog.Error("failed to run server", "err", err)
	}
}
