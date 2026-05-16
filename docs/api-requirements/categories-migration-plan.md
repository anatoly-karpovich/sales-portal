# План миграции категорий на отдельные документы MongoDB (`parentId + ancestors/path + cache`)

## 1. Цель

Перейти от текущего singleton-дерева `CategoryTree` (весь граф в одном документе) к модели:

- одна категория = один документ в коллекции `categories`;
- связи: `parentId`, `ancestors`;
- денормализация для UI/каталога: `path`/`pathSlugs`;
- быстрый read через кэш дерева/flat-представления.

Ожидаемый результат:

- лучшее горизонтальное масштабирование write/read;
- отсутствие переписывания большого дерева при локальных изменениях;
- безопасная база для storefront-каталога.

---

## 2. Целевая схема данных

## 2.1 Коллекция `categories`

```ts
{
  _id: ObjectId,
  name: string,
  slug: string, // unique, case-insensitive
  description?: string,
  imageUrl?: string,

  parentId: ObjectId | null,
  rootId: ObjectId,             // корневой узел раздела
  depth: number,                // 0 = root
  ancestors: ObjectId[],        // от root до parent
  path: { _id: ObjectId, name: string, slug: string }[], // от root до self
  pathSlugs: string[],          // для быстрого поиска/фильтра

  childrenCount: number,        // direct children
  isLeaf: boolean,              // childrenCount === 0

  directProductsCount: number,  // продукты с categoryId = _id
  subtreeProductsCount: number, // продукты в subtree (опционально: materialized, иначе вычислять)

  createdOn: Date,
  updatedOn: Date
}
```

## 2.2 Коллекция метаданных `category_tree_meta` (опционально)

```ts
{
  _id: "global",
  version: number,         // bump при любых мутациях дерева
  rebuiltOn: Date
}
```

---

## 3. Индексы

Минимальный набор:

- `slugLower` unique (или collation+unique на `slug`);
- `parentId`;
- `rootId`;
- `ancestors`;
- `isLeaf`;
- `pathSlugs` (multikey, для поиска по пути);
- `updatedOn`.

Для продуктовых guard’ов:

- убедиться в индексах на `products.categoryId` и `products.rootCategoryId` (уже есть в доменной логике).

---

## 4. Кэш-стратегия

## 4.1 Что кэшируем

- `categories:tree:v{version}` — nested дерево для `GET /categories/tree`;
- `categories:flat:v{version}` — плоский список для `GET /categories/flat`;
- `categories:workspace:v{version}` — combined payload для `GET /categories`.

## 4.2 Инвалидация

- на любой мутации категорий (`create`, `patch`, `move`, `delete`) увеличить `version`;
- новые чтения берут новый ключ, старые ключи истекают по TTL.

## 4.3 TTL/прогрев

- TTL 5–30 минут;
- lazy warm-up на первом запросе;
- optional background prewarm после мутации.

---

## 5. Фазы миграции

## Фаза 0. Подготовка

- добавить feature flag’и:
  - `CATEGORIES_READ_SOURCE=legacy|new|dual`
  - `CATEGORIES_WRITE_MODE=legacy|dual|new`
- добавить метрики:
  - latency `GET /categories*`;
  - cache hit/miss;
  - ошибки мутаций.

## Фаза 1. Новая модель и DAL

- добавить `categories` model/repository;
- реализовать операции чтения/записи поверх новой модели;
- пока не подключать к API как primary source.

## Фаза 2. Backfill (one-time)

- скрипт миграции:
  - обойти singleton `CategoryTree.nodes` DFS;
  - вставить документы в `categories` с корректными `parentId/ancestors/path/depth/rootId`;
  - заполнить `childrenCount/isLeaf`;
  - посчитать `directProductsCount` по `products.categoryId`;
  - посчитать `subtreeProductsCount` (или отложить, если решено вычислять на чтении).

Технически:

- запуск как idempotent job (`upsert` по `_id` из legacy дерева);
- dry-run режим;
- отчет по количеству узлов/расхождений.

## Фаза 3. Валидация консистентности

- сравнить legacy vs new:
  - количество узлов;
  - уникальность slug;
  - parent/root/path соответствие;
  - leaf/non-leaf;
  - direct/subtree counts.
- ввести fail-fast threshold (если есть расхождения, cutover запрещен).

## Фаза 4. Dual-write

- мутации API пишут в legacy + new (в транзакции, где возможно);
- при расхождении писать в error-лог/alert, но отвечать клиенту по текущему SLA.

Важно:

- Mongo multi-document transactions требуют replica set.
- Если транзакции недоступны: outbox + retry worker для eventual consistency.

## Фаза 5. Dual-read (shadow)

- `GET /categories*` продолжает отдавать legacy, но параллельно читает new и сравнивает payload (без влияния на ответ);
- логировать diff-статистику.

## Фаза 6. Cutover read

- переключить `CATEGORIES_READ_SOURCE=new`;
- legacy держать как fallback (`dual`/`legacy`) до стабилизации.

## Фаза 7. Cutover write

- переключить `CATEGORIES_WRITE_MODE=new`;
- legacy обновления остановить;
- оставить emergency fallback window.

## Фаза 8. Очистка legacy

- удалить/архивировать код legacy `CategoryTree`;
- freeze/архив документа в отдельную backup-коллекцию;
- убрать feature flags после стабилизации.

---

## 6. Правила move/create/delete в новой модели

- `create child` запрещен, если `parent.directProductsCount > 0`;
- `move under target` запрещен, если `target.directProductsCount > 0`;
- `delete` запрещен, если `childrenCount > 0` или есть продукты по `categoryId/rootCategoryId`;
- `move` запрещен в себя и в собственное поддерево.

---

## 7. Обновление API без breaking changes

- сохранить текущие endpoint’ы и envelope;
- сохранить поля `productsCount` (subtree);
- добавить `directProductsCount` в tree DTO;
- для фронта не менять контракт мутаций (`parentId`, `targetParentId`).

---

## 8. Риски и смягчение

1. Расхождение legacy/new при dual-write  
   Смягчение: транзакция или outbox+retry, алерты на diff.

2. Просадка latency при сборке дерева на лету  
   Смягчение: versioned cache + prewarm.

3. Ошибки path/ancestors после move  
   Смягчение: атомарный subtree-update + property-based tests.

4. Неполный backfill counts  
   Смягчение: отдельный recount job, сверка с продуктами.

---

## 9. Тест-план

- Unit:
  - create/move/delete guards;
  - path/ancestors пересчет;
  - rootId/depth корректность.
- Integration:
  - полный CRUD + move-to-root;
  - cross-root move и пересчет `rootCategoryId` у продуктов;
  - dual-read diff = 0 на эталонном наборе.
- Load:
  - latency `GET /categories` с холодным/теплым кэшем;
  - write contention при параллельных move/create.

---

## 10. План отката

- rollback read: `CATEGORIES_READ_SOURCE=legacy`;
- rollback write: `CATEGORIES_WRITE_MODE=legacy`;
- new collection не удалять до postmortem;
- при частичных записях в new запустить reconciliation job.

---

## 11. Рекомендуемый порядок выката

1. Деплой кода с новой моделью + флагами (все в legacy режиме).
2. Backfill + валидация.
3. Dual-write.
4. Dual-read shadow.
5. Read cutover.
6. Write cutover.
7. Cleanup legacy.

