# Orders Backend Handoff For Frontend

Дата: 2026-05-02  
Область: `backend/orders + backend/settings`  
Статус: **breaking changes**, legacy-совместимость **не поддерживается**  
Цель: дать фронтенду полный рабочий контекст без повторного анализа бэка.

Этот документ полностью заменяет отдельный changelog-файл и включает весь его контекст.

## 1. Что изменилось в целом

1. Разделена настройка способа получения заказа:
- `PATCH /api/orders/:orderId/delivery`
- `PATCH /api/orders/:orderId/pickup`

2. У delivery lifecycle теперь 2 стадии:
- `Planned` (выбрано, но даты еще не финализированы)
- `Scheduled` (даты финализированы при переводе в `In Process`)

3. Финализация дат перенесена в `PUT /api/orders/:orderId/status` при переходе `Draft -> In Process`.

4. В settings добавлено обязательное поле:
- `shipping.processing.cutoffHour` (0..23)

5. Overdue не хранится в БД, а вычисляется в ответах API:
- `delivery.isOverdue`
- `delivery.overdueByDays`

6. Формат дат в delivery schedule: `YYYY-MM-DD` (date-only).

## 2. Новые/обновленные endpoint’ы

## 2.1 Delivery by address

`PATCH /api/orders/:orderId/delivery`

Payload:

```json
{
  "express": true,
  "address": {
    "state": "NY",
    "city": "New York",
    "street": "Broadway",
    "house": 1,
    "apartment": 10,
    "zipCode": "10001"
  }
}
```

Поведение:
- доступно только для `order.status = Draft`;
- сохраняет snapshot доставки;
- ставит `delivery.status = Delivery Planned`.

## 2.2 Pickup by location id

`PATCH /api/orders/:orderId/pickup`

Payload:

```json
{
  "pickupLocationId": "64f100000000000000000001"
}
```

Поведение:
- доступно только для `order.status = Draft`;
- manual address запрещен;
- location ищется только в `settings.shipping.pickup.locations`;
- `404`, если location не найден или `isActive=false`;
- address в `order.delivery.address` сохраняется snapshot’ом из settings;
- ставит `delivery.status = Pickup Planned`.

## 2.3 Pricing endpoint (union request)

`POST /api/orders/pricing`

Поддерживаемые режимы:

1. delivery
```json
{
  "products": [{ "id": "<productId>", "quantity": 2 }],
  "delivery": {
    "express": true,
    "address": {
      "state": "NY",
      "city": "New York",
      "street": "Broadway",
      "house": 1,
      "zipCode": "10001"
    }
  }
}
```

2. pickup
```json
{
  "products": [{ "id": "<productId>", "quantity": 2 }],
  "pickup": { "pickupLocationId": "64f100000000000000000001" }
}
```

3. products-only
```json
{
  "products": [{ "id": "<productId>", "quantity": 2 }]
}
```

Ограничения:
- `delivery` и `pickup` одновременно передавать нельзя (`400`);
- products-only возвращает subtotal/total без delivery-компонента.

## 3. Статусы: что теперь валидно

## 3.1 Order status
- `Draft`
- `In Process`
- `Completed`
- `Canceled`

## 3.2 Delivery status
- `Draft`
- `Delivery Planned`
- `Pickup Planned`
- `Delivery Scheduled`
- `Pickup Scheduled`
- `Partially Delivered`
- `Delivered`

## 3.3 Переходы (важно для UI-гейтов)

1. `Draft` + `Draft` -> `Delivery Planned` через `PATCH /delivery`.
2. `Draft` + `Draft` -> `Pickup Planned` через `PATCH /pickup`.
3. `Draft` + `Delivery Planned|Pickup Planned` -> `In Process` + `...Scheduled` через `PUT /status`.
4. Receive разрешен только при `In Process` и `delivery.status in Delivery Scheduled | Pickup Scheduled | Partially Delivered`.
5. Повторный `PUT status=In Process` для уже `In Process` -> `400`.

## 4. Schedule contract (новый)

## 4.1 Delivery schedule

```json
{
  "express": true,
  "estimatedDays": 2,
  "estimatedDate": "2026-05-06",
  "startsAt": null,
  "dueDate": null
}
```

