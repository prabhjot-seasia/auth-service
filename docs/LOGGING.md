# Logging Configuration Guide

This guide explains how to configure logging for the Auth Service using the setup script and environment variables.

## Overview

The Auth Service supports comprehensive logging configuration including:
- **Log Levels**: debug, info, warn, error
- **Log Formats**: JSON (structured) or text (human-readable)
- **Log Destinations**: Console (stdout) or file
- **Log Rotation**: Automatic rotation based on size, age, and backup count

## Quick Examples

### Console Logging (Development)
```bash
./setup.sh \
  --log-level debug \
  --log-format text \
  --build --start
```

### File Logging (Production)
```bash
./setup.sh \
  --log-level info \
  --log-file /var/log/auth-service/auth-service.log \
  --log-format json \
  --log-max-size 200 \
  --log-max-backups 10 \
  --log-max-age 90 \
  --build --start
```

### Custom Log Location
```bash
./setup.sh \
  --log-level warn \
  --log-file /opt/logs/auth/service.log \
  --log-max-size 50 \
  --log-max-backups 3 \
  --build --start
```

## Configuration Options

### Log Level (`--log-level`)
Controls the verbosity of logging:

- **`debug`**: Most verbose, includes all debug information
- **`info`**: General information about service operation (default)
- **`warn`**: Warning messages for potentially harmful situations
- **`error`**: Only error messages

### Log File (`--log-file`)
Specifies where logs should be written:

- **Empty/stdout** (default): Logs to console
- **File path**: Logs to specified file (e.g., `/var/log/auth-service/auth.log`)

### Log Format (`--log-format`)
Controls the output format:

- **`json`** (default): Structured JSON format, ideal for log aggregation
- **`text`**: Human-readable text format, good for development

### Log Rotation Options

#### Max Size (`--log-max-size`)
- **Default**: 100 MB
- **Description**: Maximum size of log file before rotation
- **Example**: `--log-max-size 200` (200 MB)

#### Max Backups (`--log-max-backups`)
- **Default**: 5
- **Description**: Number of old log files to keep
- **Example**: `--log-max-backups 10`

#### Max Age (`--log-max-age`)
- **Default**: 30 days
- **Description**: Maximum age of log files before deletion
- **Example**: `--log-max-age 90` (90 days)

## Environment Variables

All logging options can be set via environment variables:

```bash
# Log configuration
export LOG_LEVEL=info
export LOG_FILE=/var/log/auth-service/auth-service.log
export LOG_FORMAT=json
export LOG_MAX_SIZE=100
export LOG_MAX_BACKUPS=5
export LOG_MAX_AGE=30

# Then start the service
./setup.sh --build --start
```

## Configuration Files

### Using Configuration Files
```bash
# Copy and customize
cp config/production.env config/my-logging.env

# Edit logging settings
vim config/my-logging.env

# Use the configuration
./setup.sh --config-file config/my-logging.env --build --start
```

### Pre-built Configuration Examples

#### Development (config/development.env)
```bash
LOG_LEVEL=debug
LOG_FILE=""
LOG_FORMAT=json
LOG_MAX_SIZE=100
LOG_MAX_BACKUPS=5
LOG_MAX_AGE=30
```

#### Production (config/production.env)
```bash
LOG_LEVEL=info
LOG_FILE=/var/log/auth-service/auth-service.log
LOG_FORMAT=json
LOG_MAX_SIZE=200
LOG_MAX_BACKUPS=10
LOG_MAX_AGE=90
```

#### External Database (config/external-db.env)
```bash
LOG_LEVEL=info
LOG_FILE=/var/log/auth-service/auth-service.log
LOG_FORMAT=json
LOG_MAX_SIZE=100
LOG_MAX_BACKUPS=5
LOG_MAX_AGE=30
```

## Docker Integration

### Log File Mounting
When using file logging, the setup script automatically mounts log directories:

```bash
# This command will:
# 1. Create ./logs directory on host
# 2. Mount it to /var/log/auth-service in container
./setup.sh --log-file /var/log/auth-service/auth.log --build --start
```

### Custom Log Directory
```bash
# Use custom host directory for logs
export LOG_FILE_HOST_DIR=/path/to/your/logs
./setup.sh --log-file /var/log/auth-service/auth.log --build --start
```

