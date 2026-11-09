const CATEGORIES = [
 {
  "key": "Hot Coffee",
  "label": "Hot Coffee",
  "note": "Slow-pulled espresso, velvet milk, and a little patience in every cup."
 },
 {
  "key": "Iced Coffee",
  "label": "Iced Coffee",
  "note": "Cold, bold and made for Mogadishu afternoons."
 },
 {
  "key": "Frappes",
  "label": "Frappés",
  "note": "Blended thick, topped high."
 },
 {
  "key": "Matcha",
  "label": "Matcha",
  "note": "Stone-ground matcha, layered with milk."
 },
 {
  "key": "Hot Tea",
  "label": "Hot Tea",
  "note": "From Somali qahwa to Turkish tea, brewed the traditional way."
 },
 {
  "key": "Iced Tea",
  "label": "Iced Tea",
  "note": "Steeped, chilled and poured over ice."
 },
 {
  "key": "Refresher",
  "label": "Refreshers",
  "note": "Fruit-forward fizz for the heat."
 },
 {
  "key": "Smoothies",
  "label": "Smoothies",
  "note": "Real fruit, blended smooth."
 },
 {
  "key": "Cakes",
  "label": "Cakes",
  "note": "A slice worth slowing down for."
 },
 {
  "key": "pastry_kobac",
  "label": "Bakery",
  "note": "Baked fresh for your morning cup."
 },
 {
  "key": "Sandwiches",
  "label": "Sandwiches",
  "note": "Something warm between the sips."
 },
 {
  "key": "Bottle Drinks",
  "label": "Cold Bottles",
  "note": "Grab-and-go cold."
 },
 {
  "key": "EGG EX",
  "label": "Kitchen",
  "note": "Simple, warm, done right."
 }
];

