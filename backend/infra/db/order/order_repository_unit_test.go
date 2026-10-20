package order

import (
	"database/sql/driver"
	"errors"
	"github.com/DATA-DOG/go-sqlmock"
	"gorm.io/gorm"
	"order-system/internal/testsql"
	"order-system/models"
	"reflect"
	"testing"
)

func TestOrderReadsUnit(t *testing.T) {
	dbErr := errors.New("query failed")
	for _, method := range []string{"FindAll", "FindByID"} {
		t.Run(method, func(t *testing.T) {
			for _, tt := range []struct {
				name    string
				empty   bool
				failure string
			}{
				{"関連データも取得", false, ""}, {"結果なし", true, ""}, {"注文検索失敗", false, "order"}, {"明細検索失敗", false, "items"}, {"メニュー検索失敗", false, "menu"},
			} {
				t.Run(tt.name, func(t *testing.T) {
					db, mock := testsql.Open(t)
					sql := "SELECT * FROM `orders`"
					if method == "FindByID" {
						sql += " WHERE `orders`.`id` = ? ORDER BY `orders`.`id` LIMIT ?"
					}
					query := mock.ExpectQuery(sql)
					if method == "FindByID" {
						query.WithArgs(7, 1)
					} else {
						query.WithoutArgs()
					}
					rows := sqlmock.NewRows([]string{"id", "status", "created_at"})
					if !tt.empty {
						rows.AddRow(7, "pending", testsql.Now())
					}
					if tt.failure == "order" {
						query.WillReturnError(dbErr)
					} else {
						query.WillReturnRows(rows).RowsWillBeClosed()
					}
					if !tt.empty && tt.failure != "order" {
						items := mock.ExpectQuery("SELECT * FROM `order_items` WHERE `order_items`.`order_id` = ?").WithArgs(7)
						if tt.failure == "items" {
							items.WillReturnError(dbErr)
						} else {
							items.WillReturnRows(sqlmock.NewRows([]string{"id", "order_id", "menu_id", "quantity", "price"}).AddRow(11, 7, 3, 2, 200)).RowsWillBeClosed()
							menu := mock.ExpectQuery("SELECT * FROM `menus` WHERE `menus`.`id` = ? AND `menus`.`deleted_at` IS NULL").WithArgs(3)
							if tt.failure == "menu" {
								menu.WillReturnError(dbErr)
							} else {
								menu.WillReturnRows(sqlmock.NewRows([]string{"id", "name", "price", "is_available"}).AddRow(3, "お茶", 250, true)).RowsWillBeClosed()
							}
						}
					}
					repo := NewOrderRepository(db)
					var got []models.Order
					var err error
					if method == "FindAll" {
						got, err = repo.FindAll()
					} else {
						var order *models.Order
						order, err = repo.FindByID(7)
						if order != nil {
							got = []models.Order{*order}
						}
					}
					var wantErr error
					if tt.failure != "" {
						wantErr = dbErr
					} else if tt.empty && method == "FindByID" {
						wantErr = gorm.ErrRecordNotFound
					}
					if !errors.Is(err, wantErr) {
						t.Fatalf("error = %v, want %v", err, wantErr)
					}
					if wantErr != nil {
						if got != nil {
							t.Error("result on error")
						}
						return
					}
					if tt.empty {
						if len(got) != 0 {
							t.Errorf("got = %+v, want empty", got)
						}
						return
					}
					want := []models.Order{{ID: 7, Status: "pending", CreatedAt: testsql.Now(), OrderItems: []models.OrderItem{{ID: 11, OrderID: 7, MenuID: 3, Quantity: 2, Price: 200, Menu: models.Menu{ID: 3, Name: "お茶", Price: 250, IsAvailable: true}}}}}
					if !reflect.DeepEqual(got, want) {
						t.Errorf("got = %+v, want %+v", got, want)
					}
				})
			}
		})
	}
}

func TestFindMenuByIDUnit(t *testing.T) {
	dbErr := errors.New("query failed")
	for _, tt := range []struct {
		name              string
		found             bool
		queryErr, wantErr error
	}{
		{"取得成功", true, nil, nil}, {"存在しないID", false, nil, gorm.ErrRecordNotFound}, {"DBエラー", false, dbErr, dbErr},
	} {
		t.Run(tt.name, func(t *testing.T) {
			db, mock := testsql.Open(t)
			query := mock.ExpectQuery("SELECT * FROM `menus` WHERE `menus`.`id` = ? AND `menus`.`deleted_at` IS NULL ORDER BY `menus`.`id` LIMIT ?").WithArgs(3, 1)
			rows := sqlmock.NewRows([]string{"id", "name", "price", "is_available"})
			if tt.found {
				rows.AddRow(3, "お茶", 200, false)
			}
			if tt.queryErr != nil {
				query.WillReturnError(tt.queryErr)
			} else {
				query.WillReturnRows(rows).RowsWillBeClosed()
			}
			got, err := NewOrderRepository(db).FindMenuByID(3)
			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("error = %v, want %v", err, tt.wantErr)
			}
			if tt.wantErr != nil {
				if got != nil {
					t.Error("result on error")
				}
				return
			}
			want := models.Menu{ID: 3, Name: "お茶", Price: 200, IsAvailable: false}
			if got == nil || *got != want {
				t.Errorf("got = %+v, want %+v", got, want)
			}
		})
	}
}

