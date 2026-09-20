import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';
import { config } from '../config/env.js';
import { successResponse, errorResponse, normalizeError } from '../utils/response.js';

const createToken = (userId) => {
  return jwt.sign({ userId }, config.jwtSecret, { expiresIn: '7d' });
};

export const register = async (req, res, next) => {
  try {
    const { name, email, password, confirmPassword } = req.body || {};

    if (!name || name.trim().length < 2) {
      return res.status(400).json(errorResponse('Name must be at least 2 characters long.'));
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json(errorResponse('Please provide a valid email address.'));
    }

    if (!password || password.length < 8) {
      return res.status(400).json(errorResponse('Password must be at least 8 characters long.'));
    }

    if (password !== confirmPassword) {
      return res.status(400).json(errorResponse('Passwords do not match.'));
    }

    const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existingUser) {
      return res.status(409).json(errorResponse('An account with that email already exists.'));
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase(),
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const token = createToken(user.id);

    return res.status(201).json(successResponse({
      user,
      token,
    }));
  } catch (error) {
    next({ statusCode: 500, message: normalizeError(error) });
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json(errorResponse('Email and password are required.'));
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    if (!user) {
      return res.status(401).json(errorResponse('Invalid email or password.'));
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      return res.status(401).json(errorResponse('Invalid email or password.'));
    }

    const token = createToken(user.id);

    return res.json(successResponse({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      token,
    }));
  } catch (error) {
    next({ statusCode: 500, message: normalizeError(error) });
  }
};

export const logout = async (req, res) => {
  return res.json(successResponse({ message: 'Logged out successfully.' }));
};

export const getCurrentUser = async (req, res) => {
  return res.json(successResponse({ user: req.user }));
};
