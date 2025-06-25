import https from "node:https";
import fs from "node:fs";
import { configDotenv } from "dotenv";
import express from "express";
import path from "path";
import fsRouter from "./fsHandler.mjs";
import Shell from "./shellHandler.mjs";

configDotenv();

const app = express();

app.set("view engine", "ejs");
app.set("views", "./views");

app.use("/public", express.static(path.join(process.cwd(), "/public")));

app.get('/', (_, res) => {
    res.redirect("/public");
});

app.use(fsRouter);

const server = https.createServer({
    cert: fs.readFileSync(path.join(process.cwd(), "/cert/cert.pem")),
    key: fs.readFileSync(path.join(process.cwd(), "/cert/key.pem"))
}, app);

Shell.registerWSServer(server);

server.listen(+process.env.PORT, () => {
    console.log(`Server listening at port ${process.env.PORT}`);
});