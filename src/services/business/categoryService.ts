import { Category } from '../../types/entities';
import { CategorySchema, validateEntity } from '../../schemas/validation';
import { v4 as uuidv4 } from 'uuid';

export class CategoryService {
  private categories: Map<string, Category> = new Map();

  async initialize(): Promise<void> {
    console.log('Category service initialized');
    
    // 创建默认分类
    if (this.categories.size === 0) {
      await this.createDefaultCategories();
    }
  }

  private async createDefaultCategories(): Promise<void> {
    const defaultCategories = [
      { name: '电子产品', level: 1, sortOrder: 1 },
      { name: '办公用品', level: 1, sortOrder: 2 },
      { name: '食品饮料', level: 1, sortOrder: 3 },
      { name: '服装纺织', level: 1, sortOrder: 4 },
      { name: '机械设备', level: 1, sortOrder: 5 }
    ];

    for (const categoryData of defaultCategories) {
      try {
        await this.create({
          ...categoryData,
          isActive: true
        });
      } catch (error) {
        console.warn('Failed to create default category:', error);
      }
    }
  }

  async findAll(): Promise<Category[]> {
    return Array.from(this.categories.values());
  }

  async findById(id: string): Promise<Category | null> {
    return this.categories.get(id) || null;
  }

  async findByParentId(parentId?: string): Promise<Category[]> {
    return Array.from(this.categories.values()).filter(
      category => category.parentId === parentId
    );
  }

  async findRootCategories(): Promise<Category[]> {
    return this.findByParentId(undefined);
  }

  async findActiveCategories(): Promise<Category[]> {
    return Array.from(this.categories.values()).filter(
      category => category.isActive
    );
  }

  async findByLevel(level: number): Promise<Category[]> {
    return Array.from(this.categories.values()).filter(
      category => category.level === level
    );
  }

  async buildCategoryTree(): Promise<Category[]> {
    const allCategories = await this.findAll();
    const categoryMap = new Map<string, Category>();
    
    // 创建包含children的分类对象
    allCategories.forEach(category => {
      categoryMap.set(category.id, { ...category, children: [] });
    });

    const rootCategories: Category[] = [];

    // 构建树形结构
    categoryMap.forEach(category => {
      if (category.parentId) {
        const parent = categoryMap.get(category.parentId);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(category);
        }
      } else {
        rootCategories.push(category);
      }
    });

    // 按sortOrder排序
    const sortCategories = (categories: Category[]) => {
      categories.sort((a, b) => a.sortOrder - b.sortOrder);
      categories.forEach(category => {
        if (category.children) {
          sortCategories(category.children);
        }
      });
    };

