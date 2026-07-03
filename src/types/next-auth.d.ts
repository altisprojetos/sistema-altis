import { Role } from "@prisma/client";
import "next-auth";

declare module "next-auth" {
  interface User {
    roles: Role[];
  }
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      roles: Role[];
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    roles: Role[];
    id: string;
  }
}
