package config

import (
	"os"
)

type Config struct {
	Port              string
	DatabaseURL       string
	RedisURL          string
	AIWorkerURL       string
	S3Endpoint        string
	S3AccessKey       string
	S3SecretKey       string
	S3BucketSnapshots string
	S3BucketEmails    string
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}

func LoadConfig() *Config {
	return &Config{
		Port:              getEnv("PORT", "8080"),
		DatabaseURL:       getEnv("DATABASE_URL", "postgres://trackr:[REDACTED_PASSWORD]@localhost:5432/trackr_db?sslmode=disable"),
		RedisURL:          getEnv("REDIS_URL", "redis://localhost:6379/0"),
		AIWorkerURL:       getEnv("AI_WORKER_URL", "http://localhost:8085"),
		S3Endpoint:        getEnv("S3_ENDPOINT", "http://localhost:9000"),
		S3AccessKey:       os.Getenv("S3_ACCESS_KEY"),
		S3SecretKey:       os.Getenv("S3_SECRET_KEY"),
		S3BucketSnapshots: getEnv("S3_BUCKET_SNAPSHOTS", "trackr-snapshots"),
		S3BucketEmails:    getEnv("S3_BUCKET_EMAILS", "trackr-emails"),
	}
}
