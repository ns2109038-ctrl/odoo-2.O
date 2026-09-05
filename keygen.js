const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: "spki",
    format: "pem",
  },
  privateKeyEncoding: {
    type: "pkcs8",
    format: "pem",
  },
});

console.log("Private Key:\n", privateKey);
console.log("Public Key:\n", publicKey);

const envPath = path.join(__dirname, ".env");

let envContent = "";
if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, "utf-8");
}

const privateBase64 = Buffer.from(privateKey).toString('base64');
const publicBase64 = Buffer.from(publicKey).toString('base64');

// Just saving it as multiline string with escaped newlines for .env
const privEscaped = privateKey.replace(/\n/g, '\\n');
const pubEscaped = publicKey.replace(/\n/g, '\\n');

if (!envContent.includes("JWT_PRIVATE_KEY")) {
  envContent += `\nJWT_PRIVATE_KEY="${privEscaped}"`;
}
if (!envContent.includes("JWT_PUBLIC_KEY")) {
  envContent += `\nJWT_PUBLIC_KEY="${pubEscaped}"`;
}
if (!envContent.includes("DATABASE_URL")) {
  envContent += `\nDATABASE_URL="postgresql://postgres:password@localhost:5432/auth_db?schema=public"`;
}

fs.writeFileSync(envPath, envContent);
console.log("Keys appended to .env");
