const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");
const bcrypt = require("bcryptjs");

function loadEnvFromLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, "utf8");
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) return;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
}

async function run() {
  const args = process.argv.slice(2);
  const getArg = (name) => {
    const index = args.indexOf(name);
    return index >= 0 ? args[index + 1] : undefined;
  };

  const firstName = getArg("--first");
  const lastName = getArg("--last");
  const email = getArg("--email");
  const password = getArg("--password");

  if (!firstName || !lastName || !email || !password) {
    console.error("Missing required args: --first --last --email --password");
    process.exit(1);
  }

  loadEnvFromLocal();

  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_NAME || "interviewace";

  if (!uri) {
    console.error("MONGODB_URI is missing. Set it in .env.local or environment.");
    process.exit(1);
  }

  const client = new MongoClient(uri, {});
  try {
    await client.connect();
    const db = client.db(dbName);
    const users = db.collection("users");

    const normalizedEmail = email.toLowerCase();
    const existing = await users.findOne({ email: normalizedEmail });
    if (existing) {
      console.error("User already exists with this email.");
      process.exit(1);
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const now = new Date();

    const user = {
      email: normalizedEmail,
      password: hashedPassword,
      firstName,
      lastName,
      createdAt: now,
      updatedAt: now,
      lastProfileUpdate: now,
      status: "active",
      role: "admin",
      emailVerified: false,
      isActive: true,
      profileCompleteness: 25,
      achievements: [],
      profile: {
        displayName: `${firstName} ${lastName}`.trim(),
        skills: [],
        preferredLanguages: ["English"],
        education: [],
        experience: [],
        projects: [],
      },
    };

    const result = await users.insertOne(user);
    console.log("Admin created:", {
      id: result.insertedId.toString(),
      email: normalizedEmail,
      role: "admin",
    });
  } finally {
    await client.close();
  }
}

run().catch((error) => {
  console.error("Failed to create admin:", error);
  process.exit(1);
});
