package repository

import (
	"fmt"
	"log"

	"github.com/seasia/auth-service/config"
	"github.com/seasia/auth-service/internal/migration"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type Database struct {
	DB *gorm.DB
}

func NewDatabase(cfg *config.Config) (*Database, error) {
	// Run database migrations first (unless skipped for testing)
	if cfg.Testing.SkipMigrations {
		log.Println("Skipping database migrations (SKIP_MIGRATIONS=true)")
	} else {
		log.Println("Running database migrations...")
		if err := migration.RunMigrations(cfg); err != nil {
			return nil, fmt.Errorf("failed to run migrations: %w", err)
		}
	}

	// Connect to database with GORM
	dsn := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		cfg.Database.Host,
		cfg.Database.Port,
		cfg.Database.User,
		cfg.Database.Password,
		cfg.Database.DBName,
		cfg.Database.SSLMode,
	)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Log current migration status (unless migrations were skipped)
	if !cfg.Testing.SkipMigrations {
		version, dirty, err := migration.GetMigrationVersion(cfg)
		if err != nil {
			log.Printf("Warning: could not get migration version: %v", err)
		} else {
			log.Printf("Database migration status - Version: %d, Dirty: %v", version, dirty)
		}
	}

	return &Database{DB: db}, nil
}

// SeedInitialData is no longer needed as migrations handle all data seeding
// This function is kept for backward compatibility but does nothing
func (d *Database) SeedInitialData() error {
	log.Println("SeedInitialData: Skipping - data is now managed by migrations")
	return nil
}