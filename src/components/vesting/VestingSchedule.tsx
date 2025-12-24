

import { useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
} from '@mui/material'
import type { VestingData } from '@/types/vesting'
import { formatEther } from 'viem'

interface VestingScheduleProps {
  vestingData: VestingData
}

interface ScheduleRow {
  date: Date
  unlockAmount: bigint
  cumulative: bigint
  status: 'Claimed' | 'Available' | 'Locked'
}

export function VestingSchedule({ vestingData }: Readonly<VestingScheduleProps>) {
  const schedule = useMemo(() => {
    console.log("VestingSchedule.tsx")
    const rows: ScheduleRow[] = []
    const {
      startDate,
      totalAllocation,
      vestingTerm,
      vestingPlan,
      initialRelease,
      claimed,
    } = vestingData

    // Initial release
    const initialAmount = (totalAllocation * BigInt(initialRelease)) / 100n
    rows.push({
      date: new Date(startDate),
      unlockAmount: initialAmount,
      cumulative: initialAmount,
      status: claimed >= initialAmount ? 'Claimed' : 'Available',
    })
    console.log(rows);

    // Calculate monthly releases
    const monthlyAmount = (totalAllocation - initialAmount) / BigInt(vestingTerm)
    let currentDate = new Date(startDate)
    let cumulative = initialAmount

    for (let i = 1; i <= vestingTerm; i += vestingPlan) {
      currentDate = new Date(currentDate.getTime() + vestingPlan * 30 * 24 * 60 * 60 * 1000)
      cumulative += monthlyAmount * BigInt(vestingPlan)

      rows.push({
        date: currentDate,
        unlockAmount: monthlyAmount * BigInt(vestingPlan),
        cumulative,
        status: 
          Date.now() >= currentDate.getTime()
            ? claimed >= cumulative
              ? 'Claimed'
              : 'Available'
            : 'Locked',
      })
    }

    return rows
  }, [vestingData])

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Unlock Date</TableCell>
            <TableCell align="right">Amount</TableCell>
            <TableCell align="right">Cumulative</TableCell>
            <TableCell align="right">Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {schedule.map((row, index) => (
            <TableRow key={index}>
              <TableCell>
                {row.date.toLocaleDateString()}
              </TableCell>
              <TableCell align="right">
                {formatEther(row.unlockAmount)}
              </TableCell>
              <TableCell align="right">
                {formatEther(row.cumulative)}
              </TableCell>
              <TableCell align="right">
                <Typography
                  color={
                    row.status === 'Claimed'
                      ? 'success.main'
                      : row.status === 'Available'
                      ? 'primary.main'
                      : 'text.secondary'
                  }
                >
                  {row.status}
                </Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