    sortCategories(rootCategories);
    return rootCategories;
  }

  async create(data: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<Category> {
    // 验证父分类存在性和层级
    if (data.parentId) {
      const parent = await this.findById(data.parentId);
      if (!parent) {
        throw new Error(`父分类不存在: ${data.parentId}`);
      }
      if (parent.level >= 5) {
        throw new Error('分类层级不能超过5级');
      }
      if (data.level !== parent.level + 1) {
        throw new Error('分类层级设置错误');
      }
    } else {
      if (data.level !== 1) {
        throw new Error('根分类层级必须为1');
      }
    }

    const category: Category = {
      ...data,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // 验证数据
    const validation = validateEntity(CategorySchema, category);
    if (!validation.success) {
      throw new Error(`分类数据验证失败: ${validation.errors?.join(', ')}`);
    }

    // 检查名称在同级别下的唯一性
    const siblings = await this.findByParentId(data.parentId);
    if (siblings.some(sibling => sibling.name === data.name)) {
      throw new Error(`同级分类名称已存在: ${data.name}`);
    }

    this.categories.set(category.id, category);
    return category;
  }

  async update(id: string, data: Partial<Omit<Category, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Category> {
    const existingCategory = this.categories.get(id);
    if (!existingCategory) {
      throw new Error(`分类不存在: ${id}`);
    }

    // 不允许修改父分类（避免循环引用）
    if (data.parentId !== undefined && data.parentId !== existingCategory.parentId) {
      if (data.parentId === id) {
        throw new Error('分类不能设置自己为父分类');
      }
      
      // 检查是否会造成循环引用
      if (await this.wouldCreateCycle(id, data.parentId)) {
        throw new Error('不能设置子分类为父分类，这会造成循环引用');
      }
    }

    const updatedCategory: Category = {
      ...existingCategory,
      ...data,
      updatedAt: new Date()
    };

    // 验证更新后的数据
    const validation = validateEntity(CategorySchema, updatedCategory);
    if (!validation.success) {
      throw new Error(`分类数据验证失败: ${validation.errors?.join(', ')}`);
    }

    // 检查名称在同级别下的唯一性
    if (data.name && data.name !== existingCategory.name) {
      const siblings = await this.findByParentId(updatedCategory.parentId);
      if (siblings.some(sibling => sibling.name === data.name && sibling.id !== id)) {
        throw new Error(`同级分类名称已存在: ${data.name}`);
      }
    }

    this.categories.set(id, updatedCategory);
    return updatedCategory;
  }

  async delete(id: string): Promise<boolean> {
    const category = this.categories.get(id);
    if (!category) {
      return false;
    }

    // 检查是否有子分类
    const children = await this.findByParentId(id);
    if (children.length > 0) {
      throw new Error('存在子分类，无法删除');
    }

    // 检查是否有关联的产品
    // 这里需要与ProductService配合检查
    // TODO: 实现产品关联检查

    this.categories.delete(id);
    return true;
  }

  private async wouldCreateCycle(categoryId: string, newParentId?: string): Promise<boolean> {
    if (!newParentId) return false;

    const visited = new Set<string>();
    let currentId: string | undefined = newParentId;

    while (currentId && !visited.has(currentId)) {
      if (currentId === categoryId) {
        return true;
      }
      visited.add(currentId);
      const current = await this.findById(currentId);
      currentId = current?.parentId;
    }

    return false;
  }

  async moveCategory(id: string, newParentId?: string): Promise<Category> {
    const category = await this.findById(id);
    if (!category) {
      throw new Error(`分类不存在: ${id}`);
    }

    let newLevel = 1;
    if (newParentId) {
      const newParent = await this.findById(newParentId);
      if (!newParent) {
        throw new Error(`新父分类不存在: ${newParentId}`);
      }
      newLevel = newParent.level + 1;
      
      if (newLevel > 5) {
        throw new Error('移动后分类层级将超过5级');
      }
    }

    return this.update(id, {
      parentId: newParentId,
      level: newLevel
    });
  }

  async updateSortOrder(updates: Array<{ id: string; sortOrder: number }>): Promise<Category[]> {
    const results: Category[] = [];

    for (const { id, sortOrder } of updates) {
      try {
        const updated = await this.update(id, { sortOrder });
        results.push(updated);
      } catch (error) {
        console.error(`Failed to update sort order for category ${id}:`, error);
        throw error;
      }
    }

    return results;
  }

  async toggleActive(id: string): Promise<Category> {
    const category = await this.findById(id);
    if (!category) {
      throw new Error(`分类不存在: ${id}`);
    }

    return this.update(id, { isActive: !category.isActive });
  }

  async getCategoryPath(id: string): Promise<Category[]> {
    const path: Category[] = [];
    let currentId: string | undefined = id;

    while (currentId) {
      const category = await this.findById(currentId);
      if (!category) break;
      
      path.unshift(category);
      currentId = category.parentId;
    }

    return path;
  }

  async getCategoryStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    byLevel: Record<number, number>;
  }> {
    const categories = await this.findAll();
    const byLevel: Record<number, number> = {};

    categories.forEach(category => {
      byLevel[category.level] = (byLevel[category.level] || 0) + 1;
    });

    return {
      total: categories.length,
      active: categories.filter(c => c.isActive).length,
      inactive: categories.filter(c => !c.isActive).length,
      byLevel
    };
  }
}

export default new CategoryService();