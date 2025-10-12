import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { prisma } from '../index.js';

// ========================================
// Configure Google OAuth (if credentials provided)
// ========================================
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback';

// Only configure Google OAuth if credentials are provided
if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  console.log('✅ Google OAuth enabled');
  
  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: GOOGLE_CALLBACK_URL,
        passReqToCallback: true
      },
      async (req, accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails[0].value;
          const name = profile.displayName;
          const googleId = profile.id;
          const role = req.query.state || 'PROPERTY_MANAGER';

          // Check if user exists
          let user = await prisma.user.findUnique({
            where: { email },
            include: { org: true }
          });

          if (user) {
            // User exists, update Google ID if needed
            if (!user.googleId) {
              user = await prisma.user.update({
                where: { id: user.id },
                data: { googleId },
                include: { org: true }
              });
            }
            return done(null, user);
          }

          // Create new user (only for PROPERTY_MANAGER)
          if (role !== 'PROPERTY_MANAGER') {
            return done(new Error('Google signup is only available for Property Managers'), null);
          }

          // Create organization
          const org = await prisma.org.create({
            data: {
              name: `${name}'s Organization`
            }
          });

          // Calculate trial end date (14 days)
          const trialEndDate = new Date();
          trialEndDate.setDate(trialEndDate.getDate() + 14);

          // Create user
          user = await prisma.user.create({
            data: {
              email,
              name,
              googleId,
              role: 'PROPERTY_MANAGER',
              emailVerified: true, // Google emails are verified
              subscriptionPlan: 'FREE_TRIAL',
              subscriptionStatus: 'TRIAL',
              trialEndDate,
              orgId: org.id
            },
            include: { org: true }
          });

          // Create Property Manager profile
          await prisma.propertyManagerProfile.create({
            data: {
              userId: user.id,
              managedProperties: [],
              permissions: {
                canCreateProperties: true,
                canManageTenants: true,
                canAssignJobs: true,
                canViewReports: true
              }
            }
          });

          return done(null, user);
        } catch (error) {
          console.error('Google OAuth error:', error);
          return done(error, null);
        }
      }
    )
  );
} else {
  console.log('⚠️  Google OAuth disabled - GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET not set');
}

// ========================================
// Serialize/Deserialize User
// ========================================
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { org: true }
    });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
