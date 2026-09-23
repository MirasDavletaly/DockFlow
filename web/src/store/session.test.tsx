/**
 * Вторая проверка прав – в сессии, а не только на экране.
 *
 * Сессия здесь играет роль сервиса (CLAUDE.md, п. 3.2): кнопку можно нажать
 * мимо интерфейса, и тогда остаётся только эта проверка. Тесты вызывают
 * действия сессии напрямую, как это сделал бы человек из консоли браузера.
 */
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { SessionProvider, useSession } from './session';
import { loadDb, resetDb, updateDb } from '@/store/db';

import type { StoredUser } from './db';
import type { DocumentRecord, RoleId } from '@/api/types';
import type { Root } from 'react-dom/client';

const A = 'c-knt';
const B = 'c-algoritmi';

/** Хеш-заглушка: вход по паролю эти тесты не проверяют. */
const NO_PASSWORD = { algo: 'PBKDF2-SHA256' as const, iterations: 1, salt: '', hash: '' };

function stored(id: string, role: RoleId, companyIds: string[]): StoredUser {
  return {
    id,
    login: id,
    displayName: id,
    role,
    companyIds,
    sectionIds: [],
    createdAt: '2026-09-23T00:00:00.000Z',
    password: NO_PASSWORD,
    failedAttempts: 0,
  };
}

function document_(id: string, companyId: string, authorId: string): DocumentRecord {
  return {
    id,
    templateId: 'hr-hire-order',
    companyId,
    title: 'Приказ о приёме на работу',
    description: '',
    subject: '',
    status: 'saved',
    number: null,
    createdAt: '2026-09-23T00:00:00.000Z',
    updatedAt: '2026-09-23T00:00:00.000Z',
    values: {},
    authorId,
    authorName: authorId,
  };
}

let container: HTMLDivElement;
let root: Root;
let session: ReturnType<typeof useSession>;

function Probe() {
  session = useSession();
  return null;
}

/** Входит под учётной записью и отдаёт живую сессию. */
function signInAs(userId: string, companyId: string) {
  sessionStorage.setItem(
    'docflow.session',
    JSON.stringify({ userId, companyId, adminUnlocked: true }),
  );
  act(() => {
    root.render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    );
  });
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  resetDb();

  updateDb((db) => ({
    ...db,
    users: [
      stored('admin', 'platform-admin', []),
      stored('director-a', 'director', [A]),
      stored('director-b', 'director', [B]),
      stored('worker-a', 'employee', [A]),
      stored('worker-b', 'employee', [B]),
    ],
    documents: [document_('doc-a', A, 'worker-a'), document_('doc-b', B, 'worker-b')],
  }));

  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function user(id: string): StoredUser | undefined {
  return loadDb().users.find((u) => u.id === id);
}

