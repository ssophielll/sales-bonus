/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
   const { discount, sale_price, quantity } = purchase;
   return sale_price * quantity * (1 - discount / 100);
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    const { profit } = seller;

    if (index === total - 1) return 0;
    if (index === 0) return profit * 0.15;
    if (index === 1 || index === 2) return profit * 0.10;

    return profit * 0.05;
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    const { sellers, products, purchase_records } = data;
    if (
        !data
        || !Array.isArray(data.products)
        || !Array.isArray(data.sellers)
        || !Array.isArray(data.purchase_records)
        || data.products.length === 0
        || data.sellers.length === 0
        || data.purchase_records.length === 0
    ) {
        throw new Error('Некорректные входные данные');
    }
    
    if (typeof options !== 'object' || options === null) {
        throw new Error('Опции не являются объектом');
    }
    const { calculateRevenue, calculateBonus } = options;
    if (typeof calculateRevenue !== 'function' || typeof calculateBonus !== 'function') {
        throw new Error('Чего-то не хватает');
    }
    
    const sellerStats = data.sellers.map(seller => ({
        id: seller.id,
        name: `${seller.first_name || ''} ${seller.last_name || ''}`.trim() || 'Unknown',
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {}
    }));

    console.log(sellerStats); // Промежуточная структура продавцов

    const sellerIndex = Object.fromEntries(
        sellerStats.map(seller => [seller.id, seller])
    );

    const productIndex = Object.fromEntries(
        data.products.map(product => [product.sku, product])
    );

    data.purchase_records.forEach(record => {
        const seller = sellerIndex[record.seller_id];
        if (!seller) return;
        
        seller.sales_count += 1;
        seller.revenue += record.total_amount;

        if (Array.isArray(record.items)) {
            record.items.forEach(item => {
                const product = productIndex[item.sku];
                const cost = product ? product.purchase_price * item.quantity : 0;
                const revenue = calculateRevenue(item, product);
                const profit = revenue - cost;

                if (!seller.products_sold[item.sku]) {
                    seller.products_sold[item.sku] = 0;
                }
                seller.products_sold[item.sku] += item.quantity;
            });
        }
    });

    console.log(sellerStats); // Обработка чеков

    sellerStats.sort((a, b) => b.profit - a.profit);
    console.log(sellerStats); // Сортировка по прибыли

    sellerStats.forEach((seller, index) => {
        const totalSellers = sellerStats.length;
        seller.bonus = calculateBonus(index, totalSellers, seller);

        seller.top_products = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
    });
 
    console.log(sellerStats); // После назначения бонусов и топ-10 товаров

    return sellerStats.map(seller => ({
        seller_id: seller.id,
        name: seller.name,
        revenue: +seller.revenue.toFixed(2),
        profit: +seller.profit.toFixed(2),
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: +seller.bonus.toFixed(2)
    }));
}