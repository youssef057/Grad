// Egyptian Governorates (English & Arabic)
const VALID_GOVERNORATES = [
  'Cairo', 'Giza', 'Alexandria', 'Qalyubia', 'Sharqia', 'Dakahlia', 
  'Beheira', 'Kafr El Sheikh', 'Gharbia', 'Monufia', 'Damietta',
  'Port Said', 'Ismailia', 'Suez', 'North Sinai', 'South Sinai',
  'Red Sea', 'Luxor', 'Aswan', 'Qena', 'Sohag', 'Asyut', 'Minya',
  'Beni Suef', 'Fayoum', 'New Valley', 'Matrouh'
];

const VALID_GOVERNORATES_AR = [
  'القاهرة', 'الجيزة', 'الإسكندرية', 'القليوبية', 'الشرقية', 'الدقهلية',
  'البحيرة', 'كفر الشيخ', 'الغربية', 'المنوفية', 'دمياط',
  'بورسعيد', 'الإسماعيلية', 'السويس', 'شمال سيناء', 'جنوب سيناء',
  'البحر الأحمر', 'الأقصر', 'أسوان', 'قنا', 'سوهاج', 'أسيوط', 'المنيا',
  'بني سويف', 'الفيوم', 'الوادي الجديد', 'مطروح'
];

// Order Status Transitions
const VALID_STATUS_TRANSITIONS = {
  'PENDING': ['ASSIGNED', 'CANCELLED'],
  'ASSIGNED': ['PICKED_UP', 'CANCELLED'],
  'PICKED_UP': ['IN_TRANSIT', 'RETURNED'],
  'IN_TRANSIT': ['DELIVERED', 'PARTIALLY_DELIVERED', 'RETURNED'],
  'DELIVERED': [],  // Final state
  'PARTIALLY_DELIVERED': ['DELIVERED'],  // Can complete delivery
  'CANCELLED': [],  // Final state
  'RETURNED': ['PENDING']  // Can be reassigned
};

// Arabic Status Names
const ORDER_STATUS_AR = {
  'PENDING': 'معلق',
  'ASSIGNED': 'مُعين',
  'PICKED_UP': 'مُستلم',
  'IN_TRANSIT': 'في الطريق',
  'DELIVERED': 'مُسلم',
  'PARTIALLY_DELIVERED': 'مُسلم جزئياً',
  'CANCELLED': 'ملغي',
  'RETURNED': 'مُرتجع'
};

// Business Rules
const BUSINESS_RULES = {
  MAX_BULK_ASSIGNMENT: 100,     // Maximum orders in one bulk assignment
  DEFAULT_MAX_ORDERS_PER_DRIVER: 15,  // Default if not set by admin
  MIN_ORDERS_PER_DRIVER: 1,
  MAX_ORDERS_PER_DRIVER: 50
};

// Rate Limiting Configuration (Balanced for free use)
const RATE_LIMITS = {
  BULK_ASSIGNMENT: {
    windowMs: 5 * 60 * 1000,    // 5 minutes
    max: 50,                    // 50 bulk assignments per 5 minutes
    message: 'Too many bulk assignments, please wait 5 minutes',
    messageAr: 'عدد كبير من التعيينات المجمعة، يرجى الانتظار 5 دقائق'
  },
  ORDER_CREATION: {
    windowMs: 15 * 60 * 1000,   // 15 minutes  
    max: 200,                   // 200 order creations per 15 minutes
    message: 'Too many order creations, please wait',
    messageAr: 'عدد كبير من إنشاء الطلبات، يرجى الانتظار'
  }
};

// Arabic Error Messages
const ERROR_MESSAGES_AR = {
  DRIVER_NOT_FOUND: 'السائق غير موجود',
  DRIVER_NOT_ACTIVE: 'السائق غير نشط',
  DRIVER_CAPACITY_EXCEEDED: 'تجاوز السائق الحد الأقصى للطلبات المسموح ({max}). حالياً لديه {current} طلب',
  OUTSOURCE_NOT_FOUND: 'الشريك الخارجي غير موجود',
  VEHICLE_NOT_FOUND: 'المركبة غير موجودة',
  VEHICLE_NOT_AVAILABLE: 'المركبة غير متاحة',
  ORDERS_NOT_FOUND: 'بعض الطلبات غير موجودة أو غير نشطة',
  ORDERS_ALREADY_ASSIGNED: 'الطلبات مُعينة مسبقاً: {orderNumbers}',
  ORDERS_NOT_PENDING: 'الطلبات ليست في حالة معلقة: {orderNumbers}',
  INVALID_STATUS_TRANSITION: 'لا يمكن تغيير الحالة من {from} إلى {to}. التغييرات المسموحة: {allowed}',
  SYSTEM_CONFIG_UPDATE_FAILED: 'فشل في تحديث إعدادات النظام',
  MAX_ORDERS_OUT_OF_RANGE: 'الحد الأقصى للطلبات يجب أن يكون بين {min} و {max}'
};

// Arabic validation patterns
const ARABIC_PATTERNS = {
  ARABIC_TEXT: /^[\u0600-\u06FF\s\u060C\u061B\u061F\u0640]+$/,  // Arabic with punctuation
  ARABIC_NAME: /^[\u0600-\u06FF\s]+$/,  // Arabic names only
  MIXED_TEXT: /^[\u0600-\u06FFa-zA-Z0-9\s\u060C\u061B\u061F\u0640.-]+$/  // Arabic + English + numbers
};

module.exports = {
  VALID_GOVERNORATES,
  VALID_GOVERNORATES_AR,
  VALID_STATUS_TRANSITIONS,
  ORDER_STATUS_AR,
  BUSINESS_RULES,
  RATE_LIMITS,
  ERROR_MESSAGES_AR,
  ARABIC_PATTERNS
};