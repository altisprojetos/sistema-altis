import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.active) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          roles: user.roles,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.roles = (user as { roles: Role[] }).roles;
        token.id = user.id;
        // Clear old role field if present
        delete (token as Record<string, unknown>).role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        const tok = token as Record<string, unknown>;
        // Fallback for existing sessions that still have old `role` field
        const roles = (tok.roles as Role[] | undefined) ??
          (tok.role ? [tok.role as Role] : []);
        session.user.roles = roles;
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
});
