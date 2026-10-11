package menu

import (
	"database/sql/driver"
	"errors"
	"reflect"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"gorm.io/gorm"
	"order-system/domain/repository"
	"order-system/internal/testsql"
	"order-system/models"
)

func TestMenuFindAllUnit(t *testing.T) {
	dbErr := errors.New("query failed")
	for _, tt := range []struct {
		name     string
		rows     int
		queryErr error
	}{
		{"複数件", 2, nil}, {"空の一覧", 0, nil}, {"DBエラー", 0, dbErr},
	} {
		t.Run(tt.name, func(t *testing.T) {
			db, mock := testsql.Open(t)
			query := mock.ExpectQuery("SELECT * FROM `menus` WHERE `menus`.`deleted_at` IS NULL").WithoutArgs()
			rows := sqlmock.NewRows([]string{"id", "name", "price", "is_available"})
			want := []models.Menu{}
			for i := 1; i <= tt.rows; i++ {
				rows.AddRow(i, "お茶", 200, true)
				want = append(want, models.Menu{ID: uint(i), Name: "お茶", Price: 200, IsAvailable: true})
			}
			if tt.queryErr != nil {
				query.WillReturnError(tt.queryErr)
			} else {
				query.WillReturnRows(rows).RowsWillBeClosed()
			}
			got, err := NewMenuRepository(db).FindAll()
			if !errors.Is(err, tt.queryErr) {
				t.Fatalf("error = %v, want %v", err, tt.queryErr)
			}
			if tt.queryErr != nil {
				if got != nil {
					t.Error("result on error")
				}
				return
			}
			if !reflect.DeepEqual(got, want) {
				t.Errorf("got = %+v, want %+v", got, want)
			}
		})
	}
}

func TestMenuFindByIDUnit(t *testing.T) {
	dbErr := errors.New("query failed")
	for _, tt := range []struct {
		name              string
		found             bool
		queryErr, wantErr error
	}{
		{"取得成功", true, nil, nil}, {"存在しないID", false, nil, repository.ErrMenuNotFound}, {"DBエラーを保持", false, dbErr, dbErr},
	} {
		t.Run(tt.name, func(t *testing.T) {
			db, mock := testsql.Open(t)
			query := mock.ExpectQuery("SELECT * FROM `menus` WHERE `menus`.`id` = ? AND `menus`.`deleted_at` IS NULL ORDER BY `menus`.`id` LIMIT ?").WithArgs(7, 1)
			rows := sqlmock.NewRows([]string{"id", "name", "price", "is_available"})
			if tt.found {
				rows.AddRow(7, "お茶", 200, false)
			}
			if tt.queryErr != nil {
				query.WillReturnError(tt.queryErr)
			} else {
				query.WillReturnRows(rows).RowsWillBeClosed()
			}
			got, err := NewMenuRepository(db).FindByID(7)
			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("error = %v, want %v", err, tt.wantErr)
			}
			if tt.wantErr != nil {
				if got != nil {
					t.Error("result on error")
				}
				return
			}
			want := models.Menu{ID: 7, Name: "お茶", Price: 200, IsAvailable: false}
			if got == nil || *got != want {
				t.Errorf("got = %+v, want %+v", got, want)
			}
		})
	}
}

func TestMenuWritesUnit(t *testing.T) {
	dbErr := errors.New("write failed")
	for _, op := range []struct {
		name, sql string
		args      []driver.Value
		run       func(*MenuRepository, *models.Menu) error
	}{
		{"作成", "INSERT INTO `menus` (`name`,`price`,`is_available`,`is_recommended`,`is_featured`,`deleted_at`) VALUES (?,?,?,?,?,?)", []driver.Value{"お茶", 200, true, false, false, nil}, (*MenuRepository).Create},
		{"ゼロ値を含む更新", "UPDATE `menus` SET `name`=?,`price`=?,`is_available`=?,`is_recommended`=?,`is_featured`=?,`deleted_at`=? WHERE `menus`.`deleted_at` IS NULL AND `id` = ?", []driver.Value{"お茶", 0, false, false, false, nil, 7}, (*MenuRepository).Save},
		{"論理削除", "UPDATE `menus` SET `deleted_at`=? WHERE `menus`.`id` = ? AND `menus`.`deleted_at` IS NULL", []driver.Value{testsql.Now(), 7}, (*MenuRepository).Delete},
	} {
		t.Run(op.name, func(t *testing.T) {
			for _, tt := range []struct {
				name    string
				failure string
			}{{"成功", ""}, {"SQL失敗", "exec"}, {"トランザクション開始失敗", "begin"}, {"コミット失敗", "commit"}} {
				t.Run(tt.name, func(t *testing.T) {
					db, mock := testsql.Open(t)
					menu := models.Menu{ID: 7, Name: "お茶"}
					if op.name == "作成" {
						menu.ID = 0
						menu.Price = 200
						menu.IsAvailable = true
					}
					begin := mock.ExpectBegin()
					if tt.failure == "begin" {
						begin.WillReturnError(dbErr)
					} else {
						exec := mock.ExpectExec(op.sql).WithArgs(op.args...)
						if tt.failure == "exec" {
							exec.WillReturnError(dbErr)
							mock.ExpectRollback()
						} else {
							exec.WillReturnResult(sqlmock.NewResult(7, 1))
							commit := mock.ExpectCommit()
							if tt.failure == "commit" {
								commit.WillReturnError(dbErr)
							}
						}
					}
					err := op.run(NewMenuRepository(db), &menu)
					var wantErr error
					if tt.failure != "" {
						wantErr = dbErr
					}
					if !errors.Is(err, wantErr) {
						t.Fatalf("error = %v, want %v", err, wantErr)
					}
					if tt.failure == "" {
						if menu.ID != 7 {
							t.Errorf("ID = %d, want 7", menu.ID)
						}
						if op.name == "論理削除" && menu.DeletedAt != (gorm.DeletedAt{Time: testsql.Now(), Valid: true}) {
							t.Errorf("deleted at = %v", menu.DeletedAt)
						}
					}
				})
			}
		})
	}
}
