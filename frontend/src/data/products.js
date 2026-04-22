import categoryBasketball from '../assets/images/categories/category-basketball.jpg'
import categoryLifestyle from '../assets/images/categories/category-lifestyle.jpg'
import categoryRunning from '../assets/images/categories/category-running.jpg'
import categoryTraining from '../assets/images/categories/category-training.jpg'
import heroMainImage from '../assets/images/hero/hero-main-dark-shoe.jpg'
import productAeroLitePair from '../assets/images/products/product-aerolite-white-pair.jpg'
import productAeroLiteSingle from '../assets/images/products/product-aerolite-white-single.jpg'
import productAeroRunBlackRed from '../assets/images/products/product-aerorun-black-red-top.jpg'
import productBlackNeon from '../assets/images/products/product-black-neon-side.jpg'

export const categories = [
  {
    id: 'running',
    name_uz: 'Running',
    name_ru: 'Бег',
    caption_uz: 'Yengil va tez',
    caption_ru: 'Лёгкость и скорость',
    image: categoryRunning,
  },
  {
    id: 'lifestyle',
    name_uz: 'Lifestyle',
    name_ru: 'Лайфстайл',
    caption_uz: 'Shahar uchun',
    caption_ru: 'Для города',
    image: categoryLifestyle,
  },
  {
    id: 'basketball',
    name_uz: 'Basketball',
    name_ru: 'Баскетбол',
    caption_uz: 'Court performance',
    caption_ru: 'Для паркета',
    image: categoryBasketball,
  },
  {
    id: 'training',
    name_uz: 'Training',
    name_ru: 'Тренировки',
    caption_uz: 'Gym va quvvat',
    caption_ru: 'Зал и сила',
    image: categoryTraining,
  },
  {
    id: 'clothing',
    name_uz: 'Kiyimlar',
    name_ru: 'Одежда',
    caption_uz: 'Hoodie va jacket',
    caption_ru: 'Hoodie и куртки',
    image: categoryLifestyle,
  },
]

const sizeRun = [
  { size: 38, inStock: false },
  { size: 39, inStock: true },
  { size: 40, inStock: true },
  { size: 41, inStock: true },
  { size: 42, inStock: false },
  { size: 43, inStock: true },
]

