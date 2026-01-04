package services

import (
	"sync"
	"time"
)

// TokenBlacklist manages blacklisted tokens with thread safety
type TokenBlacklist struct {
	tokens map[string]time.Time
	mutex  sync.RWMutex
}

// NewTokenBlacklist creates a new token blacklist instance
func NewTokenBlacklist() *TokenBlacklist {
	bl := &TokenBlacklist{
		tokens: make(map[string]time.Time),
	}
	
	// Start cleanup goroutine to remove expired tokens every hour
	go func() {
		ticker := time.NewTicker(time.Hour)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				bl.Cleanup()
			}
		}
	}()
	
	return bl
}

// Add adds a token to the blacklist with expiration time
func (bl *TokenBlacklist) Add(token string, expiry time.Time) {
	bl.mutex.Lock()
	defer bl.mutex.Unlock()
	bl.tokens[token] = expiry
}

// IsBlacklisted checks if a token is blacklisted
func (bl *TokenBlacklist) IsBlacklisted(token string) bool {
	bl.mutex.RLock()
	defer bl.mutex.RUnlock()
	expiry, exists := bl.tokens[token]
	if !exists {
		return false
	}
	// If token has expired, remove it from blacklist
	if time.Now().After(expiry) {
		delete(bl.tokens, token)
		return false
	}
	return true
}

// Cleanup removes expired tokens from blacklist
func (bl *TokenBlacklist) Cleanup() {
	bl.mutex.Lock()
	defer bl.mutex.Unlock()
	now := time.Now()
	for token, expiry := range bl.tokens {
		if now.After(expiry) {
			delete(bl.tokens, token)
		}
	}
}