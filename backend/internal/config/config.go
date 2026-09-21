// Package config читает настройки процесса из переменных окружения.
//
// Два правила, ради которых пакет устроен именно так:
//   - секреты берутся только из окружения, в репозитории их нет (CLAUDE.md, п. 3.10);
//   - процесс падает при старте, если настройка отсутствует или бессмысленна, а не при
//     первом запросе (CLAUDE.md, п. 6: «никаких заглушек»).
//
// Ошибки собираются все сразу: человеку показывается полный список того, что надо
// дописать в .env, а не первая попавшаяся переменная.
package config

import (
	"errors"
	"fmt"
	"log/slog"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
)

// Env — режим работы процесса. От него зависят формат логов и строгость проверок.
type Env string

const (
	EnvDev  Env = "dev"
	EnvTest Env = "test"
	EnvProd Env = "prod"
)

// Valid сообщает, известен ли режим.
func (e Env) Valid() bool {
	switch e {
	case EnvDev, EnvTest, EnvProd:
		return true
	default:
		return false
	}
}

// IsProd используется там, где в бою нужно поведение строже, чем в разработке.
func (e Env) IsProd() bool { return e == EnvProd }

// Config — полный набор настроек. Все процессы (api, worker, relay, scheduler,
// migrate, seed) читают один и тот же набор: так .env остаётся единственным.
type Config struct {
	Env      Env
	Log      Log
	HTTP     HTTP
	Database Database
	Redis    Redis
	Storage  Storage

	// ShutdownTimeout — сколько ждать завершения начатой работы после сигнала.
	ShutdownTimeout time.Duration
}

// Log — настройки журналирования.
type Log struct {
	Level slog.Level
	// JSON=false включает человекочитаемый вывод; допустимо только в разработке.
	JSON bool
}

// HTTP — адреса и таймауты HTTP-серверов (docs/architecture.md, п. 13).
type HTTP struct {
	Addr        string
	MetricsAddr string

	ReadHeaderTimeout time.Duration
	ReadTimeout       time.Duration
	WriteTimeout      time.Duration
	IdleTimeout       time.Duration

	// RequestTimeout — предельное время обработки одного запроса.
	RequestTimeout time.Duration
	// MaxBodyBytes — предел размера тела запроса (CLAUDE.md, п. 3.11).
	MaxBodyBytes int64
}

// Database — подключение к PostgreSQL через PgBouncer.
type Database struct {
	// URL содержит пароль, поэтому наружу отдаётся только в скрытом виде.
	URL string
	// MaxConns ограничивает пул приложения: PgBouncer не спасает от того,
	// что каждый процесс откроет сотни соединений.
	MaxConns int32
	// StatementTimeout — предел на один запрос к БД (CLAUDE.md, п. 3.11).
	StatementTimeout time.Duration
}

// Redis — кэш, счётчики и очереди.
type Redis struct {
	URL string
}

// Storage — объектное хранилище (MinIO/S3).
type Storage struct {
	Endpoint  string
	AccessKey string
	SecretKey string
	Bucket    string
	UseSSL    bool
}

// Load читает конфигурацию из окружения процесса.
func Load() (Config, error) { return load(os.LookupEnv) }

// LoadFrom читает конфигурацию из заданного набора значений.
//
// Нужен тестам: они собирают настройки, не трогая окружение процесса, и поэтому
// могут идти параллельно.
func LoadFrom(values map[string]string) (Config, error) {
	return load(func(key string) (string, bool) {
		v, ok := values[key]
		return v, ok
	})
}

// LookupFunc повторяет сигнатуру os.LookupEnv и позволяет тестировать загрузку
// без глобального состояния процесса.
type LookupFunc func(key string) (string, bool)

func load(lookup LookupFunc) (Config, error) {
	l := &loader{lookup: lookup}

	cfg := Config{
		Env: Env(l.str("APP_ENV", "dev")),
		Log: Log{
			Level: l.level("LOG_LEVEL", slog.LevelInfo),
			JSON:  l.bool("LOG_JSON", true),
		},
		HTTP: HTTP{
			Addr:        l.str("HTTP_ADDR", ":8080"),
			MetricsAddr: l.str("METRICS_ADDR", ":9090"),

			ReadHeaderTimeout: l.duration("HTTP_READ_HEADER_TIMEOUT", 5*time.Second),
			ReadTimeout:       l.duration("HTTP_READ_TIMEOUT", 15*time.Second),
			WriteTimeout:      l.duration("HTTP_WRITE_TIMEOUT", 30*time.Second),
			IdleTimeout:       l.duration("HTTP_IDLE_TIMEOUT", 60*time.Second),

			RequestTimeout: l.duration("HTTP_REQUEST_TIMEOUT", 20*time.Second),
			MaxBodyBytes:   int64(l.bytes("HTTP_MAX_BODY_BYTES", 1<<20)),
		},
		Database: Database{
			URL:              l.requiredURL("DATABASE_URL", "postgres", "postgresql"),
			MaxConns:         int32(l.intInRange("DATABASE_MAX_CONNS", 10, 1, 1000)),
			StatementTimeout: l.duration("DATABASE_STATEMENT_TIMEOUT", 5*time.Second),
		},
		Redis: Redis{
			URL: l.requiredURL("REDIS_URL", "redis", "rediss"),
		},
		Storage: Storage{
			Endpoint:  l.required("STORAGE_ENDPOINT"),
			AccessKey: l.required("STORAGE_ACCESS_KEY"),
			SecretKey: l.required("STORAGE_SECRET_KEY"),
			Bucket:    l.str("STORAGE_BUCKET", "docflow"),
			UseSSL:    l.bool("STORAGE_USE_SSL", false),
		},
		ShutdownTimeout: l.duration("SHUTDOWN_TIMEOUT", 20*time.Second),
	}

	if !cfg.Env.Valid() {
		l.fail("APP_ENV", fmt.Sprintf("допустимы %q, %q, %q", EnvDev, EnvTest, EnvProd))
	}
	if cfg.Env.IsProd() && !cfg.Log.JSON {
		l.fail("LOG_JSON", "в режиме prod логи должны быть в JSON")
	}
	if cfg.HTTP.RequestTimeout >= cfg.HTTP.WriteTimeout {
		l.fail("HTTP_REQUEST_TIMEOUT", "должен быть меньше HTTP_WRITE_TIMEOUT, иначе клиент получит обрыв вместо ответа")
	}

	if err := l.err(); err != nil {
		return Config{}, err
	}
	return cfg, nil
}

