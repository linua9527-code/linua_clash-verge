import BarChartRounded from '@mui/icons-material/BarChartRounded'
import {
  Box,
  Button,
  ButtonGroup,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { BaseEmpty, BasePage } from '@/components/base'
import { useProcessTrafficHistory } from '@/hooks/use-process-traffic'
import type {
  ProcessTrafficDateRange,
  ProcessTrafficPeriod,
  ProcessTrafficQuery,
} from '@/services/process-traffic-history'
import parseTraffic from '@/utils/parse-traffic'

const PERIODS: ProcessTrafficPeriod[] = ['day', 'week', 'month']

const getToday = () => {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatTraffic = (bytes: number) => {
  const [value, unit] = parseTraffic(bytes)
  return `${value} ${unit}`
}

const ProcessTrafficPage = () => {
  const { t } = useTranslation()
  const [period, setPeriod] = useState<ProcessTrafficPeriod>('day')
  const [customStartDate, setCustomStartDate] = useState(getToday)
  const [customEndDate, setCustomEndDate] = useState(getToday)
  const [customRange, setCustomRange] = useState<
    ProcessTrafficDateRange | null
  >(null)
  const query = useMemo<ProcessTrafficQuery>(
    () => customRange ?? period,
    [customRange, period],
  )
  const rows = useProcessTrafficHistory(query)
  const totalUpload = rows.reduce((total, row) => total + row.upload, 0)
  const totalDownload = rows.reduce((total, row) => total + row.download, 0)

  return (
    <BasePage
      title={t('connections.components.processTraffic.title')}
      header={<BarChartRounded color="primary" />}
      contentStyle={{ height: '100%', minHeight: 0 }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          minHeight: 0,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            mb: 1.5,
            flexWrap: 'wrap',
          }}
        >
          <ButtonGroup size="small" variant="outlined">
            {PERIODS.map((item) => (
              <Button
                key={item}
                variant={
                  !customRange && period === item ? 'contained' : 'outlined'
                }
                onClick={() => {
                  setPeriod(item)
                  setCustomRange(null)
                }}
              >
                {t(`connections.components.processTraffic.period.${item}`)}
              </Button>
            ))}
            <Button
              variant={customRange ? 'contained' : 'outlined'}
              onClick={() =>
                setCustomRange({
                  startDate: customStartDate,
                  endDate: customEndDate,
                })
              }
            >
              {t('connections.components.processTraffic.period.custom')}
            </Button>
          </ButtonGroup>
          <Typography variant="body2" color="text.secondary">
            {t('connections.components.processTraffic.total', {
              upload: formatTraffic(totalUpload),
              download: formatTraffic(totalDownload),
            })}
          </Typography>
        </Box>

        {customRange && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              mb: 1.5,
              flexWrap: 'wrap',
            }}
          >
            <TextField
              size="small"
              type="date"
              label={t(
                'connections.components.processTraffic.custom.startDate',
              )}
              value={customStartDate}
              onChange={(event) => setCustomStartDate(event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              size="small"
              type="date"
              label={t(
                'connections.components.processTraffic.custom.endDate',
              )}
              value={customEndDate}
              onChange={(event) => setCustomEndDate(event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <Button
              variant="contained"
              onClick={() =>
                setCustomRange({
                  startDate: customStartDate,
                  endDate: customEndDate,
                })
              }
              disabled={
                !customStartDate ||
                !customEndDate ||
                customStartDate > customEndDate
              }
            >
              {t('connections.components.processTraffic.custom.apply')}
            </Button>
          </Box>
        )}

        {rows.length === 0 ? (
          <BaseEmpty text={t('connections.components.processTraffic.empty')} />
        ) : (
          <TableContainer
            component={Paper}
            variant="outlined"
            sx={{ flex: 1 }}
          >
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>
                    {t('connections.components.processTraffic.fields.process')}
                  </TableCell>
                  <TableCell align="right">
                    {t(
                      'connections.components.processTraffic.fields.download',
                    )}
                  </TableCell>
                  <TableCell align="right">
                    {t(
                      'connections.components.processTraffic.fields.upload',
                    )}
                  </TableCell>
                  <TableCell align="right">
                    {t('connections.components.processTraffic.fields.total')}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => {
                  const processName =
                    row.process ||
                    t('connections.components.processTraffic.unknownProcess')

                  return (
                    <TableRow key={row.key} hover>
                      <TableCell sx={{ maxWidth: 0 }}>
                        <Typography noWrap title={row.path || processName}>
                          {processName}
                        </Typography>
                        {row.path && (
                          <Tooltip title={row.path}>
                            <Typography
                              noWrap
                              variant="caption"
                              color="text.secondary"
                            >
                              {row.path}
                            </Typography>
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        {formatTraffic(row.download)}
                      </TableCell>
                      <TableCell align="right">
                        {formatTraffic(row.upload)}
                      </TableCell>
                      <TableCell align="right">
                        {formatTraffic(row.download + row.upload)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </BasePage>
  )
}

export default ProcessTrafficPage
