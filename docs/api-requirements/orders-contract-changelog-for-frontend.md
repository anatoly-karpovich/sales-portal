# Orders Contract Change Log (Backend -> Frontend)

Дата: 2026-05-02  
Область: `backend` (orders domain)  
Статус: **breaking changes**, legacy-совместимость **не поддерживается**

## 1. TL;DR

В заказах убран top-level `deliveryStatus`.  
Источник статуса доставки теперь только `order.delivery.status` (и `history[i].delivery.status`).

Одновременно изменена lifecycle-логика:
- при `POST /api/orders` доставка создается сразу (не `null`),
- `delivery.status` на create/reopen/customer-change = `Draft`,
- scheduled-статус разделен на 2 значения: `Delivery Scheduled` и `Pickup Scheduled`.

## 2. Breaking Changes (контракт)

## 2.1. Order payload

Было:

```json
{
  "status": "Draft",
  "deliveryStatus": "Not Scheduled",
  "delivery": null
}
```

Стало:

```json
{
  "status": "Draft",
  "delivery": {
    "status": "Draft",
    "condition": "Delivery",
    "price": 30,
    "pricingTier": "same_state",
    "schedule": {
      "express": false,
      "estimatedDate": "2026-05-05T10:00:00.000Z"
    },
    "address": {
      "state": "NY",
      "city": "New York",
      "street": "Broadway",
      "house": 1,
      "apartment": 10,
      "zipCode": "10001"
    }
  }
}
```

Ключевые изменения:
- удалено поле `deliveryStatus` из top-level order;
- `delivery` теперь обязателен в order snapshot;
- новый обязательный `delivery.status` внутри `delivery`.

## 2.2. History entry payload

Было:
- `history[i].deliveryStatus` (строка),
- `history[i].delivery` мог быть nullable.

Стало:
- `history[i].deliveryStatus` удален,
- `history[i].delivery.status` используется как единственный delivery status,
- `history[i].delivery` обязателен в snapshot.

## 2.3. Статусы доставки (enum)

Было:
- `Not Scheduled`
- `Scheduled`
- `Partially Delivered`
- `Delivered`

Стало:
- `Draft`
- `Delivery Scheduled`
- `Pickup Scheduled`
- `Partially Delivered`
- `Delivered`

## 2.4. Actions в history

Добавлены pickup-специфичные actions:
- `Pickup Scheduled`
- `Pickup Edited`

Существующие delivery actions сохранены:
- `Delivery Scheduled`
- `Delivery Edited`

## 3. Эндпоинты: что изменилось

## 3.1. `POST /api/orders`

Новое поведение:
- order создается со статусом `status=Draft`;
- backend сразу создает default delivery snapshot:
  - `condition=Delivery`
  - `express=false`
  - address = адрес customer из заказа
  - `delivery.status=Draft`
- `total_price` сразу включает delivery price (`products subtotal + delivery.price`).

Важно для фронта:
- после create в ответе всегда приходит полноценный `delivery` объект;
- нельзя рассчитывать на `delivery=null` и `deliveryStatus=Not Scheduled`.

## 3.2. `PATCH /api/orders/:orderId`

Новый side effect при смене customer:
- delivery пересобирается на новый customer address;
- `delivery.status` принудительно сбрасывается в `Draft`;
- `total_price` пересчитывается с учетом новой draft-delivery.

Если customer не менялся:
- delivery остается, цена доставки может пересчитаться только по количеству lines (как и раньше по бизнес-логике line-based pricing).

## 3.3. `POST /api/orders/:orderId/delivery`

Теперь scheduled-статус зависит от `condition`:
- `condition=Delivery` -> `delivery.status = Delivery Scheduled`
- `condition=Pickup` -> `delivery.status = Pickup Scheduled`

History action:
- если до этого был `Draft`:
  - Delivery -> `Delivery Scheduled`
  - Pickup -> `Pickup Scheduled`
- если это редактирование уже назначенной доставки:
  - Delivery -> `Delivery Edited`
  - Pickup -> `Pickup Edited`

## 3.4. `PUT /api/orders/:orderId/status`

