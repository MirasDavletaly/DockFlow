# Документы на проверку юристу

Файл собирается командой `npm run legal-review` в папке `web` из самих
шаблонов, поэтому не может с ними разойтись. Руками его не правят.

## Что именно нужно проверить

1. **Ссылку на статью закона.** В ваших приказах она стоит первой строкой
   под темой: «В соответствии со статьей 34 Трудового Кодекса РК от 23 ноября
   2015 г. № 414-V». Там, где ниже написано «ссылки нет», её нужно дать –
   реквизиты норм права не выдумываются.
2. **Казахские падежные окончания после дат, чисел и ФИО.** В ваших же
   приказах для разных дат стоят разные окончания («23.06.2026-нан»,
   «04.09.2026-дан», «02.07.2026-ті»), и выбрать их программно нельзя.
   Где мог, я обошёлся оборотами без окончания.
3. **Формулировки распоряжений** в казахской колонке: «жіберілсін»,
   «ауыстырылсын», «белгіленсін», «бұзылсын», «көтермеленсін»,
   «қолданылсын» – сделаны по образцу ваших «қабылдансын» и «тағайындалсын».
4. **Значения выпадающих списков** – основание расторжения, вид взыскания,
   вид поощрения – пока идут по-русски во всех трёх колонках: своих полей
   под перевод у них нет.

`{поле}` – подстановка: система сама поставит туда ФИО, дату или сумму.

Документов: **23**.

---

## Приказ о приёме на работу

Раздел: Отдел кадров. Идентификатор: `hr-hire-order`. Языки: kk, ru, en.

**Источник текста:** ваш файл, взят буквой в букву.

**Ссылка на статью закона:** есть, проверить.

### Тема приказа

- **Қазақша.** «Жұмысқа қабылдау туралы»
- **Қазақша.** ҚР Еңбек Кодексінің 2015 жылғы 23 қарашадағы № 414-V ҚРЗ 34-бабына сәйкес
- **Русский.** «О приеме на работу»
- **Русский.** В соответствии со статьей 34 Трудового Кодекса РК от 23 ноября 2015 г. № 414-V
- **English.** “Employment order”
- **English.** In accordance with Article 34 of the Labor Code of the Republic of Kazakhstan dated November 23, 2015 No. 414-V

### Распоряжение

**Қазақша**

- {employee:nom}, {contractDate} жылғы № {contractNumber} еңбек шартына сәйкес {startDate} бастап «{position}» ретінде қабылдансын.

**Русский**

- Принять {employee} в качестве «{position}» с {startDate} в соответствии с Трудовым Договором № {contractNumber} от {contractDate} года.

**English**

- To accept {employee} as a “{position}” from {startDate}, in accordance with the Labor Contract No. {contractNumber} dated {contractDate}.

**Қазақша**

- Негіз: {contractDate} жылғы № {contractNumber} Еңбек шарты.

**Русский**

- Основание: Трудовой договор № {contractNumber} от {contractDate} года.

**English**

- Basis: Employment contract No. {contractNumber} dated {contractDate}.

---

## Приказ о предоставлении ежегодного трудового отпуска

Раздел: Отдел кадров. Идентификатор: `hr-vacation-order`. Языки: kk, ru, en.

**Источник текста:** ваш файл, взят буквой в букву.

**Ссылка на статью закона:** есть, проверить.

### Тема приказа

- **Қазақша.** «Жыл сайынғы еңбек демалысын беру туралы»
- **Қазақша.** ҚР 2015 жылғы 23 қарашадағы №414-V Еңбек кодексінің 87-бабының 2-тармағына сәйкес.
- **Русский.** «О предоставлении ежегодного трудового отпуска»
- **Русский.** В соответствии с пунктом 2 статьи 87 Трудового Кодекса РК от 23 ноября 2015 года №414-V.
- **English.** “On annual vacation leave”
- **English.** In accordance with paragraph 2 of Article 87 of the Labor Code of the Republic of Kazakhstan dated November 23, 2015 No. 414-V.

### Распоряжение

**Қазақша**

- 1. {employee} {position} {from} бастап {to} қоса алғанда, {workedFrom} – {workedTo} жұмыс кезеңі үшін ұзақтығы {days} ({daysWords}) күнтізбелік күн жыл сайынғы ақылы еңбек демалысын беру.
- 2. Бухгалтерия Қазақстан Республикасының қолданыстағы заңнамасында белгіленген мерзімде және тәртіппен жұмыс істеген кезеңі үшін демалыс күндерін есептесін.
- 3. Негіздеме: {applicationDate} жылғы {employee:nom}ның жеке мәлімдемесі.

**Русский**

- 1. Предоставить ежегодный оплачиваемый трудовой отпуск {position} {employee} продолжительностью {days} ({daysWords}) календарных дней с {from} по {to} включительно, за период работы с {workedFrom} по {workedTo}.
- 2. Бухгалтерии рассчитать отпускные дни за отработанный период работы в срок и в порядке, установленные действующим законодательством Республики Казахстан.
- 3. Основание: личное заявление {employee} от {applicationDate} года.

