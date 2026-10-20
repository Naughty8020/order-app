//go:build integration

// Package testdb provisions disposable MySQL databases for integration and E2E tests.
package testdb

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"os"
	"time"

	driver "github.com/go-sql-driver/mysql"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"order-system/models"
)

// New always creates a random database; it never migrates or drops a caller's database.
func New() (*gorm.DB, func() error, error) {
	dsn := os.Getenv("TEST_MYSQL_DSN")
	if dsn == "" {
		return nil, nil, fmt.Errorf("TEST_MYSQL_DSN is required; see backend/README.md")
	}
	cfg, err := driver.ParseDSN(dsn)
	if err != nil {
		return nil, nil, fmt.Errorf("invalid TEST_MYSQL_DSN")
	}
	cfg.DBName = ""
	cfg.ParseTime = true
	cfg.Loc = time.UTC
	cfg.Timeout = 5 * time.Second
	cfg.ReadTimeout = 5 * time.Second
	cfg.WriteTimeout = 5 * time.Second
	connect := func() (*gorm.DB, error) {
		return gorm.Open(mysql.Open(cfg.FormatDSN()), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	}
	admin, err := connect()
	if err != nil {
		return nil, nil, err
	}
	pool, err := admin.DB()
	if err != nil {
		return nil, nil, err
	}
	var random [12]byte
	if _, err = rand.Read(random[:]); err != nil {
		pool.Close()
		return nil, nil, err
	}
	name := "order_app_test_" + hex.EncodeToString(random[:])
	if err = admin.Exec("CREATE DATABASE `" + name + "` CHARACTER SET utf8mb4").Error; err != nil {
		pool.Close()
		return nil, nil, err
	}
	drop := func() error {
		err := admin.Exec("DROP DATABASE `" + name + "`").Error
		closeErr := pool.Close()
		if err != nil {
			return err
		}
		return closeErr
	}
	cfg.DBName = name
	db, err := connect()
	if err != nil {
		_ = drop()
		return nil, nil, err
	}
	dbPool, err := db.DB()
	if err != nil {
		_ = drop()
		return nil, nil, err
	}
	dbPool.SetMaxOpenConns(4)
	cleanup := func() error {
		closeErr := dbPool.Close()
		dropErr := drop()
		if dropErr != nil {
			return dropErr
		}
		return closeErr
	}
	if err = db.AutoMigrate(&models.Menu{}, &models.Order{}, &models.OrderItem{}, &models.User{}, &models.OrderSession{}); err != nil {
		_ = cleanup()
		return nil, nil, err
	}
	return db, cleanup, nil
}
