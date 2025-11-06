import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  TextField,
  FormControl,
  FormLabel,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Select,
  MenuItem,
  InputLabel,
  Paper,
  Divider,
  InputAdornment,
} from '@mui/material';
import {
  DirectionsCar as ParkingIcon,
  Pets as PetsIcon,
  WaterDrop as UtilitiesIcon,
  FitnessCenter as FeaturesIcon,
  Security as SecurityIcon,
  Accessible as AccessibleIcon,
} from '@mui/icons-material';

const PropertyAmenitiesForm = ({ value = {}, onChange, disabled = false }) => {
  // Initialize amenities state with defaults
  const [amenities, setAmenities] = useState({
    // Parking
    parking: {
      available: false,
      type: 'NONE', // NONE, STREET, DRIVEWAY, GARAGE, COVERED, UNCOVERED
      spaces: 0,
      covered: false,
    },
    // Pet Policy
    pets: {
      allowed: false,
      deposit: 0,
      restrictions: '',
      weightLimit: 0,
      catsAllowed: false,
      dogsAllowed: false,
    },
    // Utilities Included
    utilities: {
      water: false,
      gas: false,
      electricity: false,
      internet: false,
      trash: false,
      sewer: false,
      cable: false,
    },
    // Features
    features: {
      pool: false,
      gym: false,
      laundry: false,
      elevator: false,
      doorman: false,
      storage: false,
      balcony: false,
      patio: false,
      yard: false,
      fireplace: false,
      airConditioning: false,
      heating: false,
      dishwasher: false,
      microwave: false,
      refrigerator: false,
      washerDryer: false,
    },
    // Security
    security: {
      gated: false,
      cameras: false,
      alarm: false,
      accessControl: false,
      securityGuard: false,
      intercom: false,
    },
    // Accessibility
    accessibility: {
      wheelchairAccessible: false,
      elevator: false,
      ramps: false,
      wideHallways: false,
      accessibleBathroom: false,
      accessibleParking: false,
    },
    ...value,
  });

  useEffect(() => {
    if (value && typeof value === 'object') {
      setAmenities((prev) => ({
        ...prev,
        ...value,
      }));
    }
  }, [value]);

  const handleChange = (section, field, fieldValue) => {
    const updated = {
      ...amenities,
      [section]: {
        ...amenities[section],
        [field]: fieldValue,
      },
    };
    setAmenities(updated);
    if (onChange) {
      onChange(updated);
    }
  };

  const handleCheckboxChange = (section, field) => (event) => {
    handleChange(section, field, event.target.checked);
  };

  const handleTextChange = (section, field) => (event) => {
    handleChange(section, field, event.target.value);
  };

  const handleNumberChange = (section, field) => (event) => {
    const value = event.target.value === '' ? 0 : parseInt(event.target.value, 10);
    handleChange(section, field, isNaN(value) ? 0 : value);
  };

  return (
    <Box>
      {/* Parking Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <ParkingIcon color="primary" />
          <Typography variant="h6">Parking</Typography>
        </Box>
        <Divider sx={{ mb: 2 }} />
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={amenities.parking?.available || false}
                  onChange={handleCheckboxChange('parking', 'available')}
                  disabled={disabled}
                />
              }
              label="Parking Available"
            />
          </Grid>
          {amenities.parking?.available && (
            <>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth disabled={disabled}>
                  <InputLabel>Parking Type</InputLabel>
                  <Select
                    value={amenities.parking?.type || 'NONE'}
                    onChange={handleTextChange('parking', 'type')}
                    label="Parking Type"
                  >
                    <MenuItem value="NONE">None</MenuItem>
                    <MenuItem value="STREET">Street Parking</MenuItem>
                    <MenuItem value="DRIVEWAY">Driveway</MenuItem>
                    <MenuItem value="GARAGE">Garage</MenuItem>
                    <MenuItem value="COVERED">Covered Lot</MenuItem>
                    <MenuItem value="UNCOVERED">Uncovered Lot</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Number of Spaces"
                  value={amenities.parking?.spaces || 0}
                  onChange={handleNumberChange('parking', 'spaces')}
                  disabled={disabled}
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={amenities.parking?.covered || false}
                      onChange={handleCheckboxChange('parking', 'covered')}
                      disabled={disabled}
                    />
                  }
                  label="Covered Parking"
                />
              </Grid>
            </>
          )}
        </Grid>
      </Paper>

      {/* Pet Policy Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <PetsIcon color="primary" />
          <Typography variant="h6">Pet Policy</Typography>
        </Box>
        <Divider sx={{ mb: 2 }} />
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={amenities.pets?.allowed || false}
                  onChange={handleCheckboxChange('pets', 'allowed')}
                  disabled={disabled}
                />
              }
              label="Pets Allowed"
            />
          </Grid>
          {amenities.pets?.allowed && (
            <>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={amenities.pets?.catsAllowed || false}
                      onChange={handleCheckboxChange('pets', 'catsAllowed')}
                      disabled={disabled}
                    />
                  }
                  label="Cats Allowed"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={amenities.pets?.dogsAllowed || false}
                      onChange={handleCheckboxChange('pets', 'dogsAllowed')}
                      disabled={disabled}
                    />
                  }
                  label="Dogs Allowed"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Pet Deposit"
                  value={amenities.pets?.deposit || 0}
                  onChange={handleNumberChange('pets', 'deposit')}
                  disabled={disabled}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Weight Limit (lbs)"
                  value={amenities.pets?.weightLimit || 0}
                  onChange={handleNumberChange('pets', 'weightLimit')}
                  disabled={disabled}
                  inputProps={{ min: 0 }}
                  helperText="0 = No limit"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Pet Restrictions"
                  value={amenities.pets?.restrictions || ''}
                  onChange={handleTextChange('pets', 'restrictions')}
                  disabled={disabled}
                  placeholder="e.g., No aggressive breeds, must be housebroken"
                />
              </Grid>
            </>
          )}
        </Grid>
      </Paper>

      {/* Utilities Included Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <UtilitiesIcon color="primary" />
          <Typography variant="h6">Utilities Included</Typography>
        </Box>
        <Divider sx={{ mb: 2 }} />
        <FormGroup>
          <Grid container spacing={1}>
            <Grid item xs={12} sm={6} md={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={amenities.utilities?.water || false}
                    onChange={handleCheckboxChange('utilities', 'water')}
                    disabled={disabled}
                  />
                }
                label="Water"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={amenities.utilities?.gas || false}
                    onChange={handleCheckboxChange('utilities', 'gas')}
                    disabled={disabled}
                  />
                }
                label="Gas"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={amenities.utilities?.electricity || false}
                    onChange={handleCheckboxChange('utilities', 'electricity')}
                    disabled={disabled}
                  />
                }
                label="Electricity"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={amenities.utilities?.internet || false}
                    onChange={handleCheckboxChange('utilities', 'internet')}
                    disabled={disabled}
                  />
                }
                label="Internet"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={amenities.utilities?.trash || false}
                    onChange={handleCheckboxChange('utilities', 'trash')}
                    disabled={disabled}
                  />
                }
                label="Trash"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={amenities.utilities?.sewer || false}
                    onChange={handleCheckboxChange('utilities', 'sewer')}
                    disabled={disabled}
                  />
                }
                label="Sewer"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={amenities.utilities?.cable || false}
                    onChange={handleCheckboxChange('utilities', 'cable')}
                    disabled={disabled}
                  />
                }
                label="Cable TV"
              />
            </Grid>
          </Grid>
        </FormGroup>
      </Paper>

      {/* Features Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <FeaturesIcon color="primary" />
          <Typography variant="h6">Property Features</Typography>
        </Box>
        <Divider sx={{ mb: 2 }} />
        <FormGroup>
          <Grid container spacing={1}>
            <Grid item xs={12} sm={6} md={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={amenities.features?.pool || false}
                    onChange={handleCheckboxChange('features', 'pool')}
                    disabled={disabled}
                  />
                }
                label="Pool"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={amenities.features?.gym || false}
                    onChange={handleCheckboxChange('features', 'gym')}
                    disabled={disabled}
                  />
                }
                label="Gym/Fitness Center"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={amenities.features?.laundry || false}
                    onChange={handleCheckboxChange('features', 'laundry')}
                    disabled={disabled}
                  />
                }
                label="Laundry Facility"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={amenities.features?.elevator || false}
                    onChange={handleCheckboxChange('features', 'elevator')}
                    disabled={disabled}
                  />
                }
                label="Elevator"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={amenities.features?.doorman || false}
                    onChange={handleCheckboxChange('features', 'doorman')}
                    disabled={disabled}
                  />
                }
                label="Doorman"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={amenities.features?.storage || false}
                    onChange={handleCheckboxChange('features', 'storage')}
                    disabled={disabled}
                  />
                }
                label="Storage Unit"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={amenities.features?.balcony || false}
                    onChange={handleCheckboxChange('features', 'balcony')}
                    disabled={disabled}
                  />
                }
                label="Balcony"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={amenities.features?.patio || false}
                    onChange={handleCheckboxChange('features', 'patio')}
                    disabled={disabled}
                  />
                }
                label="Patio"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={amenities.features?.yard || false}
                    onChange={handleCheckboxChange('features', 'yard')}
                    disabled={disabled}
                  />
                }
                label="Yard"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={amenities.features?.fireplace || false}
                    onChange={handleCheckboxChange('features', 'fireplace')}
                    disabled={disabled}
                  />
                }
                label="Fireplace"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={amenities.features?.airConditioning || false}
                    onChange={handleCheckboxChange('features', 'airConditioning')}
                    disabled={disabled}
                  />
                }
                label="Air Conditioning"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={amenities.features?.heating || false}
                    onChange={handleCheckboxChange('features', 'heating')}
                    disabled={disabled}
                  />
                }
                label="Central Heating"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={amenities.features?.dishwasher || false}
                    onChange={handleCheckboxChange('features', 'dishwasher')}
                    disabled={disabled}
                  />
                }
                label="Dishwasher"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={amenities.features?.microwave || false}
                    onChange={handleCheckboxChange('features', 'microwave')}
                    disabled={disabled}
                  />
                }
                label="Microwave"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={amenities.features?.refrigerator || false}
                    onChange={handleCheckboxChange('features', 'refrigerator')}
                    disabled={disabled}
                  />
                }
                label="Refrigerator"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={amenities.features?.washerDryer || false}
                    onChange={handleCheckboxChange('features', 'washerDryer')}
                    disabled={disabled}
                  />
                }
                label="Washer/Dryer"
              />
            </Grid>
          </Grid>
        </FormGroup>
      </Paper>

      {/* Security Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <SecurityIcon color="primary" />
          <Typography variant="h6">Security Features</Typography>
        </Box>
        <Divider sx={{ mb: 2 }} />
        <FormGroup>
          <Grid container spacing={1}>
            <Grid item xs={12} sm={6} md={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={amenities.security?.gated || false}
                    onChange={handleCheckboxChange('security', 'gated')}
                    disabled={disabled}
                  />
                }
                label="Gated Community"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={amenities.security?.cameras || false}
                    onChange={handleCheckboxChange('security', 'cameras')}
                    disabled={disabled}
                  />
                }
                label="Security Cameras"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={amenities.security?.alarm || false}
                    onChange={handleCheckboxChange('security', 'alarm')}
                    disabled={disabled}
                  />
                }
                label="Alarm System"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={amenities.security?.accessControl || false}
                    onChange={handleCheckboxChange('security', 'accessControl')}
                    disabled={disabled}
                  />
                }
                label="Access Control"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={amenities.security?.securityGuard || false}
                    onChange={handleCheckboxChange('security', 'securityGuard')}
                    disabled={disabled}
                  />
                }
                label="Security Guard"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={amenities.security?.intercom || false}
                    onChange={handleCheckboxChange('security', 'intercom')}
                    disabled={disabled}
                  />
                }
                label="Intercom System"
              />
            </Grid>
          </Grid>
        </FormGroup>
      </Paper>

      {/* Accessibility Section */}
      <Paper sx={{ p: 3 }}>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <AccessibleIcon color="primary" />
          <Typography variant="h6">Accessibility Features</Typography>
        </Box>
        <Divider sx={{ mb: 2 }} />
        <FormGroup>
          <Grid container spacing={1}>
            <Grid item xs={12} sm={6} md={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={amenities.accessibility?.wheelchairAccessible || false}
                    onChange={handleCheckboxChange('accessibility', 'wheelchairAccessible')}
                    disabled={disabled}
                  />
                }
                label="Wheelchair Accessible"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={amenities.accessibility?.elevator || false}
                    onChange={handleCheckboxChange('accessibility', 'elevator')}
                    disabled={disabled}
                  />
                }
                label="Accessible Elevator"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={amenities.accessibility?.ramps || false}
                    onChange={handleCheckboxChange('accessibility', 'ramps')}
                    disabled={disabled}
                  />
                }
                label="Ramps"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={amenities.accessibility?.wideHallways || false}
                    onChange={handleCheckboxChange('accessibility', 'wideHallways')}
                    disabled={disabled}
                  />
                }
                label="Wide Hallways"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={amenities.accessibility?.accessibleBathroom || false}
                    onChange={handleCheckboxChange('accessibility', 'accessibleBathroom')}
                    disabled={disabled}
                  />
                }
                label="Accessible Bathroom"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={amenities.accessibility?.accessibleParking || false}
                    onChange={handleCheckboxChange('accessibility', 'accessibleParking')}
                    disabled={disabled}
                  />
                }
                label="Accessible Parking"
              />
            </Grid>
          </Grid>
        </FormGroup>
      </Paper>
    </Box>
  );
};

export default PropertyAmenitiesForm;
