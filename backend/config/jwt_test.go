package config

import (
	"strings"
	"testing"
)

func TestValidateJWTSecret(t *testing.T) {
	for _, tc := range []struct {
		name    string
		secret  string
		wantErr bool
	}{
		{"unset", "", true},
		{"one byte", "a", true},
		{"below minimum", strings.Repeat("a", 31), true},
		{"minimum", strings.Repeat("a", 32), false},
		{"generated hex format", strings.Repeat("ab", 32), false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			if err := ValidateJWTSecret(tc.secret); (err != nil) != tc.wantErr {
				t.Fatalf("ValidateJWTSecret error = %v, wantErr = %v", err, tc.wantErr)
			}
		})
	}
}