**English**

- 1. To provide paid annual leave to the {position} {employee}, for the duration of {days} ({daysWords}) calendar days from {from} to {to} inclusive, for the worked period from {workedFrom} till {workedTo}.
- 2. To Accountant Department – to perform payment for the worked period within the time and according to the procedure stated by the current legislation of the Republic of Kazakhstan.
- 3. Basis: personal statement of {employee} dated {applicationDate}.

---

## Приказ о предоставлении отпуска без сохранения заработной платы

Раздел: Отдел кадров. Идентификатор: `hr-unpaid-leave-order`. Языки: kk, ru, en.

**Источник текста:** ваш файл, взят буквой в букву.

**Ссылка на статью закона:** есть, проверить.

### Тема приказа

- **Қазақша.** «Жалақысы сақталмайтын демалысын беру туралы»
- **Қазақша.** Қазақстан Республикасының 2015 жылғы 23 қарашадағы № 414-V Еңбек кодексінің 87-бабының 5-тармағының 1-тармақшасына сәйкес.
- **Русский.** «О предоставлении отпуска без сохранения заработной платы»
- **Русский.** В соответствии с подпунктом 1, пункта 5 статьи 87 Трудового Кодекса РК от 23 ноября 2015 года №414-V.
- **English.** “On granting unpaid leave”
- **English.** In accordance with subparagraph 1, paragraph 5 of Article 87 of the Labor Code of the Republic of Kazakhstan dated November 23, 2015 No. 414-V.

### Распоряжение

**Қазақша**

- 1. {position} {employee} {from} бастап {days} ({daysWords}) күнтізбелік күн мерзімге ақысыз демалыс беру.
- Негіздеме: {employee:nom}ның {applicationDate} жылғы жеке өтініші.

**Русский**

- 1. Предоставить отпуск без сохранения заработной платы {position} {employee} с {from} сроком на {days} ({daysWords}) календарный день.
- Основание: личное заявление {employee} от {applicationDate} года.

**English**

- 1. To grant unpaid leave to the {position} {employee} from {from}, for a period of {days} ({daysWords}) calendar day(s).
- Basis: Personal request of {employee} dated {applicationDate}.

---

## Приказ о назначении директора

Раздел: Корпоративное управление. Идентификатор: `corporate-director-appointment`. Языки: kk, ru, en.

**Источник текста:** ваш файл, взят буквой в букву.

**Ссылка на статью закона:** есть, проверить.

### Тема приказа

- **Қазақша.** «Директорды тағайындау туралы»
- **Қазақша.** {@company.legalNameKk} қатысушыларының {decisionDate} шешіміне сәйкес.
- **Русский.** «О назначении Директора»
- **Русский.** На основании решения участников {@company.name} от {decisionDate} года.
- **English.** “On the appointment of the Director”
- **English.** Based on the decision of the participants of {@company.legalNameEn} dated {decisionDate}.

### Распоряжение

**Қазақша**

- {employee:nom} {startDate} бастап «{position}» лауазымына барлық коммерциялық, бухгалтерлік және банктік құжаттарға бірінші қол қою құқығымен тағайындалсын.

**Русский**

- Назначить {employee} на должность «{position}» с {startDate} с правом первой подписи на всех коммерческих, бухгалтерских и банковских документах.

**English**

- To appoint {employee} to the position of “{position}” from {startDate}, with the right of first signature on all commercial, accounting and banking documents.

---

## Доверенность

Раздел: Юридический отдел. Идентификатор: `legal-power-single`. Языки: ru, en.

**Источник текста:** ваш файл, взят буквой в букву.

Доверенность: выходит на русском и английском, казахской колонки нет.

---

## Приказ о направлении в командировку

Раздел: Отдел кадров. Идентификатор: `hr-trip-order`. Языки: kk, ru, en.

**Источник текста:** написан по образцу ваших приказов. Проверить полностью.

**Ссылка на статью закона:** есть, проверить.

### Тема приказа

- **Қазақша.** «Іссапарға жіберу туралы»
- **Қазақша.** ҚР 2015 жылғы 23 қарашадағы №414-V Еңбек кодексінің 127-бабына сәйкес.
- **Русский.** «О направлении в командировку»
- **Русский.** В соответствии со статьей 127 Трудового Кодекса РК от 23 ноября 2015 года №414-V.
- **English.** “On business trip assignment”
- **English.** In accordance with Article 127 of the Labor Code of the Republic of Kazakhstan dated November 23, 2015 No. 414-V.

### Распоряжение

**Қазақша**

- 1. {employee:nom} {position} {from} бастап {to} қоса алғанда {days} ({daysWords}) күнтізбелік күн мерзімге {city} қаласына, {organization}, іссапарға жіберілсін.
- 2. Іссапардың мақсаты: {purpose}.
- 3. Бухгалтерия іссапар шығыстарына аванс шығу күніне дейін берсін.
- 4. Қызметкер оралғаннан кейін белгіленген мерзімде аванстық есеп тапсырсын.
- Негіздеме: бөлім басшысының қызметтік жазбасы.

