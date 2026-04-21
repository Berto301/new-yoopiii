import { StatusCodes } from "http-status-codes";
import { sendContactMessage } from "./contact.service.js";

export const postContactMessageHandler = async (req, res) => {
  const data = await sendContactMessage({ payload: req.validated.body });

  res.status(StatusCodes.CREATED).json({
    success: true,
    data
  });
};