func TestOrderWritesUnit(t *testing.T) {
	dbErr := errors.New("write failed")
	for _, op := range []struct {
		name, sql string
		args      []driver.Value
		run       func(*testing.T, *OrderRepository) error
	}{
		{"ステータス保存", "UPDATE `orders` SET `receipt_token_hash`=?,`receipt_expires_at`=?,`status`=?,`created_at`=? WHERE `id` = ?", []driver.Value{"", nil, "ready", testsql.Now(), 7}, func(t *testing.T, r *OrderRepository) error {
			return r.Save(&models.Order{ID: 7, Status: "ready", CreatedAt: testsql.Now()})
		}},
	} {
		t.Run(op.name, func(t *testing.T) {
			for _, tt := range []struct{ name, failure string }{{"成功", ""}, {"SQL失敗", "exec"}, {"コミット失敗", "commit"}} {
				t.Run(tt.name, func(t *testing.T) {
					db, mock := testsql.Open(t)
					mock.ExpectBegin()
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
					err := op.run(t, NewOrderRepository(db))
					var wantErr error
					if tt.failure != "" {
						wantErr = dbErr
					}
					if !errors.Is(err, wantErr) {
						t.Fatalf("error = %v, want %v", err, wantErr)
					}
				})
			}
		})
	}
}

func TestCreateOrderWithItemsTransaction(t *testing.T) {
	dbErr := errors.New("write failed")
	for _, tt := range []struct {
		name, failure string
	}{
		{name: "注文と全明細を保存"},
		{name: "注文保存失敗でロールバック", failure: "order"},
		{name: "明細保存失敗でロールバック", failure: "item"},
		{name: "コミット失敗", failure: "commit"},
	} {
		t.Run(tt.name, func(t *testing.T) {
			db, mock := testsql.Open(t)
			mock.ExpectBegin()
			orderInsert := mock.ExpectExec("INSERT INTO `orders` (`receipt_token_hash`,`receipt_expires_at`,`status`,`created_at`) VALUES (?,?,?,?)").
				WithArgs("", nil, "pending", testsql.Now())
			if tt.failure == "order" {
				orderInsert.WillReturnError(dbErr)
				mock.ExpectRollback()
			} else {
				orderInsert.WillReturnResult(sqlmock.NewResult(7, 1))
				firstItem := mock.ExpectExec("INSERT INTO `order_items` (`name`,`order_id`,`menu_id`,`quantity`,`price`,`option`) VALUES (?,?,?,?,?,?)").
					WithArgs("お茶", 7, 3, 2, 200, "")
				if tt.failure == "item" {
					firstItem.WillReturnError(dbErr)
					mock.ExpectRollback()
				} else {
					firstItem.WillReturnResult(sqlmock.NewResult(11, 1))
					mock.ExpectExec("INSERT INTO `order_items` (`name`,`order_id`,`menu_id`,`quantity`,`price`,`option`) VALUES (?,?,?,?,?,?)").
						WithArgs("ジュース", 7, 4, 1, 300, "氷なし").
						WillReturnResult(sqlmock.NewResult(12, 1))
					commit := mock.ExpectCommit()
					if tt.failure == "commit" {
						commit.WillReturnError(dbErr)
					}
				}
			}

			order := models.Order{Status: "pending"}
			items := []models.OrderItem{
				{Name: "お茶", MenuID: 3, Quantity: 2, Price: 200},
				{Name: "ジュース", MenuID: 4, Quantity: 1, Price: 300, Option: "氷なし"},
			}
			err := NewOrderRepository(db).CreateOrderWithItems(&order, items)
			var wantErr error
			if tt.failure != "" {
				wantErr = dbErr
			}
			if !errors.Is(err, wantErr) {
				t.Fatalf("error = %v, want %v", err, wantErr)
			}
			if tt.failure == "" && order.ID != 7 {
				t.Errorf("order ID = %d, want 7", order.ID)
			}
		})
	}
}

func TestFindPublicOrdersUsesFilteredProjection(t *testing.T) {
	for _, scenario := range []string{"active", "empty", "error"} {
		t.Run(scenario, func(t *testing.T) {
			db, mock := testsql.Open(t)
			query := mock.ExpectQuery("SELECT `id`,`status` FROM `orders` WHERE status IN (?,?) ORDER BY id ASC").
				WithArgs("pending", "ready")
			dbErr := errors.New("read failed")
			if scenario == "error" {
				query.WillReturnError(dbErr)
			} else {
				rows := sqlmock.NewRows([]string{"id", "status"})
				if scenario == "active" {
					rows.AddRow(1, "pending").AddRow(2, "ready")
				}
				query.WillReturnRows(rows).RowsWillBeClosed()
			}
			got, err := NewOrderRepository(db).FindPublicOrders()
			if scenario == "error" {
				if !errors.Is(err, dbErr) {
					t.Fatalf("error = %v", err)
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}
			want := []models.PublicOrder{}
			if scenario == "active" {
				want = []models.PublicOrder{{ID: 1, Status: "pending"}, {ID: 2, Status: "ready"}}
			}
			if !reflect.DeepEqual(got, want) {
				t.Fatalf("got = %+v, want = %+v", got, want)
			}
			// Any preload would issue an unexpected additional SQL query.
		})
	}
}
