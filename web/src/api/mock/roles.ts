/**
 * Роли как данные.
 *
 * Повторяет `catalog/roles.yaml` в той части, которая нужна интерфейсу.
 * Роль — это набор прав, а не константа в коде (CLAUDE.md, п. 3.2): чтобы
 * поменять, что может директор, правится этот список, а не экраны.
 *
 * Трёх ролей достаточно для того, что просил человек. Роли раздела
 * (руководитель, специалист) из `catalog/roles.yaml` появятся вместе с
 * серверной моделью прав на этапе 1; здесь их место занимает список
 * разрешённых разделов у пользователя.
 */
import type { Action, Role, RoleId } from '@/api/types';

export const roles: Role[] = [
  {
    id: 'platform-admin',
    title: 'Администратор',
    scope: 'platform',
    description:
      'Заводит компании и людей, видит и правит документы всех компаний, ведёт журнал действий.',
    can: [
      'admin.panel',
      'company.create',
      'company.edit',
      'people.manage',
      'documents.viewAll',
      'documents.editAny',
      'documents.delete',
      'documents.restore',
      'audit.view',
    ],
  },
  {
    id: 'director',
    title: 'Директор',
    scope: 'company',
    description:
      'Всё, что может работник, плюс управление своей компанией: люди, реквизиты и все её документы.',
    can: [
      'company.edit',
      'people.manage',
      'documents.viewAll',
      'documents.editAny',
      'documents.delete',
      'documents.restore',
      'audit.view',
    ],
  },
  {
    id: 'employee',
    title: 'Работник',
    scope: 'company',
    description: 'Создаёт документы в разрешённых ему разделах и видит только свои.',
    can: [],
  },
];

export function findRole(id: RoleId): Role | undefined {
  return roles.find((role) => role.id === id);
}

/** Право роли. Роли без такого права здесь просто нет — по умолчанию запрещено. */
export function roleCan(id: RoleId, action: Action): boolean {
  return findRole(id)?.can.includes(action) ?? false;
}
