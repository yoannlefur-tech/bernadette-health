import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TablePagination from '@mui/material/TablePagination'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { useMemo, useState } from 'react'
import { formatDate } from './dates'
import type { WeighIn } from './types'
import { formatDelta, withDeltas } from './weighIns'
import { formatKg } from './weightUnits'

const ROWS_PER_PAGE = 10

type WeightHistoryProps = {
  /** In chronological order. */
  weighIns: readonly WeighIn[]
  onAdd: () => void
  onEdit: (weighIn: WeighIn) => void
  onDelete: (weighIn: WeighIn) => void
}

export function WeightHistory({ weighIns, onAdd, onEdit, onDelete }: WeightHistoryProps) {
  const [requestedPage, setRequestedPage] = useState(0)
  const rows = useMemo(() => withDeltas(weighIns).reverse(), [weighIns])

  if (rows.length === 0) {
    return (
      <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
        <Typography>Aucune pesée pour le moment</Typography>
        <Button variant="contained" onClick={onAdd}>
          Ajouter une pesée
        </Button>
      </Stack>
    )
  }

  // Deleting the only line of the last page must not leave an empty page.
  const page = Math.min(requestedPage, Math.ceil(rows.length / ROWS_PER_PAGE) - 1)
  const visibleRows = rows.slice(page * ROWS_PER_PAGE, (page + 1) * ROWS_PER_PAGE)

  return (
    <Paper variant="outlined">
      <TableContainer>
        <Table size="small" sx={{ '& th, & td': { px: 1 } }}>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell align="right">Poids</TableCell>
              <TableCell align="right">Écart</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleRows.map((row) => {
              const date = formatDate(row.measured_at)

              return (
                <TableRow key={row.id}>
                  <TableCell>{date}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    {formatKg(row.weight_grams)} kg
                  </TableCell>
                  <TableCell align="right">{row.delta ? formatDelta(row.delta) : '—'}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    <IconButton
                      size="small"
                      aria-label={`Modifier la pesée du ${date}`}
                      onClick={() => onEdit(row)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      aria-label={`Supprimer la pesée du ${date}`}
                      onClick={() => onDelete(row)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={rows.length}
        page={page}
        rowsPerPage={ROWS_PER_PAGE}
        rowsPerPageOptions={[]}
        onPageChange={(_, newPage) => setRequestedPage(newPage)}
        labelDisplayedRows={({ from, to, count }) => `${from}–${to} sur ${count}`}
        getItemAriaLabel={(type) => (type === 'next' ? 'Page suivante' : 'Page précédente')}
      />
    </Paper>
  )
}
