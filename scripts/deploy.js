/**
 * ==============================================================================
 * AL FAKHAMA FACTORY - HOSTINGER FTPS DEPLOYMENT SCRIPT
 * ==============================================================================
 * Fast, automated deployment tool to sync files with Hostinger server.
 * Run via: npm run deploy
 * ==============================================================================
 */

const ftp = require("basic-ftp");
const path = require("path");
const fs = require("fs");

async function deploy() {
    const client = new ftp.Client();
    client.ftp.verbose = true;

    const host = process.env.FTP_HOST || "147.79.103.106";
    const user = process.env.FTP_USER || "u128613351";
    const password = process.env.FTP_PASSWORD || "Alfakhama@2027";
    const remoteDir = process.env.FTP_REMOTE_DIR || "domains/alfakhamafactory-com-480061.hostingersite.com/public_html";
    const projectRoot = path.resolve(__dirname, "..");

    console.log("==========================================");
    console.log("🚀 Starting deployment to Hostinger...");
    console.log(`📡 Host: ${host}`);
    console.log(`👤 User: ${user}`);
    console.log(`📁 Target: ${remoteDir}`);
    console.log("==========================================\n");

    try {
        await client.access({
            host,
            user,
            password,
            secure: true,
            secureOptions: { rejectUnauthorized: false }
        });
        console.log("✅ Authenticated & Connected successfully via FTPS (TLSv1.3)\n");

        await client.ensureDir(remoteDir);

        const itemsToUpload = [
            "index.html",
            "favicon.ico",
            "package.json",
            "package-lock.json",
            "server.js",
            ".env",
            "admin",
            "assets",
            "css",
            "js",
            "database"
        ];

        for (const item of itemsToUpload) {
            const localPath = path.join(projectRoot, item);
            if (!fs.existsSync(localPath)) continue;

            const stat = fs.statSync(localPath);
            if (stat.isDirectory()) {
                console.log(`📦 Syncing folder: [${item}]...`);
                await client.uploadFromDir(localPath, item);
            } else {
                console.log(`📄 Uploading file: ${item}...`);
                await client.uploadFrom(localPath, item);
            }
        }

        console.log("\n==========================================");
        console.log("🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!");
        console.log("🌐 URL: https://alfakhamafactory-com-480061.hostingersite.com");
        console.log("==========================================");

    } catch (err) {
        console.error("\n❌ Deployment error:", err.message || err);
        process.exitCode = 1;
    } finally {
        client.close();
    }
}

deploy();
