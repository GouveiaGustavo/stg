const Env = use('Env');

class ArrayHelper {

    async listItems(items, pageActual, limitItems) {
        const total = items.length;
        const totalPage = Math.ceil(items.length / limitItems);
        let count = (pageActual * limitItems) - limitItems;
        const delimiter = count + limitItems;
        let result = {
            total,
            page: pageActual,
            perPage: limitItems,
            totalPage,
            data: []
        };
        if (pageActual <= totalPage) {
            for (let i = count; i < delimiter; i++) {
                if (items[i] != null) {
                    result.data.push(items[i]);
                }
                count++;
            }
        }

        return result;
    };

    async orderingItems(items, order, orderList) {

        const sort = async function (prop, arr, orderList) {
            prop = prop.split('.');
            let len = prop.length;

            arr.sort(function (a, b) {
                let i = 0;
                while (i < len) {
                    a = a[prop[i]];
                    b = b[prop[i]];
                    i++;
                }

                if (a < b) {
                    if (orderList === 'ASC') {
                        return -1;
                    } else {
                        return 1;
                    }
                } else if (a > b) {
                    if (orderList === 'ASC') {
                        return 1;
                    } else {
                        return -1;
                    }
                } else {
                    return 0;
                }
            });
            return arr;
        };

        const data = await sort(order, items, orderList);

        return data;
    }
} module.exports = ArrayHelper;
