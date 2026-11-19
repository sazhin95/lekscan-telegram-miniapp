/**
 * ONLY SYNTHETIC DEMONSTRATION DATA.
 * Pharmacy names and prices in this file are fictional and MUST NOT be used as real offers.
 * Drug active ingredients, forms, and common names are illustrative catalogue entries.
 */
window.LEKSCAN_DATA = {
  cities: [
    'Москва', 'Санкт-Петербург', 'Иваново', 'Казань', 'Нижний Новгород',
    'Екатеринбург', 'Новосибирск', 'Краснодар', 'Самара', 'Воронеж',
    'Ярославль', 'Владимир', 'Кострома', 'Тула', 'Ростов-на-Дону',
    'Пермь', 'Уфа', 'Тюмень', 'Красноярск', 'Челябинск'
  ],
  products: [
    {
      id: 'paracetamol', mnn: 'Парацетамол', aliases: ['панадол', 'эффералган', 'paracetamol'],
      forms: ['Таблетки', 'Суспензия'],
      combinations: [
        { form: 'Таблетки', dose: '500 мг', packs: ['10 шт.', '20 шт.'], base: 96 },
        { form: 'Суспензия', dose: '120 мг/5 мл', packs: ['100 мл'], base: 150 }
      ]
    },
    {
      id: 'ibuprofen', mnn: 'Ибупрофен', aliases: ['нурофен', 'ibuprofen'],
      forms: ['Таблетки', 'Суспензия'],
      combinations: [
        { form: 'Таблетки', dose: '200 мг', packs: ['10 шт.', '20 шт.'], base: 210 },
        { form: 'Таблетки', dose: '400 мг', packs: ['20 шт.'], base: 275 },
        { form: 'Суспензия', dose: '100 мг/5 мл', packs: ['100 мл'], base: 295 }
      ]
    },
    {
      id: 'cetirizine', mnn: 'Цетиризин', aliases: ['зиртек', 'цетрин', 'cetirizine'],
      forms: ['Таблетки', 'Капли'],
      combinations: [
        { form: 'Таблетки', dose: '10 мг', packs: ['10 шт.', '20 шт.'], base: 175 },
        { form: 'Капли', dose: '10 мг/мл', packs: ['20 мл'], base: 270 }
      ]
    },
    {
      id: 'tirzepatide', mnn: 'Тирзепатид', aliases: ['тирзепатид', 'tirzepatide', 'мунджаро'],
      forms: ['Раствор для инъекций'],
      combinations: [
        { form: 'Раствор для инъекций', dose: '2,5 мг/доза', packs: ['4 дозы'], base: 6250 },
        { form: 'Раствор для инъекций', dose: '5 мг/доза', packs: ['4 дозы'], base: 7600 },
        { form: 'Раствор для инъекций', dose: '10 мг/доза', packs: ['4 дозы'], base: 10800 }
      ]
    }
  ],
  demoPharmacies: [
    { id: 'a', name: 'Аптека А', subtitle: 'Вымышленная точка', coefficient: 0.91 },
    { id: 'b', name: 'Аптека Б', subtitle: 'Вымышленная точка', coefficient: 1.08 },
    { id: 'c', name: 'Аптека В', subtitle: 'Вымышленная точка', coefficient: 0.99 },
    { id: 'd', name: 'Аптека Г', subtitle: 'Вымышленная точка', coefficient: 1.17 }
  ]
};
