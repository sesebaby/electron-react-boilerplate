import * as React from "react"
import * as ScrollArea from '@radix-ui/react-scroll-area'
import { cn } from "../../lib/utils"

/**
 * 基础表格组件接口
 */
interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  /** 是否启用固定表头 */
  stickyHeader?: boolean
  /** 最小宽度 */
  minWidth?: string | number
}

interface TableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  /** 是否为固定表头 */
  sticky?: boolean
}

interface TableContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 表格高度 */
  height?: string | number
  /** 是否启用滚动 */
  scrollable?: boolean
  /** 自定义滚动条样式 */
  scrollbarClassName?: string
}

/**
 * 表格容器组件 - 集成 Radix UI ScrollArea
 */
const TableContainer = React.forwardRef<
  HTMLDivElement,
  TableContainerProps
>(({ 
  className, 
  height = "100%", 
  scrollable = true, 
  scrollbarClassName,
  children,
  ...props 
}, ref) => {
  if (!scrollable) {
    return (
      <div
        ref={ref}
        className={cn("table-container", className)}
        style={{ height }}
        {...props}
      >
        {children}
      </div>
    )
  }

  return (
    <div
      ref={ref}
      className={cn("table-container", className)}
      style={{ height }}
      {...props}
    >
      <ScrollArea.Root className="table-scroll-root h-full">
        <ScrollArea.Viewport className="table-scroll-viewport">
          {children}
        </ScrollArea.Viewport>
        
        <ScrollArea.Scrollbar 
          className={cn("table-scrollbar", scrollbarClassName)} 
          orientation="vertical"
        >
          <ScrollArea.Thumb className="table-scrollbar-thumb" />
        </ScrollArea.Scrollbar>
        
        <ScrollArea.Scrollbar 
          className={cn("table-scrollbar", scrollbarClassName)} 
          orientation="horizontal"
        >
          <ScrollArea.Thumb className="table-scrollbar-thumb" />
        </ScrollArea.Scrollbar>
        
        <ScrollArea.Corner />
      </ScrollArea.Root>
    </div>
  )
})
TableContainer.displayName = "TableContainer"

/**
 * 基础表格组件
 */
const Table = React.forwardRef<
  HTMLTableElement,
  TableProps
>(({ className, stickyHeader = false, minWidth, ...props }, ref) => (
  <table
    ref={ref}
    className={cn(
      "standard-table w-full border-collapse",
      stickyHeader && "table-sticky-header",
      className
    )}
    style={{ 
      minWidth: minWidth || "100%",
      ...props.style 
    }}
    {...props}
  />
))
Table.displayName = "Table"

/**
 * 表头组件
 */
const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  TableHeaderProps
>(({ className, sticky = false, ...props }, ref) => (
  <thead 
    ref={ref} 
    className={cn(
      "[&_tr]:border-b [&_tr]:border-white/10",
      sticky && "table-header-sticky",
      className
    )} 
    {...props} 
  />
))
TableHeader.displayName = "TableHeader"

/**
 * 表体组件
 */
const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
))
TableBody.displayName = "TableBody"

/**
 * 表尾组件
 */
const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t border-white/20 bg-white/5 font-medium [&>tr]:last:border-b-0",
      className
    )}
    {...props}
  />
))
TableFooter.displayName = "TableFooter"

/**
 * 表格行组件
 */
const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "table-row-hover border-b border-white/5 transition-colors data-[state=selected]:table-row-selected",
      className
    )}
    {...props}
  />
))
TableRow.displayName = "TableRow"

/**
 * 表头单元格组件
 */
interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  /** 是否为固定列 */
  fixed?: boolean
  /** 固定列位置 */
  fixedPosition?: 'left' | 'right'
  /** 固定列偏移量 */
  fixedOffset?: string | number
}

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  TableHeadProps
>(({ 
  className, 
  fixed = false, 
  fixedPosition = 'left',
  fixedOffset = 0,
  style,
  ...props 
}, ref) => {
  const fixedStyle = fixed ? {
    [fixedPosition]: fixedOffset,
    ...style
  } : style

  return (
    <th
      ref={ref}
      className={cn(
        "h-12 px-4 text-left align-middle font-medium [&:has([role=checkbox])]:pr-0",
        fixed && "table-cell-fixed",
        className
      )}
      style={{
        color: 'var(--table-text-primary, var(--text-primary))',
        ...fixedStyle
      }}
      {...props}
    />
  )
})
TableHead.displayName = "TableHead"

/**
 * 表格单元格组件
 */
interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  /** 是否为固定列 */
  fixed?: boolean
  /** 固定列位置 */
  fixedPosition?: 'left' | 'right'
  /** 固定列偏移量 */
  fixedOffset?: string | number
}

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  TableCellProps
>(({ 
  className, 
  fixed = false, 
  fixedPosition = 'left',
  fixedOffset = 0,
  style,
  ...props 
}, ref) => {
  const fixedStyle = fixed ? {
    [fixedPosition]: fixedOffset,
    ...style
  } : style

  return (
    <td
      ref={ref}
      className={cn(
        "p-4 align-middle [&:has([role=checkbox])]:pr-0",
        fixed && "table-cell-fixed",
        className
      )}
      style={{
        color: 'var(--table-text-secondary, var(--text-secondary))',
        ...fixedStyle
      }}
      {...props}
    />
  )
})
TableCell.displayName = "TableCell"

/**
 * 表格标题组件
 */
const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm", className)}
    style={{ 
      color: 'var(--table-text-tertiary, var(--text-tertiary))', 
      ...props.style 
    }}
    {...props}
  />
))
TableCaption.displayName = "TableCaption"

/**
 * 空状态组件
 */
interface TableEmptyProps {
  message?: string
  description?: string
  icon?: React.ReactNode
  className?: string
}

const TableEmpty: React.FC<TableEmptyProps> = ({
  message = "暂无数据",
  description,
  icon = "📊",
  className
}) => (
  <div className={cn("text-center py-12", className)}>
    <div className="text-4xl mb-4">{icon}</div>
    <p className="text-lg mb-2 text-white/70">{message}</p>
    {description && (
      <p className="text-sm text-white/50">{description}</p>
    )}
  </div>
)

/**
 * 加载状态组件
 */
interface TableLoadingProps {
  message?: string
  className?: string
}

const TableLoading: React.FC<TableLoadingProps> = ({
  message = "加载中...",
  className
}) => (
  <div className={cn("flex items-center justify-center py-12", className)}>
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/70"></div>
    <span className="ml-3 text-white/80">{message}</span>
  </div>
)

export {
  Table,
  TableContainer,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  TableEmpty,
  TableLoading,
}