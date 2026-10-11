package user

import (
	"errors"
	"github.com/DATA-DOG/go-sqlmock"
	"gorm.io/gorm"
	"order-system/internal/testsql"
	"order-system/models"
	"testing"
)

func TestFindByUserNameUnit(t *testing.T) {
	dbErr := errors.New("query failed")
	for _, tt := range []struct {
		name, username    string
		found             bool
		queryErr, wantErr error
	}{
		{"取得成功", "admin", true, nil, nil},
		{"ユーザーなし", "missing", false, nil, gorm.ErrRecordNotFound},
		{"空文字", "", false, nil, gorm.ErrRecordNotFound},
		{"SQL文字列もパラメータで渡す", "' OR 1=1 --", false, nil, gorm.ErrRecordNotFound},
		{"DBエラー", "admin", false, dbErr, dbErr},
	} {
		t.Run(tt.name, func(t *testing.T) {
			db, mock := testsql.Open(t)
			query := mock.ExpectQuery("SELECT * FROM `users` WHERE user_name = ? ORDER BY `users`.`id` LIMIT ?").WithArgs(tt.username, 1)
			rows := sqlmock.NewRows([]string{"id", "user_name", "password_hash"})
			if tt.found {
				rows.AddRow(42, tt.username, "hashed-password")
			}
			if tt.queryErr != nil {
				query.WillReturnError(tt.queryErr)
			} else {
				query.WillReturnRows(rows).RowsWillBeClosed()
			}
			got, err := NewUserRepository(db).FindByUserName(tt.username)
			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("error = %v, want %v", err, tt.wantErr)
			}
			if tt.wantErr != nil {
				if got != nil {
					t.Error("result on error")
				}
				return
			}
			want := models.User{ID: 42, UserName: tt.username, PasswordHash: "hashed-password"}
			if got == nil || *got != want {
				t.Errorf("got = %+v, want %+v", got, want)
			}
		})
	}
}
