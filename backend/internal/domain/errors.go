// Package domain — ядро предметной области. Оно ничего не знает про HTTP,
// хранилище и модули (CLAUDE.md, п. 3.3), поэтому ошибки здесь описаны в терминах
// предметной области, а не кодами ответов.
package domain

import (
	"errors"
	"fmt"
)

// Базовые виды ошибок. Сервисы возвращают их (в том числе обёрнутыми через %w),
// а перевод в коды HTTP выполняется в одном месте — internal/http/response.
var (
	// ErrNotFound — объект не существует либо недоступен обратившемуся.
	// Это один и тот же ответ намеренно: по умолчанию запрещено, и чужой
	// документ отвечает «не найдено», а не «запрещено» (CLAUDE.md, п. 3.2),
	// иначе по коду ответа можно узнать, что документ существует.
	ErrNotFound = errors.New("не найдено")

	// ErrUnauthorized — обратившийся не опознан: нет токена или он недействителен.
	ErrUnauthorized = errors.New("не аутентифицирован")

	// ErrForbidden — действие запрещено, и скрывать это не нужно.
	// Пример: нельзя утверждать документ о самом себе. Для чужих объектов
	// используется ErrNotFound.
	ErrForbidden = errors.New("действие запрещено")

	// ErrConflict — состояние изменилось с тех пор, как его видел обратившийся:
	// не совпала версия, документ уже утверждён, повторное решение.
	ErrConflict = errors.New("состояние изменилось")

	// ErrRateLimited — превышен предел обращений.
	ErrRateLimited = errors.New("слишком много обращений")
)

// FieldError описывает одно непройденное правило проверки.
type FieldError struct {
	// Field — имя поля так, как оно приходит в запросе.
	Field string
	// Message — объяснение для пользователя, по-русски.
	Message string
}

// ValidationError — набор ошибок проверки входных данных.
type ValidationError struct {
	Fields []FieldError
}

// NewValidationError собирает ошибку проверки из пар «поле — объяснение».
func NewValidationError(fields ...FieldError) *ValidationError {
	return &ValidationError{Fields: fields}
}

func (e *ValidationError) Error() string {
	if len(e.Fields) == 0 {
		return "данные не прошли проверку"
	}
	return fmt.Sprintf("данные не прошли проверку: %d поле(й)", len(e.Fields))
}

// AsValidationError достаёт ошибку проверки из цепочки обёрток.
func AsValidationError(err error) (*ValidationError, bool) {
	var v *ValidationError
	ok := errors.As(err, &v)
	return v, ok
}