**Русский**

- 1. Направить {employee}, {position}, в командировку в г. {city}, {organization}, сроком на {days} ({daysWords}) календарных дней с {from} по {to}.
- 2. Цель командировки: {purpose}.
- 3. Бухгалтерии выдать аванс на командировочные расходы до даты выезда.
- 4. Работнику представить авансовый отчёт в установленный срок после возвращения.
- Основание: служебная записка руководителя подразделения.

**English**

- 1. To send {employee}, {position}, on a business trip to {city}, {organization}, for {days} ({daysWords}) calendar days from {from} to {to}.
- 2. Purpose of the trip: {purpose}.
- 3. To Accountant Department – to issue an advance for travel expenses before the departure date.
- 4. The employee shall submit an expense report within the established period after return.
- Basis: memorandum of the head of the department.

---

## Приказ о переводе на другую должность

Раздел: Отдел кадров. Идентификатор: `hr-transfer-order`. Языки: kk, ru, en.

**Источник текста:** написан по образцу ваших приказов. Проверить полностью.

**Ссылка на статью закона:** есть, проверить.

### Тема приказа

- **Қазақша.** «Басқа лауазымға ауыстыру туралы»
- **Қазақша.** ҚР 2015 жылғы 23 қарашадағы №414-V Еңбек кодексінің 45-бабына сәйкес.
- **Русский.** «О переводе на другую должность»
- **Русский.** В соответствии со статьей 45 Трудового Кодекса РК от 23 ноября 2015 года №414-V.
- **English.** “On transfer to another position”
- **English.** In accordance with Article 45 of the Labor Code of the Republic of Kazakhstan dated November 23, 2015 No. 414-V.

### Распоряжение

**Қазақша**

- 1. {employee:nom} {transferDate} бастап «{positionFrom}» лауазымынан «{position}» лауазымына «{unit}» бөліміне ауыстырылсын.
- 2. Ауыстырылған күннен бастап айына {salary} теңге лауазымдық жалақы белгіленсін.
- 3. Кадр бөлімі ауыстыру туралы жазбаны еңбек кітапшасына және жеке карточкасына енгізсін, бухгалтерия жаңа жалақы бойынша есептесін.
- Негіздеме: {agreementDate} жылғы № {agreementNumber} еңбек шартына қосымша келісім.

**Русский**

- 1. Перевести {employee} с должности «{positionFrom}» на должность «{position}» в подразделение «{unit}» с {transferDate}.
- 2. Установить должностной оклад в размере {salary} тенге в месяц с даты перевода.
- 3. Отделу кадров внести запись о переводе в трудовую книжку и личную карточку работника, бухгалтерии – производить начисление по новому окладу.
- Основание: дополнительное соглашение к трудовому договору от {agreementDate} № {agreementNumber}.

**English**

- 1. To transfer {employee} from the position of “{positionFrom}” to the position of “{position}” in the “{unit}” unit from {transferDate}.
- 2. To set the official salary of {salary} tenge per month from the date of transfer.
- 3. To HR Department – to enter the transfer record in the employment record book and the personal card of the employee; to Accountant Department – to calculate payments at the new salary.
- Basis: supplementary agreement to the employment contract dated {agreementDate} No. {agreementNumber}.

---

## Приказ об изменении оклада

Раздел: Отдел кадров. Идентификатор: `hr-salary-order`. Языки: kk, ru, en.

**Источник текста:** написан по образцу ваших приказов. Проверить полностью.

**Ссылка на статью закона:** есть, проверить.

### Тема приказа

- **Қазақша.** «Лауазымдық жалақыны өзгерту туралы»
- **Қазақша.** ҚР 2015 жылғы 23 қарашадағы №414-V Еңбек кодексінің 46-бабына сәйкес.
- **Русский.** «Об изменении должностного оклада»
- **Русский.** В соответствии со статьей 46 Трудового Кодекса РК от 23 ноября 2015 года №414-V.
- **English.** “On change of the official salary”
- **English.** In accordance with Article 46 of the Labor Code of the Republic of Kazakhstan dated November 23, 2015 No. 414-V.

### Распоряжение

**Қазақша**

- 1. {employee:nom} {position} {fromDate} бастап айына {salary} теңге лауазымдық жалақы белгіленсін.
- 2. Бухгалтерия осы бұйрықты ескере отырып жалақы есептесін.
- 3. Кадр бөлімі штат кестесіне және қызметкердің жеке карточкасына өзгеріс енгізсін.
- Негіздеме: {agreementDate} жылғы № {agreementNumber} еңбек шартына қосымша келісім.

**Русский**

- 1. Установить {employee}, {position}, должностной оклад в размере {salary} тенге в месяц с {fromDate}.
- 2. Бухгалтерии производить начисление заработной платы с учётом настоящего приказа.
- 3. Отделу кадров внести изменение в штатное расписание и личную карточку работника.
- Основание: дополнительное соглашение к трудовому договору от {agreementDate} № {agreementNumber}.

