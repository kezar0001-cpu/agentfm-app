import {
  Alert,
  Box,
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Button,
  Stack,
  Chip,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import useApiQuery from '../hooks/useApiQuery.js';
import useApiMutation from '../hooks/useApiMutation.js';
import DataState from '../components/DataState.jsx';
import { normaliseArray } from '../utils/error.js';

export default function RecommendationsPage() {
  const { t } = useTranslation();
  const query = useApiQuery({ queryKey: ['recommendations'], url: '/api/recommendations' });
  const mutation = useApiMutation({
    url: '/api/recommendations/:id/convert',
    method: 'post',
    invalidateKeys: [['recommendations'], ['jobs']],
  });

  const recommendations = normaliseArray(query.data);

  const handleConvert = async (recommendationId) => {
    try {
      await mutation.mutateAsync({ url: `/api/recommendations/${recommendationId}/convert`, method: 'post' });
    } catch (error) {
      // Handled via mutation state.
    }
  };

  return (
    <Stack spacing={4}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          {t('recommendations.title')}
        </Typography>
      </Box>

      <Paper sx={{ p: { xs: 2, md: 3 } }}>
        {mutation.isError && (
          <Alert severity="error" sx={{ mx: 2, mt: 2 }}>
            {mutation.error.message}
          </Alert>
        )}
        <DataState
          isLoading={query.isLoading}
          isError={query.isError}
          error={query.error}
          isEmpty={!query.isLoading && !query.isError && recommendations.length === 0}
          onRetry={query.refetch}
        >
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>{t('reports.property')}</TableCell>
                  <TableCell>{t('recommendations.priority')}</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recommendations.map((recommendation) => (
                  <TableRow key={recommendation.id}>
                    <TableCell>{recommendation.id}</TableCell>
                    <TableCell>{recommendation.propertyName || recommendation.propertyId}</TableCell>
                    <TableCell>
                      {recommendation.priority && (
                        <Chip
                          size="small"
                          label={recommendation.priority}
                          color={recommendation.priority === 'high' ? 'error' : 'default'}
                        />
                      )}
                    </TableCell>
                    <TableCell>{recommendation.description}</TableCell>
                    <TableCell align="right">
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => handleConvert(recommendation.id)}
                        disabled={mutation.isPending}
                      >
                        Convert to job
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DataState>
      </Paper>
    </Stack>
  );
}
