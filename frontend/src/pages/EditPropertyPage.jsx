// frontend/src/pages/EditPropertyPage.jsx
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Card, CardContent } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';

export default function EditPropertyPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <Box>
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/properties')} sx={{ mb: 2 }}>
        Back to Properties
      </Button>
      <Card>
        <CardContent>
          <Typography variant="h4">Edit Property {id}</Typography>
          <Typography color="text.secondary">
            This page will contain the form to edit property details.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}