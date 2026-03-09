import Order from "../models/order.model";
import Customer from "../models/customer.model";
import customerService from "./customer.service";

class MetricsService {
  async getMetricsForCurrentYear() {
    const currentYear = new Date().getFullYear();

    const totalRevenue = await Order.aggregate([
      { $match: { createdOn: { $gte: new Date(`${currentYear}-01-01`), $lte: new Date(`${currentYear}-12-31`) } } },
      { $group: { _id: null, totalRevenue: { $sum: "$total_price" } } },
    ]);

    const totalOrders = await Order.countDocuments({
      createdOn: { $gte: new Date(`${currentYear}-01-01`), $lte: new Date(`${currentYear}-12-31`) },
    });

    const averageOrderValue = totalOrders ? Math.round(totalRevenue[0]?.totalRevenue / totalOrders) : 0;

    // Количество новых пользователей за год
    const totalNewCustomers = await Customer.countDocuments({
      createdOn: { $gte: new Date(`${currentYear}-01-01`), $lte: new Date(`${currentYear}-12-31`) },
    });

    // Количество отмененных ордеров за год
    const totalCanceledOrders = await Order.countDocuments({
      createdOn: { $gte: new Date(`${currentYear}-01-01`), $lte: new Date(`${currentYear}-12-31`) },
      status: "Canceled",
    });

    // Последние 3 созданных ордера
    const recentOrders = await Order.find({}).sort({ createdOn: -1 }).limit(3);

    // Топ 5 клиентов по стоимости их ордеров
    const topCustomers = await Order.aggregate([
      { $match: { createdOn: { $gte: new Date(`${currentYear}-01-01`), $lte: new Date(`${currentYear}-12-31`) } } },
      { $group: { _id: "$customer._id", totalSpent: { $sum: "$total_price" }, ordersCount: { $sum: 1 } } },
      { $sort: { totalSpent: -1 } },
      { $limit: 3 },
      {
        $lookup: {
          from: "customers",
          localField: "_id",
          foreignField: "_id",
          as: "customerInfo",
        },
      },
      { $unwind: "$customerInfo" },
      {
        $project: {
          customerName: "$customerInfo.name",
          customerEmail: "$customerInfo.email",
          totalSpent: 1,
          ordersCount: 1,
        },
      },
    ]);

    return {
      totalRevenue: totalRevenue[0]?.totalRevenue || 0,
      totalOrders,
      averageOrderValue: averageOrderValue || 0,
      totalNewCustomers,
      totalCanceledOrders,
      recentOrders: await Promise.all(
        recentOrders.map(async (o) => {
          const customer = await customerService.getCustomer(o.customer._id);
          return { ...o._doc, ...{ customer: customer } };
        })
      ),
      topCustomers,
    };
  }

  async getOrdersCountPerDay() {
    const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const data = await Order.aggregate([
      { $match: { createdOn: { $gte: currentMonthStart } } },
      {
        $group: {
          _id: { day: { $dayOfMonth: "$createdOn" }, month: { $month: "$createdOn" }, year: { $year: "$createdOn" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.day": 1 } },
    ]);
    return [...data].map((o) => {
      return { date: o._id, count: o.count };
    });
  }

  async getTopSoldProductsData() {
    const orders = await Order.find(); // Получаем все ордеры
    const productCountMap = {};

    // Проходим по каждому ордеру
    orders.forEach((order) => {
      order.products.forEach((product) => {
        const productName = product.name.toString(); // Преобразуем ObjectId в строку

        // Увеличиваем счетчик для продукта
        if (productCountMap[productName]) {
          productCountMap[productName]++;
        } else {
          productCountMap[productName] = 1;
        }
      });
    });

    // Преобразуем в массив для сортировки
    const topProductsArray = Object.entries(productCountMap)
      .map(([name, sales]) => ({ name, sales }))
      .sort((a, b) => (b.sales as number) - (a.sales as number)) // Сортировка по количеству
      .slice(0, 5); // Берем топ-5 продуктов

    return topProductsArray;
  }

  async getCustomerGrowth(days: number) {
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - days - 1); // 15 дней назад

    // Получаем данные из базы за последние 15 дней
    const registrations = await Customer.aggregate([
      {
        $match: {
          createdOn: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdOn" },
            month: { $month: "$createdOn" },
            day: { $dayOfMonth: "$createdOn" },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 },
      },
    ]);

    // Создаем массив с нулями для всех 15 дней
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
      const day = date.getDate();
      const month = date.getMonth() + 1; // JavaScript месяцы с 0
      const year = date.getFullYear();

      // Ищем, есть ли данные для данного дня
      const found = registrations.find((r) => r._id.day === day && r._id.month === month && r._id.year === year);

      // Если данные есть, добавляем их, если нет - добавляем 0
      result.push({
        date: { year, month, day },
        count: found ? found.count : 0,
      });
    }

    return result;
  }
}

export default new MetricsService();
