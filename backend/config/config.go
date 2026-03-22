package config

import (
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Database DatabaseConfig
	Server   ServerConfig
	JWT      JWTConfig
	OAuth2   OAuth2Config
	Testing  TestingConfig
	Password PasswordPolicyConfig
}

type DatabaseConfig struct {
	Host     string
	Port     int
	User     string
	Password string
	DBName   string
	SSLMode  string
}

type ServerConfig struct {
	Port        string
	Host        string
	Mode        string
	FrontendURL string
}

type JWTConfig struct {
	SecretKey       string
	AccessTokenTTL  int
	RefreshTokenTTL int
}

type OAuth2Config struct {
	ClientID     string
	ClientSecret string
	RedirectURL  string
}

type TestingConfig struct {
	SkipMigrations bool
}

type PasswordPolicyConfig struct {
	RotationDays             int
	HistoryCount             int
	MinLength                int
	RequireUppercase         bool
	RequireLowercase         bool
	RequireNumbers           bool
	RequireSpecialCharacters bool
	ExpiryWarningDays        int
	ForceFirstLoginChange    bool
}

func Load() (*Config, error) {
	godotenv.Load()

	dbPort, _ := strconv.Atoi(getEnv("DB_PORT", "5432"))
	accessTTL, _ := strconv.Atoi(getEnv("JWT_ACCESS_TOKEN_TTL", "15"))
	refreshTTL, _ := strconv.Atoi(getEnv("JWT_REFRESH_TOKEN_TTL", "10080"))
	skipMigrations, _ := strconv.ParseBool(getEnv("SKIP_MIGRATIONS", "false"))
	
	// Password policy configuration
	rotationDays, _ := strconv.Atoi(getEnv("PASSWORD_ROTATION_DAYS", "90"))
	historyCount, _ := strconv.Atoi(getEnv("PASSWORD_HISTORY_COUNT", "5"))
	minLength, _ := strconv.Atoi(getEnv("PASSWORD_MIN_LENGTH", "8"))
	requireUppercase, _ := strconv.ParseBool(getEnv("PASSWORD_REQUIRE_UPPERCASE", "true"))
	requireLowercase, _ := strconv.ParseBool(getEnv("PASSWORD_REQUIRE_LOWERCASE", "true"))
	requireNumbers, _ := strconv.ParseBool(getEnv("PASSWORD_REQUIRE_NUMBERS", "true"))
	requireSpecial, _ := strconv.ParseBool(getEnv("PASSWORD_REQUIRE_SPECIAL", "true"))
	expiryWarningDays, _ := strconv.Atoi(getEnv("PASSWORD_EXPIRY_WARNING_DAYS", "7"))
	forceFirstLoginChange, _ := strconv.ParseBool(getEnv("PASSWORD_FORCE_FIRST_LOGIN_CHANGE", "true"))

	return &Config{
		Database: DatabaseConfig{
			Host:     getEnv("DB_HOST", "localhost"),
			Port:     dbPort,
			User:     getEnv("DB_USER", "postgres"),
			Password: getEnv("DB_PASSWORD", "postgres"),
			DBName:   getEnv("DB_NAME", "auth_service"),
			SSLMode:  getEnv("DB_SSL_MODE", "disable"),
		},
		Server: ServerConfig{
			Port:        getEnv("SERVER_PORT", "8080"),
			Host:        getEnv("SERVER_HOST", "0.0.0.0"),
			Mode:        getEnv("SERVER_MODE", "debug"),
			FrontendURL: getEnv("FRONTEND_URL", "http://localhost:3000"),
		},
		JWT: JWTConfig{
			SecretKey:       getEnv("JWT_SECRET_KEY", "your-secret-key-change-this"),
			AccessTokenTTL:  accessTTL,
			RefreshTokenTTL: refreshTTL,
		},
		OAuth2: OAuth2Config{
			ClientID:     getEnv("OAUTH2_CLIENT_ID", ""),
			ClientSecret: getEnv("OAUTH2_CLIENT_SECRET", ""),
			RedirectURL:  getEnv("OAUTH2_REDIRECT_URL", ""),
		},
		Testing: TestingConfig{
			SkipMigrations: skipMigrations,
		},
		Password: PasswordPolicyConfig{
			RotationDays:             rotationDays,
			HistoryCount:             historyCount,
			MinLength:                minLength,
			RequireUppercase:         requireUppercase,
			RequireLowercase:         requireLowercase,
			RequireNumbers:           requireNumbers,
			RequireSpecialCharacters: requireSpecial,
			ExpiryWarningDays:        expiryWarningDays,
			ForceFirstLoginChange:    forceFirstLoginChange,
		},
	}, nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}