### Accessing Logs
```bash
# View logs from host directory
tail -f ./logs/auth-service.log

# View logs from container
docker exec auth-backend tail -f /var/log/auth-service/auth-service.log

# Or use setup script
./setup.sh --logs
```

## Log Formats

### JSON Format (Recommended for Production)
```json
{
  "timestamp": "2024-01-15T10:30:45Z",
  "level": "info",
  "message": "User authentication successful",
  "user_id": "user123",
  "ip_address": "192.168.1.100",
  "request_id": "req-abc123"
}
```

### Text Format (Development Friendly)
```
2024-01-15T10:30:45Z INFO User authentication successful user_id=user123 ip=192.168.1.100 request_id=req-abc123
```

## Use Cases

### Development Setup
```bash
# Debug everything to console
./setup.sh \
  --log-level debug \
  --log-format text \
  --build --start
```

### Production Setup
```bash
# Structured logging to file with rotation
./setup.sh \
  --environment production \
  --log-level info \
  --log-file /var/log/auth-service/auth-service.log \
  --log-format json \
  --log-max-size 200 \
  --log-max-backups 10 \
  --log-max-age 90 \
  --build --start
```

### Debugging Issues
```bash
# Temporary debug logging
./setup.sh \
  --log-level debug \
  --log-file /tmp/auth-debug.log \
  --log-format text \
  --restart
```

### High-Traffic Production
```bash
# Large log files with frequent rotation
./setup.sh \
  --log-level warn \
  --log-file /var/log/auth-service/auth-service.log \
  --log-format json \
  --log-max-size 500 \
  --log-max-backups 20 \
  --log-max-age 30 \
  --build --start
```

## Log Analysis

### Using jq (for JSON logs)
```bash
# Filter error logs
cat logs/auth-service.log | jq 'select(.level == "error")'

# Count log levels
cat logs/auth-service.log | jq -r '.level' | sort | uniq -c

# Find authentication failures
cat logs/auth-service.log | jq 'select(.message | contains("authentication failed"))'
```

### Using grep (for text logs)
```bash
# Find errors
grep "ERROR" logs/auth-service.log

# Find authentication events
grep "authentication" logs/auth-service.log

# Count warnings
grep -c "WARN" logs/auth-service.log
```

## Monitoring Integration

### ELK Stack Integration
With JSON format, logs can be easily ingested by Elasticsearch:

```bash
# Production setup with JSON logging
./setup.sh \
  --log-level info \
  --log-file /var/log/auth-service/auth-service.log \
  --log-format json \
  --build --start

# Then configure Filebeat/Logstash to read from:
# /var/log/auth-service/auth-service.log
```

### Grafana Loki Integration
```bash
# Set up for Loki ingestion
./setup.sh \
  --log-format json \
  --log-file /var/log/auth-service/auth-service.log \
  --build --start
```

## Troubleshooting

### Log Directory Permissions
```bash
# If log directory creation fails
sudo mkdir -p /var/log/auth-service
sudo chown $USER:$USER /var/log/auth-service

# Then retry setup
./setup.sh --log-file /var/log/auth-service/auth.log --build --start
```

### Container Log Access
```bash
# View container logs
docker logs auth-backend

# Follow container logs
docker logs -f auth-backend

# View service logs via setup script
./setup.sh --logs
```

### Log Rotation Not Working
```bash
# Check log file permissions
ls -la /var/log/auth-service/

# Ensure container can write to mounted directory
docker exec auth-backend touch /var/log/auth-service/test.log
```

## Best Practices

### Development
- Use `debug` level with `text` format
- Log to console (stdout) for simplicity
- Use smaller rotation sizes for faster testing

### Production
- Use `info` or `warn` level with `json` format
- Log to files with appropriate rotation
- Monitor disk space and log growth
- Set up log aggregation and monitoring

### Security
- Avoid logging sensitive information (passwords, tokens)
- Use structured logging to prevent log injection
- Implement log retention policies
- Monitor logs for security events

## Examples Summary

```bash
# Development
./setup.sh --log-level debug --log-format text --build --start

# Production
./setup.sh --config-file config/production.env --build --start

# Custom file location
./setup.sh --log-file /opt/logs/auth.log --build --start

# High verbosity debugging
./setup.sh --log-level debug --log-file /tmp/debug.log --restart

# Minimal logging
./setup.sh --log-level error --build --start
```