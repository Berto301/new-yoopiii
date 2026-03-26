import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";

export const signAccessToken = (user) =>
  jwt.sign({ sub: user._id, role: user.role }, env.jwtAccessSecret, {
    expiresIn: "1d"
  });

export const verifyAccessToken = (token) => jwt.verify(token, env.jwtAccessSecret);
