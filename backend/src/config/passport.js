import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { prisma } from '../index.js';

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

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      passReqToCallback: true
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        const role = req.query.role || 'client';
        const email = profile.emails[0].value;
        const name = profile.displayName;
        const googleId = profile.id;

        // Check if user exists
        let user = await prisma.user.findFirst({
          where: {
            OR: [
              { email },
              { googleId }
            ]
          },
          include: { org: true }
        });

        if (user) {
          // Update Google ID if not set
          if (!user.googleId) {
            user = await prisma.user.update({
              where: { id: user.id },
              data: { googleId, emailVerified: true },
              include: { org: true }
            });
          }
          return done(null, user);
        }

        // Create new organization for new user
        const org = await prisma.org.create({
          data: {
            name: name + "'s Organization"
          }
        });

        // Create new user
        user = await prisma.user.create({
          data: {
            email,
            name,
            googleId,
            role,
            emailVerified: true,
            orgId: org.id
          },
          include: { org: true }
        });

        // Create tenant profile if role is tenant
        if (role === 'tenant') {
          await prisma.tenantProfile.create({
            data: {
              userId: user.id,
              preferredChannel: 'EMAIL',
              language: 'EN'
            }
          });
        }

        return done(null, user);
      } catch (error) {
        console.error('Google OAuth Error:', error);
        return done(error, null);
      }
    }
  )
);

export default passport;