-- ================================================
-- 进销存管理系统 SQLite 数据库初始化脚本（带详细注释版）
-- 创建日期: 2025-07-14
-- 描述: 完整的进销存系统数据库表结构和默认数据
-- 版本: 1.0
-- 作者: 进销存系统开发团队
-- ================================================

-- 启用外键约束
PRAGMA foreign_keys = ON;

-- 开始事务
BEGIN TRANSACTION;

-- ================================================
-- 系统管理模块 - System Management Module
-- 功能：用户管理、系统配置、权限控制
-- ================================================

-- 用户表 - 系统用户信息管理
-- 功能：存储系统用户的基本信息、角色权限、登录状态等
CREATE TABLE users (
  id TEXT PRIMARY KEY,                    -- 用户唯一标识符，UUID格式
  username TEXT UNIQUE NOT NULL,          -- 用户名，登录凭证，全局唯一
  password TEXT NOT NULL,                 -- 密码，应存储加密后的哈希值
  nickname TEXT NOT NULL,                 -- 显示名称，用于界面展示
  email TEXT,                            -- 邮箱地址，可选，用于通知和找回密码
  phone TEXT,                            -- 手机号码，可选，用于通知和验证
  avatar TEXT,                           -- 头像URL或路径，可选
  role TEXT NOT NULL CHECK(role IN (      -- 用户角色，控制权限范围
    'admin',        -- 系统管理员：全部权限
    'purchaser',    -- 采购员：采购模块权限
    'salesperson',  -- 销售员：销售模块权限
    'warehouse',    -- 仓库管理员：库存模块权限
    'finance'       -- 财务员：财务模块权限
  )),
  status TEXT NOT NULL CHECK(status IN (  -- 用户状态，控制是否可登录
    'active',       -- 活跃：可正常登录使用
    'inactive',     -- 非活跃：暂时禁用，不可登录
    'locked'        -- 锁定：因安全原因锁定，不可登录
  )) DEFAULT 'active',
  last_login_at DATETIME,                 -- 最后登录时间，用于安全审计
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 创建时间
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP   -- 最后更新时间
);

-- 系统配置表 - 系统全局配置参数
-- 功能：存储系统级配置参数，支持动态配置
CREATE TABLE system_configs (
  id TEXT PRIMARY KEY,                    -- 配置项唯一标识符
  key TEXT UNIQUE NOT NULL,               -- 配置键名，全局唯一，如'system.version'
  value TEXT NOT NULL,                    -- 配置值，JSON格式或字符串
  description TEXT,                       -- 配置项描述，说明用途和格式
  category TEXT NOT NULL,                 -- 配置分类，如'system'、'business'、'ui'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 创建时间
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP   -- 最后更新时间
);

-- ================================================
-- 基础数据模块 - Master Data Module  
-- 功能：计量单位、商品分类、仓库等基础数据管理
-- ================================================

-- 计量单位表 - 商品计量单位管理
-- 功能：定义系统中使用的各种计量单位，支持精度控制
CREATE TABLE units (
  id TEXT PRIMARY KEY,                    -- 单位唯一标识符
  name TEXT NOT NULL,                     -- 单位名称，如'千克'、'米'
  symbol TEXT NOT NULL,                   -- 单位符号，如'kg'、'm'，用于显示
  precision INTEGER NOT NULL DEFAULT 2,   -- 数值精度，小数点后位数，0-6之间
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 创建时间
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP   -- 最后更新时间
);

