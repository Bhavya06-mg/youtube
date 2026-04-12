import express from "express";
import {
  postcomment,
  getallcomment,
  deletecomment,
  editcomment,
  likecomment,
  dislikecomment,
  translatecomment,
} from "../controllers/comment.js";

const routes = express.Router();

routes.post("/postcomment", postcomment);
routes.get("/:videoid", getallcomment);
routes.delete("/deletecomment/:id", deletecomment);
routes.post("/editcomment/:id", editcomment);
routes.post("/likecomment/:id", likecomment);
routes.post("/dislikecomment/:id", dislikecomment);
routes.post("/translate", translatecomment);

export default routes;