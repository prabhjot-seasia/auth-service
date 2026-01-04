# =============================================================================
# Stage 1: LINT - Code quality validation
# =============================================================================
FROM golang:1.23-alpine AS linter

WORKDIR /app

RUN apk add --no-cache git

# Install golangci-lint
RUN go install github.com/golangci/golangci-lint/cmd/golangci-lint@v1.61.0

COPY go.mod go.sum ./
RUN go mod download

COPY . .

# Run linter - build fails if lint errors exist
RUN golangci-lint run --timeout=5m ./...

# =============================================================================
# Stage 2: TEST - Execute all unit tests with coverage
# =============================================================================
FROM golang:1.23-alpine AS tester

WORKDIR /app

RUN apk add --no-cache git ca-certificates

COPY go.mod go.sum ./
RUN go mod download

COPY . .

# Run tests with coverage report
# Build fails if any test fails
RUN go test -v -race -coverprofile=coverage.out -covermode=atomic ./...

# Generate coverage report (optional: for viewing)
RUN go tool cover -func=coverage.out

# =============================================================================
# Stage 3: BUILD - Compile production binary
# =============================================================================
FROM golang:1.23-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git ca-certificates

COPY go.mod go.sum ./
RUN go mod download

COPY . .

# Build optimized production binary
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags='-w -s -extldflags "-static"' \
    -a -installsuffix cgo \
    -o main ./cmd/server

# =============================================================================
# Stage 4: PRODUCTION - Minimal runtime image
# =============================================================================
FROM alpine:3.19

RUN apk --no-cache add ca-certificates curl tzdata

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

# Copy binary from builder
COPY --from=builder /app/main .

# Set ownership
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

CMD ["./main"]
