package handlers

import (
	"github.com/trackr/gateway/internal/config"
	"github.com/trackr/gateway/internal/database"
	"github.com/trackr/gateway/internal/redis"
)

type HandlerContext struct {
	DB     *database.DB
	Redis  *redis.Client
	Config *config.Config
}

func NewHandlerContext(db *database.DB, rdb *redis.Client, cfg *config.Config) *HandlerContext {
	return &HandlerContext{
		DB:     db,
		Redis:  rdb,
		Config: cfg,
	}
}
