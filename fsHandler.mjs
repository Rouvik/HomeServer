import cors from "cors";
import { Router, json } from "express";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import pLimit from "p-limit";

const limit = pLimit(10);   // limit to 10 concurrent calls

const fsRouter = Router();

fsRouter.use(json(), cors());

async function readDir(filePath) {
    const entries = fs.readdirSync(filePath, { withFileTypes: true });

    return await Promise.all(entries.map(entry => {
        return limit(async () => {
            const fullPath = path.join(filePath, entry.name);
            let stats;
            try {
                stats = await fs.promises.stat(fullPath);
            } catch (error) {
                return {
                    name: entry.name,                   // filename
                    path: fullPath,                     // path to file
                    isFile: entry.isFile(),
                    isDirectory: entry.isDirectory(),
                    size: "EPERM",                      // size in bytes
                    mtime: "EPERM",                     // last modified
                    birthtime: "EPERM"                  // creation time
                };
            }

            return {
                name: entry.name,                               // filename
                path: fullPath,                                 // path to file
                isFile: entry.isFile(),
                isDirectory: entry.isDirectory(),
                size: stats.size,                               // size in bytes
                mtime: stats.mtime.toLocaleString(),            // last modified
                birthtime: stats.birthtime.toLocaleString()     // creation time
            };
        });
    }));
}

// handle file viewer/directory crawler
fsRouter.get(/^\/fs\/html\/(.*)/, async (req, res) => {
    const filePath = decodeURIComponent(req.params[0]) || "/";

    if (!fs.existsSync(filePath)) {
        return res.render("fsHTML", {
            fileName: path.parse(filePath).base,
            filePath,
            nonExistent: true,
            error: false
        });
    }

    if (fs.statSync(filePath).isDirectory()) {
        try {
            const dirent = await readDir(filePath);

            dirent.unshift({
                name: "../",                         // filename
                path: path.resolve(filePath, ".."), // path to file
                isFile: false,
                isDirectory: true,
                size: 0,                            // size in bytes
                mtime: 0,                           // last modified
                birthtime: 0                        // creation time
            });

            return res.render("fsHTML", {
                fileName: path.parse(filePath).dir,
                filePath,
                dirent,
                urlBase: `${req.protocol}://${req.host}/fs/html/`,
                nonExistent: false,
                error: false
            });
        } catch (error) {
            return res.render("fsHTML", {
                fileName: path.parse(filePath).dir,
                filePath,
                error
            });
        }
    }

    const pipe = fs.createReadStream(filePath);

    pipe.on("error", error => {
        return res.render("fsHTML", {
            fileName: path.parse(filePath).dir,
            filePath,
            error
        });
    });
    pipe.pipe(res);
});

fsRouter.get("/fs/api/serverRootURL", (req, res) => {
    return res.send(process.cwd());
});

fsRouter.get("/fs/api/homeURL", (req, res) => {
    return res.send(os.homedir() || "/");
});

export default fsRouter;