**English**

- 1. To set for {employee}, {position}, the official salary of {salary} tenge per month from {fromDate}.
- 2. To Accountant Department – to calculate wages taking this order into account.
- 3. To HR Department – to amend the staffing table and the personal card of the employee.
- Basis: supplementary agreement to the employment contract dated {agreementDate} No. {agreementNumber}.

---

## Приказ о расторжении трудового договора

Раздел: Отдел кадров. Идентификатор: `hr-dismissal-order`. Языки: kk, ru, en.

**Источник текста:** написан по образцу ваших приказов. Проверить полностью.

**Ссылка на статью закона:** есть, проверить.

### Тема приказа

- **Қазақша.** «Еңбек шартын бұзу туралы»
- **Қазақша.** ҚР 2015 жылғы 23 қарашадағы №414-V Еңбек кодексінің {reason}-бабына сәйкес.
- **Русский.** «О расторжении трудового договора»
- **Русский.** В соответствии со статьей {reason} Трудового Кодекса РК от 23 ноября 2015 года №414-V.
- **English.** “On termination of the employment contract”
- **English.** In accordance with Article {reason} of the Labor Code of the Republic of Kazakhstan dated November 23, 2015 No. 414-V.

### Распоряжение

**Қазақша**

- 1. «{unit}» бөлімінің {position} {employee:nom} ({reason}) еңбек шарты бұзылсын. Соңғы жұмыс күні – {dismissDate}.
- 2. Бухгалтерия пайдаланылмаған еңбек демалысының {compensationDays} күнтізбелік күні үшін өтемақыны қоса, түпкілікті есеп айырылсын.
- 3. Кадр бөлімі жұмыстан шығарылған күні қызметкерге еңбек кітапшасын және жалақы туралы анықтаманы берсін.
- Негіздеме: {contractDate} жылғы № {contractNumber} еңбек шарты.

**Русский**

- 1. Расторгнуть трудовой договор с {employee}, {position} подразделения «{unit}», {reason}. Последний рабочий день – {dismissDate}.
- 2. Бухгалтерии произвести окончательный расчёт, включая компенсацию за {compensationDays} календарных дней неиспользованного трудового отпуска.
- 3. Отделу кадров выдать работнику трудовую книжку и справку о заработной плате в день увольнения.
- Основание: трудовой договор от {contractDate} № {contractNumber}.

**English**

- 1. To terminate the employment contract with {employee}, {position} of the “{unit}” unit, {reason}. The last working day is {dismissDate}.
- 2. To Accountant Department – to make the final settlement, including {compensationDays} calendar days of compensation for the unused labour leave.
- 3. To HR Department – to hand the employee the employment record book and the salary certificate on the day of dismissal.
- Basis: employment contract dated {contractDate} No. {contractNumber}.

---

## Приказ об отзыве из отпуска

Раздел: Отдел кадров. Идентификатор: `hr-vacation-recall-order`. Языки: kk, ru, en.

**Источник текста:** написан по образцу ваших приказов. Проверить полностью.

**Ссылка на статью закона: НЕТ.** Нужно дать – её не присылали.

### Тема приказа

- **Қазақша.** «Еңбек демалысынан кері шақыру туралы»
- **Русский.** «Об отзыве из трудового отпуска»
- **English.** “On recall from labour leave”

### Распоряжение

**Қазақша**

- 1. {employee:nom} {position} {recallDate} бастап жыл сайынғы ақылы еңбек демалысынан кері шақырылсын. Себебі: {reason}.
- 2. Демалыстың пайдаланылмаған {remainingDays} ({remainingDaysWords}) күнтізбелік күні қызметкермен келісілген мерзімде берілсін.
- 3. Бухгалтерия демалыс ақысын қайта есептесін.
- Негіздеме: қызметкердің {consentDate} жылғы жазбаша келісімі.

**Русский**

- 1. Отозвать {employee}, {position}, из ежегодного оплачиваемого трудового отпуска с {recallDate}. Причина: {reason}.
- 2. Неиспользованную часть отпуска продолжительностью {remainingDays} ({remainingDaysWords}) календарных дней предоставить в согласованный с работником срок.
- 3. Бухгалтерии произвести перерасчёт отпускных выплат.
- Основание: письменное согласие работника от {consentDate}.

**English**

- 1. To recall {employee}, {position}, from the annual paid labour leave from {recallDate}. Reason: {reason}.
- 2. The unused part of the leave of {remainingDays} ({remainingDaysWords}) calendar days shall be granted at a time agreed with the employee.
- 3. To Accountant Department – to recalculate the leave payments.
- Basis: written consent of the employee dated {consentDate}.

---

## Приказ о поощрении (премировании)

Раздел: Отдел кадров. Идентификатор: `hr-bonus-order`. Языки: kk, ru, en.

**Источник текста:** написан по образцу ваших приказов. Проверить полностью.

