import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();
const prisma = new PrismaClient();

// All routes require admin authentication
router.use(authenticate);
router.use(authorize('ADMIN'));

// Get all users
router.get('/users', async (req, res, next) => {
  try {
    const { role, page = 1, limit = 20, search } = req.query;

    const where = {};
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        isVerified: true,
        createdAt: true
      },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' }
    });

    const total = await prisma.user.count({ where });

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Verify/Unverify user
router.patch('/users/:id/verify', async (req, res, next) => {
  try {
    const { isVerified } = req.body;

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isVerified },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isVerified: true
      }
    });

    // If verifying a doctor, also verify their profile
    if (isVerified && user.role === 'DOCTOR') {
      await prisma.doctorProfile.updateMany({
        where: { userId: user.id },
        data: { isVerified: true }
      });
    }

    res.json({
      success: true,
      message: req.t('admin.user_verified') || 'User verification updated',
      data: { user }
    });
  } catch (error) {
    next(error);
  }
});

// Get analytics
router.get('/analytics', async (req, res, next) => {
  try {
    const totalUsers = await prisma.user.count();
    const totalClients = await prisma.user.count({ where: { role: 'CLIENT' } });
    const totalDoctors = await prisma.user.count({ where: { role: 'DOCTOR' } });
    const totalBookings = await prisma.booking.count();
    const completedBookings = await prisma.booking.count({ where: { status: 'COMPLETED' } });
    
    const totalRevenue = await prisma.payment.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { amount: true }
    });

    const monthlyRevenue = await prisma.payment.aggregate({
      where: {
        status: 'COMPLETED',
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      },
      _sum: { amount: true }
    });

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          clients: totalClients,
          doctors: totalDoctors
        },
        bookings: {
          total: totalBookings,
          completed: completedBookings
        },
        revenue: {
          total: totalRevenue._sum.amount || 0,
          monthly: monthlyRevenue._sum.amount || 0
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get all bookings with filters
router.get('/bookings', async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const where = {};
    if (status) where.status = status;

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        client: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        },
        doctor: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        },
        payment: true
      },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' }
    });

    const total = await prisma.booking.count({ where });

    res.json({
      success: true,
      data: {
        bookings,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;

