package redis

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/redis/go-redis/v9"
)

type Client struct {
	Rdb *redis.Client
}

func ConnectRedis(ctx context.Context, redisURL string) (*Client, error) {
	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("invalid redis url: %w", err)
	}

	rdb := redis.NewClient(opt)
	if err := rdb.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("redis ping failed: %w", err)
	}

	log.Println("Connected to Redis successfully.")
	return &Client{Rdb: rdb}, nil
}

func (c *Client) Close() {
	if c.Rdb != nil {
		c.Rdb.Close()
	}
}

// Queue Names
const (
	QueueJDIngestion          = "trackr:queue:jd_ingestion"
	QueueResumeVectorization  = "trackr:queue:vectorization"
	QueueEmailClassification  = "trackr:queue:email_classification"
	QueueResumeExtraction     = "trackr:queue:resume_extraction"
)

type JDIngestionPayload struct {
	ApplicationID string  `json:"application_id"`
	UserID        string  `json:"user_id"`
	URL           *string `json:"url,omitempty"`
	Text          *string `json:"text,omitempty"`
}

type ResumeVectorizationPayload struct {
	BulletID string `json:"bullet_id"`
	UserID   string `json:"user_id"`
	Content  string `json:"content"`
}

type EmailClassificationPayload struct {
	LogID     string  `json:"log_id"`
	Sender    string  `json:"sender"`
	Subject   string  `json:"subject"`
	Body      string  `json:"body"`
	PayloadS3 *string `json:"payload_s3,omitempty"`
}

func (c *Client) EnqueueJDIngestion(ctx context.Context, payload JDIngestionPayload) error {
	data, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	return c.Rdb.LPush(ctx, QueueJDIngestion, data).Err()
}

func (c *Client) EnqueueResumeVectorization(ctx context.Context, payload ResumeVectorizationPayload) error {
	data, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	return c.Rdb.LPush(ctx, QueueResumeVectorization, data).Err()
}

func (c *Client) EnqueueEmailClassification(ctx context.Context, payload EmailClassificationPayload) error {
	data, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	return c.Rdb.LPush(ctx, QueueEmailClassification, data).Err()
}

type ResumeExtractionPayload struct {
	UserID   string `json:"user_id"`
	FileName string `json:"file_name"`
	Content  string `json:"content"`
}

func (c *Client) EnqueueResumeExtraction(ctx context.Context, payload ResumeExtractionPayload) error {
	data, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	return c.Rdb.LPush(ctx, QueueResumeExtraction, data).Err()
}

// Cache helpers
func (c *Client) Set(ctx context.Context, key string, value interface{}, expiration time.Duration) error {
	data, err := json.Marshal(value)
	if err != nil {
		return err
	}
	return c.Rdb.Set(ctx, key, data, expiration).Err()
}

func (c *Client) Get(ctx context.Context, key string, target interface{}) error {
	val, err := c.Rdb.Get(ctx, key).Result()
	if err != nil {
		return err
	}
	return json.Unmarshal([]byte(val), target)
}

func (c *Client) Del(ctx context.Context, keys ...string) error {
	return c.Rdb.Del(ctx, keys...).Err()
}
