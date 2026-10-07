package handlers

import (
	"net"
	"net/http"
	"time"

	"github.com/trackr/gateway/internal/config"
	"github.com/trackr/gateway/internal/database"
	"github.com/trackr/gateway/internal/redis"
)

type HandlerContext struct {
	DB         *database.DB
	Redis      *redis.Client
	Config     *config.Config
	HTTPClient *http.Client
}

func NewHandlerContext(db *database.DB, rdb *redis.Client, cfg *config.Config) *HandlerContext {
	transport := &http.Transport{
		Proxy: http.ProxyFromEnvironment,
		DialContext: (&net.Dialer{
			Timeout:   10 * time.Second,
			KeepAlive: 30 * time.Second,
		}).DialContext,
		MaxIdleConns:        100,
		MaxIdleConnsPerHost: 30,
		IdleConnTimeout:     90 * time.Second,
		TLSHandshakeTimeout: 10 * time.Second,
		DisableCompression:  false,
	}

	httpClient := &http.Client{
		Transport: transport,
		// Timeout is handled per-request via context to allow long-lived SSE streaming
	}

	return &HandlerContext{
		DB:         db,
		Redis:      rdb,
		Config:     cfg,
		HTTPClient: httpClient,
	}
}
