import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
// import { MongoDBAdapter } from "@auth/mongodb-adapter"
// import { clientPromise } from "./mongodb"
import { databasePromise } from "./mongodb"
import { verifyPassword } from '@/lib/crypto'
import { NextAuthConfig } from "next-auth"

interface Credentials {
	email: string
	password: string
}

import "next-auth"

export const authOptions: NextAuthConfig = {
	secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
	// Note: Adapter is not used with Credentials provider + JWT sessions
	// adapter: MongoDBAdapter(clientPromise),
	trustHost: true,
	providers: [
		CredentialsProvider({
			name: "Credentials",
			credentials: {
				email: { label: "email", type: "text" },
				password: { label: "password", type: "password" }
			},
			async authorize(creds,) {
				const credentials = creds as Credentials

				// console.log('Auth handler')

				try {
					if (!credentials.email || !credentials.password) {
						console.log("No credentials provided")
						throw new Error("No credentials provided");
					}

					const db = await databasePromise

					const user = await db
						.collection("users")
						.findOne({ email: credentials.email });

					// console.log('User found', user)


					if (!user || !verifyPassword(credentials.password, user.password)) {
						throw new Error("Invalid credentials")
					}

					return {
						id: user._id.toString(), 
						email: user.email,
						name: user.name,
						isAdmin: user.role === "MASTER_ADMIN"
					};
				} catch (error) {
					console.log(error)
					return null;
				}
			}
		})
	],
	session: {
		strategy: "jwt"
	},
	pages: {
		signIn: "/login"
	},
	callbacks: {
		async jwt({ token, user, session }) {
			if (user) {
				token.id = user.id as string;
				token.isAdmin = user.isAdmin ?? false;
				token.name = user.name as string
			}

			if (session?.user) {
				token.isAdmin = session.user?.isAdmin as boolean;
			}
			if (session) {
				token.isAdmin = session.user.isAdmin as boolean;
			}

			return token;
		},
		async session({ session, token }) {
			if (session.user) {
				session.user.id = token.id as string;
				session.user.isAdmin = token.isAdmin as boolean;
				session.user.name = token.name as string;
			}

			return session;
		},
	},
}

export const { auth, handlers, signIn, signOut } = NextAuth(authOptions)