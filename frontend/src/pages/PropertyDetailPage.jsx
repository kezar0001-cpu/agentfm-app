import { useParams } from 'react-router-dom';
import { Box, Typography, Button, Card, CardContent } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

export default function PropertyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/properties')}
          sx={{ mr: 2 }}
        >
          Back to Properties
        </Button>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Property Details
        </Typography>
      </Box>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Property ID: {id}
          </Typography>
          <Typography color="text.secondary">
            This is the property detail page for property {id}. 
            We'll build out the full property details view here.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}