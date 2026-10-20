package config

import (
	"testing"

	"order-system/internal/testsql"
	"order-system/models"

	"github.com/DATA-DOG/go-sqlmock"
)

func TestSeedMenuPreservesExistingProduct(t *testing.T) {
	db, mock := testsql.Open(t)
	name := "シャーリー・テンプル風"
	mock.ExpectQuery("SELECT * FROM `menus` WHERE name = ? AND `menus`.`deleted_at` IS NULL ORDER BY `menus`.`id` LIMIT ?").
		WithArgs(name, 1).
		WillReturnRows(sqlmock.NewRows([]string{"id", "name", "price", "is_available", "is_recommended", "is_featured", "deleted_at"}).
			AddRow(27, name, 450, false, true, true, nil)).
		RowsWillBeClosed()

	menu := models.Menu{Name: name, Price: 300, IsAvailable: true}
	if err := seedMenu(db, &menu); err != nil {
		t.Fatal(err)
	}
	if menu.ID != 27 || menu.Price != 450 || menu.IsAvailable || !menu.IsRecommended || !menu.IsFeatured {
		t.Fatalf("existing menu was overwritten: %+v", menu)
	}
}

func TestSeedMenuCreatesMissingProductWithoutFixedID(t *testing.T) {
	db, mock := testsql.Open(t)
	name := "シャーリー・テンプル風"
	mock.ExpectQuery("SELECT * FROM `menus` WHERE name = ? AND `menus`.`deleted_at` IS NULL ORDER BY `menus`.`id` LIMIT ?").
		WithArgs(name, 1).
		WillReturnRows(sqlmock.NewRows([]string{"id", "name", "price", "is_available", "is_recommended", "is_featured", "deleted_at"})).
		RowsWillBeClosed()
	mock.ExpectBegin()
	mock.ExpectExec("INSERT INTO `menus` (`name`,`price`,`is_available`,`is_recommended`,`is_featured`,`deleted_at`) VALUES (?,?,?,?,?,?)").
		WithArgs(name, 300, true, false, false, nil).
		WillReturnResult(sqlmock.NewResult(31, 1))
	mock.ExpectCommit()

	menu := models.Menu{Name: name, Price: 300, IsAvailable: true}
	if err := seedMenu(db, &menu); err != nil {
		t.Fatal(err)
	}
	if menu.ID != 31 {
		t.Fatalf("generated ID = %d, want 31", menu.ID)
	}
}
