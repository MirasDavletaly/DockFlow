package middleware

import (
	"errors"
	"log/slog"
	"net/http"
	"runtime/debug"

	"docflow/internal/http/response"
	"docflow/internal/observability"
)

// Recover не даёт панике в обработчике уронить процесс целиком.
//
// Это страховка, а не механизм работы: паника в обработке запроса считается
// дефектом (CLAUDE.md, п. 6), поэтому она пишется в журнал на уровне ошибки
// вместе со стеком, а клиент получает обычный ответ об внутренней ошибке —
// без подробностей, по которым можно изучать устройство системы.
func Recover(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		rec := newRecorder(w)

		defer func() {
			cause := recover()
			if cause == nil {
				return
			}

			// http.ErrAbortHandler — это условленный способ оборвать ответ,
			// а не сбой; его пробрасываем дальше, как и предписывает net/http.
			if errors.Is(toError(cause), http.ErrAbortHandler) {
				panic(cause)
			}

			observability.LoggerFrom(r.Context()).Error("паника в обработчике запроса",
				slog.Any("panic", cause),
				slog.String("stack", string(debug.Stack())),
				slog.String("method", r.Method),
				slog.String("path", r.URL.Path),
			)

			// Если ответ уже начал уходить клиенту, подменить его нечем:
			// остаётся оборвать соединение, чтобы обрезанное тело не выглядело
			// как успешный ответ.
			if rec.Written() {
				panic(http.ErrAbortHandler)
			}

			response.Error(rec, r, errInternal)
		}()

		next.ServeHTTP(rec, r)
	})
}

// errInternal не соответствует ни одной доменной ошибке, поэтому превращается
// в ответ 500 — ровно то, что нужно после паники.
var errInternal = errors.New("необработанная паника")

func toError(v any) error {
	if err, ok := v.(error); ok {
		return err
	}
	return nil
}
