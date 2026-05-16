import { Types } from "mongoose";
import {
  CategoryFlatNodeDTO,
  CategoryNodeDTO,
  CategoryNodePathItemDTO,
  CategoryTreeNodeDTO,
} from "../data/types/dto/categories.dto";
import { getTodaysDate } from "../utils/utils";
import CategoryModel from "../models/category.model";
import Product from "../models/product.model";

type CategoryPathStored = {
  _id: Types.ObjectId;
  name: string;
  slug: string;
};

type CategoryRecord = {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  slugLower: string;
  description?: string;
  imageUrl?: string;
  parentId: Types.ObjectId | null;
  rootId: Types.ObjectId;
  depth: number;
  ancestors: Types.ObjectId[];
  path: CategoryPathStored[];
  pathSlugs: string[];
  childrenCount: number;
  isLeaf: boolean;
  createdOn: string | Date;
  updatedOn: string | Date;
};

type CachedPayload<T> = {
  value: T;
  expiresAt: number;
};

class CategoriesService {
  private readonly cacheTtlMs = 5 * 60 * 1000;

  private treeCache: CachedPayload<CategoryTreeNodeDTO[]> | null = null;

  private flatCache: CachedPayload<CategoryFlatNodeDTO[]> | null = null;

  private toCategoryIdString(value: unknown): string {
    if (!value) {
      return "";
    }

    if (typeof value === "string") {
      return value;
    }

    if (value instanceof Types.ObjectId) {
      return value.toHexString();
    }

    if (typeof value === "object") {
      const candidate = value as {
        $oid?: unknown;
        toHexString?: () => string;
        toString?: () => string;
        type?: string;
        data?: unknown;
      };

      if (typeof candidate.$oid === "string") {
        return candidate.$oid;
      }

      if (typeof candidate.toHexString === "function") {
        const asHex = candidate.toHexString();
        if (asHex && asHex !== "[object Object]") {
          return asHex;
        }
      }

      if (candidate.type === "Buffer" && Array.isArray(candidate.data)) {
        try {
          return new Types.ObjectId(Buffer.from(candidate.data)).toHexString();
        } catch {
          return "";
        }
      }
    }

    const asAny = value as any;
    if (Types.ObjectId.isValid(asAny)) {
      return new Types.ObjectId(asAny).toHexString();
    }

    const fallback = String(value);
    return fallback === "[object Object]" ? "" : fallback;
  }

  private normalizePathItem(item: { _id: unknown; name: string; slug: string }): CategoryPathStored {
    return {
      _id: new Types.ObjectId(this.toCategoryIdString(item._id)),
      name: item.name,
      slug: item.slug,
    };
  }

  private toIsoString(value: unknown): string {
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === "string") {
      return value;
    }