export const products = [
  {
    id: 1,
    name_uz: 'AeroRun Pro',
    name_ru: 'AeroRun Pro',
    detailName_uz: 'AeroRun Pro — Qora / Oq',
    detailName_ru: 'AeroRun Pro — Чёрный / Белый',
    description_uz:
      'Yengil, nafas oladigan knit usti va responsiv yostiqcha bilan yaratilgan yugurish krossovkasi.',
    description_ru:
      'Лёгкие беговые кроссовки с дышащим верхом и отзывчивой амортизацией.',
    price: 1299000,
    oldPrice: 1624000,
    discountPercent: 20,
    image: productAeroRunBlackRed,
    detailImage: productAeroRunBlackRed,
    category: 'running',
    gender: ['men', 'unisex'],
    type: 'shoe',
    colors: ['#0f0f10', '#ffffff', '#ff3b30'],
    sizes: sizeRun,
  },
  {
    id: 2,
    name_uz: 'AeroCourt High',
    name_ru: 'AeroCourt High',
    detailName_uz: 'AeroCourt High — Ko‘k / Oq',
    detailName_ru: 'AeroCourt High — Синий / Белый',
    description_uz:
      'Shahar ritmi va maydon ruhini birlashtirgan, baland siluetli premium krossovka.',
    description_ru:
      'Премиальный высокий силуэт, объединяющий городской ритм и баскетбольный характер.',
    price: 1499000,
    oldPrice: 1765000,
    discountPercent: 15,
    image: heroMainImage,
    detailImage: heroMainImage,
    category: 'basketball',
    gender: ['men'],
    type: 'shoe',
    colors: ['#1d4ed8', '#ffffff', '#0f0f10'],
    sizes: [
      { size: 38, inStock: true },
      { size: 39, inStock: true },
      { size: 40, inStock: false },
      { size: 41, inStock: true },
      { size: 42, inStock: true },
      { size: 43, inStock: false },
    ],
  },
  {
    id: 3,
    name_uz: 'AeroLite',
    name_ru: 'AeroLite',
    detailName_uz: 'AeroLite — Oq / Silver',
    detailName_ru: 'AeroLite — Белый / Silver',
    description_uz:
      'Minimal ko‘rinishdagi lifestyle juftligi, yumshoq ichki qoplama va toza konturlar.',
    description_ru:
      'Минималистичная lifestyle-пара с мягкой внутренней отделкой и чистыми линиями.',
    price: 999000,
    oldPrice: 1110000,
    discountPercent: 10,
    image: productAeroLiteSingle,
    detailImage: productAeroLitePair,
    category: 'lifestyle',
    gender: ['women', 'unisex'],
    type: 'shoe',
    colors: ['#f5f5f5', '#c4c4c4', '#0f0f10'],
    sizes: [
      { size: 38, inStock: true },
      { size: 39, inStock: false },
      { size: 40, inStock: true },
      { size: 41, inStock: true },
      { size: 42, inStock: true },
      { size: 43, inStock: true },
    ],
  },
  {
    id: 4,
    name_uz: 'AeroTrain',
    name_ru: 'AeroTrain',
    detailName_uz: 'AeroTrain — Black Neon',
    detailName_ru: 'AeroTrain — Black Neon',
    description_uz:
      'Mashg‘ulotlar uchun yengil tayanch, kuchli grip va energik neon aksentli model.',
    description_ru:
      'Лёгкая поддержка для тренировок, уверенный grip и энергичный neon-акцент.',
    price: 1199000,
    oldPrice: 1599000,
    discountPercent: 25,
    image: productBlackNeon,
    detailImage: productBlackNeon,
    category: 'training',
    gender: ['men', 'unisex'],
    type: 'shoe',
    colors: ['#0f0f10', '#d9ff00', '#ffffff'],
    sizes: [
      { size: 38, inStock: false },
      { size: 39, inStock: true },
      { size: 40, inStock: true },
      { size: 41, inStock: false },
      { size: 42, inStock: true },
      { size: 43, inStock: true },
    ],
  },
  {
    id: 5,
    name_uz: 'KED Hoodie',
    name_ru: 'KED Hoodie',
    detailName_uz: 'KED Hoodie — Black',
    detailName_ru: 'KED Hoodie — Чёрный',
    description_uz:
      'Minimal streetwear hoodie: yumshoq mato, oversize fit va sport uslubidagi toza siluet.',
    description_ru:
      'Минималистичный streetwear hoodie: мягкая ткань, oversize fit и чистый спортивный силуэт.',
    price: 699000,
    oldPrice: 899000,
    discountPercent: 22,
    image: productBlackNeon,
    detailImage: productBlackNeon,
    category: 'clothing',
    gender: ['men', 'unisex'],
    type: 'clothing',
    colors: ['#0f0f10', '#4b5563', '#ffffff'],
    sizes: [
      { size: 'S', inStock: true },
      { size: 'M', inStock: true },
      { size: 'L', inStock: true },
      { size: 'XL', inStock: false },
    ],
  },
  {
    id: 6,
    name_uz: 'KED T-shirt',
    name_ru: 'KED T-shirt',
    detailName_uz: 'KED T-shirt — White',
    detailName_ru: 'KED T-shirt — Белый',
    description_uz:
      'Yengil cotton futbolka, kundalik styling uchun minimal KED UZ estetikasida.',
    description_ru:
      'Лёгкая cotton футболка в минималистичной эстетике KED UZ для ежедневного образа.',
    price: 289000,
    oldPrice: 349000,
    discountPercent: 17,
    image: productAeroLiteSingle,
    detailImage: productAeroLitePair,
    category: 'clothing',
    gender: ['women', 'unisex'],
    type: 'clothing',
    colors: ['#ffffff', '#ef4444', '#0f0f10'],
    sizes: [
      { size: 'S', inStock: true },
      { size: 'M', inStock: false },
      { size: 'L', inStock: true },
      { size: 'XL', inStock: true },
    ],
  },
  {
    id: 7,
    name_uz: 'Sport Jacket',
    name_ru: 'Sport Jacket',
    detailName_uz: 'Sport Jacket — Redline',
    detailName_ru: 'Sport Jacket — Redline',
    description_uz:
      'Shamolga chidamli sport jacket, yengil qatlam va sharp urban ko‘rinishga ega.',
    description_ru:
      'Ветрозащитная sport jacket с лёгким слоем и выразительным urban-силуэтом.',
    price: 849000,
    oldPrice: 1099000,
    discountPercent: 23,
    image: productAeroRunBlackRed,
    detailImage: productAeroRunBlackRed,
    category: 'clothing',
    gender: ['men', 'women', 'unisex'],
    type: 'clothing',
    colors: ['#ff3b30', '#0f0f10', '#ffffff'],
    sizes: [
      { size: 'S', inStock: false },
      { size: 'M', inStock: true },
      { size: 'L', inStock: true },
      { size: 'XL', inStock: true },
    ],
  },
]
