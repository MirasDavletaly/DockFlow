/**
 * Реквизиты компании — отдельной страницей.
 *
 * Эти значения подставляются в каждый документ, поэтому смотреть на них
 * нужно спокойно и целиком, а не сбоку на рабочем столе.
 *
 * Правка доступна директору и администратору. Уже сохранённые документы от
 * неё не меняются: у каждого из них лежит снимок реквизитов на момент
 * сохранения (CLAUDE.md, п. 3.4). Шаблоны, наоборот, всегда показывают
 * текущие значения — это и просил человек.
 */
import { useState } from 'react';

import { can } from '@/access/policy';
import { PageHeader } from '@/components/PageHeader/PageHeader';
import { t } from '@/i18n';
import { useSession } from '@/store/session';
import { cx } from '@/utils/cx';
import { formatShortDate } from '@/utils/format';

import styles from './CompanyPage.module.css';

import type { Company, HeadOffice } from '@/api/types';

export default function CompanyPage() {
  const { company, user, saveCompany } = useSession();
  const [draft, setDraft] = useState<Company | null>(null);
  const [saved, setSaved] = useState(false);

  if (company === null) return null;

  const editable = can({ user, companyId: company.id }, 'company.edit');

  function startEdit() {
    setSaved(false);
    setDraft({ ...(company as Company) });
  }

  function commit() {
    if (draft === null) return;
    saveCompany(draft);
    setDraft(null);
    setSaved(true);
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title={t.company.title}
        subtitle={t.company.body}
        actions={
          editable && draft === null ? (
            <button type="button" className={styles.action} onClick={startEdit}>
              {t.company.editAction}
            </button>
          ) : null
        }
      />

      <div className={styles.body}>
        {company.placeholder === true ? (
          <div className={styles.warn} role="note">
            <div className={styles.warnTitle}>{t.company.placeholderTitle}</div>
            <p className={styles.warnBody}>{t.company.placeholderBody}</p>
          </div>
        ) : null}

        {saved ? (
          <div className={styles.saved} role="status">
            <div className={styles.savedTitle}>{t.company.saved}</div>
            <p className={styles.savedBody}>{t.company.snapshotNote}</p>
          </div>
        ) : null}

        {draft === null ? (
          <ReadView company={company} />
        ) : (
          <EditView
            draft={draft}
            onChange={setDraft}
            onCancel={() => setDraft(null)}
            onSave={commit}
          />
        )}
      </div>
    </div>
  );
}