const PRODUCTS = [
 {
  "id": "1",
  "name": "Cappuccino",
  "category": "Hot Coffee",
  "price": 2,
  "image": "assets/img/products/1-cappuccino.png",
  "badge": "bestseller",
  "featured": true,
  "sizes": [
   {
    "size": "Small",
    "price": 2
   },
   {
    "size": "Medium",
    "price": 2.45
   },
   {
    "size": "Large",
    "price": 2.75
   }
  ]
 },
 {
  "id": "20",
  "name": "Affogato",
  "category": "Hot Coffee",
  "price": 2.5,
  "image": "assets/img/products/20-affogato.png",
  "badge": "",
  "featured": false,
  "sizes": [
   {
    "size": "Small",
    "price": 2.5
   },
   {
    "size": "Medium",
    "price": 2.75
   },
   {
    "size": "Large",
    "price": 3
   }
  ]
 },
 {
  "id": "1131",
  "name": "Americano",
  "category": "Hot Coffee",
  "price": 1.5,
  "image": "assets/img/products/1131-americano.png",
  "badge": "",
  "featured": false,
  "sizes": [
   {
    "size": "Small",
    "price": 1.5
   },
   {
    "size": "Medium",
    "price": 1.75
   },
   {
    "size": "Large",
    "price": 2
   }
  ]
 },
 {
  "id": "11",
  "name": "Café Latte",
  "category": "Hot Coffee",
  "price": 2,
  "image": "assets/img/products/11-caf-latte.png",
  "badge": "",
  "featured": false,
  "sizes": [
   {
    "size": "Small",
    "price": 2
   },
   {
    "size": "Medium",
    "price": 2.45
   },
   {
    "size": "Large",
    "price": 2.75
   }
  ]
 },
 {
  "id": "15",
  "name": "Caffe Mocha",
  "category": "Hot Coffee",
  "price": 2.5,
  "image": "assets/img/products/15-caffe-mocha.png",
  "badge": "",
  "featured": false,
  "sizes": [
   {
    "size": "Small",
    "price": 2.5
   },
   {
    "size": "Medium",
    "price": 2.75
   },
   {
    "size": "Large",
    "price": 3
   }
  ]
 },
 {
  "id": "167",
  "name": "Caramel Cappuccino",
  "category": "Hot Coffee",
  "price": 2.5,
  "image": "assets/img/products/167-caramel-cappuccino.png",
  "badge": "",
  "featured": false,
  "sizes": [
   {
    "size": "Small",
    "price": 2.5
   },
   {
    "size": "Medium",
    "price": 2.75
   },
   {
    "size": "Large",
    "price": 3
   }
  ]
 },
 {
  "id": "18",
  "name": "Caramel Latte",
  "category": "Hot Coffee",
  "price": 2.5,
  "image": "assets/img/products/18-caramel-latte.png",
  "badge": "",
  "featured": false,
  "sizes": [
   {
    "size": "Small",
    "price": 2.5
   },
   {
    "size": "Medium",
    "price": 2.75
   },
   {
    "size": "Large",
    "price": 3
   }
  ]
 },
 {
  "id": "17",
  "name": "Cortado",
  "category": "Hot Coffee",
  "price": 2,
  "image": "assets/img/products/17-cortado.png",
  "badge": "",
  "featured": false,
  "sizes": [
   {
    "size": "Small",
    "price": 2
   },
   {
    "size": "Medium",
    "price": 2.45
   },
   {
    "size": "Large",
    "price": 2.75
   }
  ]
 },
 {
  "id": "8",
  "name": "Espresso",
  "category": "Hot Coffee",
  "price": 1.5,
  "image": "assets/img/products/8-espresso.png",
  "badge": "",
  "featured": false,
  "sizes": null
 },
 {
  "id": "22",
  "name": "Hot Chocolate",
  "category": "Hot Coffee",
  "price": 2,
  "image": "assets/img/products/22-hot-chocolate.png",
  "badge": "",
  "featured": false,
  "sizes": [
   {
    "size": "Small",
    "price": 2
   },
   {
    "size": "Medium",
    "price": 2.45
   },
   {
    "size": "Large",
    "price": 2.75
   }
  ]
 },
 {
  "id": "28",
  "name": "Hot Matcha Latte",
  "category": "Hot Coffee",
  "price": 2.5,
  "image": "assets/img/products/28-hot-matcha-latte.png",
  "badge": "",
  "featured": false,
  "sizes": [
   {
    "size": "Small",
    "price": 2.5
   },
   {
    "size": "Medium",
    "price": 2.75
   },
   {
    "size": "Large",
    "price": 3
   }
  ]
 },
 {
  "id": "202",
  "name": "Lingzhi Coffee",
  "category": "Hot Coffee",
  "price": 2,
  "image": "assets/img/products/202-lingzhi-coffee.png",
  "badge": "",
  "featured": false,
  "sizes": [
   {
    "size": "Small",
    "price": 2
   },
   {
    "size": "Medium",
    "price": 2.45
   },
   {
    "size": "Large",
    "price": 2
   }
  ]
 },
 {
  "id": "16",
  "name": "Macchiato",
  "category": "Hot Coffee",
  "price": 2,
  "image": "assets/img/products/16-macchiato.png",
  "badge": "",
  "featured": false,
  "sizes": [
   {
    "size": "Small",
    "price": 2
   },
   {
    "size": "Medium",
    "price": 2.45
   },
   {
    "size": "Large",
    "price": 2.75
   }
  ]
 },
 {
  "id": "14",
  "name": "Spanish Latte",
  "category": "Hot Coffee",
  "price": 2.5,
  "image": "assets/img/products/14-spanish-latte.png",
  "badge": "",
  "featured": false,
  "sizes": [
   {
    "size": "Small",
    "price": 2.5
   },
   {
    "size": "Medium",
    "price": 2.75
   },
   {
    "size": "Large",
    "price": 3
   }
  ]
 },
 {
  "id": "19",
  "name": "Vanilla Latte",
  "category": "Hot Coffee",
  "price": 2.5,
  "image": "assets/img/products/19-vanilla-latte.png",
  "badge": "",
  "featured": false,
  "sizes": [
   {
    "size": "Small",
    "price": 2.5
   },
   {
    "size": "Medium",
    "price": 2.89
   },
   {
    "size": "Large",
    "price": 3
   }
  ]
 },
 {
  "id": "45",
  "name": "Iced Latte",
  "category": "Iced Coffee",
  "price": 2,
  "image": "assets/img/products/45-iced-latte.png",
  "badge": "bestseller",
  "featured": true,
  "sizes": [
   {
    "size": "Small",
    "price": 2
   },
   {
    "size": "Large",
    "price": 3
   }
  ]
 },
 {
  "id": "48",
  "name": "Iced Spanish Latte",
  "category": "Iced Coffee",
  "price": 2.5,
  "image": "assets/img/products/48-iced-spanish-latte.png",
  "badge": "bestseller",
  "featured": true,
  "sizes": [
   {
    "size": "Small",
    "price": 2.5
   },
   {
    "size": "Large",
    "price": 3.5
   }
  ]
 },
 {
  "id": "158",
  "name": "Iced Americano",
  "category": "Iced Coffee",
  "price": 2,
  "image": "assets/img/products/158-iced-americano.png",
  "badge": "",
  "featured": false,
  "sizes": [
   {
    "size": "Small",
    "price": 2
   },
   {
    "size": "Large",
    "price": 3
   }
  ]
 },
 {
  "id": "46",
  "name": "Iced Caramel Latte",
  "category": "Iced Coffee",
  "price": 2.5,
  "image": "assets/img/products/46-iced-caramel-latte.png",
  "badge": "",
  "featured": false,
  "sizes": [
   {
    "size": "Small",
    "price": 2.5
   },
   {
    "size": "Large",
    "price": 3.5
   }
  ]
 },
 {
  "id": "50",
  "name": "Iced Chocolate",
  "category": "Iced Coffee",
  "price": 2,
  "image": "assets/img/products/50-iced-chocolate.png",
  "badge": "",
  "featured": false,
  "sizes": [
   {
    "size": "Small",
    "price": 2
   },
   {
    "size": "Large",
    "price": 3
   }
  ]
 },
 {
  "id": "159",
  "name": "Iced Macchiato",
  "category": "Iced Coffee",
  "price": 2,
  "image": "assets/img/products/159-iced-macchiato.png",
  "badge": "",
  "featured": false,
  "sizes": [
   {
    "size": "Small",
    "price": 2
   },
   {
    "size": "Large",
    "price": 3
   }
  ]
 },
 {
  "id": "49",
  "name": "Iced Vanilla Latte",
  "category": "Iced Coffee",
  "price": 2.5,
  "image": "assets/img/products/49-iced-vanilla-latte.png",
  "badge": "",
  "featured": false,
  "sizes": [
   {
    "size": "Small",
    "price": 2.5
   },
   {
    "size": "Large",
    "price": 3.5
   }
  ]
 },
 {
  "id": "70",
  "name": "Blueberry Frappe",
  "category": "Frappes",
  "price": 3.45,
  "image": "assets/img/products/70-blueberry-frappe.png",
  "badge": "",
  "featured": false,
  "sizes": [
   {
    "size": "Small",
    "price": 3.45
   },
   {
    "size": "Large",
    "price": 4.45
   }
  ]
 },
 {
  "id": "157",
  "name": "Coffee Caramel Frappe",
  "category": "Frappes",
  "price": 3.75,
  "image": "assets/img/products/157-coffee-caramel-frappe.png",
  "badge": "",
  "featured": false,
  "sizes": [
   {
    "size": "Small",
    "price": 3.75
   },
   {
    "size": "Large",
    "price": 4.75
   }
  ]
 },
 {
  "id": "163",
  "name": "Lotus Frappe",
  "category": "Frappes",
  "price": 3.75,
  "image": "assets/img/products/163-lotus-frappe.png",
  "badge": "",
  "featured": false,
  "sizes": [
   {
    "size": "Small",
    "price": 3.75
   },
   {
    "size": "Large",
    "price": 4.75
   }
  ]
 },
 {
  "id": "69",
  "name": "Strawberry Frappe",
  "category": "Frappes",
  "price": 3.5,
  "image": "assets/img/products/69-strawberry-frappe.png",
  "badge": "",
  "featured": false,
  "sizes": [
   {
    "size": "Small",
    "price": 3.5
   },
   {
    "size": "Large",
    "price": 4.5
   }
  ]
 },
 {
  "id": "68",
  "name": "Vanilla Frappe",
  "category": "Frappes",
  "price": 3.75,
  "image": "assets/img/products/68-vanilla-frappe.png",
  "badge": "",
  "featured": false,
  "sizes": [
   {
    "size": "Small",
    "price": 3.75
   },
   {
    "size": "Large",
    "price": 4.75
   }
  ]
 },
 {
  "id": "1740",
  "name": "Coconut Matcha",
  "category": "Matcha",
  "price": 3.7,
  "image": "assets/img/products/1740-coconut-matcha.png",
  "badge": "",
  "featured": false,
  "sizes": null
 },
 {
  "id": "51",
  "name": "Iced Matcha latte",
  "category": "Matcha",
  "price": 2.5,
  "image": "assets/img/products/51-iced-matcha-latte.png",
  "badge": "",
  "featured": false,
  "sizes": [
   {
    "size": "Small",
    "price": 2.5
   },
   {
    "size": "Large",
    "price": 3.5
   }
  ]
 },
 {
  "id": "65",
  "name": "Matcha and Strawberry",
  "category": "Matcha",
  "price": 3.5,
  "image": "assets/img/products/65-matcha-and-strawberry.png",
  "badge": "",
  "featured": false,
  "sizes": [
   {
    "size": "Small",
    "price": 3.5
   },
   {
    "size": "Large",
    "price": 4.5
   }
  ]
 },
 {
  "id": "155",
  "name": "Matcha Frappe",
  "category": "Matcha",
  "price": 3.45,
  "image": "assets/img/products/155-matcha-frappe.png",
  "badge": "",
  "featured": false,
  "sizes": [
   {
    "size": "Small",
    "price": 3.45
   },
   {
    "size": "Large",
    "price": 4.5
   }
  ]
 },
 {
  "id": "1735",
  "name": "Matcha Mango",
  "category": "Matcha",
  "price": 3.65,
  "image": "assets/img/products/1735-matcha-mango.jpeg",
  "badge": "",
  "featured": false,
  "sizes": null
 },
 {
  "id": "611",
  "name": "Matcha Vanilla",
  "category": "Matcha",
  "price": 2.5,
  "image": "assets/img/products/611-matcha-vanilla.png",
  "badge": "",
  "featured": false,
  "sizes": [
   {
    "size": "Small",
    "price": 2.5
   },
   {
    "size": "Large",
    "price": 3.5
   }
  ]
 },
 {
  "id": "1187",
  "name": "Pistachio Matcha",
  "category": "Matcha",
  "price": 3,
  "image": "assets/img/products/1187-pistachio-matcha.png",
  "badge": "",
  "featured": false,
  "sizes": [
   {
    "size": "Small",
    "price": 3
   },
   {
    "size": "Large",
    "price": 4
   }
  ]
 },
 {
  "id": "1188",
  "name": "White Chocolate Matcha",
  "category": "Matcha",
  "price": 3,
  "image": "assets/img/products/1188-white-chocolate-matcha.png",
  "badge": "",
  "featured": false,
  "sizes": [
   {
    "size": "Small",
    "price": 3
   },
   {
    "size": "Large",
    "price": 4
   }
  ]
 },
 {
  "id": "1161",
  "name": "Black Tea",
  "category": "Hot Tea",
  "price": 1,
  "image": "assets/img/products/1161-black-tea.png",
  "badge": "",
  "featured": false,
  "sizes": [
   {
    "size": "Small",
    "price": 1
   },
   {
    "size": "Medium",
    "price": 1.5
   },
   {
    "size": "Large",
    "price": 2
   }
  ]
 },
 {
  "id": "9",
  "name": "Camel Milk Tea",
  "category": "Hot Tea",
  "price": 2,
  "image": "assets/img/products/9-camel-milk-tea.png",
  "badge": "",
  "featured": false,
  "sizes": [
   {
    "size": "Small",
    "price": 2
   },
   {
    "size": "Medium",
    "price": 2.45
   },
   {
    "size": "Large",
    "price": 3
   }
  ]
 },
 {
  "id": "30",
  "name": "Dawa Tea",
  "category": "Hot Tea",
  "price": 2,
  "image": "assets/img/products/30-dawa-tea.png",
  "badge": "",
  "featured": false,
  "sizes": [
   {
    "size": "Small",
    "price": 2
   },
   {
    "size": "Medium",
    "price": 2.45
   },
   {
    "size": "Large",
    "price": 2.75
   }
  ]
 },
 {
  "id": "1097",
  "name": "Lipton Tea",
  "category": "Hot Tea",
  "price": 1,
  "image": "assets/img/products/1097-lipton-tea.png",
  "badge": "",
  "featured": false,
  "sizes": [
   {
    "size": "Small",
    "price": 1
   },
   {
    "size": "Medium",
    "price": 1.5
   },
   {
    "size": "Large",
    "price": 2
   }
  ]
 },
 {
  "id": "1171",
  "name": "Masala Tea",
  "category": "Hot Tea",
  "price": 1.5,
  "image": "assets/img/products/1171-masala-tea.png",
  "badge": "",
  "featured": false,
  "sizes": [
   {
    "size": "Small",
    "price": 1.5
   },
   {
    "size": "Medium",
    "price": 1.75
   }
  ]
 },
 {
  "id": "24",
  "name": "Qahwa Somali",
  "category": "Hot Tea",
  "price": 1,
  "image": "assets/img/products/24-qahwa-somali.png",
  "badge": "",
  "featured": false,
  "sizes": [
   {
    "size": "Small",
    "price": 1
   },
   {
    "size": "Medium",
    "price": 1.5
   },
   {
    "size": "Large",
    "price": 2
   }
  ]
 },
 {
  "id": "29",
  "name": "Somali Tea",
  "category": "Hot Tea",
  "price": 1,
  "image": "assets/img/products/29-somali-tea.png",
  "badge": "",
  "featured": false,
  "sizes": [
   {
    "size": "Small",
    "price": 1
   },
   {
    "size": "Medium",
    "price": 1.5
   },
   {
    "size": "Large",
    "price": 2
   }
  ]
 },
 {
  "id": "26",
  "name": "Turkish Tea",
  "category": "Hot Tea",
  "price": 1,
  "image": "assets/img/products/26-turkish-tea.png",
  "badge": "",
  "featured": false,
  "sizes": [
   {
    "size": "Small",
    "price": 1
   },
   {
    "size": "Medium",
    "price": 1.5
   },
   {
    "size": "Large",
    "price": 2
   }
  ]
 },
 {
  "id": "164",
  "name": "Iced Karkade",
  "category": "Iced Tea",
  "price": 2.5,
  "image": "assets/img/products/164-iced-karkade.png",
  "badge": "",
  "featured": false,
  "sizes": [
   {
    "size": "Small",
    "price": 2.5
   },
   {
    "size": "Large",
    "price": 3.5
   }
  ]
 },
 {
  "id": "1164",
  "name": "Passion Iced Tea",
  "category": "Iced Tea",
  "price": 2.5,
  "image": "assets/img/products/1164-passion-iced-tea.png",
  "badge": "",
  "featured": false,
  "sizes": [
   {
    "size": "Small",
    "price": 2.5
   },
   {
    "size": "Large",
    "price": 3.5
   }
  ]
 },
 {
  "id": "53",
  "name": "Peach Iced Tea",
  "category": "Iced Tea",
  "price": 2.5,
  "image": "assets/img/products/53-peach-iced-tea.png",
  "badge": "",
  "featured": false,
  "sizes": [
   {
    "size": "Small",
    "price": 2.5
   },
   {
    "size": "Large",
    "price": 3.5
   }
  ]
 },
 {
  "id": "56",
  "name": "Raspberry Iced Tea",
  "category": "Iced Tea",
  "price": 2.5,
  "image": "assets/img/products/56-raspberry-iced-tea.png",
  "badge": "",
  "featured": false,
  "sizes": null
 },
 {
  "id": "57",
  "name": "Beetroot Mojito",
  "category": "Refresher",
  "price": 3,
  "image": "assets/img/products/57-beetroot-mojito.png",
  "badge": "",
  "featured": false,
  "sizes": null
 },
 {
  "id": "166",
  "name": "Blueberry Refresher",
  "category": "Refresher",
  "price": 3,
  "image": "assets/img/products/166-blueberry-refresher.png",
  "badge": "",
  "featured": false,
  "sizes": [
   {
    "size": "Small",
    "price": 3
   },
   {
    "size": "Large",
    "price": 4
   }
  ]
 },
 {
  "id": "168",
  "name": "Green Apple",
  "category": "Refresher",
  "price": 3,
  "image": "assets/img/products/168-green-apple.png",
  "badge": "",
  "featured": false,
  "sizes": [
   {
    "size": "Small",
    "price": 3
   },
   {
    "size": "Medium",
    "price": 4
   }
  ]
 },
 {
  "id": "161",
  "name": "Mango Mojito",
  "category": "Refresher",
  "price": 3,
  "image": "assets/img/products/161-mango-mojito.png",
  "badge": "",
  "featured": false,
  "sizes": null
 },
 {
  "id": "52",
  "name": "Passion Fruit Refresh",
  "category": "Refresher",
  "price": 2.5,
  "image": "assets/img/products/52-passion-fruit-refresh.png",
  "badge": "",
  "featured": false,
  "sizes": [
   {
    "size": "Small",
    "price": 2.5
   },
   {
    "size": "Large",
    "price": 3.5
   }
  ]
 },
 {
  "id": "58",
  "name": "Strawberry Mojito Refresher",
  "category": "Refresher",
  "price": 3,
  "image": "assets/img/products/58-strawberry-mojito-refresher.png",
  "badge": "",
  "featured": false,
  "sizes": [
   {
    "size": "Small",
    "price": 3
   },
   {
    "size": "Large",
    "price": 4
   }
  ]
 },
 {
  "id": "62",
  "name": "Passion Pear Smoothie",
  "category": "Smoothies",
  "price": 3.5,
  "image": "assets/img/products/62-passion-pear-smoothie.png",
  "badge": "bestseller",
  "featured": true,
  "sizes": [
   {
    "size": "Small",
    "price": 3.5
   },
   {
    "size": "Large",
    "price": 4.5
   }
  ]
 },
 {
  "id": "71",
  "name": "Blueberry Strawberry",
  "category": "Smoothies",
  "price": 3.5,
  "image": "assets/img/products/71-blueberry-strawberry.png",
  "badge": "",
  "featured": false,
  "sizes": [
   {
    "size": "Small",
    "price": 3.5
   },
   {
    "size": "Large",
    "price": 4.5
   }
  ]
 },
 {
  "id": "60",
  "name": "Cherry Smoothie",
  "category": "Smoothies",
  "price": 3.5,
  "image": "assets/img/products/60-cherry-smoothie.png",
  "badge": "",
  "featured": false,
  "sizes": [
   {
    "size": "Small",
    "price": 3.5
   },
   {
    "size": "Large",
    "price": 4.5
   }
  ]
 },
 {
  "id": "61",
  "name": "Mango Smoothie",
  "category": "Smoothies",
  "price": 3,
  "image": "assets/img/products/61-mango-smoothie.png",
  "badge": "",
  "featured": false,
  "sizes": null
 },
 {
  "id": "64",
  "name": "Peach Smoothie",
  "category": "Smoothies",
  "price": 3,
  "image": "assets/img/products/64-peach-smoothie.png",
  "badge": "",
  "featured": false,
  "sizes": null
 },
 {
  "id": "165",
  "name": "Strawberry Smoothie",
  "category": "Smoothies",
  "price": 3,
  "image": "assets/img/products/165-strawberry-smoothie.png",
  "badge": "",
  "featured": false,
  "sizes": [
   {
    "size": "Small",
    "price": 3
   },
   {
    "size": "Large",
    "price": 4
   }
  ]
 },
 {
  "id": "34",
  "name": "Basbusa",
  "category": "Cakes",
  "price": 2.5,
  "image": "assets/img/products/34-basbusa.png",
  "badge": "",
  "featured": false,
  "sizes": null
 },
 {
  "id": "1295",
  "name": "Carrot cake",
  "category": "Cakes",
  "price": 3.25,
  "image": "assets/img/products/1295-carrot-cake.jpg",
  "badge": "",
  "featured": false,
  "sizes": null
 },
 {
  "id": "551",
  "name": "Chocolate Cake",
  "category": "Cakes",
  "price": 2.5,
  "image": "assets/img/products/551-chocolate-cake.png",
  "badge": "",
  "featured": false,
  "sizes": null
 },
 {
  "id": "32",
  "name": "Lotus Cheesecake",
  "category": "Cakes",
  "price": 3.5,
  "image": "assets/img/products/32-lotus-cheesecake.png",
  "badge": "",
  "featured": false,
  "sizes": null
 },
 {
  "id": "37",
  "name": "Cinnamon Rolls",
  "category": "pastry_kobac",
  "price": 1.25,
  "image": "assets/img/products/37-cinnamon-rolls.png",
  "badge": "bestseller",
  "featured": true,
  "sizes": null
 },
 {
  "id": "539",
  "name": "Banana Bread",
  "category": "pastry_kobac",
  "price": 2,
  "image": "assets/img/products/539-banana-bread.png",
  "badge": "",
  "featured": false,
  "sizes": null
 },
 {
  "id": "490",
  "name": "Chocolate Chip Cookies",
  "category": "pastry_kobac",
  "price": 1.5,
  "image": "assets/img/products/490-chocolate-chip-cookies.png",
  "badge": "",
  "featured": false,
  "sizes": null
 },
 {
  "id": "31",
  "name": "Doughnut",
  "category": "pastry_kobac",
  "price": 1.5,
  "image": "assets/img/products/31-doughnut.png",
  "badge": "",
  "featured": false,
  "sizes": null
 },
 {
  "id": "1352",
  "name": "Khaliil Naxli",
  "category": "pastry_kobac",
  "price": 0.5,
  "image": "assets/img/products/1352-khaliil-naxli.jpg",
  "badge": "",
  "featured": false,
  "sizes": null
 },
 {
  "id": "1504",
  "name": "Grilled Egg Toast",
  "category": "Sandwiches",
  "price": 2.1,
  "image": "assets/img/products/1504-grilled-egg-toast.jpg",
  "badge": "",
  "featured": false,
  "sizes": null
 },
 {
  "id": "73",
  "name": "Dasani Water",
  "category": "Bottle Drinks",
  "price": 0.5,
  "image": "assets/img/products/73-dasani-water.png",
  "badge": "",
  "featured": false,
  "sizes": null
 },
 {
  "id": "1090",
  "name": "Sprite",
  "category": "Bottle Drinks",
  "price": 0.5,
  "image": "assets/img/products/1090-sprite.jpg",
  "badge": "",
  "featured": false,
  "sizes": null
 },
 {
  "id": "72",
  "name": "Water 300ml",
  "category": "Bottle Drinks",
  "price": 0.25,
  "image": "assets/img/products/72-water-300ml.png",
  "badge": "",
  "featured": false,
  "sizes": null
 },
 {
  "id": "80",
  "name": "Egg",
  "category": "EGG EX",
  "price": 5.15,
  "image": "assets/img/products/80-egg.png",
  "badge": "",
  "featured": false,
  "sizes": null
 }
];