Ограничения для `status=In Process`:
- теперь нужен `delivery.status` в
  - `Delivery Scheduled` или
  - `Pickup Scheduled`

Ограничения для `status=Canceled`:
- разрешено только при `delivery.status` в
  - `Draft`
  - `Delivery Scheduled`
  - `Pickup Scheduled`
- и если нет ни одного `received=true`.

`status=Draft` (reopen):
- по-прежнему только из `Canceled`, но теперь
- **не очищает** delivery в null,
- а пересоздает default delivery как при create:
  - customer address,
  - `condition=Delivery`, `express=false`,
  - `delivery.status=Draft`,
  - и пересчет total_price с учетом delivery.

## 3.5. `POST /api/orders/:orderId/receive`

Гейт на receive:
- `status` должен быть `In Process`;
- `delivery.status` должен быть одним из:
  - `Delivery Scheduled`
  - `Pickup Scheduled`
  - `Partially Delivered`

Результаты:
- partial receive -> `delivery.status = Partially Delivered`
- full receive -> `delivery.status = Delivered`, `status = Completed`

## 3.6. `GET /api/orders` и `POST /api/orders/export`

Входной ключ фильтра **не менялся**:
- `deliveryStatus` остается в query/body

Но применяется он теперь к:
- `delivery.status` (внутреннее поле)

Поиск (`search`) также матчится по `delivery.status`.

## 3.7. Export fields

Список полей экспорта по-прежнему принимает:
- `deliveryStatus`

Но значение для этого поля теперь берется из:
- `order.delivery.status`

## 4. Прайсинг и total_price

Новые инварианты:
- `delivery` всегда присутствует в order snapshot;
- `total_price` всегда включает delivery component;
- для create/reopen/customer-change delivery snapshot и total берутся из pricing service.

## 5. Модель данных (backend)

Изменение схемы Order:
- удалено: `Order.deliveryStatus`
- добавлено: `Order.delivery.status` (required)
- `Order.delivery` -> required

Изменение схемы History:
- удалено: `History.deliveryStatus`
- `History.delivery.status` -> required
- `History.delivery` -> required

## 6. Что нужно поменять на фронте

1. Удалить чтение `order.deliveryStatus` и перейти на `order.delivery.status`.
2. В timeline/history убрать ожидание `history[i].deliveryStatus`.
3. Обновить локальные enum'ы delivery status:
- убрать `Not Scheduled`, `Scheduled`
- добавить `Draft`, `Delivery Scheduled`, `Pickup Scheduled`
4. Обновить UI-гейты кнопок:
- Process enabled when `delivery.status in [Delivery Scheduled, Pickup Scheduled]`
- Cancel enabled when `delivery.status in [Draft, Delivery Scheduled, Pickup Scheduled]`
- Receive enabled when `delivery.status in [Delivery Scheduled, Pickup Scheduled, Partially Delivered]`
5. Учитывать, что после create всегда есть `delivery` (не null).
6. Учитывать, что смена customer в draft-order сбрасывает `delivery.status` в `Draft` и меняет address+price.
7. Обновить отображение history actions для pickup:
- `Pickup Scheduled`, `Pickup Edited`.
8. Сохранить формат фильтров запроса (`deliveryStatus`), но трактовать как фильтр по `delivery.status`.

## 7. Обратная совместимость

- Legacy-режим отсутствует.
- Старые документы с top-level `deliveryStatus` и/или `delivery=null` не поддерживаются.

## 8. Проверка после интеграции фронта (рекомендуемый smoke checklist)

1. Create order:
- в ответе `delivery` есть,
- `delivery.status = Draft`,
- `total_price` включает delivery.

2. Schedule delivery:
- Delivery condition -> `Delivery Scheduled`
- Pickup condition -> `Pickup Scheduled`

3. Process:
- проходит только из scheduled-статусов.

4. Receive:
- partial -> `Partially Delivered`
- full -> `Delivered` + order `Completed`

5. Reopen canceled:
- `delivery.status = Draft`
- delivery address соответствует текущему customer

6. Patch customer in Draft:
- `delivery.status` сбрасывается в `Draft`
- address обновляется
- `total_price` меняется согласно pricing.
