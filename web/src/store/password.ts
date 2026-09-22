/**
 * Хеширование пароля.
 *
 * Паролей в исходном коде нет ни одного: администратор заводится при первом
 * запуске, остальных заводит он. В хранилище лежит только соль и хеш —
 * ни в репозитории, ни в собранном бандле пароля нет, и через инструменты
 * разработчика он не читается.
 *
 * ЧЕГО ЭТО НЕ ДЕЛАЕТ. Это не аутентификация. Проверка идёт в браузере, и тот,
 * кто откроет консоль, обойдёт её за минуту. Настоящая проверка — на сервере,
 * argon2id, access-токен на 10 минут и ротация refresh (CLAUDE.md, п. 3.8),
 * этап 1 роадмапа. PBKDF2 здесь взят потому, что его умеет сам браузер:
 * argon2id в WebCrypto нет, а тянуть ради заглушки библиотеку незачем.
 */

/** Рекомендация OWASP для PBKDF2-SHA256 на 2023 год. */
const ITERATIONS = 310_000;
const SALT_BYTES = 16;
const KEY_BITS = 256;

export interface PasswordHash {
  algo: 'PBKDF2-SHA256';
  iterations: number;
  /** Соль в base64. У каждого пароля своя. */
  salt: string;
  /** Хеш в base64. */
  hash: string;
}

/** Минимальная длина пароля. Короче — отказ на форме, а не молча. */
export const MIN_PASSWORD_LENGTH = 8;

export async function hashPassword(password: string): Promise<PasswordHash> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derive(password, salt, ITERATIONS);

  return {
    algo: 'PBKDF2-SHA256',
    iterations: ITERATIONS,
    salt: toBase64(salt),
    hash: toBase64(hash),
  };
}

/**
 * Сверяет пароль с хешем.
 *
 * Сравнение идёт за постоянное время: разница во времени ответа подсказывает,
 * сколько первых байтов угадано.
 */
export async function verifyPassword(password: string, stored: PasswordHash): Promise<boolean> {
  const salt = fromBase64(stored.salt);
  const actual = await derive(password, salt, stored.iterations);
  return equalsConstantTime(toBase64(actual), stored.hash);
}

async function derive(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password.normalize('NFKC')),
    'PBKDF2',
    false,
    ['deriveBits'],
  );

  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    key,
    KEY_BITS,
  );

  return new Uint8Array(bits);
}

function equalsConstantTime(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
