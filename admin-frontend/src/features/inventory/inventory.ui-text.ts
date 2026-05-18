export const inventoryUiText = {
  listPage: {
    title: 'Inventory List',
    filtersTitle: 'Filters',
    filterSections: {
      inventoryStatus: 'Inventory Status',
      productStatus: 'Product Status',
      manufacturer: 'Manufacturer',
    },
    chips: {
      searchPrefix: 'Search',
      inventoryStatusPrefix: 'Inventory',
      productStatusPrefix: 'Product',
      manufacturerPrefix: 'Manufacturer',
    },
  },
  detailsPage: {
    backToInventory: 'Inventory',
    actions: {
      viewProduct: 'View Product',
      adjust: 'Adjust',
      settings: 'Settings',
    },
    summary: {
      inventoryStatus: 'Inventory Status',
      totalAvailable: 'Total Available',
      totalQuantity: 'Total Quantity',
      totalReserved: 'Total Reserved',
      lowStockVariants: 'Low Stock Variants',
      outOfStockVariants: 'Out Of Stock Variants',
    },
    labels: {
      variantStatus: 'Product Variant Status',
      stockGroup: 'Stock',
      rulesGroup: 'Rules',
      quantity: 'Quantity',
      reserved: 'Reserved',
      available: 'Available',
      threshold: 'Threshold',
      directOrder: 'Direct Order',
      stockStatus: 'Stock Status',
      sellingOutOfStock: 'Selling Out Of Stock',
      allowed: 'Allowed',
      blocked: 'Blocked',
    },
    placeholders: {
      missingProductId: 'Product id is missing.',
      unavailable: 'Inventory details are unavailable.',
      noVariants: 'No inventory variants found.',
    },
  },
} as const
