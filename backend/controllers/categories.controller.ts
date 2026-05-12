import { Response } from "express";
import { Types } from "mongoose";
import { CATEGORY_STATUSES } from "../data/enums";
import {
  CategoryFlatResponseDTO,
  CategoryNodeResponseDTO,
  CategoryProductsResponseDTO,
  CategoryTreeResponseDTO,
  CreateCategoryNodeRequestDTO,
  DeleteCategoryNodeRequestDTO,
  GetCategoriesFlatRequestDTO,
  GetCategoriesTreeRequestDTO,
  GetCategoryNodeRequestDTO,
  GetCategoryProductsRequestDTO,
  MoveCategoryNodeRequestDTO,
  PatchCategoryNodeRequestDTO,
  PatchCategoryStatusRequestDTO,
} from "../data/types/dto/categories.dto";
import { BaseResponseDTO } from "../data/types/dto/common.dto";
import CategoriesService from "../services/categories.service";
import ProductsService from "../services/products.service";

class CategoriesController {
  private parseIncludeArchived(value: string | undefined): boolean {
    if (!value) {
      return true;
    }
    return value !== "false";
  }

  async getTree(req: GetCategoriesTreeRequestDTO, res: Response<CategoryTreeResponseDTO | BaseResponseDTO>) {
    try {
      const includeArchived = this.parseIncludeArchived(req.query.includeArchived);
      const tree = await CategoriesService.getTree({ includeArchived });
      return res.status(200).json({ CategoriesTree: tree, IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async getFlat(req: GetCategoriesFlatRequestDTO, res: Response<CategoryFlatResponseDTO | BaseResponseDTO>) {
    try {
      const requestedStatus = req.query.status ?? CATEGORY_STATUSES.ACTIVE;
      const status =
        requestedStatus === "All" || requestedStatus === CATEGORY_STATUSES.ACTIVE || requestedStatus === CATEGORY_STATUSES.ARCHIVED
          ? requestedStatus
          : CATEGORY_STATUSES.ACTIVE;
      const categories = await CategoriesService.getFlat({ status });
      return res.status(200).json({ Categories: categories, IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async getNode(req: GetCategoryNodeRequestDTO, res: Response<CategoryNodeResponseDTO | BaseResponseDTO>) {
    try {
      const categoryId = req.params.categoryId;
      if (!categoryId || !Types.ObjectId.isValid(categoryId)) {
        return res.status(404).json({ IsSuccess: false, ErrorMessage: `Category with id '${categoryId}' wasn't found` });
      }

      const category = await CategoriesService.getNodeById(categoryId);
      if (!category) {
        return res.status(404).json({ IsSuccess: false, ErrorMessage: `Category with id '${categoryId}' wasn't found` });
      }
      return res.status(200).json({ Category: category, IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async createNode(req: CreateCategoryNodeRequestDTO, res: Response<CategoryNodeResponseDTO | BaseResponseDTO>) {
    try {
      if (req.body.parentId && !Types.ObjectId.isValid(req.body.parentId)) {
        return res
          .status(404)
          .json({ IsSuccess: false, ErrorMessage: `Parent category with id '${req.body.parentId}' wasn't found` });
      }
      const result = await CategoriesService.createNode(req.body);
      if (result.error) {
        return res.status(result.statusCode ?? 400).json({ IsSuccess: false, ErrorMessage: result.error });
      }
      return res.status(201).json({ Category: result.node, IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async patchNode(req: PatchCategoryNodeRequestDTO, res: Response<CategoryNodeResponseDTO | BaseResponseDTO>) {
    try {
      const categoryId = req.params.categoryId;
      if (!categoryId || !Types.ObjectId.isValid(categoryId)) {
        return res.status(404).json({ IsSuccess: false, ErrorMessage: `Category with id '${categoryId}' wasn't found` });
      }

      const result = await CategoriesService.patchNode(categoryId, req.body);
      if (result.error) {
        return res.status(result.statusCode ?? 400).json({ IsSuccess: false, ErrorMessage: result.error });
      }
      return res.status(200).json({ Category: result.node, IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async patchStatus(req: PatchCategoryStatusRequestDTO, res: Response<CategoryNodeResponseDTO | BaseResponseDTO>) {
    try {
      const categoryId = req.params.categoryId;
      if (!categoryId || !Types.ObjectId.isValid(categoryId)) {
        return res.status(404).json({ IsSuccess: false, ErrorMessage: `Category with id '${categoryId}' wasn't found` });
      }

      const result = await CategoriesService.patchStatus(categoryId, req.body.status);
      if (result.error) {
        return res.status(result.statusCode ?? 400).json({ IsSuccess: false, ErrorMessage: result.error });
      }
      return res.status(200).json({ Category: result.node, IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async moveNode(req: MoveCategoryNodeRequestDTO, res: Response<CategoryNodeResponseDTO | BaseResponseDTO>) {
    try {
      const categoryId = req.params.categoryId;
      const targetParentId = req.body.targetParentId;
      if (!categoryId || !Types.ObjectId.isValid(categoryId)) {
        return res.status(404).json({ IsSuccess: false, ErrorMessage: `Category with id '${categoryId}' wasn't found` });
      }
      if (targetParentId !== null && !Types.ObjectId.isValid(targetParentId)) {
        return res
          .status(404)
          .json({ IsSuccess: false, ErrorMessage: `Target parent category with id '${targetParentId}' wasn't found` });
      }

      const result = await CategoriesService.moveNode(categoryId, targetParentId);
      if (result.error) {
        return res.status(result.statusCode ?? 400).json({ IsSuccess: false, ErrorMessage: result.error });
      }
      return res.status(200).json({ Category: result.node, IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async deleteNode(req: DeleteCategoryNodeRequestDTO, res: Response<BaseResponseDTO>) {
    try {
      const categoryId = req.params.categoryId;
      if (!categoryId || !Types.ObjectId.isValid(categoryId)) {
        return res.status(404).json({ IsSuccess: false, ErrorMessage: `Category with id '${categoryId}' wasn't found` });
      }

      const result = await CategoriesService.deleteNode(categoryId);
      if (result.error) {
        return res.status(result.statusCode ?? 400).json({ IsSuccess: false, ErrorMessage: result.error });
      }
      return res.status(204).send();
    } catch (e: any) {
      return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async getNodeProducts(req: GetCategoryProductsRequestDTO, res: Response<CategoryProductsResponseDTO | BaseResponseDTO>) {
    try {
      const categoryId = req.params.categoryId;
      if (!categoryId || !Types.ObjectId.isValid(categoryId)) {
        return res.status(404).json({ IsSuccess: false, ErrorMessage: `Category with id '${categoryId}' wasn't found` });
      }

      const category = await CategoriesService.getNodeById(categoryId);
      if (!category) {
        return res.status(404).json({ IsSuccess: false, ErrorMessage: `Category with id '${categoryId}' wasn't found` });
      }

      const descendantIds = await CategoriesService.getDescendantIds(categoryId);
      const products = await ProductsService.getListItemsByCategoryIds(descendantIds ?? []);
      return res.status(200).json({
        Products: products,
        IsSuccess: true,
        ErrorMessage: null,
      });
    } catch (e: any) {
      return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }
}

export default new CategoriesController();