**Ссылка на статью закона: НЕТ.** Нужно дать – её не присылали.

### Тема приказа

- **Қазақша.** «Қызметкерді көтермелеу туралы»
- **Русский.** «О поощрении работника»
- **English.** “On the incentive award to the employee”

### Распоряжение

**Қазақша**

- 1. {position} {employee:nom} көтермеленсін. Көтермелеу түрі: {kind}. Себебі: {reason}.
- 2. Бухгалтерия {amount} теңге сыйақыны ең жақын жалақы төлемімен бірге төлесін.
- 3. Кадр бөлімі көтермелеу туралы мәліметті қызметкердің жеке карточкасына енгізсін.
- Негіздеме: бөлім басшысының {memoDate} жылғы ұсынысы.

**Русский**

- 1. Поощрить {employee}, {position}. Вид поощрения: {kind}. За {reason}.
- 2. Бухгалтерии выплатить премию в размере {amount} тенге в ближайшую выплату заработной платы.
- 3. Отделу кадров внести сведения о поощрении в личную карточку работника.
- Основание: представление руководителя подразделения от {memoDate}.

**English**

- 1. To award {employee}, {position}. Type of award: {kind}. For {reason}.
- 2. To Accountant Department – to pay the bonus of {amount} tenge together with the nearest salary payment.
- 3. To HR Department – to enter the award record in the personal card of the employee.
- Basis: proposal of the head of the department dated {memoDate}.

---

## Приказ о применении дисциплинарного взыскания

Раздел: Отдел кадров. Идентификатор: `hr-discipline-order`. Языки: kk, ru, en.

**Источник текста:** написан по образцу ваших приказов. Проверить полностью.

**Ссылка на статью закона:** есть, проверить.

### Тема приказа

- **Қазақша.** «Тәртіптік жаза қолдану туралы»
- **Қазақша.** ҚР 2015 жылғы 23 қарашадағы №414-V Еңбек кодексінің 64-бабына сәйкес.
- **Русский.** «О применении дисциплинарного взыскания»
- **Русский.** В соответствии со статьей 64 Трудового Кодекса РК от 23 ноября 2015 года №414-V.
- **English.** “On imposing a disciplinary sanction”
- **English.** In accordance with Article 64 of the Labor Code of the Republic of Kazakhstan dated November 23, 2015 No. 414-V.

### Распоряжение

**Қазақша**

- 1. {position} {employee:nom} {violationDate} жіберген тәртіп бұзушылығы үшін «{penalty}» түріндегі тәртіптік жаза қолданылсын: {violation}.
- 2. Кадр бөлімі қызметкерді осы бұйрықпен қол қойғыза отырып таныстырсын және бұйрықты жеке іс материалдарына тіркесін.
- Негіздеме: қызметкердің {explanationDate} жылғы түсініктемесі, № {actNumber} акт.

**Русский**

- 1. Применить к {employee}, {position}, дисциплинарное взыскание в виде «{penalty}» за нарушение, допущенное {violationDate}: {violation}.
- 2. Отделу кадров ознакомить работника с настоящим приказом под подпись и приобщить приказ к материалам личного дела.
- Основание: объяснительная работника от {explanationDate}, акт № {actNumber}.

**English**

- 1. To impose on {employee}, {position}, a disciplinary sanction in the form of “{penalty}” for the violation committed on {violationDate}: {violation}.
- 2. To HR Department – to acquaint the employee with this order against signature and to attach the order to the personal file.
- Basis: explanatory note of the employee dated {explanationDate}, act No. {actNumber}.

---

## Справка с места работы

Раздел: Отдел кадров. Идентификатор: `hr-work-certificate`. Языки: kk, ru, en.

**Источник текста:** написан по образцу ваших приказов. Проверить полностью.

**Ссылка на статью закона:** есть, проверить.

### Тема приказа

- **Қазақша.** {employee:nom} {@company.legalNameKk} ұйымында «{unit}» бөлімінде «{position}» лауазымында {startDate} бастап осы уақытқа дейін жұмыс істейтіні туралы осы анықтама берілді.
- **Қазақша.** Анықтама {destination} үшін берілді.
- **Русский.** Настоящая справка выдана в том, что {employee:nom} работает в организации {@company.legalName} в должности «{position}» в подразделении «{unit}» с {startDate} по настоящее время.
- **Русский.** Справка выдана для предъявления: {destination}.
- **English.** This certificate is issued to confirm that {employee} works at {@company.legalNameEn} in the position of “{position}” in the “{unit}” unit from {startDate} to the present time.
- **English.** The certificate is issued for submission to: {destination}.

### Распоряжение

---

## Приказ об утверждении штатного расписания

Раздел: Отдел кадров. Идентификатор: `hr-staffing-order`. Языки: kk, ru, en.

**Источник текста:** написан по образцу ваших приказов. Проверить полностью.

**Ссылка на статью закона: НЕТ.** Нужно дать – её не присылали.

### Тема приказа