describe('директор управляет только своей компанией', () => {
  it('не видит в списке людей чужой компании и администраторов', () => {
    signInAs('director-a', A);
    const ids = session.users.map((u) => u.id);

    expect(ids).toContain('worker-a');
    expect(ids).not.toContain('worker-b');
    expect(ids).not.toContain('director-b');
    expect(ids).not.toContain('admin');
  });

  it('не блокирует и не переименовывает сотрудника чужой компании', () => {
    signInAs('director-a', A);
    act(() => session.updateUser('worker-b', { blocked: true, displayName: 'взлом' }));

    expect(user('worker-b')?.blocked).toBeUndefined();
    expect(user('worker-b')?.displayName).toBe('worker-b');
  });

  it('не удаляет чужого сотрудника и не повышает своего до директора', () => {
    signInAs('director-a', A);
    act(() => session.removeUser('worker-b'));
    act(() => session.updateUser('worker-a', { role: 'director' }));

    expect(user('worker-b')).toBeDefined();
    expect(user('worker-a')?.role).toBe('employee');
  });

  it('не выдаёт своему сотруднику доступ к чужой компании', () => {
    signInAs('director-a', A);
    act(() => session.updateUser('worker-a', { companyIds: [A, B] }));

    expect(user('worker-a')?.companyIds).toEqual([A]);
  });

  it('не заводит администратора и не заводит сотрудника в чужой компании', async () => {
    signInAs('director-a', A);

    let asAdmin: { ok: boolean } = { ok: true };
    let elsewhere: { ok: boolean } = { ok: true };
    await act(async () => {
      asAdmin = await session.createUser({
        login: 'intruder',
        displayName: 'x',
        password: '12345678',
        role: 'platform-admin',
        companyIds: [],
        sectionIds: [],
        viewSectionIds: [],
      });
      elsewhere = await session.createUser({
        login: 'intruder2',
        displayName: 'x',
        password: '12345678',
        role: 'employee',
        companyIds: [B],
        sectionIds: [],
        viewSectionIds: [],
      });
    });

    expect(asAdmin.ok).toBe(false);
    expect(elsewhere.ok).toBe(false);
    expect(loadDb().users.some((u) => u.login.startsWith('intruder'))).toBe(false);
  });

  it('не видит журнал чужой компании', () => {
    updateDb((db) => ({
      ...db,
      audit: [
        { id: '1', at: '2026-09-23T00:00:00.000Z', userId: 'x', userName: 'x', companyId: A, event: 'document.create', target: 'a' },
        { id: '2', at: '2026-09-23T00:00:00.000Z', userId: 'x', userName: 'x', companyId: B, event: 'document.create', target: 'b' },
      ],
    }));
    signInAs('director-a', A);

    expect(session.audit.map((e) => e.id)).toEqual(['1']);
  });
});

describe('выданный доступ к документу', () => {
  it('директор выдаёт доступ своему сотруднику, и тот видит документ', () => {
    updateDb((db) => ({ ...db, users: [...db.users, stored('worker-a2', 'employee', [A])] }));

    signInAs('director-a', A);
    act(() => session.setDocumentGrant('doc-a', 'worker-a2', 'view'));
    expect(loadDb().documents.find((d) => d.id === 'doc-a')?.grants?.[0]?.userId).toBe('worker-a2');

    act(() => root.unmount());
    root = createRoot(container);
    signInAs('worker-a2', A);
    expect(session.documents.map((d) => d.id)).toEqual(['doc-a']);
  });

  it('директор не выдаёт доступ к документу чужой компании', () => {
    signInAs('director-a', A);
    act(() => session.setDocumentGrant('doc-b', 'worker-a', 'edit'));

    expect(loadDb().documents.find((d) => d.id === 'doc-b')?.grants).toBeUndefined();
  });

  it('человеку из другой компании доступ не выдаётся даже администратором', () => {
    signInAs('admin', A);
    act(() => session.setDocumentGrant('doc-a', 'worker-b', 'view'));

    expect(loadDb().documents.find((d) => d.id === 'doc-a')?.grants).toBeUndefined();
  });

  it('работник доступ не выдаёт', () => {
    updateDb((db) => ({ ...db, users: [...db.users, stored('worker-a2', 'employee', [A])] }));
    signInAs('worker-a', A);
    act(() => session.setDocumentGrant('doc-a', 'worker-a2', 'view'));

    expect(loadDb().documents.find((d) => d.id === 'doc-a')?.grants).toBeUndefined();
  });
});

describe('пароль админ-панели', () => {
  it('подтверждается один раз и забывается при выходе', () => {
    sessionStorage.setItem('docflow.session', JSON.stringify({ userId: 'admin', companyId: A }));
    act(() => {
      root.render(
        <SessionProvider>
          <Probe />
        </SessionProvider>,
      );
    });

    expect(session.adminUnlocked).toBe(false);
    act(() => session.unlockAdmin());
    expect(session.adminUnlocked).toBe(true);
    expect(JSON.parse(sessionStorage.getItem('docflow.session') ?? '{}')).toMatchObject({
      adminUnlocked: true,
    });

    act(() => session.signOut());
    expect(session.adminUnlocked).toBe(false);
    expect(sessionStorage.getItem('docflow.session')).toBeNull();
  });
});