function ReadView({ company }: { company: Company }) {
  return (
    <>
      <dl className={styles.requisites}>
        <Requisite label={t.company.legalName} value={company.legalName} />
        <Requisite label={t.company.legalNameEn} value={company.legalNameEn} />
        <Requisite label={t.company.bin} value={company.bin} mono />
        <Requisite label={t.company.kbe} value={company.kbe} mono />
        <Requisite label={t.company.address} value={addressLine(company)} />
        <Requisite label={t.company.addressEn} value={company.addressEn} />
        <Requisite label={t.company.actualAddress} value={company.actualAddress} />
        <Requisite label={t.company.phone} value={company.phone} />
        <Requisite label={t.company.email} value={company.email} />
        <Requisite
          label={t.company.director}
          value={`${company.directorTitle}, ${company.directorName}`}
        />
        <Requisite label={t.company.directorEn} value={company.directorNameEn} />
        <Requisite label={t.company.basis} value={company.directorBasis} />
        <Requisite label={t.company.bank} value={company.bank?.name} />
        <Requisite label={t.company.bik} value={company.bank?.bik} mono />
        <Requisite label={t.company.taxOffice} value={company.taxOffice?.name} />
        <Requisite label={t.company.taxOfficeBin} value={company.taxOffice?.bin} mono />
        <Requisite label={t.company.vat} value={vatLine(company)} />

        {/* Головной офис есть не у всех: строки появляются только там,
            где он действительно есть. */}
        {company.headOffice === undefined ? null : (
          <>
            <Requisite label={t.company.headOffice} value={company.headOffice.address} />
            <Requisite
              label={t.company.headOfficeContacts}
              value={headOfficeContacts(company.headOffice)}
            />
          </>
        )}
      </dl>

      {company.bank === undefined ? null : (
        <>
          <div className={styles.accountsTitle}>{t.company.accounts}</div>
          <ul className={styles.accounts}>
            {company.bank.accounts.map((account) => (
              <li key={account.iban} className={styles.account}>
                <span className={cx(styles.accountIban, 'tabular')}>{account.iban}</span>
                <span className={styles.accountCurrency}>{account.currency}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

interface EditProps {
  draft: Company;
  onChange: (next: Company) => void;
  onCancel: () => void;
  onSave: () => void;
}

/**
 * Правка реквизитов.
 *
 * Правятся только те поля, которые действительно меняются в жизни компании:
 * наименование, адреса, связь и руководитель. Банк, налоговый орган и НДС
 * приходят выписками и правятся в админ-панели целиком, а не по буквам.
 */
function EditView({ draft, onChange, onCancel, onSave }: EditProps) {
  const set = (patch: Partial<Company>) => onChange({ ...draft, ...patch });

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
    >
      <div className={styles.formGrid}>
        <Text label={t.company.shortName} value={draft.name} onChange={(v) => set({ name: v })} />
        <Text
          label={t.company.legalName}
          value={draft.legalName}
          onChange={(v) => set({ legalName: v })}
        />
        <Text
          label={t.company.legalNameEn}
          value={draft.legalNameEn ?? ''}
          onChange={(v) => set({ legalNameEn: v })}
        />
        <Text label={t.company.bin} value={draft.bin} onChange={(v) => set({ bin: v })} />
        <Text label={t.company.kbe} value={draft.kbe ?? ''} onChange={(v) => set({ kbe: v })} />
        <Text
          label={t.company.postalCode}
          value={draft.postalCode ?? ''}
          onChange={(v) => set({ postalCode: v })}
        />
        <Text
          label={t.company.address}
          value={draft.address}
          onChange={(v) => set({ address: v })}
        />
        <Text
          label={t.company.actualAddress}
          value={draft.actualAddress ?? ''}
          onChange={(v) => set({ actualAddress: v })}
        />
        <Text label={t.company.city} value={draft.city} onChange={(v) => set({ city: v })} />
        <Text label={t.company.phone} value={draft.phone ?? ''} onChange={(v) => set({ phone: v })} />
        <Text label={t.company.email} value={draft.email ?? ''} onChange={(v) => set({ email: v })} />
        <Text
          label={t.company.directorTitle}
          value={draft.directorTitle}
          onChange={(v) => set({ directorTitle: v })}
        />
        <Text
          label={t.company.directorName}
          value={draft.directorName}
          onChange={(v) => set({ directorName: v })}
        />
        <Text
          label={t.company.directorTitleGenitive}
          value={draft.directorTitleGenitive}
          hint={t.company.genitiveHint}
          onChange={(v) => set({ directorTitleGenitive: v })}
        />
        <Text
          label={t.company.directorNameGenitive}
          value={draft.directorNameGenitive}
          onChange={(v) => set({ directorNameGenitive: v })}
        />
        <Text
          label={t.company.basis}
          value={draft.directorBasis}
          onChange={(v) => set({ directorBasis: v })}
        />
        <Text
          label={t.company.monogram}
          value={draft.monogram}
          onChange={(v) => set({ monogram: v.slice(0, 3) })}
        />
        <label className={styles.field}>
          <span className={styles.fieldLabel}>{t.company.accent}</span>
          <input
            className={styles.color}
            type="color"
            value={draft.accent}
            onChange={(e) => set({ accent: e.target.value })}
          />
        </label>
      </div>

      <p className={styles.note}>{t.company.snapshotNote}</p>

      <div className={styles.formActions}>
        <button type="button" className={styles.secondary} onClick={onCancel}>
          {t.common.cancel}
        </button>
        <button type="submit" className={styles.primary}>
          {t.common.save}
        </button>
      </div>
    </form>
  );
}

interface TextProps {
  label: string;
  value: string;
  hint?: string;
  onChange: (value: string) => void;
}

function Text({ label, value, hint, onChange }: TextProps) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <input className={styles.input} value={value} onChange={(e) => onChange(e.target.value)} />
      {hint === undefined ? null : <span className={styles.fieldHint}>{hint}</span>}
    </label>
  );
}

/** Индекс и адрес одной строкой. Без индекса запятая не появляется. */
function addressLine(company: Company): string {
  return [company.postalCode, company.address].filter(isFilled).join(', ');
}

/** Телефон, почта и PEC головного офиса одной строкой. */
function headOfficeContacts(office: HeadOffice): string | undefined {
  const parts = [office.phone, office.email, office.pec].filter(isFilled);
  return parts.length === 0 ? undefined : parts.join(' · ');
}

/** Свидетельство НДС: «серия 27001 № 1010058». */
function vatLine(company: Company): string | undefined {
  const vat = company.vat;
  if (vat === undefined) return undefined;

  const issued = isFilled(vat.issuedAt) ? ` от ${formatShortDate(vat.issuedAt)}` : '';
  return `серия ${vat.series} № ${vat.number}${issued}`;
}

function isFilled(value: string | undefined): value is string {
  return value !== undefined && value.trim() !== '';
}

interface RequisiteProps {
  label: string;
  value: string | undefined;
  /** Номера показываем моноширинным: так видно, что цифра пропущена. */
  mono?: boolean;
}

/**
 * Строка реквизита.
 *
 * Незаполненный реквизит не прячется, а показывается словами «не заполнено»:
 * пустое место читается как «здесь ничего и не должно быть», а это не так —
 * это данные, которых у системы пока нет.
 */
function Requisite({ label, value, mono = false }: RequisiteProps) {
  const filled = isFilled(value);

  return (
    <div className={styles.requisite}>
      <dt className={styles.requisiteLabel}>{label}</dt>
      <dd
        className={cx(styles.requisiteValue, filled ? mono && 'tabular' : styles.requisiteMissing)}
        title={filled ? undefined : t.company.missingHint}
      >
        {filled ? value : t.company.missing}
      </dd>
    </div>
  );
}
