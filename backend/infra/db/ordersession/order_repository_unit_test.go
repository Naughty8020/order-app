package ordersession

import (
	"database/sql/driver"
	"errors"
	"github.com/DATA-DOG/go-sqlmock"
	"order-system/domain/repository"
	"order-system/internal/testsql"
	"order-system/models"
	"testing"
	"time"
)

func TestFindByTokenHashUnit(t *testing.T) {
	dbErr := errors.New("query failed")
	for _, tt := range []struct {
		name, hash        string
		found             bool
		queryErr, wantErr error
	}{
		{"取得成功", "token-hash", true, nil, nil},
		{"存在しないハッシュ", "missing", false, nil, repository.ErrNotFound},
		{"空文字", "", false, nil, repository.ErrNotFound},
		{"SQL文字列もパラメータで渡す", "' OR 1=1 --", false, nil, repository.ErrNotFound},
		{"DBエラーを保持", "token-hash", false, dbErr, dbErr},
	} {
		t.Run(tt.name, func(t *testing.T) {
			db, mock := testsql.Open(t)
			query := mock.ExpectQuery("SELECT * FROM `order_sessions` WHERE token_hash = ? ORDER BY `order_sessions`.`id` LIMIT ?").WithArgs(tt.hash, 1)
			now := testsql.Now()
			rows := sqlmock.NewRows([]string{"id", "token_hash", "expires_at", "window_start", "order_count", "created_at"})
			if tt.found {
				rows.AddRow(7, tt.hash, now.Add(30*time.Minute), now, 3, now)
			}
			if tt.queryErr != nil {
				query.WillReturnError(tt.queryErr)
			} else {
				query.WillReturnRows(rows).RowsWillBeClosed()
			}
			got, err := NewOrderSessionRepository(db).FindByTokenHash(tt.hash)
			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("error = %v, want %v", err, tt.wantErr)
			}
			if tt.wantErr != nil {
				if got != nil {
					t.Error("result on error")
				}
				return
			}
			want := models.OrderSession{ID: 7, TokenHash: tt.hash, ExpiresAt: now.Add(30 * time.Minute), WindowStart: now, OrderCount: 3, CreatedAt: now}
			if got == nil || *got != want {
				t.Errorf("got = %+v, want %+v", got, want)
			}
		})
	}
}

func TestSessionWritesUnit(t *testing.T) {
	dbErr := errors.New("write failed")
	now := testsql.Now()
	for _, op := range []struct {
		name, sql string
		args      []driver.Value
		run       func(*orderSessionRepository, *models.OrderSession) error
	}{
		{"作成", "INSERT INTO `order_sessions` (`token_hash`,`expires_at`,`window_start`,`order_count`,`created_at`) VALUES (?,?,?,?,?)", []driver.Value{"hash", now.Add(30 * time.Minute), now, 0, now}, (*orderSessionRepository).Create},
		{"回数を0にリセットして保存", "UPDATE `order_sessions` SET `token_hash`=?,`expires_at`=?,`window_start`=?,`order_count`=?,`created_at`=? WHERE `id` = ?", []driver.Value{"hash", now.Add(30 * time.Minute), now, 0, now, 7}, (*orderSessionRepository).Save},
		{"期限ちょうど以前を削除", "DELETE FROM `order_sessions` WHERE expires_at <= NOW()", nil, func(r *orderSessionRepository, _ *models.OrderSession) error { return r.DeleteExpired() }},
	} {
		t.Run(op.name, func(t *testing.T) {
			for _, tt := range []struct {
				name    string
				failure string
			}{{"成功", ""}, {"SQL失敗", "exec"}, {"コミット失敗", "commit"}} {
				t.Run(tt.name, func(t *testing.T) {
					db, mock := testsql.Open(t)
					session := models.OrderSession{ID: 7, TokenHash: "hash", ExpiresAt: now.Add(30 * time.Minute), WindowStart: now, CreatedAt: now}
					if op.name == "作成" {
						session.ID = 0
						session.CreatedAt = time.Time{}
					}
					mock.ExpectBegin()
					exec := mock.ExpectExec(op.sql)
					if len(op.args) == 0 {
						exec.WithoutArgs()
					} else {
						exec.WithArgs(op.args...)
					}
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
					err := op.run(NewOrderSessionRepository(db), &session)
					var wantErr error
					if tt.failure != "" {
						wantErr = dbErr
					}
					if !errors.Is(err, wantErr) {
						t.Fatalf("error = %v, want %v", err, wantErr)
					}
					if tt.failure == "" && op.name == "作成" && (session.ID != 7 || !session.CreatedAt.Equal(now)) {
						t.Errorf("created = %+v", session)
					}
				})
			}
		})
	}
}
