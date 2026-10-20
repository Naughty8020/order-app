//go:build integration

// e2eserver serves the real API against a disposable database, only on loopback.
package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"order-system/config"
	"order-system/internal/testdb"
	"order-system/models"
	"order-system/server"
	"os"
	"os/signal"
	"syscall"
	"time"
)

func run() error {
	db, cleanup, err := testdb.New()
	if err != nil {
		return err
	}
	defer func() {
		if err := cleanup(); err != nil {
			log.Printf("test database cleanup: %v", err)
		}
	}()
	if err := config.SeedAdmin(db); err != nil {
		return err
	}
	if err := db.Create(&models.Menu{Name: "E2Eお茶", Price: 200, IsAvailable: true}).Error; err != nil {
		return err
	}
	router, err := server.NewRouter(db)
	if err != nil {
		return err
	}
	srv := &http.Server{Addr: "127.0.0.1:18080", Handler: router, ReadHeaderTimeout: 5 * time.Second}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	done := make(chan error, 1)
	go func() { done <- srv.ListenAndServe() }()
	select {
	case err := <-done:
		return err
	case <-ctx.Done():
		shutdown, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := srv.Shutdown(shutdown); err != nil {
			return err
		}
		err := <-done
		if errors.Is(err, http.ErrServerClosed) {
			return nil
		}
		return err
	}
}
func main() {
	if err := run(); err != nil {
		log.Print(err)
		os.Exit(1)
	}
}