// LogValue отдаёт конфигурацию для логов без секретов: строки подключения содержат
// пароли, а им в логах не место (CLAUDE.md, п. 3.10).
func (c Config) LogValue() slog.Value {
	return slog.GroupValue(
		slog.String("env", string(c.Env)),
		slog.String("http_addr", c.HTTP.Addr),
		slog.String("metrics_addr", c.HTTP.MetricsAddr),
		slog.String("database", hideCredentials(c.Database.URL)),
		slog.String("redis", hideCredentials(c.Redis.URL)),
		slog.String("storage_endpoint", c.Storage.Endpoint),
		slog.String("storage_bucket", c.Storage.Bucket),
	)
}

// hideCredentials оставляет от строки подключения только то, что полезно при
// разборе инцидента: схему, хост и имя базы. Логин и пароль убираются.
func hideCredentials(raw string) string {
	u, err := url.Parse(raw)
	if err != nil {
		return "[не разобрано]"
	}
	u.User = nil
	u.RawQuery = ""
	return u.String()
}

// loader накапливает ошибки разбора, чтобы показать их одним списком.
type loader struct {
	lookup LookupFunc
	errs   []error
}

func (l *loader) fail(key, reason string) {
	l.errs = append(l.errs, fmt.Errorf("%s: %s", key, reason))
}

func (l *loader) err() error {
	if len(l.errs) == 0 {
		return nil
	}
	return fmt.Errorf("настройки окружения заполнены неверно:\n\t%w", errors.Join(l.errs...))
}

func (l *loader) raw(key string) (string, bool) {
	v, ok := l.lookup(key)
	if !ok {
		return "", false
	}
	v = strings.TrimSpace(v)
	if v == "" {
		return "", false
	}
	return v, true
}

func (l *loader) str(key, def string) string {
	if v, ok := l.raw(key); ok {
		return v
	}
	return def
}

func (l *loader) required(key string) string {
	v, ok := l.raw(key)
	if !ok {
		l.fail(key, "обязательная переменная не задана")
		return ""
	}
	return v
}

func (l *loader) requiredURL(key string, schemes ...string) string {
	v := l.required(key)
	if v == "" {
		return ""
	}
	u, err := url.Parse(v)
	if err != nil {
		l.fail(key, "не разбирается как URL")
		return v
	}
	for _, s := range schemes {
		if u.Scheme == s {
			return v
		}
	}
	l.fail(key, fmt.Sprintf("схема %q не подходит, ожидается одна из: %s", u.Scheme, strings.Join(schemes, ", ")))
	return v
}

func (l *loader) bool(key string, def bool) bool {
	v, ok := l.raw(key)
	if !ok {
		return def
	}
	parsed, err := strconv.ParseBool(v)
	if err != nil {
		l.fail(key, "ожидается true или false")
		return def
	}
	return parsed
}

func (l *loader) duration(key string, def time.Duration) time.Duration {
	v, ok := l.raw(key)
	if !ok {
		return def
	}
	parsed, err := time.ParseDuration(v)
	if err != nil {
		l.fail(key, "ожидается длительность, например 5s или 200ms")
		return def
	}
	if parsed <= 0 {
		l.fail(key, "должна быть положительной: таймаут обязателен у каждой операции")
		return def
	}
	return parsed
}

func (l *loader) intInRange(key string, def, minValue, maxValue int) int {
	v, ok := l.raw(key)
	if !ok {
		return def
	}
	parsed, err := strconv.Atoi(v)
	if err != nil {
		l.fail(key, "ожидается целое число")
		return def
	}
	if parsed < minValue || parsed > maxValue {
		l.fail(key, fmt.Sprintf("допустимо от %d до %d", minValue, maxValue))
		return def
	}
	return parsed
}

func (l *loader) bytes(key string, def int) int {
	return l.intInRange(key, def, 1024, 64<<20)
}

func (l *loader) level(key string, def slog.Level) slog.Level {
	v, ok := l.raw(key)
	if !ok {
		return def
	}
	var lvl slog.Level
	if err := lvl.UnmarshalText([]byte(v)); err != nil {
		l.fail(key, "ожидается debug, info, warn или error")
		return def
	}
	return lvl
}
