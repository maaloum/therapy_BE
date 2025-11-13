import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get translations (public)
router.get('/', async (req, res, next) => {
  try {
    const { language, category } = req.query;

    const where = {};
    if (language) where.language = language;
    if (category) where.category = category;

    const translations = await prisma.translation.findMany({
      where,
      orderBy: { key: 'asc' }
    });

    // Convert to i18next format
    const translationsObj = translations.reduce((acc, t) => {
      if (!acc[t.category || 'common']) {
        acc[t.category || 'common'] = {};
      }
      acc[t.category || 'common'][t.key] = t.value;
      return acc;
    }, {});

    res.json({
      success: true,
      data: { translations: translationsObj }
    });
  } catch (error) {
    next(error);
  }
});

// Admin routes for managing translations
router.post('/', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const { key, language, value, category } = req.body;

    const translation = await prisma.translation.upsert({
      where: {
        key_language: {
          key,
          language
        }
      },
      update: {
        value,
        category: category || 'common'
      },
      create: {
        key,
        language,
        value,
        category: category || 'common'
      }
    });

    res.status(201).json({
      success: true,
      message: req.t('translation.created') || 'Translation created/updated',
      data: { translation }
    });
  } catch (error) {
    next(error);
  }
});

export default router;