    try {
      return new Date(value as string).toISOString();
    } catch {
      return String(value);
    }
  }

  private normalizeText(value: string): string {
    return value.trim();
  }

  private normalizeOptionalText(value?: string): string | undefined {
    if (typeof value !== "string") {
      return undefined;
    }
    const normalized = this.normalizeText(value);
    return normalized.length > 0 ? normalized : undefined;
  }

  private slugify(value: string): string {
    return this.normalizeText(value)
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  private getCached<T>(cache: CachedPayload<T> | null): T | null {
    if (!cache) {
      return null;
    }
    if (cache.expiresAt <= Date.now()) {
      return null;
    }
    return cache.value;
  }

  private setTreeCache(value: CategoryTreeNodeDTO[]) {
    this.treeCache = {
      value,
      expiresAt: Date.now() + this.cacheTtlMs,
    };
  }

  private setFlatCache(value: CategoryFlatNodeDTO[]) {
    this.flatCache = {
      value,
      expiresAt: Date.now() + this.cacheTtlMs,
    };
  }

  private invalidateCategoryCache() {
    this.treeCache = null;
    this.flatCache = null;
  }

  private toNodePathItem(pathItem: CategoryPathStored): CategoryNodePathItemDTO {
    return {
      _id: this.toCategoryIdString(pathItem._id),
      name: pathItem.name,
      slug: pathItem.slug,
    };
  }

  private toNodeDTOFromTreeNode(node: CategoryTreeNodeDTO): CategoryNodeDTO {
    return {
      _id: node._id,
      name: node.name,
      slug: node.slug,
      description: node.description,
      imageUrl: node.imageUrl,
      children: node.children.map((child) => this.toNodeDTOFromTreeNode(child)),
      createdOn: node.createdOn,
      updatedOn: node.updatedOn,
    };
  }

  private async getDirectProductsCountByCategoryId(): Promise<Map<string, number>> {
    const grouped = await Product.aggregate<{ _id: unknown; count: number }>([
      { $group: { _id: "$categoryId", count: { $sum: 1 } } },
    ]).exec();

    const result = new Map<string, number>();
    for (const item of grouped) {
      const categoryId = this.toCategoryIdString(item._id);
      if (!categoryId) {
        continue;
      }
      result.set(categoryId, item.count);
    }

    return result;
  }

  private async loadAllCategories(): Promise<CategoryRecord[]> {
    return (await CategoryModel.find({}).lean().exec()) as unknown as CategoryRecord[];
  }

  private sortByName(categories: CategoryRecord[]): CategoryRecord[] {
    return [...categories].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  }

  private buildTree(
    categories: CategoryRecord[],
    directProductsCountByCategoryId: Map<string, number>,
  ): CategoryTreeNodeDTO[] {
    const childrenByParentId = new Map<string, CategoryRecord[]>();

    for (const category of categories) {
      const parentKey = category.parentId ? this.toCategoryIdString(category.parentId) : "__ROOT__";
      const currentChildren = childrenByParentId.get(parentKey) ?? [];
      currentChildren.push(category);
      childrenByParentId.set(parentKey, currentChildren);
    }

    const buildNode = (category: CategoryRecord): CategoryTreeNodeDTO => {
      const categoryId = this.toCategoryIdString(category._id);
      const children = this.sortByName(childrenByParentId.get(categoryId) ?? []).map(buildNode);
      const directProductsCount = directProductsCountByCategoryId.get(categoryId) ?? 0;
      const descendantsProductsCount = children.reduce((total, child) => total + child.productsCount, 0);

      return {
        _id: categoryId,
        name: category.name,
        slug: category.slug,
        description: category.description,
        imageUrl: category.imageUrl,
        children,
        directProductsCount,
        productsCount: directProductsCount + descendantsProductsCount,
        createdOn: this.toIsoString(category.createdOn),
        updatedOn: this.toIsoString(category.updatedOn),
      };
    };

    return this.sortByName(childrenByParentId.get("__ROOT__") ?? []).map(buildNode);
  }

  private flattenTreeNodes(
    nodes: CategoryTreeNodeDTO[],
    options: { parentId?: string; path?: CategoryNodePathItemDTO[] } = {},
  ): CategoryFlatNodeDTO[] {
    const parentId = options.parentId;
    const path = options.path ?? [];

    return nodes.flatMap((node) => {
      const nodePathItem = { _id: node._id, name: node.name, slug: node.slug };
      const nodePath = [...path, nodePathItem];

      const current: CategoryFlatNodeDTO = {
        _id: node._id,
        name: node.name,
        slug: node.slug,
        description: node.description,
        imageUrl: node.imageUrl,
        parentId,
        path: nodePath,
        createdOn: node.createdOn,
        updatedOn: node.updatedOn,
      };

      const children = this.flattenTreeNodes(node.children, {
        parentId: node._id,
        path: nodePath,
      });

      return [current, ...children];
    });
  }

  private findNodeInTree(nodes: CategoryTreeNodeDTO[], categoryId: string): CategoryTreeNodeDTO | null {
    for (const node of nodes) {
      if (node._id === categoryId) {
        return node;
      }
      const nested = this.findNodeInTree(node.children, categoryId);
      if (nested) {
        return nested;
      }
    }

    return null;
  }

  private async ensureSlugIsUnique(slug: string, ignoredNodeId?: string): Promise<{ isValid: true } | { isValid: false; error: string }> {
    const slugLower = slug.toLowerCase();
    const match = await CategoryModel.findOne({
      slugLower,
      ...(ignoredNodeId ? { _id: { $ne: new Types.ObjectId(ignoredNodeId) } } : {}),
    })
      .select("_id")
      .lean()
      .exec();

    if (match) {
      return { isValid: false, error: `Category slug '${slug}' already exists` };
    }

    return { isValid: true };
  }

  private async adjustParentChildrenCount(parentId: string, delta: number, changedOn: string) {
    const parent = (await CategoryModel.findById(parentId).lean().exec()) as unknown as CategoryRecord | null;
    if (!parent) {
      return;
    }

    const nextChildrenCount = Math.max((parent.childrenCount ?? 0) + delta, 0);
    await CategoryModel.updateOne(
      { _id: parent._id },
      {
        $set: {
          childrenCount: nextChildrenCount,
          isLeaf: nextChildrenCount === 0,
          updatedOn: changedOn,
        },
      },
    ).exec();
  }

  async getTree(): Promise<CategoryTreeNodeDTO[]> {
    const cached = this.getCached(this.treeCache);
    if (cached) {
      return cached;
    }

    const [categories, directProductsCountByCategoryId] = await Promise.all([
      this.loadAllCategories(),
      this.getDirectProductsCountByCategoryId(),
    ]);

    const tree = this.buildTree(categories, directProductsCountByCategoryId);
    this.setTreeCache(tree);
    return tree;
  }

  async getFlat(): Promise<CategoryFlatNodeDTO[]> {
    const cached = this.getCached(this.flatCache);
    if (cached) {
      return cached;
    }

    const tree = await this.getTree();
    const flat = this.flattenTreeNodes(tree);
    this.setFlatCache(flat);
    return flat;
  }

  async getNodeById(categoryId: string): Promise<CategoryNodeDTO | null> {
    const tree = await this.getTree();
    const node = this.findNodeInTree(tree, categoryId);
    if (!node) {
      return null;
    }
    return this.toNodeDTOFromTreeNode(node);
  }

  async getNodePath(categoryId: string): Promise<CategoryNodePathItemDTO[] | null> {
    const category = (await CategoryModel.findById(categoryId).select("path").lean().exec()) as
      | Pick<CategoryRecord, "path">
      | null;
    if (!category) {
      return null;
    }
    return category.path.map((item) => this.toNodePathItem(item));
  }

  async getRootCategoryId(categoryId: string): Promise<string | null> {
    const category = (await CategoryModel.findById(categoryId).select("rootId").lean().exec()) as
      | Pick<CategoryRecord, "rootId">
      | null;
    if (!category) {
      return null;
    }

    return this.toCategoryIdString(category.rootId) || null;
  }

  async getDescendantIds(categoryId: string): Promise<string[] | null> {
    const categoryObjectId = new Types.ObjectId(categoryId);
    const exists = await CategoryModel.exists({ _id: categoryObjectId });
    if (!exists) {
      return null;
    }

    const descendants = (await CategoryModel.find({ $or: [{ _id: categoryObjectId }, { ancestors: categoryObjectId }] })
      .select("_id")
      .lean()
      .exec()) as Array<{ _id: Types.ObjectId }>;

    return descendants.map((item) => this.toCategoryIdString(item._id)).filter(Boolean);
  }

  async validateCategoryExists(categoryId: string): Promise<{ isValid: true } | { isValid: false; error: string }> {
    const exists = await CategoryModel.exists({ _id: new Types.ObjectId(categoryId) });
    if (!exists) {
      return { isValid: false, error: `Category with id '${categoryId}' wasn't found` };
    }
    return { isValid: true };
  }

  async createNode(payload: {
    name: string;
    slug?: string;
    description?: string;
    imageUrl?: string;
    parentId?: string;
  }): Promise<{ node?: CategoryNodeDTO; error?: string; statusCode?: number }> {
    const normalizedName = this.normalizeText(payload.name);
    if (!normalizedName) {
      return { error: "Incorrect request body", statusCode: 400 };
    }

    const slugSource = this.normalizeOptionalText(payload.slug) ?? normalizedName;
    const normalizedSlug = this.slugify(slugSource);
    if (!normalizedSlug) {
      return { error: "Incorrect request body", statusCode: 400 };
    }

    const uniqueSlugResult = await this.ensureSlugIsUnique(normalizedSlug);
    if (uniqueSlugResult.isValid === false) {
      return { error: uniqueSlugResult.error, statusCode: 409 };
    }

    const normalizedParentId = payload.parentId ? payload.parentId.trim() : "";
    let parentCategory: CategoryRecord | null = null;

    if (normalizedParentId) {
      parentCategory = (await CategoryModel.findById(normalizedParentId).lean().exec()) as unknown as CategoryRecord | null;
      if (!parentCategory) {
        return { error: `Parent category with id '${payload.parentId}' wasn't found`, statusCode: 404 };
      }

      const parentDirectProductsCount = await Product.countDocuments({ categoryId: parentCategory._id }).exec();
      if (parentDirectProductsCount > 0) {
        return {
          error: "Cannot create child category: parent category has direct products assigned",
          statusCode: 409,
        };
      }
    }

    const now = getTodaysDate(true);
    const categoryId = new Types.ObjectId();
    const path: CategoryPathStored[] = parentCategory
      ? [
          ...parentCategory.path.map((item) => this.normalizePathItem(item)),
          { _id: categoryId, name: normalizedName, slug: normalizedSlug },
        ]
      : [{ _id: categoryId, name: normalizedName, slug: normalizedSlug }];

    const newCategory = await CategoryModel.create({
      _id: categoryId,
      name: normalizedName,
      slug: normalizedSlug,
      slugLower: normalizedSlug.toLowerCase(),
      description: this.normalizeOptionalText(payload.description),
      imageUrl: this.normalizeOptionalText(payload.imageUrl),
      parentId: parentCategory ? parentCategory._id : null,
      rootId: parentCategory ? parentCategory.rootId : categoryId,
      depth: parentCategory ? parentCategory.depth + 1 : 0,
      ancestors: parentCategory ? [...parentCategory.ancestors, parentCategory._id] : [],
      path,
      pathSlugs: path.map((item) => item.slug),
      childrenCount: 0,
      isLeaf: true,
      createdOn: now,
      updatedOn: now,
    });

    if (parentCategory) {
      await this.adjustParentChildrenCount(this.toCategoryIdString(parentCategory._id), 1, now);
    }

    this.invalidateCategoryCache();

    return {
      node: {
        _id: this.toCategoryIdString(newCategory._id),
        name: newCategory.name,
        slug: newCategory.slug,
        description: newCategory.description,
        imageUrl: newCategory.imageUrl,
        children: [],
        createdOn: this.toIsoString(newCategory.createdOn),
        updatedOn: this.toIsoString(newCategory.updatedOn),
      },
    };
  }

  async patchNode(
    categoryId: string,
    payload: Partial<{ name: string; slug: string; description?: string; imageUrl?: string }>,
  ): Promise<{ node?: CategoryNodeDTO; error?: string; statusCode?: number }> {
    const category = (await CategoryModel.findById(categoryId).lean().exec()) as unknown as CategoryRecord | null;
    if (!category) {
      return { error: `Category with id '${categoryId}' wasn't found`, statusCode: 404 };
    }

    const nextName = payload.name !== undefined ? this.normalizeText(payload.name) : category.name;
    if (!nextName) {
      return { error: "Incorrect request body", statusCode: 400 };
    }

    const nextSlug = payload.slug !== undefined ? this.slugify(payload.slug) : category.slug;
    if (!nextSlug) {
      return { error: "Incorrect request body", statusCode: 400 };
    }

    if (nextSlug.toLowerCase() !== category.slugLower) {
      const uniqueSlugResult = await this.ensureSlugIsUnique(nextSlug, categoryId);
      if (uniqueSlugResult.isValid === false) {
        return { error: uniqueSlugResult.error, statusCode: 409 };
      }
    }

    const nameOrSlugChanged = nextName !== category.name || nextSlug !== category.slug;
    const now = getTodaysDate(true);

    const updatedPath = nameOrSlugChanged
      ? [...category.path.slice(0, Math.max(category.path.length - 1, 0)), { _id: category._id, name: nextName, slug: nextSlug }]
      : category.path;

    const normalizedDescription =
      payload.description !== undefined ? this.normalizeOptionalText(payload.description) : undefined;
    const normalizedImageUrl = payload.imageUrl !== undefined ? this.normalizeOptionalText(payload.imageUrl) : undefined;

    const setPayload: Record<string, unknown> = {
      name: nextName,
      slug: nextSlug,
      slugLower: nextSlug.toLowerCase(),
      ...(payload.description !== undefined && normalizedDescription !== undefined
        ? { description: normalizedDescription }
        : {}),
      ...(payload.imageUrl !== undefined && normalizedImageUrl !== undefined ? { imageUrl: normalizedImageUrl } : {}),
      ...(nameOrSlugChanged
        ? {
            path: updatedPath,
            pathSlugs: updatedPath.map((item) => item.slug),
          }
        : {}),
      updatedOn: now,
    };

    const unsetPayload: Record<string, 1> = {
      ...(payload.description !== undefined && normalizedDescription === undefined ? { description: 1 } : {}),
      ...(payload.imageUrl !== undefined && normalizedImageUrl === undefined ? { imageUrl: 1 } : {}),
    };

    await CategoryModel.updateOne(
      { _id: category._id },
      {
        $set: setPayload,
        ...(Object.keys(unsetPayload).length > 0 ? { $unset: unsetPayload } : {}),
      },
    ).exec();

    if (nameOrSlugChanged) {
      const descendants = (await CategoryModel.find({ ancestors: category._id }).select("_id path").lean().exec()) as Array<{
        _id: Types.ObjectId;
        path: CategoryPathStored[];
      }>;

      if (descendants.length > 0) {
        await CategoryModel.bulkWrite(
          descendants.map((descendant) => {
            const nextPath = descendant.path.map((pathItem) => {
              if (this.toCategoryIdString(pathItem._id) !== categoryId) {
                return this.normalizePathItem(pathItem);
              }
              return {
                _id: category._id,
                name: nextName,
                slug: nextSlug,
              };
            });

            return {
              updateOne: {
                filter: { _id: descendant._id },
                update: {
                  $set: {
                    path: nextPath,
                    pathSlugs: nextPath.map((item) => item.slug),
                    updatedOn: now,
                  },
                },
              },
            };
          }),
        );
      }
    }

    this.invalidateCategoryCache();

    const updatedNode = await this.getNodeById(categoryId);
    return {
      node: updatedNode ?? undefined,
    };
  }

  async deleteNode(categoryId: string): Promise<{ isDeleted: boolean; error?: string; statusCode?: number }> {
    const category = (await CategoryModel.findById(categoryId).lean().exec()) as unknown as CategoryRecord | null;
    if (!category) {
      return { isDeleted: false, error: `Category with id '${categoryId}' wasn't found`, statusCode: 404 };
    }

    const hasChildren =
      (category.childrenCount ?? 0) > 0 ||
      Boolean(await CategoryModel.exists({ parentId: category._id }).select("_id").lean().exec());
    if (hasChildren) {
      return { isDeleted: false, error: "Not allowed to delete category with children", statusCode: 409 };
    }

    const isUsed = await Product.exists({
      $or: [{ categoryId: category._id }, { rootCategoryId: category._id }],
    });
    if (isUsed) {
      return { isDeleted: false, error: "Not allowed to delete category, assigned to the product", statusCode: 409 };
    }

    await CategoryModel.deleteOne({ _id: category._id }).exec();

    if (category.parentId) {
      await this.adjustParentChildrenCount(this.toCategoryIdString(category.parentId), -1, getTodaysDate(true));
    }

    this.invalidateCategoryCache();
    return { isDeleted: true };
  }

  async moveNode(
    categoryId: string,
    targetParentId: string | null,
  ): Promise<{ node?: CategoryNodeDTO; error?: string; statusCode?: number }> {
    const sourceCategory = (await CategoryModel.findById(categoryId).lean().exec()) as unknown as CategoryRecord | null;
    if (!sourceCategory) {
      return { error: `Category with id '${categoryId}' wasn't found`, statusCode: 404 };
    }

    if (targetParentId === categoryId) {
      return { error: "Category cannot be moved into itself", statusCode: 400 };
    }

    const currentParentId = sourceCategory.parentId ? this.toCategoryIdString(sourceCategory.parentId) : null;
    const normalizedTargetParentId = targetParentId ? targetParentId.trim() : null;

    if (currentParentId === normalizedTargetParentId) {
      return {
        node: (await this.getNodeById(categoryId)) ?? undefined,
      };
    }

    let targetParentCategory: CategoryRecord | null = null;

    if (normalizedTargetParentId) {
      targetParentCategory = (await CategoryModel.findById(normalizedTargetParentId).lean().exec()) as
        | CategoryRecord
        | null;
      if (!targetParentCategory) {
        return { error: `Target parent category with id '${targetParentId}' wasn't found`, statusCode: 404 };
      }

      const sourceIdInTargetAncestors = targetParentCategory.ancestors.some(
        (ancestorId) => this.toCategoryIdString(ancestorId) === categoryId,
      );
      if (sourceIdInTargetAncestors) {
        return { error: "Category cannot be moved into its own subtree", statusCode: 400 };
      }

      const targetDirectProductsCount = await Product.countDocuments({ categoryId: targetParentCategory._id }).exec();
      if (targetDirectProductsCount > 0) {
        return {
          error: "Cannot move category under target parent: target parent has direct products assigned",
          statusCode: 409,
        };
      }
    }

    const subtree = (await CategoryModel.find({
      $or: [{ _id: sourceCategory._id }, { ancestors: sourceCategory._id }],
    })
      .sort({ depth: 1 })
      .lean()
      .exec()) as unknown as CategoryRecord[];

    if (subtree.length === 0) {
      return { error: `Category with id '${categoryId}' wasn't found`, statusCode: 404 };
    }

    const newRootId = targetParentCategory ? targetParentCategory.rootId : sourceCategory._id;
    const newSourcePath: CategoryPathStored[] = targetParentCategory
      ? [
          ...targetParentCategory.path.map((item) => this.normalizePathItem(item)),
          { _id: sourceCategory._id, name: sourceCategory.name, slug: sourceCategory.slug },
        ]
      : [{ _id: sourceCategory._id, name: sourceCategory.name, slug: sourceCategory.slug }];
    const oldSourcePathLength = sourceCategory.path.length;
    const now = getTodaysDate(true);

    await CategoryModel.bulkWrite(
      subtree.map((category) => {
        const isSource = this.toCategoryIdString(category._id) === categoryId;
        const relativePath = isSource ? [] : category.path.slice(oldSourcePathLength).map((item) => this.normalizePathItem(item));
        const nextPath = [...newSourcePath, ...relativePath].map((item) => this.normalizePathItem(item));
        const nextAncestors = nextPath
          .slice(0, Math.max(nextPath.length - 1, 0))
          .map((item) => new Types.ObjectId(this.toCategoryIdString(item._id)));

        return {
          updateOne: {
            filter: { _id: category._id },
            update: {
              $set: {
                ...(isSource ? { parentId: targetParentCategory ? targetParentCategory._id : null } : {}),
                rootId: newRootId,
                depth: Math.max(nextPath.length - 1, 0),
                ancestors: nextAncestors,
                path: nextPath,
                pathSlugs: nextPath.map((item) => item.slug),
                updatedOn: now,
              },
            },
          },
        };
      }),
    );

    if (currentParentId) {
      await this.adjustParentChildrenCount(currentParentId, -1, now);
    }
    if (normalizedTargetParentId) {
      await this.adjustParentChildrenCount(normalizedTargetParentId, 1, now);
    }

    const oldRootCategoryId = this.toCategoryIdString(sourceCategory.rootId);
    const newRootCategoryId = this.toCategoryIdString(newRootId);

    if (oldRootCategoryId !== newRootCategoryId) {
      await Product.updateMany(
        {
          categoryId: { $in: subtree.map((category) => category._id) },
        },
        {
          $set: { rootCategoryId: newRootId },
        },
      ).exec();
    }

    this.invalidateCategoryCache();

    return {
      node: (await this.getNodeById(categoryId)) ?? undefined,
    };
  }
}

export default new CategoriesService();

