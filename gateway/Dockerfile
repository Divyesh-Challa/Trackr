# Build stage
FROM golang:alpine AS builder

WORKDIR /app
ENV GOTOOLCHAIN=auto

RUN apk add --no-cache git ca-certificates

# Copy Go dependencies from gateway directory
COPY gateway/go.mod gateway/go.sum* ./
RUN go mod download || true

# Copy gateway source code and compile
COPY gateway/ .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /app/gateway cmd/server/main.go

# Runtime stage
FROM alpine:3.20

WORKDIR /app
RUN apk add --no-cache ca-certificates tzdata curl

COPY --from=builder /app/gateway /app/gateway

EXPOSE 8000 8080

CMD ["/app/gateway"]
