package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// ── Role guard ────────────────────────────────────────────────────────────

// OwnerOnly rejects requests from staff; only org owners can proceed.
func OwnerOnly() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, _ := c.Get("role")
		if role != "owner" {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "owner access required"})
			return
		}
		c.Next()
	}
}

// ── Simple in-memory rate limiter ─────────────────────────────────────────
// Good enough for a single-instance deployment (Render free tier).
// For multi-instance, swap the map for Redis.

type rateBucket struct {
	count    int
	resetAt  time.Time
}

type RateLimiter struct {
	mu       sync.Mutex
	buckets  map[string]*rateBucket
	limit    int
	window   time.Duration
}

func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
	rl := &RateLimiter{
		buckets: make(map[string]*rateBucket),
		limit:   limit,
		window:  window,
	}
	// Cleanup goroutine — prevents unbounded memory growth
	go func() {
		for range time.Tick(5 * time.Minute) {
			rl.mu.Lock()
			now := time.Now()
			for k, b := range rl.buckets {
				if now.After(b.resetAt) {
					delete(rl.buckets, k)
				}
			}
			rl.mu.Unlock()
		}
	}()
	return rl
}

func (rl *RateLimiter) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Key by IP + path prefix so login bruteforce is per-IP
		key := c.ClientIP() + ":" + c.FullPath()

		rl.mu.Lock()
		b, ok := rl.buckets[key]
		if !ok || time.Now().After(b.resetAt) {
			b = &rateBucket{count: 0, resetAt: time.Now().Add(rl.window)}
			rl.buckets[key] = b
		}
		b.count++
		count := b.count
		rl.mu.Unlock()

		if count > rl.limit {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error": "too many requests — try again later",
			})
			return
		}
		c.Next()
	}
}

// ── Security headers ──────────────────────────────────────────────────────

func SecurityHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("X-XSS-Protection", "1; mode=block")
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Next()
	}
}

// ── Subscription gate ─────────────────────────────────────────────────────
// Blocks API access if the org's trial or subscription has expired.
// Attach after AuthRequired() on routes that require an active plan.

type SubscriptionGate struct {
	// injected via closure to avoid circular import
	CheckFn func(orgID string) bool
}

func SubscriptionRequired(checkFn func(orgID string) bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		orgID := c.GetString("org_id")
		if !checkFn(orgID) {
			c.AbortWithStatusJSON(http.StatusPaymentRequired, gin.H{
				"error": "subscription expired — please upgrade to continue",
				"code":  "subscription_expired",
			})
			return
		}
		c.Next()
	}
}
