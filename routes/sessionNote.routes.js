import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();
const prisma = new PrismaClient();

// Create or update session note (Doctor only)
router.put('/:bookingId', authenticate, authorize('DOCTOR'), async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { notes } = req.body;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId }
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: req.t('sessionNote.booking_not_found') || 'Booking not found'
      });
    }

    const doctorProfile = await prisma.doctorProfile.findUnique({
      where: { userId: req.user.id }
    });

    if (booking.doctorId !== doctorProfile?.id) {
      return res.status(403).json({
        success: false,
        message: req.t('sessionNote.unauthorized') || 'Unauthorized'
      });
    }

    const sessionNote = await prisma.sessionNote.upsert({
      where: { bookingId },
      update: { notes },
      create: {
        bookingId,
        doctorId: doctorProfile.id,
        notes
      }
    });

    res.json({
      success: true,
      message: req.t('sessionNote.updated') || 'Session note updated',
      data: { sessionNote }
    });
  } catch (error) {
    next(error);
  }
});

// Get session notes for a booking (Doctor only)
router.get('/:bookingId', authenticate, authorize('DOCTOR'), async (req, res, next) => {
  try {
    const { bookingId } = req.params;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId }
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: req.t('sessionNote.booking_not_found') || 'Booking not found'
      });
    }

    const doctorProfile = await prisma.doctorProfile.findUnique({
      where: { userId: req.user.id }
    });

    if (booking.doctorId !== doctorProfile?.id) {
      return res.status(403).json({
        success: false,
        message: req.t('sessionNote.unauthorized') || 'Unauthorized'
      });
    }

    const sessionNote = await prisma.sessionNote.findUnique({
      where: { bookingId }
    });

    res.json({
      success: true,
      data: { sessionNote }
    });
  } catch (error) {
    next(error);
  }
});

export default router;