Семантика:
- `estimatedDate` в Draft — preview;
- `startsAt` и `dueDate` финализируются только на `Draft -> In Process`.

## 4.2 Pickup schedule

```json
{
  "readyInDays": 1,
  "holdForDays": 5,
  "availableFromDate": "2026-05-05",
  "pickupByDate": "2026-05-10",
  "startsAt": null
}
```

Семантика:
- в Draft это preview-значения (могут измениться после Process);
- `availableFromDate` и `pickupByDate` финализируются только на `Draft -> In Process`.

## 5. Финализация дат при In Process

Финализация выполняется только в `PUT /api/orders/:orderId/status` при переходе `Draft -> In Process`.

Источник cut-off:
- `settings.shipping.processing.cutoffHour` (server local time, 24h).

Правило:
- если `now.hour >= cutoffHour` -> `startsAt = tomorrow`
- иначе -> `startsAt = today`

Дальше:

Delivery:
- `dueDate = startsAt + estimatedDays`
- `estimatedDate = dueDate`
- status: `Delivery Planned -> Delivery Scheduled`

Pickup:
- `availableFromDate = startsAt + readyInDays`
- `pickupByDate = availableFromDate + holdForDays`
- status: `Pickup Planned -> Pickup Scheduled`

## 6. Overdue в API ответах

Во всех order responses (кроме export) delivery дополнен:

```json
{
  "delivery": {
    "...": "...",
    "isOverdue": false,
    "overdueByDays": 0
  }
}
```

Правило:
- overdue считается только когда `order.status = In Process`;
- для delivery due date = `delivery.schedule.dueDate`;
- для pickup due date = `delivery.schedule.pickupByDate`;
- если даты нет/невалидна — overdue=false;
- `overdueByDays` = date-diff в днях (`today - dueDate`, min `0`).

## 7. Что НЕ менялось

1. Snapshot `order.delivery` остается единым объектом (без разделения на разные поля `pickup`/`delivery` на уровне модели заказа).
2. Export контракт по структуре не расширялся overdue-полями.
3. Общий envelope ответов (`IsSuccess`, `ErrorMessage`, `Order`, `Orders`) сохранен.

## 8. Settings changes (обязательно для фронта)

Добавлено обязательное поле:

```json
{
  "shipping": {
    "processing": {
      "cutoffHour": 18
    }
  }
}
```

Ограничения:
- integer `0..23`.

Важно:
- backend ожидает это поле как обязательное в create/update settings.

## 9. Ошибки, которые фронт должен учесть

1. `PATCH /pickup`:
- `404` если location id не найден;
- `404` если location неактивен.

2. `PUT status=In Process`:
- `400`, если заказ уже `In Process`;
- `400`, если delivery еще не в planned-статусе.

3. `POST /orders/pricing`:
- `400`, если переданы одновременно `delivery` и `pickup`.

## 10. Frontend checklist (практический)

1. Перевести вызовы scheduling на новые endpoint’ы (`PATCH /delivery`, `PATCH /pickup`).
2. Обновить локальные enum’ы delivery statuses:
- добавить `Delivery Planned`, `Pickup Planned`.
3. Обновить UI-гейты:
- кнопка Process активна только при `delivery.status in [Delivery Planned, Pickup Planned]`.
- Receive активна только при `delivery.status in [Delivery Scheduled, Pickup Scheduled, Partially Delivered]`.
4. Переключить отображение дат на `YYYY-MM-DD`.
5. Учесть preview/final distinction:
- Draft может иметь preview `estimatedDate`, но финализация происходит только при Process.
6. Добавить рендер `isOverdue` и `overdueByDays` в list/details (кроме export-потока).
7. Для pickup-формы отправлять только `pickupLocationId`.
8. Для pricing отправлять union payload (delivery/pickup/none).

## 11. Быстрая матрица «было -> стало»

1. `POST /orders/:id/delivery` -> `PATCH /orders/:id/delivery` + `PATCH /orders/:id/pickup`
2. `Scheduled` сразу после выбора доставки -> `Planned`, `Scheduled` только после Process
3. datetime-like даты schedule -> date-only `YYYY-MM-DD`
4. без `cutoffHour` -> обязательный `shipping.processing.cutoffHour`
5. overdue не было -> теперь computed в DTO
