/**
 * Рабочий стол.
 *
 * Первое, что видит человек после входа. Показываем не «аналитику», а то,
 * что ему сейчас делать: частые документы и его последние черновики.
 * Счётчики считаются по реальным документам сессии — выдуманных чисел
 * на экране нет.
 */
import { Link } from 'react-router-dom';

import { templates } from '@/api/mock/templates';
import { PageHeader } from '@/components/PageHeader/PageHeader';
import { StatusStamp } from '@/components/StatusStamp/StatusStamp';
import { t } from '@/i18n';
import { useSession } from '@/store/session';
import { cx } from '@/utils/cx';
import { formatShortDate, partOfDay } from '@/utils/format';

import styles from './DashboardPage.module.css';

import type { Company, HeadOffice } from '@/api/types';

export default function DashboardPage() {
  const { user, documents, company } = useSession();

  const greeting = {
    morning: t.dashboard.subtitleMorning,
    day: t.dashboard.subtitleDay,
    evening: t.dashboard.subtitleEvening,
  }[partOfDay()];

  const counters = [
    { key: 'drafts', label: t.dashboard.counters.drafts, value: countBy(documents, 'draft') },
    { key: 'review', label: t.dashboard.counters.review, value: countBy(documents, 'review') },
    { key: 'approved', label: t.dashboard.counters.approved, value: countBy(documents, 'approved') },
  ];

  const recent = documents.slice(0, 5);

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow={greeting}
        title={user?.displayName ?? t.dashboard.title}
      />

      <div className={styles.body}>
        <section className={styles.counters} aria-label={t.dashboard.title}>
          {counters.map((counter) => (
            <div key={counter.key} className={styles.counter}>
              <div className={`${styles.counterValue} tabular`}>{counter.value}</div>
              <div className={styles.counterLabel}>{counter.label}</div>
            </div>
          ))}
        </section>

        <section className={styles.block}>
          <h2 className={styles.blockTitle}>{t.dashboard.quickTitle}</h2>
          <p className={styles.blockBody}>{t.dashboard.quickBody}</p>

          <ul className={styles.quickList}>
            {templates.map((template) => (
              <li key={template.id}>
                <Link className={styles.quickItem} to={`/create/${template.id}`}>
                  <span className={styles.quickSeries}>{template.series}</span>
                  <span className={styles.quickText}>
                    <span className={styles.quickTitleText}>{template.title}</span>
                    <span className={styles.quickPurpose}>{template.purpose}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {company === null ? null : (
          <section className={styles.block}>
            <h2 className={styles.blockTitle}>{t.company.title}</h2>
            <p className={styles.blockBody}>{t.company.body}</p>

            {company.placeholder === true ? (
              <div className={styles.warn} role="note">
                <div className={styles.warnTitle}>{t.company.placeholderTitle}</div>
                <p className={styles.warnBody}>{t.company.placeholderBody}</p>
              </div>
            ) : null}

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
                value={`${company.directorTitle} — ${company.directorName}`}
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
          </section>
        )}

        <section className={styles.block}>
          <h2 className={styles.blockTitle}>{t.dashboard.recentTitle}</h2>

          {recent.length === 0 ? (
            <p className={styles.blockBody}>{t.dashboard.recentEmpty}</p>
          ) : (
            <ul className={styles.recentList}>
              {recent.map((doc) => (
                <li key={doc.id}>
                  <Link className={styles.recentItem} to={`/documents/${doc.id}`}>
                    <span className={styles.recentTitle}>{doc.title}</span>
                    <StatusStamp status={doc.status} size="sm" />
                    <span className={`${styles.recentDate} tabular`}>
                      {formatShortDate(doc.createdAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function countBy(documents: { status: string }[], status: string): number {
  return documents.filter((d) => d.status === status).length;
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
