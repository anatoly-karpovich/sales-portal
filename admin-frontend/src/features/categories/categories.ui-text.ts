export const categoriesUiText = {
  page: {
    title: 'Categories',
    subtitle: 'Manage product category hierarchy, parent-child structure and category metadata.',
    addRootButton: '+ Root category',
  },
  tree: {
    title: 'Category tree',
    searchPlaceholder: 'Search category...',
    addRootInlineButton: '+ Add root category',
    empty: 'No categories yet. Create a root category to start.',
  },
  details: {
    placeholderTitle: 'No category selected',
    placeholderText: 'Select a category from the tree or create a new root category.',
    parentBadge: 'Parent category',
    leafBadge: 'Leaf category',
    actions: {
      move: 'Move',
      addChild: '+ Add child',
    },
    sections: {
      createRoot: 'Create root category',
      createChild: 'Create child category',
      generalInfo: 'General info',
      children: 'Children categories',
      usage: 'Category usage',
      dangerZone: 'Danger zone',
    },
    fields: {
      name: 'Name',
      slug: 'Slug',
      parent: 'Parent',
      parentPath: 'Parent path',
      description: 'Description',
      imageUrl: 'Image URL',
    },
    parentRootLabel: 'Root category',
    noChildrenPrefix: 'No child categories yet. Use "Add child" to create the next level under',
    usage: {
      directProducts: 'Direct products',
      subtreeProducts: 'Subtree products',
      rootCategory: 'Root category',
      depth: 'Depth',
      fullPath: 'Full path',
    },
    danger: {
      info: 'Category can be deleted only if it has no child categories and no assigned products.',
      deleteButton: 'Delete category',
      deleteBlockedChildren: 'Has child categories',
      deleteBlockedProducts: 'Used by products',
    },
    createChildBlockedDirectProducts:
      'Cannot add child category because this category already has direct products.',
    create: {
      submit: 'Create category',
      cancel: 'Cancel',
    },
    update: {
      submit: 'Save changes',
    },
  },
  dialogs: {
    deleteTitle: 'Delete category?',
    deleteMessage: 'This action cannot be undone.',
    deleteConfirm: 'Delete',
    cancel: 'Cancel',
    moveTitle: 'Move category?',
    moveConfirm: 'Move category',
    moveSourceLabel: 'Category',
    moveFromLabel: 'From',
    moveToLabel: 'To',
    moveTargetLabel: 'Target parent',
    moveTargetPlaceholder: 'Select target parent',
    moveTargetRequired: 'Target parent is required.',
    moveTargetRootOption: 'Root category',
  },
  validation: {
    nameRequired: 'Name is required.',
    imageUrlInvalid: 'Image URL must be a valid http(s) URL.',
  },
  toasts: {
    createSuccess: 'Category was successfully created.',
    updateSuccess: 'Category was successfully updated.',
    moveSuccess: 'Category was successfully moved.',
    deleteSuccess: 'Category was successfully deleted.',
    refreshFailed: 'Unable to refresh categories. Please reload the page.',
  },
  errors: {
    loadTreeFailed: 'Unable to load categories tree.',
    actionFailed: 'Category action failed. Please try again later.',
  },
} as const

export function getDeleteCategoryMessage(categoryName?: string) {
  return categoryName
    ? `Category: ${categoryName}`
    : 'Are you sure you want to delete this category?'
}
