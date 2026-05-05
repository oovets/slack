import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import jwt from 'jsonwebtoken'

export function hashPassword(password: string) {
	const salt = randomBytes(16).toString('hex')
	const hash = scryptSync(password, salt, 64).toString('hex')
	return `${salt}:${hash}`
}

export function verifyPassword(password: string, storedHash: string) {
	const [salt, key] = storedHash.split(':')
	const hashBuffer = Buffer.from(key, 'hex')
	const derived = scryptSync(password, salt, 64)
	return timingSafeEqual(hashBuffer, derived)
}

export function generateEmailToken(email: string) {
	if (!process.env.JWT_RESET_SECRET) {
		throw new Error('JWT_RESET_SECRET is not defined in environment variables')
	}

	const secret = process.env.JWT_RESET_SECRET as string

	const token = jwt.sign({ email }, secret, {
		expiresIn: '14d'
	})

	return token
}

export function verifyEmailToken(token: string): {
	valid: boolean
	expired: boolean
	email: string | null
} {
	try {
		if (!process.env.JWT_RESET_SECRET) {
			throw new Error('JWT_RESET_SECRET is not defined in environment variables')
		}

		const decoded = jwt.verify(token, process.env.JWT_RESET_SECRET) as {
			email: string
		}
		return { valid: true, expired: false, email: decoded.email }
	} catch (err: any) {
		console.error('Error verifying token:', err)

		if (err.name === 'TokenExpiredError') {
			return { valid: false, expired: true, email: null }
		}

		return { valid: false, expired: false, email: null }
	}
}