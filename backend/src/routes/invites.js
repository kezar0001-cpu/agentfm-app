import { Router } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '../config/prismaClient.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { sendInviteEmail } from '../utils/email.js';

const router = Router();

// Generate a secure random token
function generateInviteToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Calculate expiration date (7 days from now)
function calculateExpirationDate() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date;
}

// Validation schema for creating an invite
const createInviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['OWNER', 'TECHNICIAN', 'TENANT']),
  propertyId: z.string().optional(),
  unitId: z.string().optional(),
});

/**
 * POST /api/invites
 * Property Manager creates an invite for Owner, Technician, or Tenant
 */
router.post('/', requireAuth, requireRole('PROPERTY_MANAGER'), async (req, res) => {
  try {
    const { email, role, propertyId, unitId } = createInviteSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    // Check if there's already a pending invite for this email
    const existingInvite = await prisma.invite.findFirst({
      where: {
        email,
        status: 'PENDING',
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (existingInvite) {
      return res.status(400).json({
        success: false,
        message: 'A pending invite already exists for this email',
      });
    }

    // If inviting to a property, verify the property exists and belongs to this manager
    if (propertyId) {
      const property = await prisma.property.findFirst({
        where: {
          id: propertyId,
          managerId: req.user.id,
        },
      });

      if (!property) {
        return res.status(404).json({
          success: false,
          message: 'Property not found or you do not have permission',
        });
      }
    }

    // If inviting to a unit, verify the unit exists
    if (unitId) {
      const unit = await prisma.unit.findUnique({
        where: { id: unitId },
        include: { property: true },
      });

      if (!unit || unit.property.managerId !== req.user.id) {
        return res.status(404).json({
          success: false,
          message: 'Unit not found or you do not have permission',
        });
      }
    }

    // Create the invite
    const token = generateInviteToken();
    const expiresAt = calculateExpirationDate();

    const invite = await prisma.invite.create({
      data: {
        email,
        role,
        token,
        status: 'PENDING',
        expiresAt,
        invitedById: req.user.id,
        propertyId: propertyId || null,
        unitId: unitId || null,
      },
      include: {
        invitedBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        property: true,
        unit: true,
      },
    });

    // Generate the signup URL with the invite token
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const signupUrl = `${frontendUrl}/signup?invite=${token}`;

    // Send invitation email
    try {
      const inviterName = `${invite.invitedBy.firstName} ${invite.invitedBy.lastName}`;
      const propertyName = invite.property?.name || null;
      const unitName = invite.unit?.unitNumber || null;

      await sendInviteEmail(
        invite.email,
        signupUrl,
        inviterName,
        invite.role,
        propertyName,
        unitName
      );
    } catch (emailError) {
      console.error('Failed to send invite email:', emailError);
      // Log error but don't fail the request - invite was created successfully
      // The property manager can manually share the invite link if needed
    }

    res.status(201).json({
      success: true,
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        status: invite.status,
        expiresAt: invite.expiresAt,
        signupUrl,
        property: invite.property,
        unit: invite.unit,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors,
      });
    }
    console.error('Create invite error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create invite',
    });
  }
});

/**
 * GET /api/invites/:token
 * Verify an invite token and get invite details
 */
router.get('/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const invite = await prisma.invite.findUnique({
      where: { token },
      include: {
        invitedBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        property: true,
        unit: true,
      },
    });

    if (!invite) {
      return res.status(404).json({
        success: false,
        message: 'Invite not found',
      });
    }

    // Check if invite has expired
    if (new Date() > new Date(invite.expiresAt)) {
      return res.status(400).json({
        success: false,
        message: 'This invite has expired',
      });
    }

    // Check if invite has already been accepted
    if (invite.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'This invite has already been used',
      });
    }

    res.json({
      success: true,
      invite: {
        email: invite.email,
        role: invite.role,
        invitedBy: invite.invitedBy,
        property: invite.property,
        unit: invite.unit,
      },
    });
  } catch (error) {
    console.error('Get invite error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve invite',
    });
  }
});

/**
 * GET /api/invites
 * Get all invites created by the authenticated Property Manager
 */
router.get('/', requireAuth, requireRole('PROPERTY_MANAGER'), async (req, res) => {
  try {
    const invites = await prisma.invite.findMany({
      where: {
        invitedById: req.user.id,
      },
      include: {
        property: true,
        unit: true,
        invitedUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      success: true,
      invites,
    });
  } catch (error) {
    console.error('Get invites error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve invites',
    });
  }
});

/**
 * DELETE /api/invites/:id
 * Cancel/delete a pending invite
 */
router.delete('/:id', requireAuth, requireRole('PROPERTY_MANAGER'), async (req, res) => {
  try {
    const { id } = req.params;

    const invite = await prisma.invite.findUnique({
      where: { id },
    });

    if (!invite) {
      return res.status(404).json({
        success: false,
        message: 'Invite not found',
      });
    }

    if (invite.invitedById !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this invite',
      });
    }

    await prisma.invite.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Invite deleted successfully',
    });
  } catch (error) {
    console.error('Delete invite error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete invite',
    });
  }
});

export default router;
