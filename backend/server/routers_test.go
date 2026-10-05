package server

import (
	"strings"
	"testing"
)

func TestRunRejectsShortJWTSecret(t *testing.T) {
	t.Setenv("ORDER_ACCESS_SECRET", "test-order-access-secret")
	t.Setenv("ADMIN_USERNAME", "admin")
	for _, secret := range []string{"", "a", strings.Repeat("a", 31)} {
		t.Setenv("JWT_SECRET", secret)
		// No database or listener is needed: configuration must fail first.
		if err := Run(nil); err == nil || !strings.Contains(err.Error(), "JWT_SECRET must be at least 32 bytes") {
			t.Fatalf("Run error = %v, want JWT_SECRET length error", err)
		}
	}
}
