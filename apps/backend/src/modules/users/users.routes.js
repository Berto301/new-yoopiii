import { Router } from "express";
import { asyncHandler } from "../../core/utils/async-handler.js";
import { getUsers } from "./users.controller.js";

export const userRouter = Router();

userRouter.get("/", asyncHandler(getUsers));