- **Қазақша.** «Штат кестесін бекіту туралы»
- **Русский.** «Об утверждении штатного расписания»
- **English.** “On approval of the staffing table”

### Распоряжение

**Қазақша**

- 1. {headcount} штат бірлігі және айлық еңбекақы қоры {payroll} теңге болатын штат кестесі бекітілсін және {effectiveDate} бастап қолданысқа енгізілсін.
- 2. Кадр бөлімі бөлім басшыларын осы бұйрықпен таныстырсын.
- 3. Бұйрықтың орындалуын бақылауды өзіме қалдырамын.
- Негіздеме: осы бұйрыққа № 1 қосымша.

**Русский**

- 1. Утвердить штатное расписание в количестве {headcount} штатных единиц с месячным фондом оплаты труда {payroll} тенге и ввести его в действие с {effectiveDate}.
- 2. Отделу кадров ознакомить руководителей подразделений с настоящим приказом.
- 3. Контроль за исполнением настоящего приказа оставляю за собой.
- Основание: приложение № 1 к настоящему приказу.

**English**

- 1. To approve the staffing table of {headcount} staff units with a monthly payroll of {payroll} tenge and to put it into effect from {effectiveDate}.
- 2. To HR Department – to acquaint the heads of departments with this order.
- 3. I reserve the control over the execution of this order.
- Basis: Annex No. 1 to this order.

---

## Приказ об утверждении графика отпусков

Раздел: Отдел кадров. Идентификатор: `hr-vacation-schedule-order`. Языки: kk, ru, en.

**Источник текста:** написан по образцу ваших приказов. Проверить полностью.

**Ссылка на статью закона: НЕТ.** Нужно дать – её не присылали.

### Тема приказа

- **Қазақша.** «Демалыс кестесін бекіту туралы»
- **Русский.** «Об утверждении графика отпусков»
- **English.** “On approval of the leave schedule”

### Распоряжение

**Қазақша**

- 1. {year} жылға арналған қызметкерлердің жыл сайынғы ақылы еңбек демалыстарының кестесі бекітілсін.
- 2. Кадр бөлімі қызметкерлерді кестемен {noticeDate} мерзіміне дейін қол қойғыза отырып таныстырсын.
- 3. Бөлім басшылары кестенің сақталуын қамтамасыз етсін.
- Негіздеме: осы бұйрыққа № 1 қосымша.

**Русский**

- 1. Утвердить график ежегодных оплачиваемых трудовых отпусков работников на {year} год.
- 2. Отделу кадров ознакомить работников с графиком под подпись в срок до {noticeDate}.
- 3. Руководителям подразделений обеспечить соблюдение графика.
- Основание: приложение № 1 к настоящему приказу.

**English**

- 1. To approve the schedule of annual paid labour leaves of the employees for {year}.
- 2. To HR Department – to acquaint the employees with the schedule against signature by {noticeDate}.
- 3. To the heads of departments – to ensure that the schedule is observed.
- Basis: Annex No. 1 to this order.

---

## Приказ о проведении аттестации работников

Раздел: Отдел кадров. Идентификатор: `hr-attestation-order`. Языки: kk, ru, en.

**Источник текста:** написан по образцу ваших приказов. Проверить полностью.

**Ссылка на статью закона: НЕТ.** Нужно дать – её не присылали.

### Тема приказа

- **Қазақша.** «Қызметкерлерді аттестаттауды өткізу туралы»
- **Русский.** «О проведении аттестации работников»
- **English.** “On conducting the certification of employees”

### Распоряжение

**Қазақша**

- 1. «{unit}» бөлімінің қызметкерлерін аттестаттау {from} бастап {to} аралығында өткізілсін.
- 2. Аттестаттау комиссиясының төрағасы болып {employee:nom} тағайындалсын. Комиссия мүшелері: {members}.
- 3. Кадр бөлімі қызметкерлерді осы бұйрықпен таныстырсын.
- 4. Бұйрықтың орындалуын бақылауды өзіме қалдырамын.

**Русский**

- 1. Провести аттестацию работников подразделения «{unit}» в период с {from} по {to}.
- 2. Назначить председателем аттестационной комиссии {employee}. Члены комиссии: {members}.
- 3. Отделу кадров ознакомить работников с настоящим приказом.
- 4. Контроль за исполнением настоящего приказа оставляю за собой.

**English**

- 1. To conduct the certification of the employees of the “{unit}” unit from {from} to {to}.
- 2. To appoint {employee} as the chairperson of the certification commission. Members: {members}.
- 3. To HR Department – to acquaint the employees with this order.
- 4. I reserve the control over the execution of this order.

---

## Приказ об отзыве доверенности

Раздел: Юридический отдел. Идентификатор: `legal-power-revoke-order`. Языки: kk, ru, en.

**Источник текста:** написан по образцу ваших приказов. Проверить полностью.

**Ссылка на статью закона: НЕТ.** Нужно дать – её не присылали.

### Тема приказа

