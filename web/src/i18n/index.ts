/**
 * Точка доступа к строкам интерфейса.
 *
 * Сейчас словарь один. Когда появится казахский, здесь встанет выбор языка,
 * а экраны останутся нетронутыми — они обращаются только к `t`.
 */
import { ru } from './ru';

import type { Dictionary } from './ru';

export const t: Dictionary = ru;

export type { Dictionary };
