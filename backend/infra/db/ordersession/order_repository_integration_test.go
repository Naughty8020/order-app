//go:build integration

package ordersession

import (
	"testing"
	"time"

	"order-system/internal/testdb"
	"order-system/models"
)

func TestUpdateWithLockSerializesConcurrentChanges(t *testing.T) {
	db, cleanup, err := testdb.New()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := cleanup(); err != nil {
			t.Errorf("cleanup: %v", err)
		}
	})

	repo := NewOrderSessionRepository(db)
	now := time.Now().UTC().Truncate(time.Microsecond)
	session := &models.OrderSession{
		TokenHash:   "concurrent-session",
		ExpiresAt:   now.Add(30 * time.Minute),
		WindowStart: now,
		OrderCount:  2,
	}
	if err := repo.Create(session); err != nil {
		t.Fatal(err)
	}

	firstLocked := make(chan struct{})
	releaseFirst := make(chan struct{})
	secondLocked := make(chan struct{})
	results := make(chan error, 2)

	go func() {
		results <- repo.UpdateWithLock(session.TokenHash, func(locked *models.OrderSession) (bool, error) {
			close(firstLocked)
			<-releaseFirst
			locked.OrderCount--
			return true, nil
		})
	}()
	<-firstLocked

	go func() {
		results <- repo.UpdateWithLock(session.TokenHash, func(locked *models.OrderSession) (bool, error) {
			close(secondLocked)
			locked.OrderCount++
			return true, nil
		})
	}()

	startedWithoutWaiting := false
	select {
	case <-secondLocked:
		startedWithoutWaiting = true
	case <-time.After(200 * time.Millisecond):
	}
	close(releaseFirst)

	for range 2 {
		if err := <-results; err != nil {
			t.Fatal(err)
		}
	}
	if startedWithoutWaiting {
		t.Fatal("同じセッションの更新が行ロックを待たずに開始された")
	}

	updated, err := repo.FindByTokenHash(session.TokenHash)
	if err != nil {
		t.Fatal(err)
	}
	if updated.OrderCount != 2 {
		t.Fatalf("order count = %d, want 2", updated.OrderCount)
	}
}
