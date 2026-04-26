### 1. Settings foundation

```ts id="t4lcux"
Settings {
  order: {
    maxProductsInOrder: number;
    maxProductQuantityInOrder: number;
  };

  inventory: {
    defaultLowStockThreshold: number;
  };

  delivery: {
    defaultCities: string[];
    basePricePerItem: number;
    extraPriceForOtherCity: number;
  };
}
```

Сразу добавить страницу **Settings** в админке.

---

### 2. Customer model cleanup

Убрать `country`.

```ts id="nydzjn"
Customer {
  name: string;
  email: string;
  city: string;
  address: string;
}
```

Город теперь выбирается из:

```ts id="74wbwu"
settings.delivery.defaultCities;
```

Плюс вариант:

```txt id="j6qpsc"
Other
```

Если выбран `Other`, кастомер/админ вводит город вручную.

---

### 3. Order products v2

```ts id="vefsfp"
Order {
  products: {
    product: {
      id: string;
      name: string;
      manufacturer: string;
    };
    unitPrice: number;
    quantity: number;
    received: boolean;
  }[];
}
```

Правила:

```txt id="js6p53"
- product.id уникален внутри заказа
- quantity >= 1
- quantity <= settings.order.maxProductQuantityInOrder
- products.length <= settings.order.maxProductsInOrder
```

---

### 4. Delivery v2 + delivery price

```ts id="9dzifv"
Order {
  delivery: {
    status: "Draft" | "Scheduled" | "Partially Delivered" | "Delivered";
    city: string;
    address: string;
    deliveryDate?: Date;
    price: number;
  };
}
```

Цена считается через settings:

```ts id="8k3y0u"
const totalItems = order.products.reduce((sum, item) => sum + item.quantity, 0);

let price = totalItems * settings.delivery.basePricePerItem;

if (!settings.delivery.defaultCities.includes(order.delivery.city)) {
  price += settings.delivery.extraPriceForOtherCity;
}
```

Flow:

```txt id="gf5xp2"
Order created
→ delivery Draft с city/address из customer
→ user/admin подтверждает или редактирует delivery
→ delivery Scheduled
```

---

### 5. Order lifecycle without payment

```ts id="p07l0e"
orderStatus:
  Draft | In Process | Completed | Cancelled
```

Flow:

```txt id="08ennl"
Draft
→ In Process
→ delivery Scheduled / Partially Delivered / Delivered
→ Completed вручную
```

Правило:

```txt id="98tinn"
Completed только если delivery.status = Delivered
```

---

### 6. Product v2

```ts id="ms14ur"
Product {
  name
  price
  manufacturer
  sku
  description
  imageUrl
  category
  status: Draft | Active | Archived
}
```

Правила:

```txt id="vdb33q"
- sku уникален
- Archived нельзя добавить в заказ
```

---

### 7. Inventory light

```ts id="i1yc70"
Inventory {
  productId: string;
  amount: number;
  reserved: number;
  sellingOutOfStock: boolean;
  lowStockThreshold: number;
}
```

При создании inventory:

```ts id="oeohnl"
lowStockThreshold = settings.inventory.defaultLowStockThreshold;
```

---

### 8. Inventory + Orders integration

```txt id="n50e7j"
In Process → reserved += quantity
Cancelled → reserved -= quantity
Completed → reserved -= quantity, amount -= quantity
```

Проверка:

```ts id="52c057"
available = amount - reserved;
```

Если `quantity > available`, ошибка, кроме случая:

```ts id="makte2"
sellingOutOfStock = true;
```

---

### 9. Cancel with reason

```ts id="j3wqhi"
cancellation: {
  cancelledBy: "customer" | "manager";
  reason?: string;
  cancelledAt: Date;
}
```

Можно отменить:

```txt id="osb0jv"
orderStatus = Draft | In Process
delivery.status != Partially Delivered
delivery.status != Delivered
```

---

## Customer part после этого

### 10. Customer auth

```ts id="2kgydq"
Customer {
  name
  email
  passwordHash
  city
  address
}
```

Роуты:

```txt id="sk54ak"
POST /auth/register
POST /auth/login
GET /auth/me
```

---

### 11. Cart

```ts id="oogfuw"
Cart {
  customerId
  products: {
    productId
    quantity
  }[]
}
```

---

### 12. Checkout

```txt id="vd57nq"
cart → order Draft
delivery Draft создаётся автоматически
city/address берутся из customer
delivery.price рассчитывается через settings
```

---

### 13. Customer delivery confirmation

```txt id="ia78c3"
PATCH /me/orders/:id/delivery
```

Flow:

```txt id="fqhnvc"
Draft delivery → Scheduled
```

---

### 14. Payment + Pending

```ts id="py2hqp"
payment: {
  isPaid: boolean;
  paidAt?: Date;
}
```

Добавить `Pending` только здесь:

```ts id="k333xy"
orderStatus:
  Draft | Pending | In Process | Completed | Cancelled
```

Flow:

```txt id="6b6ib4"
Draft order + Scheduled delivery
→ pay
→ Pending
→ manager takes order
→ In Process
```

---

### 15. Customer frontend

Страницы:

```txt id="munx4z"
Catalog
Product page
Cart
Checkout
Delivery
My Orders
Profile
Login / Register
```

---

### 16. Cleanup админки

Убрать обычное создание заказа из админки.

Админка остаётся для:

```txt id="bxbnnm"
Products
Inventory
Settings
Orders processing
Customers
```

Теперь порядок логичный: сначала `Settings + Customer city`, потом уже новая доставка.
