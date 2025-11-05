import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Skeleton,
} from '@mui/material';

/**
 * SkeletonTable Component
 *
 * Skeleton loader for table-based content
 * Matches the structure of MUI tables used throughout the app
 *
 * @param {number} rows - Number of skeleton rows to render (default: 5)
 * @param {number} columns - Number of columns in the table (default: 4)
 * @param {Array<string>} headers - Optional header labels (if provided, will show skeleton headers)
 * @param {boolean} showActions - Show action column with icon skeletons (default: true)
 */
export default function SkeletonTable({
  rows = 5,
  columns = 4,
  headers = null,
  showActions = true,
}) {
  const totalColumns = showActions ? columns + 1 : columns;

  // Generate random widths for more realistic skeleton appearance
  const getRandomWidth = (min = 60, max = 90) => {
    return `${Math.floor(Math.random() * (max - min + 1)) + min}%`;
  };

  return (
    <TableContainer
      component={Paper}
      sx={{
        animation: 'fadeIn 0.5s ease-out',
        '@keyframes fadeIn': {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
      }}
    >
      <Table>
        {/* Table Head */}
        <TableHead>
          <TableRow>
            {headers ? (
              // Show header skeletons based on provided headers
              <>
                {headers.map((header, index) => (
                  <TableCell key={index}>
                    <Skeleton
                      variant="text"
                      width={header.length * 8 + 20}
                      height={24}
                      sx={{ fontWeight: 600 }}
                    />
                  </TableCell>
                ))}
                {showActions && (
                  <TableCell align="right">
                    <Skeleton variant="text" width={70} height={24} />
                  </TableCell>
                )}
              </>
            ) : (
              // Generic header skeletons
              <>
                {Array.from({ length: columns }).map((_, index) => (
                  <TableCell key={index}>
                    <Skeleton
                      variant="text"
                      width={100}
                      height={24}
                      sx={{ fontWeight: 600 }}
                    />
                  </TableCell>
                ))}
                {showActions && (
                  <TableCell align="right">
                    <Skeleton variant="text" width={70} height={24} />
                  </TableCell>
                )}
              </>
            )}
          </TableRow>
        </TableHead>

        {/* Table Body */}
        <TableBody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <TableRow
              key={rowIndex}
              sx={{
                animation: `slideIn 0.3s ease-out ${rowIndex * 0.05}s both`,
                '@keyframes slideIn': {
                  '0%': {
                    opacity: 0,
                    transform: 'translateX(-10px)',
                  },
                  '100%': {
                    opacity: 1,
                    transform: 'translateX(0)',
                  },
                },
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.02)',
                },
              }}
            >
              {/* Data columns */}
              {Array.from({ length: columns }).map((_, colIndex) => (
                <TableCell key={colIndex}>
                  {colIndex === 0 ? (
                    // First column - often has more prominent text
                    <Skeleton
                      variant="text"
                      width={getRandomWidth(70, 95)}
                      height={20}
                      sx={{
                        animation: 'pulse 1.5s ease-in-out infinite',
                        animationDelay: `${rowIndex * 0.1}s`,
                        '@keyframes pulse': {
                          '0%, 100%': { opacity: 1 },
                          '50%': { opacity: 0.4 },
                        },
                      }}
                    />
                  ) : colIndex === columns - 1 ? (
                    // Last column - often has chips or badges
                    <Skeleton
                      variant="rounded"
                      width={80}
                      height={24}
                      sx={{
                        borderRadius: 3,
                        animation: 'shimmer 2s infinite',
                        animationDelay: `${rowIndex * 0.1}s`,
                        '@keyframes shimmer': {
                          '0%': { opacity: 0.3 },
                          '50%': { opacity: 0.6 },
                          '100%': { opacity: 0.3 },
                        },
                      }}
                    />
                  ) : (
                    // Middle columns - regular text
                    <Skeleton
                      variant="text"
                      width={getRandomWidth(50, 85)}
                      height={20}
                      sx={{
                        animation: 'pulse 1.5s ease-in-out infinite',
                        animationDelay: `${rowIndex * 0.1 + colIndex * 0.05}s`,
                      }}
                    />
                  )}
                </TableCell>
              ))}

              {/* Actions column */}
              {showActions && (
                <TableCell align="right">
                  <Box display="flex" gap={1} justifyContent="flex-end">
                    <Skeleton
                      variant="circular"
                      width={32}
                      height={32}
                      sx={{
                        animation: 'shimmer 2s infinite',
                        animationDelay: `${rowIndex * 0.1}s`,
                      }}
                    />
                    <Skeleton
                      variant="circular"
                      width={32}
                      height={32}
                      sx={{
                        animation: 'shimmer 2s infinite',
                        animationDelay: `${rowIndex * 0.1 + 0.1}s`,
                      }}
                    />
                  </Box>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
