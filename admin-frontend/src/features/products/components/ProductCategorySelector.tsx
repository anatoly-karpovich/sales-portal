import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded'
import { Alert, Box, Chip, Paper, Stack, TextField, Typography } from '@mui/material'
import { useMemo, useState } from 'react'
import type { CategoryFlatNode, CategoryNode } from '@/api/modules/categories.api'

type ProductCategorySelectorProps = {
  tree: CategoryNode[]
  flat: CategoryFlatNode[]
  selectedCategoryId: string | null
  onChange: (categoryId: string) => void
  disabled?: boolean
  testIdPrefix: string
}

type CategoryTreeMeta = {
  isLeaf: boolean
}

function buildPathLabel(path: CategoryFlatNode['path']) {
  return path.map((item) => item.name).join(' / ')
}

function collectTreeMeta(nodes: CategoryNode[], result = new Map<string, CategoryTreeMeta>()) {
  nodes.forEach((node) => {
    result.set(node._id, { isLeaf: (node.children ?? []).length === 0 })
    collectTreeMeta(node.children ?? [], result)
  })
  return result
}

function filterTreeBySearch(nodes: CategoryNode[], matchedNodeIds: Set<string>): CategoryNode[] {
  const walk = (items: CategoryNode[]): CategoryNode[] => {
    return items.flatMap((item) => {
      const filteredChildren = walk(item.children ?? [])
      const isMatched = matchedNodeIds.has(item._id)

      if (!isMatched && filteredChildren.length === 0) {
        return []
      }

      return [{ ...item, children: filteredChildren }]
    })
  }

  return walk(nodes)
}

export function ProductCategorySelector({
  tree,
  flat,
  selectedCategoryId,
  onChange,
  disabled = false,
  testIdPrefix,
}: ProductCategorySelectorProps) {
  const [search, setSearch] = useState('')

  const treeMetaById = useMemo(() => collectTreeMeta(tree), [tree])
  const flatById = useMemo(() => new Map(flat.map((node) => [node._id, node])), [flat])

  const selectedCategory = selectedCategoryId ? flatById.get(selectedCategoryId) ?? null : null

  const normalizedSearch = search.trim().toLowerCase()
  const matchingNodeIds = useMemo(() => {
    if (!normalizedSearch) return new Set<string>()

    return new Set(
      flat
        .filter((item) => {
          const pathLabel = buildPathLabel(item.path).toLowerCase()
          return (
            item.name.toLowerCase().includes(normalizedSearch) ||
            item.slug.toLowerCase().includes(normalizedSearch) ||
            pathLabel.includes(normalizedSearch)
          )
        })
        .map((item) => item._id),
    )
  }, [flat, normalizedSearch])

  const displayTree = useMemo(() => {
    if (!normalizedSearch) return tree
    return filterTreeBySearch(tree, matchingNodeIds)
  }, [matchingNodeIds, normalizedSearch, tree])

  const renderNodes = (nodes: CategoryNode[], depth: number) => {
    return nodes.map((node) => {
      const nodeMeta = treeMetaById.get(node._id)
      const isLeaf = nodeMeta?.isLeaf ?? true
      const isSelected = selectedCategoryId === node._id

      return (
        <Box key={node._id}>
          <Box
            component="button"
            type="button"
            disabled={disabled || !isLeaf}
            onClick={() => onChange(node._id)}
            sx={{
              width: '100%',
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) auto',
              alignItems: 'center',
              gap: 1,
              px: 1,
              py: 0.9,
              borderRadius: 1,
              border: '1px solid',
              borderColor: isSelected ? 'primary.main' : 'transparent',
              bgcolor: isSelected ? 'action.selected' : 'transparent',
              color: 'text.primary',
              textAlign: 'left',
              cursor: disabled || !isLeaf ? 'not-allowed' : 'pointer',
              opacity: disabled || !isLeaf ? 0.7 : 1,
              '&:hover': {
                bgcolor: disabled || !isLeaf ? 'transparent' : 'action.hover',
              },
            }}
            data-testid={`${testIdPrefix}-option-${node._id}`}
          >
            <Stack spacing={0.25} sx={{ pl: depth * 2 }}>
              <Typography variant="body2" sx={{ fontWeight: isSelected ? 700 : 600 }}>
                {node.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {flatById.get(node._id)?.path ? buildPathLabel(flatById.get(node._id)!.path) : node.slug}
              </Typography>
            </Stack>
            {isLeaf ? (
              <Chip size="small" label="leaf" color="success" variant="outlined" />
            ) : (
              <Chip size="small" label={`${node.children.length} children`} variant="outlined" />
            )}
          </Box>

          {(node.children ?? []).length > 0 ? <Stack spacing={0.5}>{renderNodes(node.children, depth + 1)}</Stack> : null}
        </Box>
      )
    })
  }

  return (
    <Stack spacing={1.25} data-testid={`${testIdPrefix}-selector`}>
      <TextField
        placeholder="Search category by name, slug or path..."
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        disabled={disabled}
        data-testid={`${testIdPrefix}-search-input`}
        inputProps={{ 'data-testid': `${testIdPrefix}-search-input-field` }}
      />

      <Paper
        variant="outlined"
        sx={{ p: 1, maxHeight: 320, overflowY: 'auto' }}
        data-testid={`${testIdPrefix}-tree`}
      >
        {displayTree.length === 0 ? (
          <Alert severity="info" data-testid={`${testIdPrefix}-empty-state`}>
            No categories found.
          </Alert>
        ) : (
          <Stack spacing={0.5}>{renderNodes(displayTree, 0)}</Stack>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ p: 1.25 }} data-testid={`${testIdPrefix}-preview`}>
        <Stack spacing={0.75}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              Selected category
            </Typography>
            {selectedCategory ? <Chip label="leaf" size="small" color="success" variant="outlined" /> : null}
          </Stack>

          {selectedCategory ? (
            <Stack spacing={0.5}>
              <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
                {selectedCategory.path.map((pathItem, index) => (
                  <Stack key={`${pathItem._id}-${index}`} direction="row" spacing={0.5} alignItems="center">
                    <Chip size="small" label={pathItem.name} />
                    {index < selectedCategory.path.length - 1 ? (
                      <ChevronRightRoundedIcon fontSize="small" color="disabled" />
                    ) : null}
                  </Stack>
                ))}
              </Stack>
              <Typography variant="caption" color="text.secondary">
                Root category: {selectedCategory.path[0]?.name ?? '-'}
              </Typography>
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Select a leaf category.
            </Typography>
          )}
        </Stack>
      </Paper>
    </Stack>
  )
}