-- 商品分类表 - 商品分类层次结构管理
-- 功能：支持多级分类，树形结构，便于商品组织和统计
CREATE TABLE categories (
  id TEXT PRIMARY KEY,                    -- 分类唯一标识符
  name TEXT NOT NULL,                     -- 分类名称，如'电子产品'、'手机'
  parent_id TEXT,                         -- 父分类ID，NULL表示顶级分类
  level INTEGER NOT NULL DEFAULT 1,      -- 分类层级，1为顶级，递增
  sort_order INTEGER NOT NULL DEFAULT 0, -- 排序顺序，用于分类显示排序
  is_active BOOLEAN NOT NULL DEFAULT 1,  -- 是否启用，0=禁用，1=启用
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 创建时间
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 最后更新时间
  FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- 仓库表 - 仓库信息管理
-- 功能：管理多个仓库，支持默认仓库设置
CREATE TABLE warehouses (
  id TEXT PRIMARY KEY,                    -- 仓库唯一标识符
  code TEXT UNIQUE NOT NULL,              -- 仓库编码，业务编号，全局唯一
  name TEXT NOT NULL,                     -- 仓库名称，如'主仓库'、'分仓库A'
  address TEXT,                          -- 仓库地址，详细地址信息
  manager TEXT,                          -- 仓库负责人姓名
  phone TEXT,                            -- 联系电话
  is_default BOOLEAN NOT NULL DEFAULT 0, -- 是否默认仓库，1=是，0=否，全局只能有一个
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 创建时间
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP   -- 最后更新时间
);

-- ================================================
-- 商品管理模块 - Product Management Module
-- 功能：商品信息管理、库存跟踪
-- ================================================

-- 商品表 - 商品基本信息管理
-- 功能：存储商品的完整信息，包括价格、库存限制等
CREATE TABLE products (
  id TEXT PRIMARY KEY,                    -- 商品唯一标识符
  sku TEXT UNIQUE NOT NULL,               -- 商品SKU码，库存单位，全局唯一
  name TEXT NOT NULL,                     -- 商品名称
  description TEXT,                       -- 商品详细描述
  category_id TEXT NOT NULL,              -- 商品分类ID，关联categories表
  unit_id TEXT NOT NULL,                  -- 计量单位ID，关联units表
  brand TEXT,                            -- 品牌名称
  model TEXT,                            -- 型号规格
  barcode TEXT,                          -- 条形码，用于扫码识别
  purchase_price REAL NOT NULL DEFAULT 0, -- 采购价格，成本价
  sale_price REAL NOT NULL DEFAULT 0,     -- 销售价格，建议零售价
  min_stock REAL NOT NULL DEFAULT 0,      -- 最小库存量，低于此值需补货
  max_stock REAL NOT NULL DEFAULT 0,      -- 最大库存量，库存上限
  status TEXT NOT NULL CHECK(status IN (  -- 商品状态
    'active',       -- 正常：可正常销售采购
    'inactive',     -- 停用：暂停销售采购
    'discontinued'  -- 停产：不再采购，清理库存
  )) DEFAULT 'active',
  images TEXT,                           -- 商品图片URLs，JSON数组格式
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 创建时间
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 最后更新时间
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE RESTRICT
);

-- 库存主表 - 商品在各仓库的库存统计
-- 功能：实时跟踪每个商品在每个仓库的库存数量和状态
CREATE TABLE inventory_stocks (
  id TEXT PRIMARY KEY,                    -- 库存记录唯一标识符
  product_id TEXT NOT NULL,               -- 商品ID，关联products表
  warehouse_id TEXT NOT NULL,             -- 仓库ID，关联warehouses表
  current_stock REAL NOT NULL DEFAULT 0, -- 当前库存数量，实际可用数量
  available_stock REAL NOT NULL DEFAULT 0, -- 可用库存，当前库存减去预留库存
  reserved_stock REAL NOT NULL DEFAULT 0,  -- 预留库存，已分配但未出库的数量
  avg_cost REAL NOT NULL DEFAULT 0,        -- 平均成本，加权平均计算
  last_in_date DATETIME,                   -- 最后入库日期
  last_out_date DATETIME,                  -- 最后出库日期
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 创建时间
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 最后更新时间
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
  UNIQUE(product_id, warehouse_id)        -- 每个商品在每个仓库只能有一条记录
);

-- 库存流水表 - 库存变动记录
-- 功能：记录所有库存变动，包括入库、出库、调整等操作
CREATE TABLE inventory_transactions (
  id TEXT PRIMARY KEY,                    -- 流水记录唯一标识符
  transaction_no TEXT UNIQUE NOT NULL,    -- 流水单号，业务单号，全局唯一
  product_id TEXT NOT NULL,               -- 商品ID，关联products表
  warehouse_id TEXT NOT NULL,             -- 仓库ID，关联warehouses表
  transaction_type TEXT NOT NULL CHECK(transaction_type IN (
    'in',           -- 入库：增加库存
    'out',          -- 出库：减少库存
    'adjust'        -- 调整：盘点调整
  )),
  quantity REAL NOT NULL,                 -- 变动数量，正数为增加，负数为减少
  unit_price REAL NOT NULL DEFAULT 0,     -- 单价，用于计算金额
  total_amount REAL NOT NULL DEFAULT 0,   -- 总金额，数量×单价
  reference_type TEXT,                    -- 关联业务类型，如'purchase'、'sale'
  reference_id TEXT,                      -- 关联业务单据ID
  remark TEXT,                           -- 备注说明
  operator TEXT NOT NULL,                -- 操作人员
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 创建时间
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 最后更新时间
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE
);

-- ================================================
-- 供应商管理模块 - Supplier Management Module
-- 功能：供应商信息管理、信用评级
-- ================================================

-- 供应商表 - 供应商基本信息管理
-- 功能：管理供应商信息，包括联系方式、信用等级、付款条件等
CREATE TABLE suppliers (
  id TEXT PRIMARY KEY,                    -- 供应商唯一标识符
  code TEXT UNIQUE NOT NULL,              -- 供应商编码，业务编号，全局唯一
  name TEXT NOT NULL,                     -- 供应商名称/公司名称
  contact_person TEXT,                    -- 联系人姓名
  phone TEXT,                            -- 联系电话
  email TEXT,                            -- 邮箱地址
  address TEXT,                          -- 详细地址
  payment_terms TEXT,                     -- 付款条件，如'30天账期'、'款到发货'
  credit_limit REAL NOT NULL DEFAULT 0,   -- 信用额度，最大欠款限额
  rating TEXT NOT NULL CHECK(rating IN (  -- 信用评级
    'A',            -- 优秀：信誉极好，优先合作
    'B',            -- 良好：信誉良好，正常合作
    'C',            -- 一般：需要关注，谨慎合作
    'D'             -- 差：信誉较差，限制合作
  )) DEFAULT 'C',
  status TEXT NOT NULL CHECK(status IN (  -- 供应商状态
    'active',       -- 活跃：可正常合作
    'inactive'      -- 停用：暂停合作
  )) DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 创建时间
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP   -- 最后更新时间
);

-- ================================================
-- 采购管理模块 - Purchase Management Module
-- 功能：采购订单管理、收货管理、采购流程控制
-- ================================================

-- 采购订单表 - 采购订单主表
-- 功能：管理采购订单，包括订单状态、金额统计等
CREATE TABLE purchase_orders (
  id TEXT PRIMARY KEY,                    -- 采购订单唯一标识符
  order_no TEXT UNIQUE NOT NULL,          -- 采购订单号，业务单号，全局唯一
  supplier_id TEXT NOT NULL,              -- 供应商ID，关联suppliers表
  order_date DATE NOT NULL,               -- 订单日期
  expected_date DATE,                     -- 预期到货日期
  status TEXT NOT NULL CHECK(status IN (  -- 订单状态
    'draft',        -- 草稿：未确认的订单
    'confirmed',    -- 已确认：已向供应商确认
    'partial',      -- 部分收货：已收货但未完成
    'completed',    -- 已完成：全部收货完成
    'cancelled'     -- 已取消：订单被取消
  )) DEFAULT 'draft',
  total_amount REAL NOT NULL DEFAULT 0,   -- 订单总金额，明细金额汇总
  discount_amount REAL NOT NULL DEFAULT 0, -- 折扣金额
  tax_amount REAL NOT NULL DEFAULT 0,      -- 税费金额
  final_amount REAL NOT NULL DEFAULT 0,    -- 最终金额，总金额-折扣+税费
  remark TEXT,                           -- 订单备注
  creator TEXT NOT NULL,                 -- 创建人员
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 创建时间
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 最后更新时间
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT
);

-- 采购订单明细表 - 采购订单商品明细
-- 功能：记录订单中每个商品的详细信息，包括数量、价格等
CREATE TABLE purchase_order_items (
  id TEXT PRIMARY KEY,                    -- 订单明细唯一标识符
  order_id TEXT NOT NULL,                 -- 采购订单ID，关联purchase_orders表
  product_id TEXT NOT NULL,               -- 商品ID，关联products表
  quantity REAL NOT NULL,                 -- 采购数量
  unit_price REAL NOT NULL,               -- 采购单价
  discount_rate REAL NOT NULL DEFAULT 0, -- 折扣率，百分比，如10表示10%
  amount REAL NOT NULL,                   -- 明细金额，数量×单价×(1-折扣率)
  received_quantity REAL NOT NULL DEFAULT 0, -- 已收货数量
  status TEXT NOT NULL CHECK(status IN (  -- 明细状态
    'pending',      -- 待收货：尚未收货
    'partial',      -- 部分收货：已收货但未完成
    'completed'     -- 已完成：全部收货完成
  )) DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 创建时间
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 最后更新时间
  FOREIGN KEY (order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

-- 采购收货表 - 采购收货主表
-- 功能：管理采购收货单，记录实际收货情况
CREATE TABLE purchase_receipts (
  id TEXT PRIMARY KEY,                    -- 收货单唯一标识符
  receipt_no TEXT UNIQUE NOT NULL,        -- 收货单号，业务单号，全局唯一
  order_id TEXT NOT NULL,                 -- 关联采购订单ID
  supplier_id TEXT NOT NULL,              -- 供应商ID，关联suppliers表
  warehouse_id TEXT NOT NULL,             -- 收货仓库ID，关联warehouses表
  receipt_date DATE NOT NULL,             -- 收货日期
  status TEXT NOT NULL CHECK(status IN (  -- 收货单状态
    'draft',        -- 草稿：未确认的收货单
    'confirmed'     -- 已确认：收货完成并入库
  )) DEFAULT 'draft',
  total_quantity REAL NOT NULL DEFAULT 0, -- 收货总数量
  total_amount REAL NOT NULL DEFAULT 0,   -- 收货总金额
  receiver TEXT NOT NULL,                 -- 收货人员
  remark TEXT,                           -- 收货备注
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 创建时间
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 最后更新时间
  FOREIGN KEY (order_id) REFERENCES purchase_orders(id) ON DELETE RESTRICT,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT
);

-- 采购收货明细表 - 采购收货商品明细
-- 功能：记录收货单中每个商品的实际收货数量和金额
CREATE TABLE purchase_receipt_items (
  id TEXT PRIMARY KEY,                    -- 收货明细唯一标识符
  receipt_id TEXT NOT NULL,               -- 收货单ID，关联purchase_receipts表
  product_id TEXT NOT NULL,               -- 商品ID，关联products表
  order_item_id TEXT NOT NULL,            -- 关联订单明细ID，用于对账
  quantity REAL NOT NULL,                 -- 实际收货数量
  unit_price REAL NOT NULL,               -- 收货单价
  amount REAL NOT NULL,                   -- 收货金额，数量×单价
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 创建时间
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 最后更新时间
  FOREIGN KEY (receipt_id) REFERENCES purchase_receipts(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  FOREIGN KEY (order_item_id) REFERENCES purchase_order_items(id) ON DELETE RESTRICT
);

-- ================================================
-- 客户管理模块 - Customer Management Module
-- 功能：客户信息管理、客户分级、信用管理
-- ================================================

-- 客户表 - 客户基本信息管理
-- 功能：管理客户信息，包括客户分级、信用额度、付款条件等
CREATE TABLE customers (
  id TEXT PRIMARY KEY,                    -- 客户唯一标识符
  code TEXT UNIQUE NOT NULL,              -- 客户编码，业务编号，全局唯一
  name TEXT NOT NULL,                     -- 客户名称/公司名称
  contact_person TEXT,                    -- 联系人姓名
  phone TEXT,                            -- 联系电话
  email TEXT,                            -- 邮箱地址
  address TEXT,                          -- 详细地址
  customer_type TEXT NOT NULL CHECK(customer_type IN (
    'individual',   -- 个人客户：零售客户
    'company'       -- 企业客户：批发客户
  )) DEFAULT 'individual',
  credit_limit REAL NOT NULL DEFAULT 0,   -- 信用额度，最大欠款限额
  payment_terms TEXT,                     -- 付款条件，如'30天账期'、'货到付款'
  discount_rate REAL NOT NULL DEFAULT 0,  -- 客户折扣率，百分比
  level TEXT NOT NULL CHECK(level IN (    -- 客户等级，影响价格和服务
    'VIP',          -- VIP客户：最高等级，最大优惠
    'Gold',         -- 金牌客户：高等级，较大优惠
    'Silver',       -- 银牌客户：中等级，一般优惠
    'Bronze'        -- 铜牌客户：普通等级，基础优惠
  )) DEFAULT 'Bronze',
  status TEXT NOT NULL CHECK(status IN (  -- 客户状态
    'active',       -- 活跃：可正常交易
    'inactive'      -- 停用：暂停交易
  )) DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 创建时间
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP   -- 最后更新时间
);

-- ================================================
-- 销售管理模块 - Sales Management Module
-- 功能：销售订单管理、出库管理、销售流程控制
-- ================================================

-- 销售订单表 - 销售订单主表
-- 功能：管理销售订单，包括订单状态、金额统计、付款状态等
CREATE TABLE sales_orders (
  id TEXT PRIMARY KEY,                    -- 销售订单唯一标识符
  order_no TEXT UNIQUE NOT NULL,          -- 销售订单号，业务单号，全局唯一
  customer_id TEXT NOT NULL,              -- 客户ID，关联customers表
  order_date DATE NOT NULL,               -- 订单日期
  delivery_date DATE,                     -- 预期交货日期
  status TEXT NOT NULL CHECK(status IN (  -- 订单状态
    'draft',        -- 草稿：未确认的订单
    'confirmed',    -- 已确认：已确认的订单
    'shipped',      -- 已发货：商品已出库发货
    'completed',    -- 已完成：订单完成
    'cancelled'     -- 已取消：订单被取消
  )) DEFAULT 'draft',
  total_amount REAL NOT NULL DEFAULT 0,   -- 订单总金额，明细金额汇总
  discount_amount REAL NOT NULL DEFAULT 0, -- 折扣金额
  tax_amount REAL NOT NULL DEFAULT 0,      -- 税费金额
  final_amount REAL NOT NULL DEFAULT 0,    -- 最终金额，总金额-折扣+税费
  payment_status TEXT NOT NULL CHECK(payment_status IN (
    'unpaid',       -- 未付款：尚未收到款项
    'partial',      -- 部分付款：已收到部分款项
    'paid'          -- 已付款：已收到全部款项
  )) DEFAULT 'unpaid',
  remark TEXT,                           -- 订单备注
  creator TEXT NOT NULL,                 -- 创建人员
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 创建时间
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 最后更新时间
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
);

-- 销售订单明细表 - 销售订单商品明细
-- 功能：记录订单中每个商品的详细信息，包括数量、价格等
CREATE TABLE sales_order_items (
  id TEXT PRIMARY KEY,                    -- 订单明细唯一标识符
  order_id TEXT NOT NULL,                 -- 销售订单ID，关联sales_orders表
  product_id TEXT NOT NULL,               -- 商品ID，关联products表
  quantity REAL NOT NULL,                 -- 销售数量
  unit_price REAL NOT NULL,               -- 销售单价
  discount_rate REAL NOT NULL DEFAULT 0, -- 折扣率，百分比，如10表示10%
  amount REAL NOT NULL,                   -- 明细金额，数量×单价×(1-折扣率)
  shipped_quantity REAL NOT NULL DEFAULT 0, -- 已发货数量
  status TEXT NOT NULL CHECK(status IN (  -- 明细状态
    'pending',      -- 待发货：尚未发货
    'partial',      -- 部分发货：已发货但未完成
    'completed'     -- 已完成：全部发货完成
  )) DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 创建时间
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 最后更新时间
  FOREIGN KEY (order_id) REFERENCES sales_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

-- 销售出库表 - 销售出库主表
-- 功能：管理销售出库单，记录实际出库发货情况
CREATE TABLE sales_deliveries (
  id TEXT PRIMARY KEY,                    -- 出库单唯一标识符
  delivery_no TEXT UNIQUE NOT NULL,       -- 出库单号，业务单号，全局唯一
  order_id TEXT NOT NULL,                 -- 关联销售订单ID
  customer_id TEXT NOT NULL,              -- 客户ID，关联customers表
  warehouse_id TEXT NOT NULL,             -- 出库仓库ID，关联warehouses表
  delivery_date DATE NOT NULL,            -- 出库日期
  status TEXT NOT NULL CHECK(status IN (  -- 出库单状态
    'draft',        -- 草稿：未确认的出库单
    'confirmed',    -- 已确认：出库完成
    'shipped',      -- 已发货：商品已发出
    'completed',    -- 已完成：客户已收货
    'cancelled'     -- 已取消：出库被取消
  )) DEFAULT 'draft',
  total_quantity REAL NOT NULL DEFAULT 0, -- 出库总数量
  total_amount REAL NOT NULL DEFAULT 0,   -- 出库总金额
  delivery_person TEXT NOT NULL,          -- 发货人员
  remark TEXT,                           -- 出库备注
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 创建时间
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 最后更新时间
  FOREIGN KEY (order_id) REFERENCES sales_orders(id) ON DELETE RESTRICT,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT
);

-- 销售出库明细表 - 销售出库商品明细
-- 功能：记录出库单中每个商品的实际出库数量和金额
CREATE TABLE sales_delivery_items (
  id TEXT PRIMARY KEY,                    -- 出库明细唯一标识符
  delivery_id TEXT NOT NULL,              -- 出库单ID，关联sales_deliveries表
  product_id TEXT NOT NULL,               -- 商品ID，关联products表
  order_item_id TEXT NOT NULL,            -- 关联订单明细ID，用于对账
  quantity REAL NOT NULL,                 -- 实际出库数量
  unit_price REAL NOT NULL,               -- 出库单价
  amount REAL NOT NULL,                   -- 出库金额，数量×单价
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 创建时间
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 最后更新时间
  FOREIGN KEY (delivery_id) REFERENCES sales_deliveries(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  FOREIGN KEY (order_item_id) REFERENCES sales_order_items(id) ON DELETE RESTRICT
);

-- ================================================
-- 财务管理模块 - Financial Management Module
-- 功能：应收应付管理、收付款记录、财务统计
-- ================================================

-- 应付账款表 - 供应商应付款管理
-- 功能：管理对供应商的应付款项，跟踪付款状态和到期时间
CREATE TABLE accounts_payable (
  id TEXT PRIMARY KEY,                    -- 应付账款唯一标识符
  bill_no TEXT UNIQUE NOT NULL,           -- 应付单据号，业务单号，全局唯一
  supplier_id TEXT NOT NULL,              -- 供应商ID，关联suppliers表
  order_id TEXT,                         -- 关联采购订单ID，可为空
  bill_date DATE NOT NULL,                -- 单据日期
  due_date DATE NOT NULL,                 -- 到期日期，超过此日期为逾期
  total_amount REAL NOT NULL,             -- 应付总金额
  paid_amount REAL NOT NULL DEFAULT 0,    -- 已付金额
  balance_amount REAL NOT NULL,           -- 余额，应付金额-已付金额
  status TEXT NOT NULL CHECK(status IN (  -- 付款状态
    'unpaid',       -- 未付款：尚未付款
    'partial',      -- 部分付款：已付部分款项
    'paid',         -- 已付款：已付清全部款项
    'overdue'       -- 逾期：超过到期日期未付清
  )) DEFAULT 'unpaid',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 创建时间
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 最后更新时间
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
  FOREIGN KEY (order_id) REFERENCES purchase_orders(id) ON DELETE SET NULL
);

-- 应收账款表 - 客户应收款管理
-- 功能：管理客户应收款项，跟踪收款状态和到期时间
CREATE TABLE accounts_receivable (
  id TEXT PRIMARY KEY,                    -- 应收账款唯一标识符
  bill_no TEXT UNIQUE NOT NULL,           -- 应收单据号，业务单号，全局唯一
  customer_id TEXT NOT NULL,              -- 客户ID，关联customers表
  order_id TEXT,                         -- 关联销售订单ID，可为空
  bill_date DATE NOT NULL,                -- 单据日期
  due_date DATE NOT NULL,                 -- 到期日期，超过此日期为逾期
  total_amount REAL NOT NULL,             -- 应收总金额
  received_amount REAL NOT NULL DEFAULT 0, -- 已收金额
  balance_amount REAL NOT NULL,           -- 余额，应收金额-已收金额
  status TEXT NOT NULL CHECK(status IN (  -- 收款状态
    'unpaid',       -- 未收款：尚未收款
    'partial',      -- 部分收款：已收部分款项
    'paid',         -- 已收款：已收清全部款项
    'overdue'       -- 逾期：超过到期日期未收清
  )) DEFAULT 'unpaid',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 创建时间
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 最后更新时间
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
  FOREIGN KEY (order_id) REFERENCES sales_orders(id) ON DELETE SET NULL
);

-- 付款记录表 - 供应商付款记录
-- 功能：记录每笔付款的详细信息，包括付款方式、金额等
CREATE TABLE payments (
  id TEXT PRIMARY KEY,                    -- 付款记录唯一标识符
  payment_no TEXT UNIQUE NOT NULL,        -- 付款单号，业务单号，全局唯一
  payable_id TEXT NOT NULL,               -- 应付账款ID，关联accounts_payable表
  payment_date DATE NOT NULL,             -- 付款日期
  payment_method TEXT NOT NULL CHECK(payment_method IN (
    'cash',         -- 现金：现金付款
    'bank',         -- 银行转账：银行转账付款
    'check'         -- 支票：支票付款
  )),
  amount REAL NOT NULL,                   -- 付款金额
  remark TEXT,                           -- 付款备注
  operator TEXT NOT NULL,                -- 操作人员
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 创建时间
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 最后更新时间
  FOREIGN KEY (payable_id) REFERENCES accounts_payable(id) ON DELETE CASCADE
);

-- 收款记录表 - 客户收款记录
-- 功能：记录每笔收款的详细信息，包括收款方式、金额等
CREATE TABLE receipts (
  id TEXT PRIMARY KEY,                    -- 收款记录唯一标识符
  receipt_no TEXT UNIQUE NOT NULL,        -- 收款单号，业务单号，全局唯一
  receivable_id TEXT NOT NULL,            -- 应收账款ID，关联accounts_receivable表
  receipt_date DATE NOT NULL,             -- 收款日期
  payment_method TEXT NOT NULL CHECK(payment_method IN (
    'cash',         -- 现金：现金收款
    'bank',         -- 银行转账：银行转账收款
    'check'         -- 支票：支票收款
  )),
  amount REAL NOT NULL,                   -- 收款金额
  remark TEXT,                           -- 收款备注
  operator TEXT NOT NULL,                -- 操作人员
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 创建时间
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 最后更新时间
  FOREIGN KEY (receivable_id) REFERENCES accounts_receivable(id) ON DELETE CASCADE
);

-- ================================================
-- 系统日志模块 - System Logging Module
-- 功能：操作日志、审计跟踪、安全监控
-- ================================================

-- 操作日志表 - 系统操作审计日志
-- 功能：记录用户的所有关键操作，用于审计和安全监控
CREATE TABLE operation_logs (
  id TEXT PRIMARY KEY,                    -- 日志记录唯一标识符
  operator TEXT NOT NULL,                -- 操作人员，用户名或ID
  action TEXT NOT NULL,                  -- 操作动作，如'create'、'update'、'delete'
  module TEXT NOT NULL,                  -- 操作模块，如'inventory'、'sales'、'purchase'
  entity_type TEXT NOT NULL,             -- 操作实体类型，如'product'、'order'
  entity_id TEXT,                        -- 操作实体ID，被操作记录的ID
  description TEXT NOT NULL,             -- 操作描述，详细说明操作内容
  ip_address TEXT,                       -- 操作IP地址，用于安全审计
  user_agent TEXT,                       -- 用户代理，浏览器信息
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 创建时间
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP   -- 最后更新时间
);

-- ================================================
-- 兼容性支持模块 - Compatibility Support Module
-- 功能：向后兼容、数据迁移支持
-- ================================================

-- 兼容性表：库存物品表（用于向后兼容）
-- 功能：支持现有代码的兼容性，逐步迁移到新的products和inventory_stocks表
CREATE TABLE IF NOT EXISTS inventory_items (
  id TEXT PRIMARY KEY,                    -- 商品唯一标识符
  name TEXT NOT NULL,                     -- 商品名称
  description TEXT,                       -- 商品描述
  sku TEXT UNIQUE NOT NULL,               -- 商品SKU码
  category TEXT NOT NULL,                 -- 商品分类（字符串格式，兼容老版本）
  supplier TEXT,                         -- 供应商（字符串格式，兼容老版本）
  stock_quantity INTEGER NOT NULL DEFAULT 0,     -- 库存数量
  reserved_quantity INTEGER NOT NULL DEFAULT 0,  -- 预留数量
  unit_price REAL NOT NULL DEFAULT 0,            -- 单价
  total_value REAL NOT NULL DEFAULT 0,           -- 总价值
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP, -- 最后更新时间
  status TEXT CHECK(status IN (          -- 商品状态（兼容老版本格式）
    'in-stock',     -- 有库存
    'low-stock',    -- 低库存
    'out-of-stock', -- 无库存
    'discontinued'  -- 停产
  )) DEFAULT 'in-stock',
  location TEXT,                         -- 存放位置
  reorder_level INTEGER DEFAULT 0,      -- 补货提醒数量
  max_stock INTEGER DEFAULT 0,          -- 最大库存
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 创建时间
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP   -- 最后更新时间
);

-- 全局换算规则表 - 单位换算规则管理
-- 功能：定义不同单位之间的换算关系，支持自动单位转换
CREATE TABLE IF NOT EXISTS global_conversion_rules (
  id TEXT PRIMARY KEY,                    -- 换算规则唯一标识符
  name TEXT NOT NULL,                     -- 规则名称，如'千克到克转换'
  from_unit_id TEXT NOT NULL,             -- 源单位ID，关联units表
  to_unit_id TEXT NOT NULL,               -- 目标单位ID，关联units表
  conversion_rate REAL NOT NULL,         -- 换算比率，1源单位=多少目标单位
  category TEXT NOT NULL,                -- 换算类别，如'weight'、'length'
  description TEXT,                      -- 规则描述，说明换算关系
  is_active BOOLEAN NOT NULL DEFAULT 0,  -- 是否启用，0=禁用，1=启用
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 创建时间
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 最后更新时间
  FOREIGN KEY (from_unit_id) REFERENCES units(id),
  FOREIGN KEY (to_unit_id) REFERENCES units(id)
);

-- ================================================
-- 数据库索引 - Database Indexes
-- 功能：提高查询性能，优化数据库操作速度
-- ================================================

-- 商品相关索引 - 优化商品查询性能
CREATE INDEX idx_products_sku ON products(sku);                    -- SKU唯一查询
CREATE INDEX idx_products_category ON products(category_id);        -- 按分类查询
CREATE INDEX idx_products_status ON products(status);               -- 按状态查询

-- 分类相关索引 - 优化分类树查询
CREATE INDEX idx_categories_parent ON categories(parent_id);        -- 父子关系查询

-- 用户相关索引 - 优化用户管理查询
CREATE INDEX idx_users_username ON users(username);                 -- 用户名登录查询
CREATE INDEX idx_users_role ON users(role);                        -- 按角色查询

-- 系统配置索引 - 优化配置查询
CREATE INDEX idx_system_configs_key ON system_configs(key);         -- 配置键查询
CREATE INDEX idx_system_configs_category ON system_configs(category); -- 配置分类查询

-- 库存相关索引 - 优化库存查询和统计
CREATE INDEX idx_inventory_stocks_product ON inventory_stocks(product_id);     -- 按商品查询库存
CREATE INDEX idx_inventory_stocks_warehouse ON inventory_stocks(warehouse_id); -- 按仓库查询库存
CREATE INDEX idx_inventory_transactions_product ON inventory_transactions(product_id);     -- 按商品查询流水
CREATE INDEX idx_inventory_transactions_warehouse ON inventory_transactions(warehouse_id); -- 按仓库查询流水
CREATE INDEX idx_inventory_transactions_date ON inventory_transactions(created_at);        -- 按日期查询流水
CREATE INDEX idx_inventory_transactions_type ON inventory_transactions(transaction_type);  -- 按类型查询流水
CREATE INDEX idx_inventory_transactions_no ON inventory_transactions(transaction_no);      -- 流水单号查询

-- 供应商相关索引 - 优化供应商管理查询
CREATE INDEX idx_suppliers_code ON suppliers(code);                 -- 供应商编码查询
CREATE INDEX idx_suppliers_status ON suppliers(status);             -- 按状态查询

-- 采购相关索引 - 优化采购业务查询
CREATE INDEX idx_purchase_orders_no ON purchase_orders(order_no);               -- 订单号查询
CREATE INDEX idx_purchase_orders_supplier ON purchase_orders(supplier_id);      -- 按供应商查询
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);             -- 按状态查询
CREATE INDEX idx_purchase_orders_date ON purchase_orders(order_date);           -- 按日期查询
CREATE INDEX idx_purchase_order_items_order ON purchase_order_items(order_id);  -- 订单明细查询
CREATE INDEX idx_purchase_order_items_product ON purchase_order_items(product_id); -- 商品订单查询
CREATE INDEX idx_purchase_receipts_no ON purchase_receipts(receipt_no);         -- 收货单号查询
CREATE INDEX idx_purchase_receipts_order ON purchase_receipts(order_id);        -- 按订单查询收货
CREATE INDEX idx_purchase_receipts_date ON purchase_receipts(receipt_date);     -- 按日期查询收货
CREATE INDEX idx_purchase_receipt_items_receipt ON purchase_receipt_items(receipt_id); -- 收货明细查询

-- 客户相关索引 - 优化客户管理查询
CREATE INDEX idx_customers_code ON customers(code);                 -- 客户编码查询
CREATE INDEX idx_customers_status ON customers(status);             -- 按状态查询
CREATE INDEX idx_customers_level ON customers(level);               -- 按等级查询

-- 销售相关索引 - 优化销售业务查询
CREATE INDEX idx_sales_orders_no ON sales_orders(order_no);                     -- 订单号查询
CREATE INDEX idx_sales_orders_customer ON sales_orders(customer_id);            -- 按客户查询
CREATE INDEX idx_sales_orders_status ON sales_orders(status);                   -- 按状态查询
CREATE INDEX idx_sales_orders_date ON sales_orders(order_date);                 -- 按日期查询
CREATE INDEX idx_sales_order_items_order ON sales_order_items(order_id);        -- 订单明细查询
CREATE INDEX idx_sales_order_items_product ON sales_order_items(product_id);    -- 商品订单查询
CREATE INDEX idx_sales_deliveries_no ON sales_deliveries(delivery_no);          -- 出库单号查询
CREATE INDEX idx_sales_deliveries_order ON sales_deliveries(order_id);          -- 按订单查询出库
CREATE INDEX idx_sales_deliveries_customer ON sales_deliveries(customer_id);    -- 按客户查询出库
CREATE INDEX idx_sales_deliveries_warehouse ON sales_deliveries(warehouse_id);  -- 按仓库查询出库
CREATE INDEX idx_sales_deliveries_date ON sales_deliveries(delivery_date);      -- 按日期查询出库
CREATE INDEX idx_sales_delivery_items_delivery ON sales_delivery_items(delivery_id);     -- 出库明细查询
CREATE INDEX idx_sales_delivery_items_product ON sales_delivery_items(product_id);       -- 商品出库查询
CREATE INDEX idx_sales_delivery_items_order_item ON sales_delivery_items(order_item_id); -- 订单明细关联

-- 财务相关索引 - 优化财务查询和报表
CREATE INDEX idx_accounts_payable_supplier ON accounts_payable(supplier_id);    -- 按供应商查询应付
CREATE INDEX idx_accounts_payable_status ON accounts_payable(status);           -- 按状态查询应付
CREATE INDEX idx_accounts_payable_due_date ON accounts_payable(due_date);       -- 按到期日查询
CREATE INDEX idx_accounts_receivable_customer ON accounts_receivable(customer_id); -- 按客户查询应收
CREATE INDEX idx_accounts_receivable_status ON accounts_receivable(status);     -- 按状态查询应收
CREATE INDEX idx_accounts_receivable_due_date ON accounts_receivable(due_date); -- 按到期日查询
CREATE INDEX idx_payments_payable ON payments(payable_id);                      -- 付款记录查询
CREATE INDEX idx_payments_date ON payments(payment_date);                       -- 按日期查询付款
CREATE INDEX idx_receipts_receivable ON receipts(receivable_id);                -- 收款记录查询
CREATE INDEX idx_receipts_date ON receipts(receipt_date);                       -- 按日期查询收款

-- 日志相关索引 - 优化日志查询和审计
CREATE INDEX idx_operation_logs_operator ON operation_logs(operator);           -- 按操作人查询
CREATE INDEX idx_operation_logs_action ON operation_logs(action);               -- 按操作类型查询
CREATE INDEX idx_operation_logs_module ON operation_logs(module);               -- 按模块查询
CREATE INDEX idx_operation_logs_entity ON operation_logs(entity_type, entity_id); -- 按实体查询
CREATE INDEX idx_operation_logs_date ON operation_logs(created_at);             -- 按日期查询

-- 兼容性表索引 - 支持老版本查询
CREATE INDEX IF NOT EXISTS idx_inventory_sku ON inventory_items(sku);           -- SKU查询
CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory_items(category); -- 分类查询
CREATE INDEX IF NOT EXISTS idx_inventory_status ON inventory_items(status);     -- 状态查询
CREATE INDEX IF NOT EXISTS idx_units_symbol ON units(symbol);                   -- 单位符号查询
CREATE INDEX IF NOT EXISTS idx_global_conversion_from_unit ON global_conversion_rules(from_unit_id); -- 源单位查询
CREATE INDEX IF NOT EXISTS idx_global_conversion_to_unit ON global_conversion_rules(to_unit_id);     -- 目标单位查询
CREATE INDEX IF NOT EXISTS idx_global_conversion_category ON global_conversion_rules(category);     -- 换算分类查询

-- ================================================
-- 数据库触发器 - Database Triggers
-- 功能：自动维护数据一致性、时间戳更新、业务规则执行
-- ================================================

-- 自动更新时间戳触发器组 - 当记录更新时自动更新updated_at字段

-- 用户表时间戳触发器
CREATE TRIGGER update_users_timestamp AFTER UPDATE ON users
BEGIN
  UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- 商品表时间戳触发器
CREATE TRIGGER update_products_timestamp AFTER UPDATE ON products
BEGIN
  UPDATE products SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- 分类表时间戳触发器
CREATE TRIGGER update_categories_timestamp AFTER UPDATE ON categories
BEGIN
  UPDATE categories SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- 单位表时间戳触发器
CREATE TRIGGER update_units_timestamp AFTER UPDATE ON units
BEGIN
  UPDATE units SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- 仓库表时间戳触发器
CREATE TRIGGER update_warehouses_timestamp AFTER UPDATE ON warehouses
BEGIN
  UPDATE warehouses SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- 库存表时间戳触发器
CREATE TRIGGER update_inventory_stocks_timestamp AFTER UPDATE ON inventory_stocks
BEGIN
  UPDATE inventory_stocks SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- 供应商表时间戳触发器
CREATE TRIGGER update_suppliers_timestamp AFTER UPDATE ON suppliers
BEGIN
  UPDATE suppliers SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- 客户表时间戳触发器
CREATE TRIGGER update_customers_timestamp AFTER UPDATE ON customers
BEGIN
  UPDATE customers SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- 采购订单表时间戳触发器
CREATE TRIGGER update_purchase_orders_timestamp AFTER UPDATE ON purchase_orders
BEGIN
  UPDATE purchase_orders SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- 销售订单表时间戳触发器
CREATE TRIGGER update_sales_orders_timestamp AFTER UPDATE ON sales_orders
BEGIN
  UPDATE sales_orders SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- 销售出库表时间戳触发器
CREATE TRIGGER update_sales_deliveries_timestamp AFTER UPDATE ON sales_deliveries
BEGIN
  UPDATE sales_deliveries SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- 库存自动更新触发器 - 当库存流水增加时自动更新库存统计
-- 功能：维护库存数据一致性，自动计算当前库存、平均成本等
CREATE TRIGGER update_inventory_on_transaction AFTER INSERT ON inventory_transactions
BEGIN
  -- 更新或插入库存记录，自动计算库存数量和平均成本
  INSERT OR REPLACE INTO inventory_stocks (
    id, product_id, warehouse_id, current_stock, available_stock, 
    reserved_stock, avg_cost, last_in_date, last_out_date, created_at, updated_at
  )
  SELECT 
    COALESCE(s.id, NEW.id || '_stock'),                    -- 库存记录ID
    NEW.product_id,                                        -- 商品ID
    NEW.warehouse_id,                                      -- 仓库ID
    COALESCE(s.current_stock, 0) + NEW.quantity,          -- 更新当前库存
    COALESCE(s.available_stock, 0) + NEW.quantity,        -- 更新可用库存
    COALESCE(s.reserved_stock, 0),                         -- 保持预留库存不变
    CASE 
      WHEN NEW.transaction_type = 'in' AND NEW.quantity > 0 THEN
        -- 入库时计算加权平均成本
        (COALESCE(s.avg_cost, 0) * COALESCE(s.current_stock, 0) + NEW.unit_price * NEW.quantity) 
        / (COALESCE(s.current_stock, 0) + NEW.quantity)
      ELSE COALESCE(s.avg_cost, NEW.unit_price)            -- 出库时保持平均成本不变
    END,
    CASE WHEN NEW.transaction_type = 'in' THEN NEW.created_at ELSE s.last_in_date END,   -- 更新最后入库时间
    CASE WHEN NEW.transaction_type = 'out' THEN NEW.created_at ELSE s.last_out_date END, -- 更新最后出库时间
    COALESCE(s.created_at, NEW.created_at),                -- 保持创建时间
    NEW.created_at                                         -- 更新修改时间
  FROM (SELECT NULL) AS dummy
  LEFT JOIN inventory_stocks s ON s.product_id = NEW.product_id AND s.warehouse_id = NEW.warehouse_id;
END;

-- ================================================
-- 基础数据初始化 - Master Data Initialization
-- 功能：插入系统运行所需的基础数据
-- ================================================

-- 计量单位数据 - 涵盖常用的各类计量单位
-- 功能：为商品管理提供标准化的计量单位选择

-- 数量类单位 - 用于计数商品
INSERT INTO units (id, name, symbol, precision, created_at, updated_at) VALUES
('unit-001', '个', '个', 0, datetime('now'), datetime('now')),     -- 基本计数单位
('unit-002', '件', '件', 0, datetime('now'), datetime('now')),     -- 商品件数
('unit-003', '套', '套', 0, datetime('now'), datetime('now')),     -- 成套商品
('unit-004', '包', '包', 0, datetime('now'), datetime('now')),     -- 包装单位
('unit-005', '箱', '箱', 0, datetime('now'), datetime('now')),     -- 箱装单位
('unit-006', '盒', '盒', 0, datetime('now'), datetime('now')),     -- 盒装单位
('unit-007', '瓶', '瓶', 0, datetime('now'), datetime('now')),     -- 瓶装单位
('unit-008', '罐', '罐', 0, datetime('now'), datetime('now')),     -- 罐装单位
('unit-009', '袋', '袋', 0, datetime('now'), datetime('now')),     -- 袋装单位
('unit-010', '支', '支', 0, datetime('now'), datetime('now')),     -- 支装单位
('unit-011', '打', '打', 0, datetime('now'), datetime('now')),     -- 12个为一打
('unit-012', '对', '对', 0, datetime('now'), datetime('now')),     -- 成对商品

-- 重量类单位 - 用于称重商品
('unit-013', '克', 'g', 2, datetime('now'), datetime('now')),      -- 基本重量单位
('unit-014', '千克', 'kg', 3, datetime('now'), datetime('now')),   -- 公斤
('unit-015', '吨', 't', 3, datetime('now'), datetime('now')),      -- 公吨
('unit-016', '磅', 'lb', 2, datetime('now'), datetime('now')),     -- 英制重量单位
('unit-017', '两', '两', 2, datetime('now'), datetime('now')),     -- 中式重量单位
('unit-018', '斤', '斤', 2, datetime('now'), datetime('now')),     -- 中式重量单位

-- 长度类单位 - 用于测量长度的商品
('unit-019', '厘米', 'cm', 2, datetime('now'), datetime('now')),   -- 基本长度单位
('unit-020', '米', 'm', 3, datetime('now'), datetime('now')),      -- 标准长度单位
('unit-021', '毫米', 'mm', 1, datetime('now'), datetime('now')),   -- 精密长度单位
('unit-022', '英寸', 'in', 2, datetime('now'), datetime('now')),   -- 英制长度单位
('unit-023', '英尺', 'ft', 2, datetime('now'), datetime('now')),   -- 英制长度单位
('unit-024', '分米', 'dm', 2, datetime('now'), datetime('now')),   -- 十分之一米
('unit-025', '公里', 'km', 3, datetime('now'), datetime('now')),   -- 千米
('unit-026', '码', 'yd', 2, datetime('now'), datetime('now')),     -- 英制长度单位

-- 体积类单位 - 用于测量体积的商品
('unit-027', '毫升', 'ml', 2, datetime('now'), datetime('now')),   -- 基本体积单位
('unit-028', '升', 'L', 3, datetime('now'), datetime('now')),      -- 标准体积单位
('unit-029', '立方厘米', 'cm³', 2, datetime('now'), datetime('now')), -- 立方体积单位
('unit-030', '立方米', 'm³', 3, datetime('now'), datetime('now')), -- 大体积单位
('unit-031', '加仑', 'gal', 2, datetime('now'), datetime('now')), -- 英制体积单位

-- 面积类单位 - 用于测量面积的商品
('unit-032', '平方厘米', 'cm²', 2, datetime('now'), datetime('now')), -- 基本面积单位
('unit-033', '平方米', 'm²', 3, datetime('now'), datetime('now')),  -- 标准面积单位
('unit-034', '平方英寸', 'in²', 2, datetime('now'), datetime('now')), -- 英制面积单位
('unit-035', '平方英尺', 'ft²', 2, datetime('now'), datetime('now')), -- 英制面积单位

-- 时间类单位 - 用于时间相关的商品或服务
('unit-036', '秒', 's', 0, datetime('now'), datetime('now')),      -- 基本时间单位
('unit-037', '分钟', 'min', 0, datetime('now'), datetime('now')), -- 60秒
('unit-038', '小时', 'h', 0, datetime('now'), datetime('now')),   -- 60分钟
('unit-039', '天', 'd', 0, datetime('now'), datetime('now')),     -- 24小时
('unit-040', '月', 'month', 0, datetime('now'), datetime('now')), -- 约30天
('unit-041', '年', 'year', 0, datetime('now'), datetime('now'));  -- 12个月

-- 商品分类数据 - 建立分层的商品分类体系
-- 功能：为商品提供结构化的分类管理，支持多级分类
INSERT INTO categories (id, name, parent_id, is_active, created_at, updated_at) VALUES
-- 一级分类（顶级分类）
('cat-001', '电子产品', NULL, 1, datetime('now'), datetime('now')),      -- 电子设备总类
('cat-004', '家用电器', NULL, 1, datetime('now'), datetime('now')),      -- 家电总类
('cat-007', '服装鞋帽', NULL, 1, datetime('now'), datetime('now')),      -- 服装总类
('cat-010', '食品饮料', NULL, 1, datetime('now'), datetime('now')),      -- 食品总类

-- 二级分类（子分类）
('cat-002', '手机', 'cat-001', 1, datetime('now'), datetime('now')),     -- 电子产品-手机
('cat-003', '电脑', 'cat-001', 1, datetime('now'), datetime('now')),     -- 电子产品-电脑
('cat-005', '厨房电器', 'cat-004', 1, datetime('now'), datetime('now')), -- 家用电器-厨房电器
('cat-006', '清洁电器', 'cat-004', 1, datetime('now'), datetime('now')), -- 家用电器-清洁电器
('cat-008', '男装', 'cat-007', 1, datetime('now'), datetime('now')),     -- 服装鞋帽-男装
('cat-009', '女装', 'cat-007', 1, datetime('now'), datetime('now'));     -- 服装鞋帽-女装

-- 供应商数据 - 示例供应商信息
-- 功能：提供常见的知名供应商作为系统初始数据
INSERT INTO suppliers (id, code, name, contact_person, phone, email, address, status, created_at, updated_at) VALUES
('sup-001', 'SUP001', '华为技术有限公司', '张经理', '010-12345678', 'zhang@huawei.com', '深圳市龙岗区', 'active', datetime('now'), datetime('now')),
('sup-002', 'SUP002', '小米科技有限公司', '李经理', '010-87654321', 'li@xiaomi.com', '北京市海淀区', 'active', datetime('now'), datetime('now')),
('sup-003', 'SUP003', '美的集团股份有限公司', '王经理', '0757-12345678', 'wang@midea.com', '佛山市顺德区', 'active', datetime('now'), datetime('now')),
('sup-004', 'SUP004', '海尔智家股份有限公司', '赵经理', '0532-87654321', 'zhao@haier.com', '青岛市崂山区', 'active', datetime('now'), datetime('now')),
('sup-005', 'SUP005', '格力电器股份有限公司', '刘经理', '0756-12345678', 'liu@gree.com', '珠海市香洲区', 'active', datetime('now'), datetime('now'));

-- 仓库数据 - 多仓库配置示例
-- 功能：提供多仓库管理的初始配置，包括主仓库和分仓库
INSERT INTO warehouses (id, code, name, address, manager, phone, is_default, created_at, updated_at) VALUES
('wh-001', 'WH001', '主仓库', '北京市朝阳区工业园区A座', '张经理', '010-12345678', 1, datetime('now'), datetime('now')),     -- 默认主仓库
('wh-002', 'WH002', '分仓库A', '上海市浦东新区物流园B区', '李经理', '021-87654321', 0, datetime('now'), datetime('now')),   -- 上海分仓
('wh-003', 'WH003', '分仓库B', '广州市天河区仓储中心C栋', '王经理', '020-11223344', 0, datetime('now'), datetime('now')), -- 广州分仓
('wh-004', 'WH004', '临时仓库', '深圳市南山区临时存储点', '赵经理', '0755-88776655', 0, datetime('now'), datetime('now')); -- 临时仓库

-- 单位换算规则数据 - 常用单位之间的换算关系
-- 功能：支持不同单位之间的自动换算，提高系统使用便利性
INSERT INTO global_conversion_rules (id, name, from_unit_id, to_unit_id, conversion_rate, category, description, is_active, created_at, updated_at) VALUES

-- 数量单位换算规则
('rule-001', '打到个转换', 'unit-011', 'unit-001', 12, 'quantity', '1打=12个', 0, datetime('now'), datetime('now')),
('rule-002', '对到个转换', 'unit-012', 'unit-001', 2, 'quantity', '1对=2个', 0, datetime('now'), datetime('now')),
('rule-003', '箱到个转换', 'unit-005', 'unit-001', 24, 'quantity', '1箱=24个（示例）', 0, datetime('now'), datetime('now')),
('rule-004', '包到个转换', 'unit-004', 'unit-001', 12, 'quantity', '1包=12个（示例）', 0, datetime('now'), datetime('now')),

-- 重量单位换算规则 - 支持国际和中式重量单位换算
('rule-005', '千克到克转换', 'unit-014', 'unit-013', 1000, 'weight', '1千克=1000克', 0, datetime('now'), datetime('now')),
('rule-006', '吨到千克转换', 'unit-015', 'unit-014', 1000, 'weight', '1吨=1000千克', 0, datetime('now'), datetime('now')),
('rule-007', '磅到克转换', 'unit-016', 'unit-013', 453.592, 'weight', '1磅=453.592克', 0, datetime('now'), datetime('now')),
('rule-008', '斤到克转换', 'unit-018', 'unit-013', 500, 'weight', '1斤=500克', 0, datetime('now'), datetime('now')),
('rule-009', '两到克转换', 'unit-017', 'unit-013', 50, 'weight', '1两=50克', 0, datetime('now'), datetime('now')),

-- 长度单位换算规则 - 支持公制和英制长度单位换算
('rule-010', '米到厘米转换', 'unit-020', 'unit-019', 100, 'length', '1米=100厘米', 0, datetime('now'), datetime('now')),
('rule-011', '厘米到毫米转换', 'unit-019', 'unit-021', 10, 'length', '1厘米=10毫米', 0, datetime('now'), datetime('now')),
('rule-012', '分米到厘米转换', 'unit-024', 'unit-019', 10, 'length', '1分米=10厘米', 0, datetime('now'), datetime('now')),
('rule-013', '公里到米转换', 'unit-025', 'unit-020', 1000, 'length', '1公里=1000米', 0, datetime('now'), datetime('now')),
('rule-014', '英寸到厘米转换', 'unit-022', 'unit-019', 2.54, 'length', '1英寸=2.54厘米', 0, datetime('now'), datetime('now')),
('rule-015', '英尺到英寸转换', 'unit-023', 'unit-022', 12, 'length', '1英尺=12英寸', 0, datetime('now'), datetime('now')),
('rule-016', '码到英尺转换', 'unit-026', 'unit-023', 3, 'length', '1码=3英尺', 0, datetime('now'), datetime('now')),

-- 体积单位换算规则 - 支持各种体积单位换算
('rule-017', '升到毫升转换', 'unit-028', 'unit-027', 1000, 'volume', '1升=1000毫升', 0, datetime('now'), datetime('now')),
('rule-018', '立方厘米到毫升转换', 'unit-029', 'unit-027', 1, 'volume', '1立方厘米=1毫升', 0, datetime('now'), datetime('now')),
('rule-019', '立方米到升转换', 'unit-030', 'unit-028', 1000, 'volume', '1立方米=1000升', 0, datetime('now'), datetime('now')),
('rule-020', '加仑到升转换', 'unit-031', 'unit-028', 3.78541, 'volume', '1加仑=3.78541升', 0, datetime('now'), datetime('now')),

-- 面积单位换算规则
('rule-021', '平方米到平方厘米转换', 'unit-033', 'unit-032', 10000, 'area', '1平方米=10000平方厘米', 0, datetime('now'), datetime('now')),
('rule-022', '平方英寸到平方厘米转换', 'unit-034', 'unit-032', 6.4516, 'area', '1平方英寸=6.4516平方厘米', 0, datetime('now'), datetime('now')),
('rule-023', '平方英尺到平方英寸转换', 'unit-035', 'unit-034', 144, 'area', '1平方英尺=144平方英寸', 0, datetime('now'), datetime('now')),

-- 时间单位换算规则 - 支持各种时间单位换算
('rule-024', '分钟到秒转换', 'unit-037', 'unit-036', 60, 'time', '1分钟=60秒', 0, datetime('now'), datetime('now')),
('rule-025', '小时到分钟转换', 'unit-038', 'unit-037', 60, 'time', '1小时=60分钟', 0, datetime('now'), datetime('now')),
('rule-026', '天到小时转换', 'unit-039', 'unit-038', 24, 'time', '1天=24小时', 0, datetime('now'), datetime('now')),
('rule-027', '月到天转换', 'unit-040', 'unit-039', 30, 'time', '1月=30天（平均）', 0, datetime('now'), datetime('now')),
('rule-028', '年到月转换', 'unit-041', 'unit-040', 12, 'time', '1年=12月', 0, datetime('now'), datetime('now'));

-- ================================================
-- 数据库版本管理 - Database Version Management
-- 功能：跟踪数据库结构变更历史，支持迁移管理
-- ================================================

-- 迁移记录表 - 记录已执行的数据库迁移
CREATE TABLE IF NOT EXISTS migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,                   -- 迁移记录ID，自增长
  version INTEGER UNIQUE NOT NULL,                        -- 迁移版本号，唯一
  name TEXT NOT NULL,                                     -- 迁移名称，描述迁移内容
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP           -- 迁移执行时间
);

-- 插入当前版本的迁移记录
INSERT INTO migrations (version, name) VALUES
(1, 'create_initial_tables'),          -- 创建基础表结构
(2, 'create_inventory_tables'),        -- 创建库存相关表
(3, 'create_supplier_and_purchase_tables'), -- 创建供应商和采购表
(4, 'create_customer_and_sales_tables'),    -- 创建客户和销售表
(5, 'create_financial_tables'),        -- 创建财务相关表
(6, 'create_operation_logs'),          -- 创建操作日志表
(7, 'create_sales_delivery_tables'),   -- 创建销售出库表
(8, 'create_triggers');                -- 创建触发器

-- 提交事务
COMMIT;

-- ================================================
-- 数据库初始化完成统计 - Initialization Statistics
-- 功能：显示数据库初始化结果，便于验证
-- ================================================

-- 显示数据库对象统计信息
SELECT 
  'Tables' as type, 
  COUNT(*) as count 
FROM sqlite_master 
WHERE type='table' AND name NOT LIKE 'sqlite_%'
UNION ALL
SELECT 
  'Indexes' as type, 
  COUNT(*) as count 
FROM sqlite_master 
WHERE type='index' AND name NOT LIKE 'sqlite_%'
UNION ALL
SELECT 
  'Triggers' as type, 
  COUNT(*) as count 
FROM sqlite_master 
WHERE type='trigger'
UNION ALL
SELECT 
  'Units' as type, 
  COUNT(*) as count 
FROM units
UNION ALL
SELECT 
  'Categories' as type, 
  COUNT(*) as count 
FROM categories
UNION ALL
SELECT 
  'Suppliers' as type, 
  COUNT(*) as count 
FROM suppliers
UNION ALL
SELECT 
  'Warehouses' as type, 
  COUNT(*) as count 
FROM warehouses
UNION ALL
SELECT 
  'Conversion Rules' as type, 
  COUNT(*) as count 
FROM global_conversion_rules;

-- ================================================
-- 脚本结束 - Script End
-- ================================================

/*
数据库初始化完成！
Database initialization completed!

包含内容 (Contents):
- 22个主要业务表 (22 main business tables)
- 完整的索引体系 (Complete index system)
- 自动时间戳触发器 (Automatic timestamp triggers)
- 库存自动更新触发器 (Inventory auto-update triggers)
- 41个标准计量单位 (41 standard measurement units)
- 10个商品分类 (10 product categories)
- 5个示例供应商 (5 sample suppliers)
- 4个仓库配置 (4 warehouse configurations)
- 28个单位转换规则 (28 unit conversion rules)

使用说明 (Usage):
1. 直接在SQLite客户端执行此脚本
2. 或使用命令行：sqlite3 database.db < database_schema_with_comments.sql
3. 所有表结构和基础数据将自动创建
*/