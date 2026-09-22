/**
 * Хранение пароля.
 *
 * Проверяется ровно то, ради чего это написано: в хранилище не остаётся
 * самого пароля, у двух одинаковых паролей разные соли, и неверный пароль
 * не подходит.
 *
 * Это не проверка стойкости: браузерная проверка обходится через инструменты
 * разработчика, и настоящая аутентификация будет на сервере (CLAUDE.md, п. 3.8).
 */
import { describe, expect, it } from 'vitest';

import { hashPassword, verifyPassword } from './password';

const PASSWORD = 'правильный-пароль-42';

describe('хеш пароля', () => {
  it('подходит своему паролю', async () => {
    const stored = await hashPassword(PASSWORD);
    await expect(verifyPassword(PASSWORD, stored)).resolves.toBe(true);
  });

  it('не подходит чужому', async () => {
    const stored = await hashPassword(PASSWORD);
    await expect(verifyPassword('другой-пароль-42', stored)).resolves.toBe(false);
    await expect(verifyPassword('', stored)).resolves.toBe(false);
  });

  it('самого пароля в записи нет', async () => {
    const stored = await hashPassword(PASSWORD);
    expect(JSON.stringify(stored)).not.toContain(PASSWORD);
  });

  it('у двух одинаковых паролей разные соли и разные хеши', async () => {
    const first = await hashPassword(PASSWORD);
    const second = await hashPassword(PASSWORD);

    expect(first.salt).not.toBe(second.salt);
    expect(first.hash).not.toBe(second.hash);
  });

  it('пароль приводится к одной форме записи', async () => {
    // «й» набирается одним знаком или «и» с краткой сверху. Для человека это
    // один и тот же пароль, и раскладка не должна закрывать ему вход.
    const composed = 'пароль-й-2026';
    const decomposed = 'пароль-й-2026';

    const stored = await hashPassword(composed);
    await expect(verifyPassword(decomposed, stored)).resolves.toBe(true);
  });
});
