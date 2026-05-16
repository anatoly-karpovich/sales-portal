import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import { Button, Chip, Paper, Stack, TextField, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import type { DragEvent } from 'react'
import type { CategoryNode } from '@/api/modules/categories.api'
import { categoriesUiText } from '@/features/categories/categories.ui-text'
import { CategoriesTreeNodeRow } from '@/features/categories/components/CategoriesTreeNodeRow'
import { toStableId } from '@/features/categories/pages/categoriesPage.utils'

type CategoriesTreePanelProps = {
  flatNodesCount: number
  search: string
  onSearchChange: (value: string) => void
  addChildBlockedReason: string
  displayTree: CategoryNode[]
  effectiveSelectedId: string | null
  effectiveExpandedIds: Set<string>
  forcedExpandedIds: Set<string>
  searchActive: boolean
  dragOverId: string | null
  draggedId: string | null
  areActionsLocked: boolean
  onToggleExpand: (categoryId: string) => void
  onSelectNode: (categoryId: string) => void
  onAddChild: (categoryId: string) => void
  onOpenMovePicker: (categoryId: string) => void
  onDragStart: (categoryId: string, event: DragEvent<HTMLDivElement>) => void
  onDragEnd: () => void
  onDragOver: (categoryId: string, event: DragEvent<HTMLDivElement>) => void
  onDrop: (categoryId: string, event: DragEvent<HTMLDivElement>) => void
  onRootDragOver: (event: DragEvent<HTMLDivElement>) => void
  onRootDrop: (event: DragEvent<HTMLDivElement>) => void
  isRootDragOver: boolean
  onOpenCreateRoot: () => void
}

export function CategoriesTreePanel({
  flatNodesCount,
  search,
  onSearchChange,
  addChildBlockedReason,
  displayTree,
  effectiveSelectedId,
  effectiveExpandedIds,
  forcedExpandedIds,
  searchActive,
  dragOverId,
  draggedId,
  areActionsLocked,
  onToggleExpand,
  onSelectNode,
  onAddChild,
  onOpenMovePicker,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onRootDragOver,
  onRootDrop,
  isRootDragOver,
  onOpenCreateRoot,
}: CategoriesTreePanelProps) {
  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden' }} data-testid="categories-page-tree-panel">
      <Stack spacing={1.5} sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {categoriesUiText.tree.title}
          </Typography>
          <Chip
            label={`${flatNodesCount} nodes`}
            size="small"
            data-testid="categories-page-node-count-chip"
          />
        </Stack>
        <TextField
          placeholder={categoriesUiText.tree.searchPlaceholder}
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          data-testid="categories-page-tree-search-input"
          inputProps={{ 'data-testid': 'categories-page-tree-search-input-field' }}
        />
      </Stack>

      <Stack
        spacing={1}
        sx={{ p: 1.5, maxHeight: { xs: 420, lg: 'calc(100vh - 290px)' }, overflowY: 'auto' }}
      >
        {displayTree.length === 0 ? (
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ py: 0.75, px: 0.25 }}
            data-testid="categories-page-tree-empty-state"
          >
            <InfoOutlinedIcon fontSize="small" color="info" />
            <Typography variant="body2">{categoriesUiText.tree.empty}</Typography>
          </Stack>
        ) : (
          <Stack spacing={0.4} data-testid="categories-page-tree-list">
            {displayTree.map((node) => (
              <CategoriesTreeNodeRow
                key={`${toStableId(node._id)}-root`}
                node={node}
                depth={0}
                actionButtonsDisabled={areActionsLocked}
                addChildBlockedReason={addChildBlockedReason}
                selectedId={effectiveSelectedId}
                expandedIds={effectiveExpandedIds}
                forceExpandedIds={forcedExpandedIds}
                searchActive={searchActive}
                dragOverId={dragOverId}
                draggedId={draggedId}
                onToggleExpand={onToggleExpand}
                onSelect={onSelectNode}
                onAddChild={onAddChild}
                onOpenMovePicker={onOpenMovePicker}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onDragOver={onDragOver}
                onDrop={onDrop}
              />
            ))}
          </Stack>
        )}
        {draggedId ? (
          <Paper
            variant="outlined"
            onDragOver={onRootDragOver}
            onDrop={onRootDrop}
            sx={(theme) => ({
              p: 1.25,
              textAlign: 'center',
              borderStyle: 'dashed',
              borderWidth: 2,
              borderColor: isRootDragOver ? 'success.main' : 'info.main',
              bgcolor: isRootDragOver
                ? alpha(theme.palette.success.main, 0.2)
                : alpha(theme.palette.info.main, 0.12),
            })}
            data-testid="categories-page-root-drop-zone"
          >
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Drop here to move as root category
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Drag a category node into this zone
            </Typography>
          </Paper>
        ) : null}

        <Button
          variant="outlined"
          onClick={onOpenCreateRoot}
          disabled={areActionsLocked}
          data-testid="categories-page-tree-add-root-button"
        >
          {categoriesUiText.tree.addRootInlineButton}
        </Button>
      </Stack>
    </Paper>
  )
}
