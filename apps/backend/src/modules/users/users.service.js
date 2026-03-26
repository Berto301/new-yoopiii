import { User } from "./user.model.js";

export const listUsers = () => User.find().select("-passwordHash").limit(50).lean();
