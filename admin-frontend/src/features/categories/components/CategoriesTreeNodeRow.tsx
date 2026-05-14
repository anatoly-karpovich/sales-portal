import AddRoundedIcon from '@mui/icons-material/AddRounded'
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded'
import DragIndicatorRoundedIcon from '@mui/icons-material/DragIndicatorRounded'
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded'
import OpenWithRoundedIcon from '@mui/icons-material/OpenWithRounded'
import { Box, IconButton, Stack, Tooltip, Typography } from '@mui/material'
import type { DragEvent } from 'react'
import type { CategoryNode } from '@/api/modules/categories.api'

type CategoriesTreeNodeRowProps = {
  node: CategoryNode
  depth: number
  actionButtonsDisabled: boolean
  selectedId: string | null
  expandedIds: Set<string>
  forceExpandedIds: Set<string>
  searchActive: boolean
  dragOverId: string | null
  draggedId: string | null
  onToggleExpand: (categoryId: string) => void
  onSelect: (categoryId: string) => void
  onAddChild: (categoryId: string) => void
  onOpenMovePicker: (categoryId: string) => void
  onDragStart: (categoryId: string, event: DragEvent<HTMLDivElement>) => void
  onDragEnd: () => void
  onDragOver: (categoryId: string, event: DragEvent<HTMLDivElement>) => void
  onDrop: (categoryId: string, event: DragEvent<HTMLDivElement>) => void
}

export function CategoriesTreeNodeRow({
  node,
  depth,
  actionButtonsDisabled,
  selectedId,
  expandedIds,
  forceExpandedIds,
  searchActive,
  dragOverId,
  draggedId,
  onToggleExpand,
  onSelect,
  onAddChild,
  onOpenMovePicker,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: CategoriesTreeNodeRowProps) {
  const isSelected = selectedId === node._id
  const hasChildren = node.children.length > 0
  const isExpanded = searchActive ? forceExpandedIds.has(node._id) : expandedIds.has(node._id)
  const isDragOver = dragOverId === node._id
  const isDragging = draggedId === node._id
  const showRowActions = !actionButtonsDisabled && isSelected

  return (
    <Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'auto 28px minmax(0, 1fr) auto auto',
          alignItems: 'center',
          gap: 0.75,
          py: 0.5,
          pr: 0.5,
          pl: 0.5,
          borderRadius: 1.5,
          border: '1px solid',
          borderColor: isDragOver ? 'success.main' : 'transparent',
          bgcolor: isDragOver ? 'success.main' : isSelected ? 'action.hover' : 'transparent',
          opacity: isDragging ? 0.45 : 1,
          color:
            isDragOver
              ? 'primary.contrastText'
              : isSelected
                ? 'text.primary'
                : depth > 0
                  ? 'text.secondary'
                  : 'text.primary',
          '&:hover': {
            bgcolor: isDragOver ? 'success.main' : 'action.hover',
            color: isDragOver ? 'primary.contrastText' : 'text.primary',
          },
          '&:hover .categories-tree-row-action': {
            opacity: 1,
            transform: 'translateX(0)',
          },
          '&:hover .categories-tree-row-drag-handle': {
            opacity: actionButtonsDisabled ? 0 : 1,
          },
        }}
        draggable
        onDragStart={(event) => onDragStart(node._id, event)}
        onDragEnd={onDragEnd}
        onDragOver={(event) => onDragOver(node._id, event)}
        onDrop={(event) => onDrop(node._id, event)}
        data-testid={`categories-tree-node-${node._id}`}
      >
        <Stack
          direction="row"
          spacing={0}
          sx={{ height: 28, minWidth: depth > 0 ? `${depth * 0.7}rem` : '0.4rem' }}
          aria-hidden
        >
          {Array.from({ length: depth }).map((_, index) => (
            <Box
              key={`depth-guide-${node._id}-${depth}-${index}`}
              sx={{
                width: '0.7rem',
                borderLeft: '1px dashed',
                borderColor: 'divider',
                opacity: 0.55,
              }}
            />
          ))}
        </Stack>

        <IconButton
          size="small"
          onClick={(event) => {
            event.stopPropagation()
            if (!hasChildren) return
            onToggleExpand(node._id)
          }}
          sx={{ color: 'inherit' }}
          data-testid={`categories-tree-node-toggle-${node._id}`}
        >
          {hasChildren ? (
            isExpanded ? (
              <ExpandMoreRoundedIcon fontSize="small" />
            ) : (
              <ChevronRightRoundedIcon fontSize="small" />
            )
          ) : (
            <Box
              component="span"
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                bgcolor: 'currentColor',
                display: 'inline-block',
              }}
            />
          )}
        </IconButton>

        <Stack
          direction="row"
          spacing={0.75}
          sx={{ minWidth: 0, alignItems: 'center', cursor: 'pointer' }}
          onClick={() => onSelect(node._id)}
          data-testid={`categories-tree-node-select-${node._id}`}
        >
          <DragIndicatorRoundedIcon
            fontSize="small"
            className="categories-tree-row-drag-handle"
            sx={{ opacity: showRowActions ? 1 : 0, color: 'text.secondary' }}
          />
          <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
            {node.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
            {node.productsCount ?? 0} products
          </Typography>
        </Stack>

        <Tooltip title="Add child category">
          <span>
            <IconButton
              size="small"
              className="categories-tree-row-action"
              disabled={actionButtonsDisabled}
              onClick={(event) => {
                event.stopPropagation()
                onAddChild(node._id)
              }}
              sx={{
                opacity: showRowActions ? 1 : 0,
                transform: showRowActions ? 'translateX(0)' : 'translateX(4px)',
                transition: 'all 150ms ease',
              }}
              data-testid={`categories-tree-node-add-child-${node._id}`}
            >
              <AddRoundedIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title="Move category">
          <span>
            <IconButton
              size="small"
              className="categories-tree-row-action"
              disabled={actionButtonsDisabled}
              onClick={(event) => {
                event.stopPropagation()
                onOpenMovePicker(node._id)
              }}
              sx={{
                opacity: showRowActions ? 1 : 0,
                transform: showRowActions ? 'translateX(0)' : 'translateX(4px)',
                transition: 'all 150ms ease',
              }}
              data-testid={`categories-tree-node-move-${node._id}`}
            >
              <OpenWithRoundedIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {hasChildren && isExpanded ? (
        <Stack spacing={0.4}>
          {node.children.map((child, childIndex) => (
            <CategoriesTreeNodeRow
              key={`${child._id}-${depth + 1}-${childIndex}`}
              node={child}
              depth={depth + 1}
              actionButtonsDisabled={actionButtonsDisabled}
              selectedId={selectedId}
              expandedIds={expandedIds}
              forceExpandedIds={forceExpandedIds}
              searchActive={searchActive}
              dragOverId={dragOverId}
              draggedId={draggedId}
              onToggleExpand={onToggleExpand}
              onSelect={onSelect}
              onAddChild={onAddChild}
              onOpenMovePicker={onOpenMovePicker}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDragOver={onDragOver}
              onDrop={onDrop}
            />
          ))}
        </Stack>
      ) : null}
    </Box>
  )
}
