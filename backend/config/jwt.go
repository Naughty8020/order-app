package config

import "errors"

// ValidateJWTSecret enforces the minimum key length for HS256.
// Length alone cannot guarantee entropy; use a cryptographically random key.
func ValidateJWTSecret(secret string) error {
	if len(secret) < 32 {
		return errors.New("JWT_SECRET must be at least 32 bytes; generate a random key with openssl rand -hex 32")
	}
	return nil
}
