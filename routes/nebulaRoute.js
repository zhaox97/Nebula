import {Router} from "express";
const router = Router();
import path from "path";

// Following three lines convert a "URL" to a file path
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* GET home page. */
router.get('/', function(req, res, next) {
  res.sendFile(path.join(__dirname, "../Nebula-UIs/index.html"), function(err) {
      if (err) {
        console.log("Error: send file");
        console.log(err);   
      }
  });
});

export default router;