- **Қазақша.** «Сенімхатты кері қайтарып алу туралы»
- **Русский.** «Об отзыве доверенности»
- **English.** “On revocation of the power of attorney”

### Распоряжение

**Қазақша**

- 1. {employee:nom} атына {powerDate} жылғы № {powerNumber} берілген сенімхаттың күші {revokeDate} бастап жойылсын.
- 2. Заңгер сенімхаттың кері қайтарып алынғаны туралы мүдделі тұлғаларды хабардар етсін.
- 3. Сенімхаттың түпнұсқасы қайтарылсын.
- 4. Бұйрықтың орындалуын бақылауды өзіме қалдырамын.

**Русский**

- 1. Отозвать с {revokeDate} доверенность № {powerNumber} от {powerDate}, выданную на имя {employee}.
- 2. Юристу уведомить заинтересованных лиц об отзыве доверенности.
- 3. Обеспечить возврат оригинала доверенности.
- 4. Контроль за исполнением настоящего приказа оставляю за собой.

**English**

- 1. To revoke from {revokeDate} the power of attorney No. {powerNumber} dated {powerDate}, issued in the name of {employee}.
- 2. To the lawyer – to notify the interested parties of the revocation.
- 3. To ensure the return of the original power of attorney.
- 4. I reserve the control over the execution of this order.

---

## Приказ о создании комиссии

Раздел: Корпоративное управление. Идентификатор: `corporate-commission-order`. Языки: kk, ru, en.

**Источник текста:** написан по образцу ваших приказов. Проверить полностью.

**Ссылка на статью закона: НЕТ.** Нужно дать – её не присылали.

### Тема приказа

- **Қазақша.** «Комиссия құру туралы»
- **Русский.** «О создании комиссии»
- **English.** “On establishing a commission”

### Распоряжение

**Қазақша**

- 1. {subject} комиссиясы құрылсын.
- 2. Комиссия төрағасы болып {employee:nom} тағайындалсын. Комиссия мүшелері: {members}.
- 3. Комиссия жұмысының нәтижелерін {reportDate} мерзіміне дейін ұсынсын.
- 4. Бұйрықтың орындалуын бақылауды өзіме қалдырамын.

**Русский**

- 1. Создать комиссию {subject}.
- 2. Назначить председателем комиссии {employee}. Члены комиссии: {members}.
- 3. Комиссии представить результаты работы в срок до {reportDate}.
- 4. Контроль за исполнением настоящего приказа оставляю за собой.

**English**

- 1. To establish a commission {subject}.
- 2. To appoint {employee} as the chairperson of the commission. Members: {members}.
- 3. The commission shall submit the results of its work by {reportDate}.
- 4. I reserve the control over the execution of this order.

---

## Приказ о праве подписи документов

Раздел: Корпоративное управление. Идентификатор: `corporate-signature-right-order`. Языки: kk, ru, en.

**Источник текста:** написан по образцу ваших приказов. Проверить полностью.

**Ссылка на статью закона: НЕТ.** Нужно дать – её не присылали.

### Тема приказа

- **Қазақша.** «Құжаттарға қол қою құқығы туралы»
- **Русский.** «О праве подписи документов»
- **English.** “On the right to sign documents”

### Распоряжение

**Қазақша**

- 1. {employee:nom}, {position}, {fromDate} бастап {untilDate} аралығында мынадай құжаттарға қол қою құқығы берілсін: {scope}.
- 2. Қол қою үлгісі осы бұйрыққа қоса беріледі.
- 3. Бұйрықтың орындалуын бақылауды өзіме қалдырамын.

**Русский**

- 1. Предоставить {employee}, {position}, право подписи следующих документов: {scope}, в период с {fromDate} по {untilDate}.
- 2. Образец подписи прилагается к настоящему приказу.
- 3. Контроль за исполнением настоящего приказа оставляю за собой.

**English**

- 1. To grant {employee}, {position}, the right to sign the following documents: {scope}, from {fromDate} to {untilDate}.
- 2. The specimen signature is attached to this order.
- 3. I reserve the control over the execution of this order.

---

## Приказ об учётной политике

Раздел: Финансы и бухгалтерия. Идентификатор: `finance-accounting-policy-order`. Языки: kk, ru, en.

**Источник текста:** написан по образцу ваших приказов. Проверить полностью.

**Ссылка на статью закона: НЕТ.** Нужно дать – её не присылали.

### Тема приказа

- **Қазақша.** «Есеп саясатын бекіту туралы»
- **Русский.** «Об утверждении учётной политики»
- **English.** “On approval of the accounting policy”

### Распоряжение

**Қазақша**

- 1. {year} жылға арналған есеп саясаты бекітілсін және {effectiveDate} бастап қолданысқа енгізілсін.
- 2. Бас бухгалтер есеп саясатының сақталуын қамтамасыз етсін.
- 3. Бұйрықтың орындалуын бақылауды өзіме қалдырамын.
- Негіздеме: осы бұйрыққа № 1 қосымша.

**Русский**

