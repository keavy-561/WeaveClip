package migrations

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// Up applies all pending up migrations in order.
func Up(db *sql.DB, dir string) error {
	if err := ensureMigrationsTable(db); err != nil {
		return err
	}
	files, err := os.ReadDir(dir)
	if err != nil {
		return err
	}
	var ups []string
	for _, f := range files {
		if f.IsDir() {
			continue
		}
		name := f.Name()
		if strings.HasSuffix(name, ".up.sql") {
			ups = append(ups, name)
		}
	}
	sort.Strings(ups)
	for _, name := range ups {
		ver := strings.TrimSuffix(name, ".up.sql")
		var applied int
		if err := db.QueryRow("SELECT COUNT(1) FROM schema_migrations WHERE version=$1", ver).Scan(&applied); err != nil {
			return err
		}
		if applied > 0 {
			continue
		}
		sqlBytes, err := os.ReadFile(filepath.Join(dir, name))
		if err != nil {
			return err
		}
		tx, err := db.Begin()
		if err != nil {
			return err
		}
	if _, err := tx.Exec(string(sqlBytes)); err != nil {
		if rbErr := tx.Rollback(); rbErr != nil {
			return fmt.Errorf("migrate up %s rollback: %w", ver, rbErr)
		}
		return fmt.Errorf("migrate up %s: %w", ver, err)
	}
	if _, err := tx.Exec("INSERT INTO schema_migrations(version) VALUES($1)", ver); err != nil {
		if rbErr := tx.Rollback(); rbErr != nil {
			return fmt.Errorf("migrate up %s rollback: %w", ver, rbErr)
		}
		return err
	}
		if err := tx.Commit(); err != nil {
			return err
		}
		fmt.Printf("migrated up: %s\n", ver)
	}
	return nil
}

// Down rolls back to the specified version. If target is empty, rolls back the last applied migration.
func Down(db *sql.DB, dir, target string) error {
	if err := ensureMigrationsTable(db); err != nil {
		return err
	}
	files, err := os.ReadDir(dir)
	if err != nil {
		return err
	}
	var downs []string
	for _, f := range files {
		if f.IsDir() {
			continue
		}
		name := f.Name()
		if strings.HasSuffix(name, ".down.sql") {
			downs = append(downs, name)
		}
	}
	sort.Strings(downs)

	type row struct {
		version string
	}
	var applied []row
	rows, err := db.Query("SELECT version FROM schema_migrations ORDER BY version DESC")
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var r row
		if err := rows.Scan(&r.version); err != nil {
			return err
		}
		applied = append(applied, r)
	}

	if target == "" {
		if len(applied) == 0 {
			return fmt.Errorf("no migrations applied")
		}
		target = applied[0].version
	}

	for _, r := range applied {
		if r.version == target {
			break
		}
		for _, name := range downs {
			ver := strings.TrimSuffix(name, ".down.sql")
			if ver == r.version {
				sqlBytes, err := os.ReadFile(filepath.Join(dir, name))
				if err != nil {
					return err
				}
				tx, err := db.Begin()
				if err != nil {
					return err
				}
				if _, err := tx.Exec(string(sqlBytes)); err != nil {
					if rbErr := tx.Rollback(); rbErr != nil {
						return fmt.Errorf("migrate down %s rollback: %w", ver, rbErr)
					}
					return fmt.Errorf("migrate down %s: %w", ver, err)
				}
				if _, err := tx.Exec("DELETE FROM schema_migrations WHERE version=$1", ver); err != nil {
					if rbErr := tx.Rollback(); rbErr != nil {
						return fmt.Errorf("migrate down %s rollback: %w", ver, rbErr)
					}
					return err
				}
				if err := tx.Commit(); err != nil {
					return err
				}
				fmt.Printf("migrated down: %s\n", ver)
				break
			}
		}
	}
	return nil
}

// Status prints applied migrations.
func Status(db *sql.DB) error {
	if err := ensureMigrationsTable(db); err != nil {
		return err
	}
	rows, err := db.Query("SELECT version, applied_at FROM schema_migrations ORDER BY version")
	if err != nil {
		return err
	}
	defer rows.Close()
	fmt.Println("applied migrations:")
	for rows.Next() {
		var v, a string
		if err := rows.Scan(&v, &a); err != nil {
			return err
		}
		fmt.Printf("  %s (at %s)\n", v, a)
	}
	return nil
}

func ensureMigrationsTable(db *sql.DB) error {
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version VARCHAR(255) PRIMARY KEY,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`)
	return err
}
