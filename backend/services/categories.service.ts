import mongoose, { ClientSession, Types } from "mongoose";
import { ICategoryNode } from "../data/types";
import {
  CategoryFlatNodeDTO,
  CategoryNodeDTO,
  CategoryNodePathItemDTO,
  CategoryTreeNodeDTO,
} from "../data/types/dto/categories.dto";
import { getTodaysDate } from "../utils/utils";
import CategoryTreeModel from "../models/category-tree.model";
import Product from "../models/product.model";

type MutableCategoryNode = Omit<ICategoryNode, "children"> & {
  children: MutableCategoryNode[];
};

type NodeContext = {
  node: MutableCategoryNode;
  parent: MutableCategoryNode | null;
  root: MutableCategoryNode;
};

type TreeDocument = {
  _id?: Types.ObjectId;
  nodes: MutableCategoryNode[];
  createdOn: string;
  updatedOn: string;
};

class CategoriesService {
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

  private cloneNodes(nodes: MutableCategoryNode[]): MutableCategoryNode[] {
    return nodes.map((node) => ({
      ...node,
      children: this.cloneNodes(node.children ?? []),
    }));
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

  private async getOrCreateTree(): Promise<TreeDocument> {
    const existing = await CategoryTreeModel.findOne().lean().exec();
    if (existing) {
      return existing as unknown as TreeDocument;
    }

    const now = getTodaysDate(true);
    const created = await CategoryTreeModel.create({
      nodes: [],
      createdOn: now,
      updatedOn: now,
    });
    return created.toObject() as unknown as TreeDocument;
  }

  async ensureTreeExists() {
    await this.getOrCreateTree();
  }

  private toNodePathItem(node: MutableCategoryNode): CategoryNodePathItemDTO {
    return {
      _id: this.toCategoryIdString(node._id),
      name: node.name,
      slug: node.slug,
    };
  }

  private toNodeDTO(node: MutableCategoryNode): CategoryNodeDTO {
    return {
      _id: this.toCategoryIdString(node._id),
      name: node.name,
      slug: node.slug,
      description: node.description,
      imageUrl: node.imageUrl,
      children: (node.children ?? []).map((child) => this.toNodeDTO(child)),
      createdOn: (node.createdOn as any) instanceof Date ? (node.createdOn as any).toISOString() : node.createdOn,
      updatedOn: (node.updatedOn as any) instanceof Date ? (node.updatedOn as any).toISOString() : node.updatedOn,
    };
  }

  private toTreeNodeDTO(node: MutableCategoryNode, directProductsCountByCategoryId: Map<string, number>): CategoryTreeNodeDTO {
    const children = (node.children ?? []).map((child) => this.toTreeNodeDTO(child, directProductsCountByCategoryId));
    const categoryId = this.toCategoryIdString(node._id);
    const directProductsCount = directProductsCountByCategoryId.get(categoryId) ?? 0;
    const descendantsProductsCount = children.reduce((total, child) => total + child.productsCount, 0);

    return {
      _id: categoryId,
      name: node.name,
      slug: node.slug,
      description: node.description,
      imageUrl: node.imageUrl,
      children,
      productsCount: directProductsCount + descendantsProductsCount,
      createdOn: (node.createdOn as any) instanceof Date ? (node.createdOn as any).toISOString() : node.createdOn,
      updatedOn: (node.updatedOn as any) instanceof Date ? (node.updatedOn as any).toISOString() : node.updatedOn,
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

  private flattenNodes(
    nodes: MutableCategoryNode[],
    options: {
      parentId?: string;
      path?: CategoryNodePathItemDTO[];
    } = {},
  ): CategoryFlatNodeDTO[] {
    const parentId = options.parentId;
    const path = options.path ?? [];
    return nodes.flatMap((node) => {
      const nodePath = [...path, this.toNodePathItem(node)];
      const current: CategoryFlatNodeDTO = {
        _id: this.toCategoryIdString(node._id),
        name: node.name,
        slug: node.slug,
        description: node.description,
        imageUrl: node.imageUrl,
        parentId,
        path: nodePath,
        createdOn: (node.createdOn as any) instanceof Date ? (node.createdOn as any).toISOString() : node.createdOn,
        updatedOn: (node.updatedOn as any) instanceof Date ? (node.updatedOn as any).toISOString() : node.updatedOn,
      };
      const children = this.flattenNodes(node.children ?? [], {
        parentId: this.toCategoryIdString(node._id),
        path: nodePath,
      });
      return [current, ...children];
    });
  }

  private findNodeContext(
    nodes: MutableCategoryNode[],
    categoryId: string,
    parent: MutableCategoryNode | null = null,
    root?: MutableCategoryNode,
  ): NodeContext | null {
    for (const node of nodes) {
      const currentRoot = root ?? node;
      if (this.toCategoryIdString(node._id) === categoryId) {
        return {
          node,
          parent,
          root: currentRoot,
        };
      }
      const nested = this.findNodeContext(node.children ?? [], categoryId, node, currentRoot);
      if (nested) {
        return nested;
      }
    }
    return null;
  }

  private collectDescendantIds(node: MutableCategoryNode): string[] {
    const childIds = (node.children ?? []).flatMap((child) => this.collectDescendantIds(child));
    return [this.toCategoryIdString(node._id), ...childIds].filter(Boolean);
  }

  private sortNodesByName(nodes: MutableCategoryNode[]) {
    nodes.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    for (const node of nodes) {
      this.sortNodesByName(node.children ?? []);
    }
  }

  private assertUniqueSlug(
    nodes: MutableCategoryNode[],
    slug: string,
    ignoredNodeId?: string,
  ): { isValid: true } | { isValid: false; error: string } {
    const flattened = this.flattenNodes(nodes);
    const normalizedSlug = slug.toLowerCase();
    const conflict = flattened.find((node) => {
      if (ignoredNodeId && node._id === ignoredNodeId) {
        return false;
      }
      return node.slug.toLowerCase() === normalizedSlug;
    });
    if (conflict) {
      return { isValid: false, error: `Category slug '${slug}' already exists` };
    }
    return { isValid: true };
  }

  private async persistTree(tree: TreeDocument, session?: ClientSession): Promise<TreeDocument> {
    const updated = await CategoryTreeModel.findByIdAndUpdate(
      tree._id,
      {
        nodes: tree.nodes,
        updatedOn: getTodaysDate(true),
      },
      { new: true, session },
    )
      .lean()
      .exec();
    return updated as unknown as TreeDocument;
  }

  async getTree(): Promise<CategoryTreeNodeDTO[]> {
    const tree = await this.getOrCreateTree();
    const nodes = this.cloneNodes(tree.nodes as MutableCategoryNode[]);
    this.sortNodesByName(nodes);
    const directProductsCountByCategoryId = await this.getDirectProductsCountByCategoryId();
    return nodes.map((node) => this.toTreeNodeDTO(node, directProductsCountByCategoryId));
  }

  async getFlat(): Promise<CategoryFlatNodeDTO[]> {
    const tree = await this.getOrCreateTree();
    const nodes = this.cloneNodes(tree.nodes as MutableCategoryNode[]);
    this.sortNodesByName(nodes);
    return this.flattenNodes(nodes);
  }

  async getNodeById(categoryId: string): Promise<CategoryNodeDTO | null> {
    const tree = await this.getOrCreateTree();
    const context = this.findNodeContext(tree.nodes, categoryId);
    if (!context) {
      return null;
    }
    return this.toNodeDTO(context.node);
  }

  async getNodePath(categoryId: string): Promise<CategoryNodePathItemDTO[] | null> {
    const tree = await this.getOrCreateTree();
    const flattened = this.flattenNodes(tree.nodes);
    const target = flattened.find((node) => node._id === categoryId);
    return target?.path ?? null;
  }

  async getRootCategoryId(categoryId: string): Promise<string | null> {
    const tree = await this.getOrCreateTree();
    const context = this.findNodeContext(tree.nodes, categoryId);
    if (!context) {
      return null;
    }
    return this.toCategoryIdString(context.root._id) || null;
  }

  async getDescendantIds(categoryId: string): Promise<string[] | null> {
    const tree = await this.getOrCreateTree();
    const context = this.findNodeContext(tree.nodes, categoryId);
    if (!context) {
      return null;
    }
    return this.collectDescendantIds(context.node);
  }

  async validateCategoryExists(categoryId: string): Promise<{ isValid: true } | { isValid: false; error: string }> {
    const tree = await this.getOrCreateTree();
    const context = this.findNodeContext(tree.nodes, categoryId);
    if (!context) {
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
    const tree = await this.getOrCreateTree();
    const normalizedName = this.normalizeText(payload.name);
    if (!normalizedName) {
      return { error: "Incorrect request body", statusCode: 400 };
    }

    const slugSource = this.normalizeOptionalText(payload.slug) ?? normalizedName;
    const normalizedSlug = this.slugify(slugSource);
    if (!normalizedSlug) {
      return { error: "Incorrect request body", statusCode: 400 };
    }

    const uniqueSlugResult = this.assertUniqueSlug(tree.nodes, normalizedSlug);
    if (uniqueSlugResult.isValid === false) {
      return { error: uniqueSlugResult.error, statusCode: 409 };
    }

    let parentContext: NodeContext | null = null;
    if (payload.parentId) {
      parentContext = this.findNodeContext(tree.nodes, payload.parentId);
      if (!parentContext) {
        return { error: `Parent category with id '${payload.parentId}' wasn't found`, statusCode: 404 };
      }
    }

    const now = getTodaysDate(true);
    const newNode: MutableCategoryNode = {
      _id: new Types.ObjectId(),
      name: normalizedName,
      slug: normalizedSlug,
      description: this.normalizeOptionalText(payload.description),
      imageUrl: this.normalizeOptionalText(payload.imageUrl),
      children: [],
      createdOn: now,
      updatedOn: now,
    };

    if (parentContext) {
      parentContext.node.children.push(newNode);
    } else {
      tree.nodes.push(newNode);
    }
    this.sortNodesByName(tree.nodes);

    const updatedTree = await this.persistTree(tree);
    const createdNodeId = this.toCategoryIdString(newNode._id);
    const createdContext = this.findNodeContext(updatedTree.nodes, createdNodeId);
    return {
      node: createdContext ? this.toNodeDTO(createdContext.node) : undefined,
    };
  }

  async patchNode(
    categoryId: string,
    payload: Partial<{ name: string; slug: string; description?: string; imageUrl?: string }>,
  ): Promise<{ node?: CategoryNodeDTO; error?: string; statusCode?: number }> {
    const tree = await this.getOrCreateTree();
    const context = this.findNodeContext(tree.nodes, categoryId);
    if (!context) {
      return { error: `Category with id '${categoryId}' wasn't found`, statusCode: 404 };
    }

    if (payload.name !== undefined) {
      const normalizedName = this.normalizeText(payload.name);
      if (!normalizedName) {
        return { error: "Incorrect request body", statusCode: 400 };
      }
      context.node.name = normalizedName;
    }

    if (payload.slug !== undefined) {
      const normalizedSlug = this.slugify(payload.slug);
      if (!normalizedSlug) {
        return { error: "Incorrect request body", statusCode: 400 };
      }
      const uniqueSlugResult = this.assertUniqueSlug(tree.nodes, normalizedSlug, categoryId);
      if (uniqueSlugResult.isValid === false) {
        return { error: uniqueSlugResult.error, statusCode: 409 };
      }
      context.node.slug = normalizedSlug;
    }

    if (payload.description !== undefined) {
      context.node.description = this.normalizeOptionalText(payload.description);
    }

    if (payload.imageUrl !== undefined) {
      context.node.imageUrl = this.normalizeOptionalText(payload.imageUrl);
    }

    context.node.updatedOn = getTodaysDate(true);
    this.sortNodesByName(tree.nodes);
    const updatedTree = await this.persistTree(tree);
    const updatedContext = this.findNodeContext(updatedTree.nodes, categoryId);
    return {
      node: updatedContext ? this.toNodeDTO(updatedContext.node) : undefined,
    };
  }

  async deleteNode(categoryId: string): Promise<{ isDeleted: boolean; error?: string; statusCode?: number }> {
    const tree = await this.getOrCreateTree();
    const context = this.findNodeContext(tree.nodes, categoryId);
    if (!context) {
      return { isDeleted: false, error: `Category with id '${categoryId}' wasn't found`, statusCode: 404 };
    }

    if ((context.node.children ?? []).length > 0) {
      return { isDeleted: false, error: "Not allowed to delete category with children", statusCode: 409 };
    }

    const categoryObjectId = new Types.ObjectId(categoryId);
    const isUsed = await Product.exists({
      $or: [{ categoryId: categoryObjectId }, { rootCategoryId: categoryObjectId }],
    });
    if (isUsed) {
      return { isDeleted: false, error: "Not allowed to delete category, assigned to the product", statusCode: 409 };
    }

    if (context.parent) {
      context.parent.children = context.parent.children.filter(
        (child) => this.toCategoryIdString(child._id) !== categoryId,
      );
    } else {
      tree.nodes = tree.nodes.filter((node) => this.toCategoryIdString(node._id) !== categoryId);
    }

    await this.persistTree(tree);
    return { isDeleted: true };
  }

  async moveNode(
    categoryId: string,
    targetParentId: string | null,
  ): Promise<{ node?: CategoryNodeDTO; error?: string; statusCode?: number }> {
    const tree = await this.getOrCreateTree();
    const sourceContext = this.findNodeContext(tree.nodes, categoryId);
    if (!sourceContext) {
      return { error: `Category with id '${categoryId}' wasn't found`, statusCode: 404 };
    }

    if (targetParentId === categoryId) {
      return { error: "Category cannot be moved into itself", statusCode: 400 };
    }

    const descendantIds = new Set(this.collectDescendantIds(sourceContext.node));
    if (targetParentId && descendantIds.has(targetParentId)) {
      return { error: "Category cannot be moved into its own subtree", statusCode: 400 };
    }

    const targetContext = targetParentId ? this.findNodeContext(tree.nodes, targetParentId) : null;
    if (targetParentId && !targetContext) {
      return { error: `Target parent category with id '${targetParentId}' wasn't found`, statusCode: 404 };
    }

    const oldRootId = this.toCategoryIdString(sourceContext.root._id);
    const sourceNode = sourceContext.node;

    if (sourceContext.parent) {
      sourceContext.parent.children = sourceContext.parent.children.filter(
        (child) => this.toCategoryIdString(child._id) !== categoryId,
      );
    } else {
      tree.nodes = tree.nodes.filter((node) => this.toCategoryIdString(node._id) !== categoryId);
    }

    if (targetContext) {
      targetContext.node.children.push(sourceNode);
    } else {
      tree.nodes.push(sourceNode);
    }

    sourceNode.updatedOn = getTodaysDate(true);
    this.sortNodesByName(tree.nodes);

    const newRootId = targetContext
      ? this.toCategoryIdString(targetContext.root._id)
      : this.toCategoryIdString(sourceNode._id);

    let updatedTree: TreeDocument | null = null;
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        if (oldRootId !== newRootId) {
          const descendantObjectIds = [...descendantIds]
            .filter((id) => Types.ObjectId.isValid(id))
            .map((id) => new Types.ObjectId(id));
          const rootObjectId = Types.ObjectId.isValid(newRootId) ? new Types.ObjectId(newRootId) : null;

          if (rootObjectId && descendantObjectIds.length > 0) {
            await Product.updateMany(
              { categoryId: { $in: descendantObjectIds } },
              { $set: { rootCategoryId: rootObjectId } },
              { session },
            ).exec();
          }
        }

        updatedTree = await this.persistTree(tree, session);
      });
    } finally {
      await session.endSession();
    }

    if (!updatedTree) {
      return { error: "Failed to move category", statusCode: 500 };
    }

    const updatedContext = this.findNodeContext(updatedTree.nodes, categoryId);
    return {
      node: updatedContext ? this.toNodeDTO(updatedContext.node) : undefined,
    };
  }
}

export default new CategoriesService();
