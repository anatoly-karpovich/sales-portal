import mongoose, { ClientSession, Types } from "mongoose";
import { ICategoryNode } from "../data/types";
import { CategoryFlatNodeDTO, CategoryNodeDTO, CategoryNodePathItemDTO } from "../data/types/dto/categories.dto";
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
      _id: node._id?.toString?.() ?? "",
      name: node.name,
      slug: node.slug,
    };
  }

  private toNodeDTO(node: MutableCategoryNode): CategoryNodeDTO {
    return {
      _id: node._id?.toString?.() ?? "",
      name: node.name,
      slug: node.slug,
      description: node.description,
      imageUrl: node.imageUrl,
      children: (node.children ?? []).map((child) => this.toNodeDTO(child)),
      createdOn: (node.createdOn as any) instanceof Date ? (node.createdOn as any).toISOString() : node.createdOn,
      updatedOn: (node.updatedOn as any) instanceof Date ? (node.updatedOn as any).toISOString() : node.updatedOn,
    };
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
        _id: node._id?.toString?.() ?? "",
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
        parentId: node._id?.toString?.(),
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
      if (node._id?.toString() === categoryId) {
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
    return [node._id?.toString?.() ?? "", ...childIds].filter(Boolean);
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

  async getTree(): Promise<CategoryNodeDTO[]> {
    const tree = await this.getOrCreateTree();
    const nodes = structuredClone(tree.nodes);
    this.sortNodesByName(nodes);
    return nodes.map((node) => this.toNodeDTO(node));
  }

  async getFlat(): Promise<CategoryFlatNodeDTO[]> {
    const tree = await this.getOrCreateTree();
    const nodes = structuredClone(tree.nodes);
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
    return context.root._id?.toString?.() ?? null;
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
    const createdContext = this.findNodeContext(updatedTree.nodes, newNode._id?.toString?.() ?? "");
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
      context.parent.children = context.parent.children.filter((child) => child._id?.toString() !== categoryId);
    } else {
      tree.nodes = tree.nodes.filter((node) => node._id?.toString() !== categoryId);
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

    const oldRootId = sourceContext.root._id?.toString?.() ?? "";
    const sourceNode = sourceContext.node;

    if (sourceContext.parent) {
      sourceContext.parent.children = sourceContext.parent.children.filter((child) => child._id?.toString() !== categoryId);
    } else {
      tree.nodes = tree.nodes.filter((node) => node._id?.toString() !== categoryId);
    }

    if (targetContext) {
      targetContext.node.children.push(sourceNode);
    } else {
      tree.nodes.push(sourceNode);
    }

    sourceNode.updatedOn = getTodaysDate(true);
    this.sortNodesByName(tree.nodes);

    const newRootId = targetContext ? targetContext.root._id?.toString?.() ?? "" : sourceNode._id?.toString?.() ?? "";

    let updatedTree: TreeDocument | null = null;
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        if (oldRootId !== newRootId) {
          const descendantObjectIds = [...descendantIds].map((id) => new Types.ObjectId(id));
          await Product.updateMany(
            { categoryId: { $in: descendantObjectIds } },
            { $set: { rootCategoryId: new Types.ObjectId(newRootId) } },
            { session },
          ).exec();
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
