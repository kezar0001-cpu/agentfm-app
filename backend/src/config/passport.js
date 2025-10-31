import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { prisma } from '../config/prismaClient.js';

// ========================================
// Configure Google OAuth (if credentials provided)
// ========================================
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback';

// Only configure Google OAuth if credentials are provided
const OAUTH_TRIAL_DAYS = 14;

function deriveNameParts(profile, email) {
  const givenName = profile?.name?.givenName?.trim();
  const familyName = profile?.name?.familyName?.trim();

  if (givenName || familyName) {
    return {
      firstName: givenName || familyName || 'Google',
      lastName: familyName || givenName || 'User',
    };
  }

  const displayName = profile?.displayName?.trim();
  if (displayName) {
    const parts = displayName.split(/\s+/);
    const firstName = parts.shift();
    const lastName = parts.join(' ') || 'User';
    return {
      firstName: firstName || 'Google',
      lastName,
    };
  }

  const [localPart] = email.split('@');
  if (localPart) {
    const cleaned = localPart.replace(/[._-]+/g, ' ').trim();
    if (cleaned) {
      const parts = cleaned.split(/\s+/);
      const firstName = parts.shift();
      const lastName = parts.join(' ') || 'User';
      return {
        firstName: firstName || 'Google',
        lastName,
      };
    }
  }

  return { firstName: 'Google', lastName: 'User' };
}

async function generatePlaceholderPasswordHash() {
  const randomSecret = crypto.randomBytes(32).toString('hex');
  return bcrypt.hash(randomSecret, 10);
}

function calculateTrialEndDate() {
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + OAUTH_TRIAL_DAYS);
  return trialEnd;
}

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
          const { firstName, lastName } = deriveNameParts(profile, email);
          const role = req.query.state || 'PROPERTY_MANAGER';

          // Check if user exists
          let user = await prisma.user.findUnique({
            where: { email }
          });

          if (user) {
            const updates = {};

            if (!user.emailVerified) {
              updates.emailVerified = true;
            }

            if ((!user.firstName || !user.firstName.trim()) && firstName) {
              updates.firstName = firstName;
            }

            if ((!user.lastName || !user.lastName.trim()) && lastName) {
              updates.lastName = lastName;
            }

            if (Object.keys(updates).length > 0) {
              user = await prisma.user.update({
                where: { id: user.id },
                data: updates
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
              name: `${firstName}'s Organization`
            }
          });

          // Calculate trial end date (14 days)
          const trialEndDate = calculateTrialEndDate();

          const passwordHash = await generatePlaceholderPasswordHash();

          // Create user
          user = await prisma.user.create({
            data: {
              email,
              firstName,
              lastName,
              passwordHash,
              role: 'PROPERTY_MANAGER',
              emailVerified: true, // Google emails are verified
              subscriptionPlan: 'FREE_TRIAL',
              subscriptionStatus: 'TRIAL',
              trialEndDate,
              orgId: org.id
            }
          });

          // Create Property Manager profile when the model is available.
          // Some deployments may still be on an earlier Prisma schema where
          // the PropertyManagerProfile model has not been generated. In that
          // case prisma.propertyManagerProfile will be undefined, which used
          // to throw an error and stop the OAuth callback flow.
          if (prisma.propertyManagerProfile?.create) {
            await prisma.propertyManagerProfile.create({
              data: {
                userId: user.id,
                managedProperties: [],
                permissions: {
                  canCreateProperties: true,
                  canManageTenants: true,
                  canAssignJobs: true,
                  canViewReports: true
                },
                updatedAt: new Date()
              }
            });
          } else {
            console.warn(
              'PropertyManagerProfile model is not available in Prisma client; skipping profile creation for user',
              user.id
            );
          }

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
      where: { id }
    });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