- 1. Утвердить учётную политику на {year} год и ввести её в действие с {effectiveDate}.
- 2. Главному бухгалтеру обеспечить соблюдение учётной политики.
- 3. Контроль за исполнением настоящего приказа оставляю за собой.
- Основание: приложение № 1 к настоящему приказу.

**English**

- 1. To approve the accounting policy for {year} and to put it into effect from {effectiveDate}.
- 2. To the chief accountant – to ensure that the accounting policy is observed.
- 3. I reserve the control over the execution of this order.
- Basis: Annex No. 1 to this order.

---

## Приказ о проведении инвентаризации

Раздел: Финансы и бухгалтерия. Идентификатор: `finance-inventory-order`. Языки: kk, ru, en.

**Источник текста:** написан по образцу ваших приказов. Проверить полностью.

**Ссылка на статью закона: НЕТ.** Нужно дать – её не присылали.

### Тема приказа

- **Қазақша.** «Түгендеу жүргізу туралы»
- **Русский.** «О проведении инвентаризации»
- **English.** “On conducting an inventory count”

### Распоряжение

**Қазақша**

- 1. {scope} түгендеуі {from} бастап {to} аралығында жүргізілсін.
- 2. Түгендеу комиссиясының төрағасы болып {employee:nom} тағайындалсын. Комиссия мүшелері: {members}.
- 3. Комиссия түгендеу нәтижелері бойынша акт жасасын.
- 4. Бұйрықтың орындалуын бақылауды өзіме қалдырамын.

**Русский**

- 1. Провести инвентаризацию {scope} в период с {from} по {to}.
- 2. Назначить председателем инвентаризационной комиссии {employee}. Члены комиссии: {members}.
- 3. Комиссии составить акт по результатам инвентаризации.
- 4. Контроль за исполнением настоящего приказа оставляю за собой.

**English**

- 1. To conduct an inventory count of {scope} from {from} to {to}.
- 2. To appoint {employee} as the chairperson of the inventory commission. Members: {members}.
- 3. The commission shall draw up an act on the results of the count.
- 4. I reserve the control over the execution of this order.

---

## Приказ об открытии проекта

Раздел: Проекты. Идентификатор: `projects-open-order`. Языки: kk, ru, en.

**Источник текста:** написан по образцу ваших приказов. Проверить полностью.

**Ссылка на статью закона: НЕТ.** Нужно дать – её не присылали.

### Тема приказа

- **Қазақша.** «Жобаны ашу туралы»
- **Русский.** «Об открытии проекта»
- **English.** “On the opening of the project”

### Распоряжение

**Қазақша**

- 1. «{project}» жобасы {from} бастап {to} аралығында ашылсын. Жоба бюджеті – {budget} теңге.
- 2. Жоба жетекшісі болып {employee:nom} тағайындалсын.
- 3. Жоба жетекшісі жоба жарғысын әзірлесін.
- 4. Бұйрықтың орындалуын бақылауды өзіме қалдырамын.

**Русский**

- 1. Открыть проект «{project}» со сроком выполнения с {from} по {to}. Бюджет проекта – {budget} тенге.
- 2. Назначить руководителем проекта {employee}.
- 3. Руководителю проекта разработать устав проекта.
- 4. Контроль за исполнением настоящего приказа оставляю за собой.

**English**

- 1. To open the project “{project}” with the term from {from} to {to}. The project budget is {budget} tenge.
- 2. To appoint {employee} as the project manager.
- 3. The project manager shall develop the project charter.
- 4. I reserve the control over the execution of this order.

---

## Приказ о назначении ответственного за охрану труда

Раздел: Охрана труда и экология. Идентификатор: `hse-safety-officer-order`. Языки: kk, ru, en.

**Источник текста:** написан по образцу ваших приказов. Проверить полностью.

**Ссылка на статью закона: НЕТ.** Нужно дать – её не присылали.

### Тема приказа

- **Қазақша.** «Еңбекті қорғау жөніндегі жауапты тұлғаны тағайындау туралы»
- **Русский.** «О назначении ответственного за охрану труда»
- **English.** “On the appointment of the occupational safety officer”

### Распоряжение

**Қазақша**

- 1. {employee:nom}, {position}, {fromDate} бастап еңбекті қорғау жөніндегі жауапты тұлға болып тағайындалсын.
- 2. Жауапты тұлға нұсқамалардың өткізілуін және еңбекті қорғау журналдарының жүргізілуін қамтамасыз етсін.
- 3. Бұйрықтың орындалуын бақылауды өзіме қалдырамын.

**Русский**

- 1. Назначить {employee}, {position}, ответственным за охрану труда с {fromDate}.
- 2. Ответственному обеспечить проведение инструктажей и ведение журналов по охране труда.
- 3. Контроль за исполнением настоящего приказа оставляю за собой.

**English**

- 1. To appoint {employee}, {position}, as the person responsible for occupational safety from {fromDate}.
- 2. The responsible person shall ensure that briefings are held and that the occupational safety logs are kept.
- 3. I reserve the control over the execution of this order.
